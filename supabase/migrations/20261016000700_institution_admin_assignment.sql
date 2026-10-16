-- Platform-admin-controlled appointment and transfer of the sole institution administrator.
-- Target user must already exist in Auth and must not administer another institution.
create table if not exists public.institution_admin_audit (
 id uuid primary key default gen_random_uuid(),
 institution_id uuid not null references public.institutions(id),
 previous_admin uuid references auth.users(id),
 new_admin uuid not null references auth.users(id),
 changed_by uuid not null references auth.users(id),
 reason text not null check(length(trim(reason)) between 10 and 2000),
 changed_at timestamptz not null default now()
);
alter table public.institution_admin_audit enable row level security;
revoke all on public.institution_admin_audit from anon,authenticated;
grant select on public.institution_admin_audit to authenticated;
create policy "platform admins read admin transfer audit"
 on public.institution_admin_audit for select to authenticated
 using(exists(select 1 from public.user_role_assignments r where r.user_id=(select auth.uid()) and r.role='platform_admin'));

create or replace function public.gss_assign_institution_admin(
 p_institution_id uuid,p_new_admin uuid,p_reason text
) returns void language plpgsql security definer set search_path='' as $$
declare v_previous uuid;v_verified text;
begin
 if auth.uid() is null or not exists(
  select 1 from public.user_role_assignments r
  where r.user_id=auth.uid() and r.role='platform_admin'
 ) then raise exception 'Platform admin required' using errcode='42501'; end if;
 if length(trim(coalesce(p_reason,''))) not between 10 and 2000 then
  raise exception 'A reason of 10-2000 characters is required'; end if;
 -- Serialize appointments for the same institution to prevent racing transfers.
 select verification_status into v_verified from public.institutions
 where id=p_institution_id for update;
 if not found or v_verified<>'verified' then raise exception 'Approved institution required'; end if;
 if not exists(select 1 from auth.users where id=p_new_admin and email_confirmed_at is not null) then
  raise exception 'Target must be an existing email-confirmed user'; end if;
 if exists(select 1 from public.user_role_assignments where user_id=p_new_admin
  and role in ('platform_admin','bank_admin','bank_officer')) then
  raise exception 'Target has incompatible privileged role'; end if;
 if exists(select 1 from public.user_role_assignments where user_id=p_new_admin
  and role='institution_admin' and institution_id<>p_institution_id) then
  raise exception 'Target already administers another institution'; end if;
 select user_id into v_previous from public.user_role_assignments
 where institution_id=p_institution_id and role='institution_admin' for update;
 if v_previous=p_new_admin then raise exception 'Already assigned to this institution'; end if;
 delete from public.user_role_assignments
 where institution_id=p_institution_id and role='institution_admin';
 insert into public.user_role_assignments(user_id,role,institution_id)
 values(p_new_admin,'institution_admin',p_institution_id);
 insert into public.institution_admin_audit(institution_id,previous_admin,new_admin,changed_by,reason)
 values(p_institution_id,v_previous,p_new_admin,auth.uid(),trim(p_reason));
end; $$;
revoke all on function public.gss_assign_institution_admin(uuid,uuid,text) from public,anon;
grant execute on function public.gss_assign_institution_admin(uuid,uuid,text) to authenticated;
-- Appointment is atomic and audited; email delivery/invitations are not implemented.
