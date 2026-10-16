-- Institution-scoped review queue. No client-provided institution selector.
create or replace function public.gss_institution_verification_queue()
returns table(request_id uuid,student_name text,admission_number text,status text,created_at timestamptz,review_note text)
language plpgsql stable security definer set search_path='' as $$
declare v_institution uuid;
begin
 select institution_id into v_institution from public.user_role_assignments
 where user_id=auth.uid() and role='institution_admin';
 if v_institution is null then raise exception 'Institution admin required'; end if;
 return query select q.id,p.display_name,e.admission_number,q.status,q.created_at,q.review_note
 from public.enrollment_verification_requests q
 join public.student_enrollments e on e.id=q.enrollment_id
 join public.student_profiles p on p.id=q.student_id
 where q.institution_id=v_institution and e.institution_id=v_institution
 order by q.created_at desc limit 200;
end; $$;
revoke all on function public.gss_institution_verification_queue() from public,anon;
grant execute on function public.gss_institution_verification_queue() to authenticated;
