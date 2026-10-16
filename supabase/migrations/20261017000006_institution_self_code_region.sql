-- Update gss_institution_self to return institution_code and region.
--
-- The function's return type changes (two new columns), so it must be
-- dropped and recreated. This is additive — the caller's institution_id
-- is still derived from user_role_assignments, so the access control is
-- unchanged. No new grants; existing grants are re-issued.
drop function if exists public.gss_institution_self();

create or replace function public.gss_institution_self()
returns table(id uuid, name text, country_code text, verification_status text,
              created_at timestamptz, institution_code text, region text)
language sql stable security definer set search_path = '' as $$
  select i.id, i.name, i.country_code, i.verification_status, i.created_at,
         i.institution_code, i.region
    from public.institutions i
   where i.id = (
     select r.institution_id from public.user_role_assignments r
      where r.user_id = (select auth.uid()) and r.role = 'institution_admin' limit 1)
   limit 1;
$$;
revoke all on function public.gss_institution_self() from public, anon;
grant execute on function public.gss_institution_self() to authenticated;
