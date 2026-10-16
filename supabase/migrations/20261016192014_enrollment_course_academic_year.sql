alter table public.student_enrollments
  add column course_name text check (course_name is null or length(trim(course_name)) between 2 and 200),
  add column academic_year text check (academic_year is null or academic_year ~ '^20[0-9]{2}/20[0-9]{2}$');

-- Reuse the existing enrollment checks; these fields remain self-reported until institution review.
create or replace function public.gss_submit_enrollment_details(
 p_institution_id uuid, p_admission_number text, p_course_name text, p_academic_year text
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_course text:=trim(coalesce(p_course_name,'')); v_year text:=trim(coalesce(p_academic_year,''));
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if length(v_course) not between 2 and 200 then raise exception 'Enter a valid course name'; end if;
 if v_year !~ '^20[0-9]{2}/20[0-9]{2}$' then raise exception 'Use academic year format YYYY/YYYY'; end if;
 if split_part(v_year,'/',2)::int != split_part(v_year,'/',1)::int+1 then raise exception 'Academic year must contain consecutive years'; end if;
 v_id:=public.gss_submit_enrollment(p_institution_id,p_admission_number);
 update public.student_enrollments set course_name=v_course, academic_year=v_year
 where id=v_id and student_id=auth.uid();
 return v_id;
end; $$;
revoke all on function public.gss_submit_enrollment_details(uuid,text,text,text) from public,anon;
grant execute on function public.gss_submit_enrollment_details(uuid,text,text,text) to authenticated;
