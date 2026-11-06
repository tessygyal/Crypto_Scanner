-- Scam Detector PNG — initial schema (M2)
--
-- Tables: profiles, checks, reports, evidence. Row Level Security is enabled on
-- every table. Writes always require user_id = auth.uid().
--
--   profiles  read: any signed-in user (display name only)   write: owner
--   checks    read: owner                                    write: owner
--   reports   read: approved ones + your own (any status)    write: owner, always "pending"
--   evidence  read: owner                                    write: owner
--
-- Moderators approve/reject reports from the Supabase dashboard (or with the
-- service role), which bypasses RLS. Users can never set a report's status.
--
-- Apply: Supabase dashboard → SQL Editor → paste this file → Run
--        (or `npx supabase db push` with the Supabase CLI).

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, created automatically on sign-up
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Public profile for each user. No email or other personal data.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Copy the display name chosen at sign-up (auth user metadata) into profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  name text := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
begin
  if char_length(name) < 2 then
    name := 'New user';
  end if;
  insert into public.profiles (id, display_name) values (new.id, btrim(left(name, 40)));
  return new;
end;
$$;

-- Only the trigger should run this security-definer function.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- checks: a user's risk-check history
-- ---------------------------------------------------------------------------

create table public.checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  input text not null check (char_length(input) between 1 and 2048),
  type text not null check (type in ('url', 'qr', 'token', 'scheme')),
  score smallint not null check (score between 0 and 100),
  risk_level text not null check (risk_level in ('none', 'low', 'medium', 'high')),
  -- Array of risk indicators, e.g. [{"id":"no_https","label":"…","weight":15}]
  signals jsonb not null default '[]'::jsonb check (jsonb_typeof(signals) = 'array'),
  created_at timestamptz not null default now()
);

comment on table public.checks is 'Risk checks run by a user. Private to that user. Re-running a check inserts a new row.';

create index checks_user_created_idx on public.checks (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- reports: community scam reports (describe schemes and platforms, not people)
-- ---------------------------------------------------------------------------

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  scheme_type text not null check (scheme_type in (
    'investment_ponzi', 'fake_exchange', 'giveaway_airdrop', 'romance', 'impersonation',
    'phishing', 'pump_and_dump', 'job_task', 'other'
  )),
  platform text not null check (platform in (
    'facebook', 'whatsapp', 'telegram', 'tiktok', 'instagram', 'website', 'sms', 'phone_call',
    'in_person', 'other'
  )),
  description text not null check (char_length(btrim(description)) between 20 and 2000),
  -- Optional: reports without a location are listed but not shown on the map.
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reports_location_both_or_neither check ((latitude is null) = (longitude is null))
);

comment on table public.reports is 'Community scam reports. New and edited reports are pending until a moderator approves them.';

create index reports_user_created_idx on public.reports (user_id, created_at desc);
create index reports_status_created_idx on public.reports (status, created_at desc);

create trigger reports_set_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();

-- Editing a report's content sends it back to moderation, so an approved
-- report can't be changed into something that was never reviewed.
create or replace function public.reports_reset_status_on_edit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.scheme_type, new.platform, new.description, new.latitude, new.longitude)
     is distinct from
     (old.scheme_type, old.platform, old.description, old.latitude, old.longitude) then
    new.status := 'pending';
  end if;
  return new;
end;
$$;

create trigger reports_reset_status_on_edit
  before update on public.reports
  for each row execute function public.reports_reset_status_on_edit();

-- ---------------------------------------------------------------------------
-- evidence: screenshots attached to a report (files live in Storage)
-- ---------------------------------------------------------------------------

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  -- Path inside the "evidence" bucket: "<user id>/<file name>"
  storage_path text not null unique check (storage_path ~ '^[0-9a-f-]{36}/[^/]+$'),
  created_at timestamptz not null default now()
);

comment on table public.evidence is 'Screenshot files for a report. Private to the report owner (and moderators).';

create index evidence_report_idx on public.evidence (report_id);

-- ---------------------------------------------------------------------------
-- Privileges: nothing for anonymous users; signed-in users may only update
-- the columns listed here (never ids, owners, status or timestamps).
-- ---------------------------------------------------------------------------

revoke all on public.profiles, public.checks, public.reports, public.evidence from anon;

revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

revoke update on public.checks from authenticated;

revoke update on public.reports from authenticated;
grant update (scheme_type, platform, description, latitude, longitude) on public.reports to authenticated;

revoke update on public.evidence from authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.checks enable row level security;
alter table public.reports enable row level security;
alter table public.evidence enable row level security;

-- profiles
create policy "profiles: signed-in users can read"
  on public.profiles for select to authenticated
  using (true);

create policy "profiles: owner can update"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- checks
create policy "checks: owner can read"
  on public.checks for select to authenticated
  using (user_id = (select auth.uid()));

create policy "checks: owner can insert"
  on public.checks for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "checks: owner can delete"
  on public.checks for delete to authenticated
  using (user_id = (select auth.uid()));

-- reports
create policy "reports: read approved or own"
  on public.reports for select to authenticated
  using (status = 'approved' or user_id = (select auth.uid()));

create policy "reports: owner can insert pending"
  on public.reports for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending');

create policy "reports: owner can update"
  on public.reports for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "reports: owner can delete"
  on public.reports for delete to authenticated
  using (user_id = (select auth.uid()));

-- evidence (ownership comes from the parent report; files must be in the user's folder)
create policy "evidence: owner can read"
  on public.evidence for select to authenticated
  using (exists (
    select 1 from public.reports r
    where r.id = report_id and r.user_id = (select auth.uid())
  ));

create policy "evidence: owner can insert"
  on public.evidence for insert to authenticated
  with check (
    split_part(storage_path, '/', 1) = (select auth.uid())::text
    and exists (
      select 1 from public.reports r
      where r.id = report_id and r.user_id = (select auth.uid())
    )
  );

create policy "evidence: owner can delete"
  on public.evidence for delete to authenticated
  using (exists (
    select 1 from public.reports r
    where r.id = report_id and r.user_id = (select auth.uid())
  ));

-- ---------------------------------------------------------------------------
-- Storage: private "evidence" bucket; each user can only touch their own folder
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidence', 'evidence', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "evidence files: owner can upload to own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "evidence files: owner can read own folder"
  on storage.objects for select to authenticated
  using (bucket_id = 'evidence' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "evidence files: owner can delete own folder"
  on storage.objects for delete to authenticated
  using (bucket_id = 'evidence' and (storage.foldername(name))[1] = (select auth.uid())::text);
