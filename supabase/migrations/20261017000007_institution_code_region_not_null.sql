-- Make institution_code and region mandatory (NOT NULL) on both
-- institution_applications and institutions.
--
-- Per the product decision: all fields on the onboarding form are now
-- mandatory, including institution code and region. This migration:
--   1. Backfills any existing NULL values with a placeholder so the
--      NOT NULL constraint can be added without failing.
--   2. Drops the old nullable CHECK constraints.
--   3. Sets the columns NOT NULL.
--   4. Adds CHECK constraints requiring non-empty trimmed values.
--
-- The RPCs (gss_admin_create_institution, gss_review_institution) already
-- validate non-empty values; this migration enforces the same at the DB
-- level so a direct insert (e.g. from a future admin tool) cannot bypass
-- the requirement.

-- 1. Backfill NULLs.
update public.institution_applications set institution_code = 'UNSPECIFIED' where institution_code is null;
update public.institution_applications set region = 'Unspecified' where region is null;
update public.institutions set institution_code = 'UNSPECIFIED' where institution_code is null;
update public.institutions set region = 'Unspecified' where region is null;

-- 2. Set NOT NULL.
alter table public.institution_applications alter column institution_code set not null;
alter table public.institution_applications alter column region set not null;
alter table public.institutions alter column institution_code set not null;
alter table public.institutions alter column region set not null;

-- 3. Replace the CHECK constraints to require non-empty trimmed values.
--    Drop the old (nullable-permitting) constraints first.
alter table public.institution_applications drop constraint if exists institution_applications_institution_code_check;
alter table public.institution_applications drop constraint if exists institution_applications_region_check;
alter table public.institution_applications
  add constraint institution_applications_institution_code_check
  check (length(trim(institution_code)) between 1 and 50);
alter table public.institution_applications
  add constraint institution_applications_region_check
  check (length(trim(region)) between 1 and 100);

alter table public.institutions drop constraint if exists institutions_institution_code_check;
alter table public.institutions drop constraint if exists institutions_region_check;
alter table public.institutions
  add constraint institutions_institution_code_check
  check (length(trim(institution_code)) between 1 and 50);
alter table public.institutions
  add constraint institutions_region_check
  check (length(trim(region)) between 1 and 100);
