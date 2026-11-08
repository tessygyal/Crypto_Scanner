-- Scam Detector PNG — in-app moderation
--
-- Until now moderators approved reports in the Supabase dashboard. This lets
-- chosen users do it in the app:
--
--   * public.moderators lists who is a moderator. Nobody can change it through
--     the API; add moderators in the SQL Editor (see README).
--   * Moderators can read every report (including pending and rejected ones),
--     and the screenshots attached to them.
--   * Moderators change a report's status only through moderate_report(),
--     which records who reviewed it, when, and an optional note for the reporter.
--     They still can't edit a report's content, and can't review their own.

-- ---------------------------------------------------------------------------
-- Moderators
-- ---------------------------------------------------------------------------

create table public.moderators (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.moderators is 'Users who can review community reports in the app. Managed in the SQL Editor only.';

alter table public.moderators enable row level security;
-- No policies and no privileges: the API can't read or change this table.
revoke all on public.moderators from anon, authenticated;

-- True when the signed-in user is a moderator. security definer so it can read
-- public.moderators, which users have no access to.
create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.moderators m where m.user_id = (select auth.uid()));
$$;

revoke execute on function public.is_moderator() from public, anon;
grant execute on function public.is_moderator() to authenticated;

-- ---------------------------------------------------------------------------
-- Review details on reports
-- ---------------------------------------------------------------------------

alter table public.reports
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references public.profiles (id) on delete set null,
  add column review_note text check (review_note is null or char_length(review_note) between 1 and 300);

comment on column public.reports.review_note is 'Optional note from the moderator to the reporter (e.g. why it was not approved).';

-- Users can't set the review columns themselves: new reports start with none,
-- and editing a report's content sends it back to review and clears them.
-- (Replaces the function from the initial schema; the trigger stays the same.)
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
    new.reviewed_at := null;
    new.reviewed_by := null;
    new.review_note := null;
  end if;
  return new;
end;
$$;

create or replace function public.reports_clear_review_on_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.reviewed_at := null;
  new.reviewed_by := null;
  new.review_note := null;
  return new;
end;
$$;

create trigger reports_clear_review_on_insert
  before insert on public.reports
  for each row execute function public.reports_clear_review_on_insert();

-- ---------------------------------------------------------------------------
-- Moderators can read every report and its screenshots
-- ---------------------------------------------------------------------------

create policy "reports: moderators can read all"
  on public.reports for select to authenticated
  using ((select public.is_moderator()));

create policy "evidence: moderators can read"
  on public.evidence for select to authenticated
  using ((select public.is_moderator()));

create policy "evidence files: moderators can read"
  on storage.objects for select to authenticated
  using (bucket_id = 'evidence' and (select public.is_moderator()));

-- ---------------------------------------------------------------------------
-- Approve / reject
-- ---------------------------------------------------------------------------

create or replace function public.moderate_report(report_id uuid, decision text, note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  owner uuid;
  clean_note text := nullif(btrim(coalesce(note, '')), '');
begin
  if me is null or not public.is_moderator() then
    raise exception 'only moderators can review reports' using errcode = 'insufficient_privilege';
  end if;
  if decision not in ('approved', 'rejected') then
    raise exception 'decision must be approved or rejected' using errcode = 'check_violation';
  end if;
  if char_length(clean_note) > 300 then
    raise exception 'note must be 300 characters or fewer' using errcode = 'check_violation';
  end if;

  select r.user_id into owner from public.reports r where r.id = report_id for update;
  if not found then
    raise exception 'report not found' using errcode = 'no_data_found';
  end if;
  if owner = me then
    raise exception 'moderators cannot review their own reports' using errcode = 'insufficient_privilege';
  end if;

  update public.reports r
     set status = decision,
         reviewed_at = now(),
         reviewed_by = me,
         review_note = clean_note
   where r.id = report_id;
end;
$$;

revoke execute on function public.moderate_report(uuid, text, text) from public, anon;
grant execute on function public.moderate_report(uuid, text, text) to authenticated;
