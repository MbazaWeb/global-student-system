-- Institution self-registration with password + profile editing while pending.
--
-- Changes the onboarding flow so that an institution can create an account
-- with a password at application time. The institution is created with
-- verification_status='pending' immediately. The institution admin can log
-- in and update their profile while waiting for approval. Students cannot
-- see the institution until a platform admin approves it (existing RLS
-- already filters by verification_status='verified').
--
-- Flow:
--   1. Institution fills the onboarding form with name, country, code,
--      region, email and password.
--   2. Client calls supabase.auth.signUp with institution metadata in
--      raw_user_meta_data.
--   3. This trigger fires on auth.users insert, creates:
--      a. An institution row (verification_status='pending').
--      b. An institution_applications row (status='pending', linked to
--         the institution and auth user).
--      c. An institution_admin role assignment for the new user.
--   4. The user can now log in (after email confirmation if enabled) and
--      update their profile via gss_institution_update_profile.
--   5. A platform admin reviews the application and approves it.
--      gss_review_institution now updates the existing institution's
--      status to 'verified' instead of creating a new one.
--   6. Students can now see and enroll at the institution.

-- 1. Add institution_id and auth_user_id to institution_applications.
alter table public.institution_applications
  add column if not exists institution_id uuid references public.institutions(id) on delete set null;
alter table public.institution_applications
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

-- 2. Add updated_at to institutions.
alter table public.institutions
  add column if not exists updated_at timestamptz not null default now();

-- 3. Trigger function: create institution + application + role on signup.
create or replace function public.gss_institution_on_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_is_institution text;
  v_name text;
  v_country text;
  v_code text;
  v_region text;
  v_email text;
  v_inst_id uuid;
  v_app_id uuid;
begin
  v_is_institution := new.raw_user_meta_data->>'is_institution';
  if coalesce(v_is_institution, 'false') <> 'true' then
    return new;
  end if;

  -- Prevent double registration (user already has institution_admin role).
  if exists (select 1 from public.user_role_assignments
             where user_id = new.id and role = 'institution_admin') then
    raise exception 'This account already administers an institution';
  end if;

  -- Read and validate institution details from metadata.
  v_name := left(trim(coalesce(new.raw_user_meta_data->>'institution_name', '')), 200);
  if length(v_name) < 3 then
    raise exception 'Institution name must be 3-200 characters';
  end if;

  v_country := upper(trim(coalesce(new.raw_user_meta_data->>'institution_country', '')));
  if v_country !~ '^[A-Z]{2}$' then
    raise exception 'Country code must be 2 uppercase letters';
  end if;

  v_code := left(trim(coalesce(new.raw_user_meta_data->>'institution_code', '')), 50);
  if length(v_code) < 1 then
    raise exception 'Institution code is required';
  end if;

  v_region := left(trim(coalesce(new.raw_user_meta_data->>'institution_region', '')), 100);
  if length(v_region) < 1 then
    raise exception 'Region is required';
  end if;

  v_email := lower(trim(coalesce(new.raw_user_meta_data->>'contact_email', new.email)));

  -- Create the institution as pending.
  insert into public.institutions(name, country_code, verification_status, institution_code, region)
  values (v_name, v_country, 'pending', v_code, v_region)
  returning id into v_inst_id;

  -- Create the application row linked to the institution and auth user.
  insert into public.institution_applications(
    institution_name, country_code, contact_email, status,
    institution_code, region, institution_id, auth_user_id
  )
  values (v_name, v_country, v_email, 'pending', v_code, v_region, v_inst_id, new.id)
  returning id into v_app_id;

  -- Assign institution_admin role to the new user for the new institution.
  insert into public.user_role_assignments(user_id, role, institution_id)
  values (new.id, 'institution_admin', v_inst_id);

  return new;
end $$;
revoke all on function public.gss_institution_on_signup() from public, anon, authenticated;

-- 4. Trigger on auth.users AFTER INSERT (runs after gss_student_signup).
drop trigger if exists gss_institution_signup on auth.users;
create trigger gss_institution_signup
  after insert on auth.users
  for each row execute function public.gss_institution_on_signup();

-- 5. gss_institution_update_profile — lets institution_admin update name,
--    code and region while waiting for approval (or after).
create or replace function public.gss_institution_update_profile(
  p_name text, p_institution_code text, p_region text
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_inst uuid;
  v_name text;
  v_code text;
  v_region text;
begin
  select r.institution_id into v_inst from public.user_role_assignments r
   where r.user_id = auth.uid() and r.role = 'institution_admin';
  if v_inst is null then
    raise exception 'Institution admin required' using errcode = '42501';
  end if;

  v_name := trim(coalesce(p_name, ''));
  if length(v_name) not between 3 and 200 then
    raise exception 'Institution name must be 3-200 characters';
  end if;

  v_code := trim(coalesce(p_institution_code, ''));
  if length(v_code) not between 1 and 50 then
    raise exception 'Institution code must be 1-50 characters';
  end if;

  v_region := trim(coalesce(p_region, ''));
  if length(v_region) not between 1 and 100 then
    raise exception 'Region must be 1-100 characters';
  end if;

  update public.institutions
     set name = v_name,
         institution_code = v_code,
         region = v_region,
         updated_at = now()
   where id = v_inst;
end $$;
revoke all on function public.gss_institution_update_profile(text,text,text) from public, anon;
grant execute on function public.gss_institution_update_profile(text,text,text) to authenticated;

-- 6. Modify gss_review_institution: when approving, if the application has
--    an institution_id, update that institution's status to 'verified'
--    instead of creating a new one. Backward compat: if no institution_id,
--    create a new institution (old behavior).
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
    if v_application.institution_id is not null then
      -- New flow: institution already exists (self-registered). Update its status.
      update public.institutions
         set verification_status = 'verified',
             updated_at = now()
       where id = v_application.institution_id;
    else
      -- Old flow: create a new institution from the application.
      insert into public.institutions(name,country_code,verification_status,institution_code,region)
      values(v_application.institution_name,v_application.country_code,'verified',
             v_application.institution_code,v_application.region);
    end if;
  end if;

  update public.institution_applications set status=p_decision where id=p_application_id;
  insert into public.institution_review_audit(application_id,reviewer_id,decision,note)
  values(p_application_id,auth.uid(),p_decision,trim(p_note));
end; $$;
revoke all on function public.gss_review_institution(uuid,text,text) from public,anon;
grant execute on function public.gss_review_institution(uuid,text,text) to authenticated;
