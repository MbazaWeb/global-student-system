-- Platform-admin direct institution creation.
--
-- Adds:
--   1. institution_code and region columns to public.institutions (nullable,
--      same CHECK constraints as institution_applications).
--   2. gss_admin_create_institution RPC — platform_admin only, creates a
--      verified institution directly (bypassing the application queue).
--      Writes an institution_review_audit row so the creation is audited.
--   3. Backfills institution_code/region from the application when
--      gss_review_institution approves (so the application-review path
--      also carries the new fields into the institutions row).
--
-- No changes to existing migrations. No new client write grants — all
-- writes go through the SECURITY DEFINER function.

-- 1. Add institution_code and region to institutions.
alter table public.institutions
  add column if not exists institution_code text
    check (institution_code is null or length(trim(institution_code)) between 1 and 50);

alter table public.institutions
  add column if not exists region text
    check (region is null or length(trim(region)) between 1 and 100);

-- 2. gss_admin_create_institution — direct creation by platform admin.
--    Creates the institution with verification_status='verified' so it is
--    immediately usable for enrollment. Writes an audit row in
--    institution_review_audit (decision='approved', note explains direct
--    creation). Returns the new institution id.
create or replace function public.gss_admin_create_institution(
  p_name text, p_country_code text, p_institution_code text, p_region text, p_note text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_name text;
  v_country text;
  v_code text;
  v_region text;
  v_note text;
  v_app_id uuid;
begin
  -- Auth + role check.
  if auth.uid() is null or not public.gss_has_role('platform_admin') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  -- Validate inputs (mirror the institution_applications CHECK constraints).
  v_name := trim(coalesce(p_name, ''));
  if length(v_name) not between 3 and 200 then
    raise exception 'Institution name must be 3-200 characters';
  end if;
  v_country := upper(trim(coalesce(p_country_code, '')));
  if v_country !~ '^[A-Z]{2}$' then
    raise exception 'Country code must be 2 uppercase letters';
  end if;
  v_code := trim(coalesce(p_institution_code, ''));
  if length(v_code) > 0 and length(v_code) not between 1 and 50 then
    raise exception 'Institution code must be 1-50 characters';
  end if;
  v_region := trim(coalesce(p_region, ''));
  if length(v_region) > 0 and length(v_region) not between 1 and 100 then
    raise exception 'Region must be 1-100 characters';
  end if;
  v_note := trim(coalesce(p_note, ''));
  if length(v_note) not between 10 and 2000 then
    raise exception 'A note of 10-2000 characters is required';
  end if;

  -- Create the institution as verified.
  insert into public.institutions(name, country_code, verification_status, institution_code, region)
  values (v_name, v_country, 'verified', nullif(v_code, ''), nullif(v_region, ''))
  returning id into v_id;

  -- Audit: create a synthetic application row so institution_review_audit
  -- has a stable FK target. This keeps the audit table's schema unchanged.
  insert into public.institution_applications(institution_name, country_code, contact_email, status, institution_code, region)
  values (v_name, v_country, 'platform-admin@gss.local', 'approved', nullif(v_code, ''), nullif(v_region, ''))
  returning id into v_app_id;

  insert into public.institution_review_audit(application_id, reviewer_id, decision, note)
  values (v_app_id, auth.uid(), 'approved', '[Direct creation] ' || v_note);

  return v_id;
end $$;
revoke all on function public.gss_admin_create_institution(text,text,text,text,text) from public, anon;
grant execute on function public.gss_admin_create_institution(text,text,text,text,text) to authenticated;

-- 3. Update gss_review_institution to carry institution_code/region from the
--    application into the institutions row on approval.
create or replace function public.gss_review_institution(
  p_application_id uuid, p_decision text, p_note text
) returns void language plpgsql security definer set search_path='' as $$
declare
  v_application public.institution_applications%rowtype;
begin
  if auth.uid() is null or not exists (
    select 1 from public.user_role_assignments r
    where r.user_id=auth.uid() and r.role='platform_admin'
  ) then raise exception 'Not authorized' using errcode='42501'; end if;
  if p_decision not in ('reviewing','approved','rejected')
    or length(trim(coalesce(p_note,''))) not between 10 and 2000
  then raise exception 'Invalid decision or review note'; end if;
  select * into v_application from public.institution_applications
  where id=p_application_id for update;
  if not found then raise exception 'Application not found'; end if;
  if v_application.status in ('approved','rejected') then
    raise exception 'Application already finalized'; end if;
  if p_decision='approved' and v_application.status<>'reviewing' then
    raise exception 'Move application to reviewing before approval'; end if;
  if p_decision='approved' then
    insert into public.institutions(name,country_code,verification_status,institution_code,region)
    values(v_application.institution_name,v_application.country_code,'verified',
           v_application.institution_code,v_application.region);
  end if;
  update public.institution_applications set status=p_decision where id=p_application_id;
  insert into public.institution_review_audit(application_id,reviewer_id,decision,note)
  values(p_application_id,auth.uid(),p_decision,trim(p_note));
end; $$;
revoke all on function public.gss_review_institution(uuid,text,text) from public,anon;
grant execute on function public.gss_review_institution(uuid,text,text) to authenticated;

-- 4. Update gss_admin_list_institutions to include institution_code and region.
--    Drop and recreate because the return type changes.
drop function if exists public.gss_admin_list_institutions(text, text);
create or replace function public.gss_admin_list_institutions(p_search text, p_status text)
returns table(id uuid, name text, country_code text, verification_status text, created_at timestamptz,
              institution_code text, region text)
language sql stable security definer set search_path = '' as $$
  select i.id, i.name, i.country_code, i.verification_status, i.created_at,
         i.institution_code, i.region
    from public.institutions i
   where public.gss_has_role('platform_admin')
     and (p_search is null or p_search = ''
          or i.name ilike '%' || p_search || '%'
          or i.country_code ilike '%' || p_search || '%'
          or coalesce(i.institution_code, '') ilike '%' || p_search || '%'
          or coalesce(i.region, '') ilike '%' || p_search || '%')
     and (p_status is null or p_status = '' or i.verification_status = p_status)
   order by i.created_at desc limit 500;
$$;
revoke all on function public.gss_admin_list_institutions(text,text) from public, anon;
grant execute on function public.gss_admin_list_institutions(text,text) to authenticated;
