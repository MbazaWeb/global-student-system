-- Institution-scoped directory; do not grant broad profile or global-ID reads.
create or replace function public.gss_institution_student_directory()
returns table(enrollment_id uuid,student_name text,global_student_id text,admission_number text,verification_status text,submitted_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
declare v_institution uuid;
begin
 select r.institution_id into v_institution from public.user_role_assignments r
 where r.user_id=auth.uid() and r.role='institution_admin';
 if v_institution is null then raise exception 'Institution admin required' using errcode='42501'; end if;
 return query select e.id,p.display_name,g.global_student_id,e.admission_number,e.verification_status,e.created_at
 from public.student_enrollments e
 join public.student_profiles p on p.id=e.student_id
 left join public.student_global_ids g on g.student_id=e.student_id
 where e.institution_id=v_institution
 order by e.created_at desc limit 500;
end; $$;
revoke all on function public.gss_institution_student_directory() from public,anon;
grant execute on function public.gss_institution_student_directory() to authenticated;
-- Read-only listing. Do not expose student phone/email to institution admins by default.
