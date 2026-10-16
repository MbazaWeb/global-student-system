-- Safe student-initiated enrollment request; no client direct writes to enrollment.
create policy "public list verified institutions" on public.institutions
for select to anon,authenticated using (verification_status='verified');
grant select(id,name,country_code,verification_status) on public.institutions to anon,authenticated;

create or replace function public.gss_submit_enrollment(
 p_institution_id uuid,p_admission_number text
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_admission text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from public.student_profiles p where p.id=auth.uid()) then
  raise exception 'Student profile required'; end if;
 if not exists(select 1 from public.user_role_assignments r where r.user_id=auth.uid() and r.role='student') then
  raise exception 'Student role required'; end if;
 if not exists(select 1 from public.institutions i where i.id=p_institution_id and i.verification_status='verified') then
  raise exception 'Institution is not approved'; end if;
 v_admission:=upper(trim(coalesce(p_admission_number,'')));
 if length(v_admission) not between 3 and 60 then raise exception 'Invalid admission number'; end if;
 insert into public.student_enrollments(student_id,institution_id,admission_number)
 values(auth.uid(),p_institution_id,v_admission) returning id into v_id;
 insert into public.enrollment_verification_requests(enrollment_id,student_id,institution_id)
 values(v_id,auth.uid(),p_institution_id);
 return v_id;
end; $$;
revoke all on function public.gss_submit_enrollment(uuid,text) from public,anon;
grant execute on function public.gss_submit_enrollment(uuid,text) to authenticated;
-- Institution admin reads only their institution enrollments.
create policy "institution admin reads institution enrollments"
 on public.student_enrollments for select to authenticated
 using(public.gss_is_institution_admin(institution_id));
grant select on public.student_enrollments to authenticated;
-- Enrollment status changes only through the authorized verification RPC.
