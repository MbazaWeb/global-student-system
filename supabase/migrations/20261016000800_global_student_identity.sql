-- A permanent platform identifier, distinct from admission numbers and Auth UUIDs.
-- Never use this ID alone as proof of enrollment or identity.
create sequence if not exists public.gss_student_number_seq start 100000;
revoke all on sequence public.gss_student_number_seq from public,anon,authenticated;
create table if not exists public.student_global_ids (
 student_id uuid primary key references public.student_profiles(id) on delete cascade,
 global_student_id text not null unique default ('GSS-' || lpad(nextval('public.gss_student_number_seq'::regclass)::text,10,'0')),
 issued_at timestamptz not null default now()
);
alter table public.student_global_ids enable row level security;
revoke all on public.student_global_ids from anon,authenticated;
grant select on public.student_global_ids to authenticated;
create policy "student reads own global id" on public.student_global_ids
 for select to authenticated using(student_id=(select auth.uid()));
-- Backfill existing profiles. Global ID is assigned once, independent of institution.
insert into public.student_global_ids(student_id)
select id from public.student_profiles on conflict(student_id) do nothing;
create or replace function public.gss_assign_global_id()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.student_global_ids(student_id) values(new.id)
 on conflict(student_id) do nothing;
 return new;
end; $$;
revoke all on function public.gss_assign_global_id() from public,anon,authenticated;
drop trigger if exists gss_global_id_on_profile on public.student_profiles;
create trigger gss_global_id_on_profile after insert on public.student_profiles
for each row execute function public.gss_assign_global_id();
-- Student profile display name is deliberately not editable via client until moderation rules exist.
