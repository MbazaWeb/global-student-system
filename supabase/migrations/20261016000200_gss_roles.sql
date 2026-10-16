create table if not exists public.user_role_assignments (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check (role in ('student','institution_admin','institution_staff','bank_admin','bank_officer','platform_admin')),
 institution_id uuid references public.institutions(id),
 created_at timestamptz not null default now(),
 constraint valid_scope check ((role in ('institution_admin','institution_staff') and institution_id is not null) or (role not in ('institution_admin','institution_staff') and institution_id is null))
);
create unique index if not exists unique_role_scope on public.user_role_assignments (user_id,role,coalesce(institution_id,'00000000-0000-0000-0000-000000000000'::uuid));
alter table public.user_role_assignments enable row level security;
revoke all on public.user_role_assignments from anon,authenticated;
grant select on public.user_role_assignments to authenticated;
create policy "read own roles" on public.user_role_assignments for select to authenticated using ((select auth.uid())=user_id);
-- No insert/update/delete policies for clients. Provision roles only through trusted backend.
