-- Guardian portal, institution finance reporting and platform admin dashboard.
-- Clients never get direct write access. Reads go through security-definer functions that
-- check identity and, for guardians, an active link approved by the student.

-- 1. Add the parent_guardian role (no institution scope, like student and platform roles).
do $$
declare c record;
begin
  for c in
    -- Match constraints on the role column alone (valid_scope also references institution_id, so it is kept).
    select con.conname from pg_constraint con
    where con.conrelid = 'public.user_role_assignments'::regclass
      and con.contype = 'c'
      and con.conkey = array[(select a.attnum from pg_attribute a
                               where a.attrelid = con.conrelid and a.attname = 'role')]::int2[]
  loop
    execute format('alter table public.user_role_assignments drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.user_role_assignments
  add constraint user_role_assignments_role_check
  check (role in ('student','parent_guardian','institution_admin','institution_staff','bank_admin','bank_officer','platform_admin'));

-- 2. Role helper used by all new functions.
create or replace function public.gss_has_role(p_role text)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.user_role_assignments r
    where r.user_id = (select auth.uid()) and r.role = p_role
  );
$$;
revoke all on function public.gss_has_role(text) from public, anon;
grant execute on function public.gss_has_role(text) to authenticated;

-- 3. Guardian links. A link is active only after the student approves it.
create table if not exists public.guardian_links (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  relationship text not null check (relationship in ('parent','legal_guardian','sponsor','other')),
  status text not null default 'pending' check (status in ('pending','active','declined','revoked')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (guardian_id, student_id)
);
create index if not exists guardian_links_student_status on public.guardian_links(student_id, status);
alter table public.guardian_links enable row level security;
revoke all on public.guardian_links from public, anon, authenticated;
grant select on public.guardian_links to authenticated;
create policy "guardians read own links" on public.guardian_links
  for select to authenticated using (guardian_id = (select auth.uid()));
create policy "students read links to them" on public.guardian_links
  for select to authenticated using (student_id = (select auth.uid()));
-- No client insert/update/delete. Use the functions below.

-- 4. Guardian requests a link using the student's Global Student ID.
-- Responds identically for unknown IDs so the function cannot be used to enumerate students.
create or replace function public.gss_request_guardian_link(p_global_student_id text, p_relationship text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_student uuid; v_id uuid;
begin
  if auth.uid() is null or not public.gss_has_role('parent_guardian') then
    raise exception 'Not authorized' using errcode='42501';
  end if;
  if p_relationship not in ('parent','legal_guardian','sponsor','other') then
    raise exception 'Invalid relationship';
  end if;
  select g.student_id into v_student
  from public.student_global_ids g
  where g.global_student_id = upper(trim(coalesce(p_global_student_id,'')));
  if v_student is null then
    return null;
  end if;
  insert into public.guardian_links(guardian_id, student_id, relationship)
  values (auth.uid(), v_student, p_relationship)
  on conflict (guardian_id, student_id) do nothing
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.gss_request_guardian_link(text,text) from public, anon;
grant execute on function public.gss_request_guardian_link(text,text) to authenticated;

-- 5. Student accepts or declines a pending request.
create or replace function public.gss_student_decide_guardian_link(p_link_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Not authorized' using errcode='42501'; end if;
  update public.guardian_links
     set status = case when p_accept then 'active' else 'declined' end,
         decided_at = now()
   where id = p_link_id and student_id = auth.uid() and status = 'pending';
  if not found then raise exception 'Request not found or already decided'; end if;
end $$;
revoke all on function public.gss_student_decide_guardian_link(uuid,boolean) from public, anon;
grant execute on function public.gss_student_decide_guardian_link(uuid,boolean) to authenticated;

-- 6. Student revokes an active guardian link at any time.
create or replace function public.gss_student_revoke_guardian_link(p_link_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Not authorized' using errcode='42501'; end if;
  update public.guardian_links set status='revoked', decided_at=now()
   where id = p_link_id and student_id = auth.uid() and status = 'active';
  if not found then raise exception 'Link not found or not active'; end if;
end $$;
revoke all on function public.gss_student_revoke_guardian_link(uuid) from public, anon;
grant execute on function public.gss_student_revoke_guardian_link(uuid) to authenticated;

-- 7. Guardian's active children with enrollment summaries.
create or replace function public.gss_guardian_children()
returns table(link_id uuid, student_id uuid, student_name text, global_student_id text, relationship text, enrollments jsonb)
language sql stable security definer set search_path='' as $$
  select l.id, l.student_id, p.display_name, g.global_student_id, l.relationship,
    coalesce((
      select jsonb_agg(jsonb_build_object('institution', i.name, 'status', e.verification_status)
                       order by e.created_at)
      from public.student_enrollments e
      join public.institutions i on i.id = e.institution_id
      where e.student_id = l.student_id
    ), '[]'::jsonb)
  from public.guardian_links l
  join public.student_profiles p on p.id = l.student_id
  join public.student_global_ids g on g.student_id = l.student_id
  where l.guardian_id = (select auth.uid())
    and l.status = 'active'
    and public.gss_has_role('parent_guardian')
  order by p.display_name;
$$;
revoke all on function public.gss_guardian_children() from public, anon;
grant execute on function public.gss_guardian_children() to authenticated;

-- 8. Payment history for one linked child.
create or replace function public.gss_guardian_child_payments(p_student_id uuid)
returns table(reference text, amount_minor bigint, currency_code text, transaction_type text,
              status text, description text, occurred_at timestamptz)
language sql stable security definer set search_path='' as $$
  select t.reference, t.amount_minor, t.currency_code, t.transaction_type,
         t.status, t.description, t.occurred_at
  from public.gss_transactions t
  where t.student_id = p_student_id
    and exists (
      select 1 from public.guardian_links l
      where l.guardian_id = (select auth.uid())
        and l.student_id = p_student_id
        and l.status = 'active'
    )
    and public.gss_has_role('parent_guardian')
  order by t.occurred_at desc
  limit 100;
$$;
revoke all on function public.gss_guardian_child_payments(uuid) from public, anon;
grant execute on function public.gss_guardian_child_payments(uuid) to authenticated;

-- 9. Institution finance summary, scoped to the caller's single institution.
create or replace function public.gss_institution_finance_summary()
returns table(transaction_type text, status text, currency_code text, transaction_count bigint, total_minor bigint)
language sql stable security definer set search_path='' as $$
  select t.transaction_type, t.status, t.currency_code,
         count(*)::bigint, coalesce(sum(t.amount_minor),0)::bigint
  from public.gss_transactions t
  where t.institution_id = (
      select r.institution_id from public.user_role_assignments r
      where r.user_id = (select auth.uid()) and r.role = 'institution_admin'
      limit 1)
    and public.gss_has_role('institution_admin')
  group by t.transaction_type, t.status, t.currency_code
  order by t.transaction_type, t.status;
$$;
revoke all on function public.gss_institution_finance_summary() from public, anon;
grant execute on function public.gss_institution_finance_summary() to authenticated;

-- 10. Platform dashboard counts (platform admins only; returns null for anyone else).
create or replace function public.gss_admin_dashboard_stats()
returns jsonb language sql stable security definer set search_path='' as $$
  select case when not public.gss_has_role('platform_admin') then null
  else jsonb_build_object(
    'institutions_verified', (select count(*) from public.institutions where verification_status='verified'),
    'applications_open', (select count(*) from public.institution_applications where status in ('pending','reviewing')),
    'verification_requests_pending', (select count(*) from public.enrollment_verification_requests where status='pending'),
    'students', (select count(*) from public.student_profiles),
    'guardian_links_active', (select count(*) from public.guardian_links where status='active'),
    'guardian_links_pending', (select count(*) from public.guardian_links where status='pending'),
    'transactions_completed', (select count(*) from public.gss_transactions where status='completed'),
    'transactions_pending', (select count(*) from public.gss_transactions where status='pending')
  ) end;
$$;
revoke all on function public.gss_admin_dashboard_stats() from public, anon;
grant execute on function public.gss_admin_dashboard_stats() to authenticated;

-- 11. Role assignment listing for platform admins (read-only; provisioning stays server-side).
create or replace function public.gss_admin_list_role_assignments()
returns table(user_id uuid, email text, role text, institution_id uuid, created_at timestamptz)
language sql stable security definer set search_path='' as $$
  select r.user_id, u.email::text, r.role, r.institution_id, r.created_at
  from public.user_role_assignments r
  join auth.users u on u.id = r.user_id
  where public.gss_has_role('platform_admin')
  order by r.created_at desc
  limit 500;
$$;
revoke all on function public.gss_admin_list_role_assignments() from public, anon;
grant execute on function public.gss_admin_list_role_assignments() to authenticated;

-- 12. Platform admins provision guardian access by account email. Self-service signup never grants it.
create or replace function public.gss_admin_grant_guardian_role(p_email text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid;
begin
  if not public.gss_has_role('platform_admin') then
    raise exception 'Not authorized' using errcode='42501';
  end if;
  select u.id into v_user from auth.users u where lower(u.email) = lower(trim(coalesce(p_email,'')));
  if v_user is null then raise exception 'No account with that email'; end if;
  insert into public.user_role_assignments(user_id, role)
  values (v_user, 'parent_guardian')
  on conflict do nothing;
  return v_user;
end $$;
revoke all on function public.gss_admin_grant_guardian_role(text) from public, anon;
grant execute on function public.gss_admin_grant_guardian_role(text) to authenticated;
