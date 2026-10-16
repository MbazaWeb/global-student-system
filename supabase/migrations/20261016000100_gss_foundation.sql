-- GSS v0.1 foundation. No live banking tables or privileged client access.
create extension if not exists pgcrypto;
create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country_code text not null,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected','review_required')),
  created_at timestamptz not null default now()
);
create table if not exists public.student_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.student_enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  institution_id uuid not null references public.institutions(id),
  admission_number text not null,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected','review_required')),
  created_at timestamptz not null default now(),
  unique (institution_id, admission_number)
);
alter table public.institutions enable row level security;
alter table public.student_profiles enable row level security;
alter table public.student_enrollments enable row level security;
create policy "student reads own profile" on public.student_profiles for select to authenticated using ((select auth.uid()) = id);
create policy "student reads own enrollments" on public.student_enrollments for select to authenticated using ((select auth.uid()) = student_id);
-- No public writes. Onboarding and verification must use authorized server-side workflows.
