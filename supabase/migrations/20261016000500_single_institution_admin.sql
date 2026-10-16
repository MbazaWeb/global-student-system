-- GSS: exactly one active institution admin per institution.
-- A pending institution may have zero until its first admin is provisioned.
-- Remove legacy institution_staff assignments; this platform uses institution_admin only.
delete from public.user_role_assignments where role='institution_staff';
alter table public.user_role_assignments drop constraint if exists valid_scope;
alter table public.user_role_assignments add constraint valid_scope
 check ((role='institution_admin' and institution_id is not null)
 or (role<>'institution_admin' and institution_id is null));
alter table public.user_role_assignments drop constraint if exists user_role_assignments_role_check;
alter table public.user_role_assignments add constraint user_role_assignments_role_check
 check (role in ('student','institution_admin','bank_admin','bank_officer','platform_admin'));
create unique index if not exists gss_one_institution_admin
 on public.user_role_assignments(institution_id)
 where role='institution_admin';
-- An institution admin may not also be the admin of another institution.
create unique index if not exists gss_one_admin_institution_per_user
 on public.user_role_assignments(user_id) where role='institution_admin';

create or replace function public.gss_is_institution_admin(p_institution_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.user_role_assignments r
 where r.user_id=(select auth.uid()) and r.role='institution_admin'
 and r.institution_id=p_institution_id);
$$;
revoke all on function public.gss_is_institution_admin(uuid) from public,anon;
grant execute on function public.gss_is_institution_admin(uuid) to authenticated;

-- Verification requests must be initiated by the enrolled student and resolved by the
-- sole admin of the relevant institution. No admission number is automatically verified.
create table if not exists public.enrollment_verification_requests (
 id uuid primary key default gen_random_uuid(),
 enrollment_id uuid not null references public.student_enrollments(id) on delete cascade,
 student_id uuid not null references public.student_profiles(id) on delete cascade,
 institution_id uuid not null references public.institutions(id),
 status text not null default 'pending' check(status in ('pending','verified','rejected')),
 review_note text,
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 created_at timestamptz not null default now(),
 unique(enrollment_id)
);
alter table public.enrollment_verification_requests enable row level security;
revoke all on public.enrollment_verification_requests from anon,authenticated;
grant select on public.enrollment_verification_requests to authenticated;
create policy "student reads own verification requests"
 on public.enrollment_verification_requests for select to authenticated
 using (student_id=(select auth.uid()));
create policy "institution admin reads own verification requests"
 on public.enrollment_verification_requests for select to authenticated
 using (public.gss_is_institution_admin(institution_id));

create or replace function public.gss_request_enrollment_verification(p_enrollment_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_enrollment public.student_enrollments%rowtype; v_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into v_enrollment from public.student_enrollments
 where id=p_enrollment_id and student_id=auth.uid();
 if not found then raise exception 'Enrollment not found'; end if;
 insert into public.enrollment_verification_requests(enrollment_id,student_id,institution_id)
 values(v_enrollment.id,v_enrollment.student_id,v_enrollment.institution_id)
 on conflict(enrollment_id) do update set enrollment_id=excluded.enrollment_id
 returning id into v_id;
 return v_id;
end; $$;
revoke all on function public.gss_request_enrollment_verification(uuid) from public,anon;
grant execute on function public.gss_request_enrollment_verification(uuid) to authenticated;

create or replace function public.gss_decide_enrollment_verification(
 p_request_id uuid,p_decision text,p_note text
) returns void language plpgsql security definer set search_path='' as $$
declare v_request public.enrollment_verification_requests%rowtype;
begin
 if p_decision not in ('verified','rejected') or
 length(trim(coalesce(p_note,''))) not between 10 and 2000 then
 raise exception 'Decision and review note are required'; end if;
 select * into v_request from public.enrollment_verification_requests
 where id=p_request_id for update;
 if not found then raise exception 'Request not found'; end if;
 if not public.gss_is_institution_admin(v_request.institution_id) then
 raise exception 'Not authorized' using errcode='42501'; end if;
 if v_request.status<>'pending' then raise exception 'Request already resolved'; end if;
 update public.enrollment_verification_requests
 set status=p_decision,review_note=trim(p_note),reviewed_by=auth.uid(),reviewed_at=now()
 where id=p_request_id;
 update public.student_enrollments set verification_status=p_decision
 where id=v_request.enrollment_id and institution_id=v_request.institution_id
 and student_id=v_request.student_id;
end; $$;
revoke all on function public.gss_decide_enrollment_verification(uuid,text,text) from public,anon;
grant execute on function public.gss_decide_enrollment_verification(uuid,text,text) to authenticated;
-- Provision institution_admin through a trusted admin backend only.
