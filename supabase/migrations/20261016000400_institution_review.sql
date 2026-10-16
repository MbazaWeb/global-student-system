-- Institution application review. Only platform admins can read or decide.
create policy "platform admins read institution applications"
on public.institution_applications for select to authenticated
using (exists (
 select 1 from public.user_role_assignments r
 where r.user_id=(select auth.uid()) and r.role='platform_admin'
));
create table if not exists public.institution_review_audit (
 id uuid primary key default gen_random_uuid(),
 application_id uuid not null references public.institution_applications(id),
 reviewer_id uuid not null references auth.users(id),
 decision text not null check(decision in ('reviewing','approved','rejected')),
 note text not null check(length(trim(note)) between 10 and 2000),
 created_at timestamptz not null default now()
);
alter table public.institution_review_audit enable row level security;
revoke all on public.institution_review_audit from anon,authenticated;
grant select on public.institution_review_audit to authenticated;
create policy "platform admins read review audit"
on public.institution_review_audit for select to authenticated
using (exists (select 1 from public.user_role_assignments r
 where r.user_id=(select auth.uid()) and r.role='platform_admin'));
create or replace function public.gss_review_institution(
 p_application_id uuid, p_decision text, p_note text
) returns void language plpgsql security definer set search_path='' as $$
declare v_application public.institution_applications%rowtype;
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
  insert into public.institutions(name,country_code,verification_status)
  values(v_application.institution_name,v_application.country_code,'verified');
 end if;
 update public.institution_applications set status=p_decision where id=p_application_id;
 insert into public.institution_review_audit(application_id,reviewer_id,decision,note)
 values(p_application_id,auth.uid(),p_decision,trim(p_note));
end; $$;
revoke all on function public.gss_review_institution(uuid,text,text) from public,anon;
grant execute on function public.gss_review_institution(uuid,text,text) to authenticated;
-- Approval confirms an administrator's external checks; no staff access is issued automatically.
