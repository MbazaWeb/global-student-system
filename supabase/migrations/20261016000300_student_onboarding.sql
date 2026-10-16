-- Student self-registration: profile and student role are created from Auth signup.
-- Only metadata fields controlled by this trigger are copied; no user-supplied role is trusted.
create or replace function public.gss_create_student_on_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_name text;
begin
 v_name := left(trim(coalesce(new.raw_user_meta_data->>'display_name','')),100);
 if length(v_name)<2 then v_name := 'Student'; end if;
 insert into public.student_profiles(id,display_name) values(new.id,v_name)
 on conflict (id) do nothing;
 insert into public.user_role_assignments(user_id,role) values(new.id,'student')
 on conflict do nothing;
 return new;
end; $$;
revoke all on function public.gss_create_student_on_signup() from public,anon,authenticated;
drop trigger if exists gss_student_signup on auth.users;
create trigger gss_student_signup after insert on auth.users for each row execute function public.gss_create_student_on_signup();

create table if not exists public.institution_applications(
 id uuid primary key default gen_random_uuid(),
 institution_name text not null check(length(trim(institution_name)) between 3 and 200),
 country_code text not null check(country_code ~ '^[A-Z]{2}$'),
 contact_email text not null check(length(contact_email) between 5 and 254),
 status text not null default 'pending' check(status in ('pending','reviewing','approved','rejected')),
 created_at timestamptz not null default now()
);
alter table public.institution_applications enable row level security;
revoke all on public.institution_applications from anon,authenticated;
grant insert on public.institution_applications to anon,authenticated;
create policy "submit institution application" on public.institution_applications for insert to anon,authenticated with check (status='pending');
-- No applicant read/update policy: prevent leaking contact information.
-- Add abuse protection, email verification and trusted approval before production.
