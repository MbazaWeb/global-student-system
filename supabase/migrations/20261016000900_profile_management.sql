-- Student-editable profile details, kept separate from verified admission records.
alter table public.student_profiles
 add column if not exists phone text,
 add column if not exists country_code text,
 add column if not exists updated_at timestamptz not null default now();
alter table public.student_profiles
 add constraint gss_student_phone_format check(phone is null or phone ~ '^\\+[1-9][0-9]{6,14}$');
alter table public.student_profiles
 add constraint gss_student_country_format check(country_code is null or country_code ~ '^[A-Z]{2}$');
grant update(display_name,phone,country_code) on public.student_profiles to authenticated;
grant select on public.student_profiles to authenticated;
create policy "student updates own profile" on public.student_profiles
 for update to authenticated using(id=(select auth.uid()))
 with check(id=(select auth.uid()) and length(trim(display_name)) between 2 and 100);
-- Do not treat student-editable details as verified identity information.
