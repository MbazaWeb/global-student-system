-- Audit fix D-6: migration 20261016200000 re-added 'institution_staff' to the
-- user_role_assignments_role_check constraint, undoing the policy from
-- migration 20261016000500 ("No institution_staff role is permitted").
-- This migration restores the intended role set: student, parent_guardian,
-- institution_admin, bank_admin, bank_officer, platform_admin.

-- 1. Remove any institution_staff rows that may have been inserted since
--    migration 20261016200000 (none expected in production, but be safe).
delete from public.user_role_assignments where role='institution_staff';

-- 2. Drop and re-add the role check constraint without institution_staff.
--    Drop by name (the constraint was created by migration 20261016200000
--    with the same name as the one it replaced).
alter table public.user_role_assignments drop constraint if exists user_role_assignments_role_check;
alter table public.user_role_assignments
  add constraint user_role_assignments_role_check
  check (role in ('student','parent_guardian','institution_admin','bank_admin','bank_officer','platform_admin'));
