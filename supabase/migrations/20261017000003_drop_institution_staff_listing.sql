-- Drop gss_institution_staff_listing — dead code.
--
-- The function was named "staff_listing" but queried for role='institution_admin'
-- (not 'institution_staff', which is forbidden by migration 20261017000001).
-- The name was misleading and the function is unnecessary: the institution
-- admin's own details are available via gss_institution_self() and the
-- authenticated user's email. StaffManagement now uses those instead.
--
-- This migration does NOT reintroduce institution_staff or change any role
-- policy. It only drops the function and revokes its grants.
revoke all on function public.gss_institution_staff_listing() from public, anon, authenticated;
drop function if exists public.gss_institution_staff_listing();
