-- Scam Detector PNG — screenshot evidence on reports
--
-- The evidence table, its RLS and the private "evidence" bucket already exist
-- (initial schema). This adds the rules the app now relies on:
--
--   * At most 3 screenshots per report.
--   * A screenshot's file must be in the uploader's folder AND named after the
--     report it belongs to: "<user id>/<report id>-<anything>". This ties each
--     file to one report, so a file can't be attached to someone else's report
--     or reused across reports.
--
-- Screenshots are private: only the report's owner (and moderators, see the
-- moderation migration) can see them. They are never shown to the community,
-- because screenshots of chats often contain names, faces and phone numbers.

create or replace function public.evidence_enforce_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if split_part(new.storage_path, '/', 2) not like new.report_id::text || '-%' then
    raise exception 'evidence file name must start with the report id'
      using errcode = 'check_violation';
  end if;

  -- Serialise inserts for the same report so two uploads at once can't both
  -- pass the count check.
  perform pg_advisory_xact_lock(hashtext('evidence:' || new.report_id::text));
  if (select count(*) from public.evidence e where e.report_id = new.report_id) >= 3 then
    raise exception 'a report can have at most 3 screenshots'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger evidence_enforce_rules
  before insert on public.evidence
  for each row execute function public.evidence_enforce_rules();
