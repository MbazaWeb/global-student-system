-- Add institution_code and region to institution_applications.
--
-- Both columns are optional (nullable) so the existing insert policy
-- (status='pending') and CHECK constraints continue to work without
-- changes. The onboarding form collects them; the admin approvals page
-- displays them. They are not used by gss_review_institution.
--
-- institution_code: a short code the institution uses to identify itself
--   (e.g. a ministry-issued code). 1-50 chars, trimmed. Optional because
--   not every institution has one at application time.
-- region: a sub-national region/state/province name. 1-100 chars, trimmed.
--   Optional for the same reason.

alter table public.institution_applications
  add column if not exists institution_code text
    check (institution_code is null or length(trim(institution_code)) between 1 and 50);

alter table public.institution_applications
  add column if not exists region text
    check (region is null or length(trim(region)) between 1 and 100);

-- Allow clients to insert the new columns (the existing grant covers the
-- table; no change needed). The existing RLS insert policy
-- "submit institution application" checks status='pending' and does not
-- restrict columns, so the new columns are insertable by anon/authenticated.
