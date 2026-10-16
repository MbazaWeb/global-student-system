-- GSS support console, catalogues, audit and notification foundation.
-- Single migration per audit instructions. Timestamp 20261017000002 (after 20261017000001).
-- All tables: RLS enabled, no client insert/update/delete grants.
-- All SECURITY DEFINER functions: search_path = '', revoked from public+anon, granted to authenticated.
-- Every write function writes an audit row in the same transaction where the spec requires it.

-- ============================================================================
-- 1. Roles: add support_agent and support_lead to the role check constraint.
-- ============================================================================
alter table public.user_role_assignments drop constraint if exists user_role_assignments_role_check;
alter table public.user_role_assignments
  add constraint user_role_assignments_role_check
  check (role in ('student','parent_guardian','institution_admin','bank_admin','bank_officer','platform_admin','support_agent','support_lead'));

-- ============================================================================
-- 2. Notifications (in-app only; no email/SMS delivery wired).
-- ============================================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  body text not null default '',
  category text not null default 'general' check (category in ('general','payment','verification','support','system')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_created on public.notifications(user_id, created_at desc);
alter table public.notifications enable row level security;
revoke all on public.notifications from public, anon, authenticated;
grant select on public.notifications to authenticated;
create policy "user reads own notifications" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));

-- ============================================================================
-- 3. Support cases, notes, refund requests, refund audit.
-- ============================================================================
create table if not exists public.support_cases (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  transaction_id uuid references public.gss_transactions(id),
  subject text not null check (length(trim(subject)) between 3 and 200),
  description text not null check (length(trim(description)) between 10 and 4000),
  status text not null default 'open' check (status in ('open','in_progress','awaiting_student','resolved','closed','refunded')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  assigned_to uuid references auth.users(id),
  refund_request_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_cases_student on public.support_cases(student_id, created_at desc);
create index if not exists support_cases_status on public.support_cases(status, created_at desc);
alter table public.support_cases enable row level security;
revoke all on public.support_cases from public, anon, authenticated;
grant select on public.support_cases to authenticated;
create policy "student reads own cases" on public.support_cases
  for select to authenticated using (student_id = (select auth.uid()));
create policy "support staff and admins read all cases" on public.support_cases
  for select to authenticated
  using (public.gss_has_role('support_agent')
      or public.gss_has_role('support_lead')
      or public.gss_has_role('platform_admin'));

create table if not exists public.support_case_notes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.support_cases(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  body text not null check (length(trim(body)) between 1 and 4000),
  visibility text not null default 'internal' check (visibility in ('internal','student')),
  created_at timestamptz not null default now()
);
create index if not exists support_case_notes_case on public.support_case_notes(case_id, created_at);
alter table public.support_case_notes enable row level security;
revoke all on public.support_case_notes from public, anon, authenticated;
grant select on public.support_case_notes to authenticated;
create policy "student reads student-visible notes on own cases" on public.support_case_notes
  for select to authenticated
  using (
    visibility = 'student'
    and exists (select 1 from public.support_cases c
                where c.id = support_case_notes.case_id
                  and c.student_id = (select auth.uid()))
  );
create policy "support staff and admins read all notes" on public.support_case_notes
  for select to authenticated
  using (public.gss_has_role('support_agent')
      or public.gss_has_role('support_lead')
      or public.gss_has_role('platform_admin'));

create table if not exists public.support_refund_requests (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.support_cases(id) on delete cascade,
  transaction_id uuid not null references public.gss_transactions(id),
  student_id uuid not null references public.student_profiles(id),
  amount_minor bigint not null check (amount_minor > 0),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  reason text not null check (length(trim(reason)) between 10 and 2000),
  status text not null default 'pending' check (status in ('pending','approved','rejected','processed')),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  decision_note text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists refund_requests_status on public.support_refund_requests(status, created_at desc);
alter table public.support_refund_requests enable row level security;
revoke all on public.support_refund_requests from public, anon, authenticated;
grant select on public.support_refund_requests to authenticated;
create policy "student reads own refund requests" on public.support_refund_requests
  for select to authenticated using (student_id = (select auth.uid()));
create policy "support staff and admins read refund requests" on public.support_refund_requests
  for select to authenticated
  using (public.gss_has_role('support_agent')
      or public.gss_has_role('support_lead')
      or public.gss_has_role('platform_admin'));

-- Now that refund_requests exists, wire the FK from support_cases.
alter table public.support_cases
  drop constraint if exists support_cases_refund_request_id_fkey;
alter table public.support_cases
  add constraint support_cases_refund_request_id_fkey
  foreign key (refund_request_id) references public.support_refund_requests(id) on delete set null;

create table if not exists public.support_refund_audit (
  id uuid primary key default gen_random_uuid(),
  refund_request_id uuid not null references public.support_refund_requests(id) on delete cascade,
  previous_status text not null,
  new_status text not null,
  decided_by uuid not null references auth.users(id),
  note text,
  created_at timestamptz not null default now()
);
alter table public.support_refund_audit enable row level security;
revoke all on public.support_refund_audit from public, anon, authenticated;
grant select on public.support_refund_audit to authenticated;
create policy "platform admin reads refund audit" on public.support_refund_audit
  for select to authenticated using (public.gss_has_role('platform_admin'));

-- ============================================================================
-- 4. Institution catalogues (programmes, departments, academic years, tuition fees).
--    Institution admin can read own; writes go through functions that write audit rows.
-- ============================================================================
create table if not exists public.institution_programmes (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 200),
  code text check (code is null or length(trim(code)) between 1 and 50),
  created_at timestamptz not null default now(),
  unique (institution_id, name)
);
alter table public.institution_programmes enable row level security;
revoke all on public.institution_programmes from public, anon, authenticated;
grant select on public.institution_programmes to authenticated;
create policy "institution admin reads own programmes" on public.institution_programmes
  for select to authenticated using (public.gss_is_institution_admin(institution_id));
create policy "student reads programmes for own institutions" on public.institution_programmes
  for select to authenticated
  using (exists (select 1 from public.student_enrollments e
                 where e.student_id = (select auth.uid())
                   and e.institution_id = institution_programmes.institution_id));

create table if not exists public.institution_departments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 200),
  created_at timestamptz not null default now(),
  unique (institution_id, name)
);
alter table public.institution_departments enable row level security;
revoke all on public.institution_departments from public, anon, authenticated;
grant select on public.institution_departments to authenticated;
create policy "institution admin reads own departments" on public.institution_departments
  for select to authenticated using (public.gss_is_institution_admin(institution_id));
create policy "student reads departments for own institutions" on public.institution_departments
  for select to authenticated
  using (exists (select 1 from public.student_enrollments e
                 where e.student_id = (select auth.uid())
                   and e.institution_id = institution_departments.institution_id));

create table if not exists public.institution_academic_years (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  year text not null check (year ~ '^20[0-9]{2}/20[0-9]{2}$'),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (institution_id, year)
);
alter table public.institution_academic_years enable row level security;
revoke all on public.institution_academic_years from public, anon, authenticated;
grant select on public.institution_academic_years to authenticated;
create policy "institution admin reads own academic years" on public.institution_academic_years
  for select to authenticated using (public.gss_is_institution_admin(institution_id));
create policy "student reads academic years for own institutions" on public.institution_academic_years
  for select to authenticated
  using (exists (select 1 from public.student_enrollments e
                 where e.student_id = (select auth.uid())
                   and e.institution_id = institution_academic_years.institution_id));

create table if not exists public.institution_tuition_fees (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  programme_id uuid references public.institution_programmes(id) on delete set null,
  academic_year_id uuid references public.institution_academic_years(id) on delete set null,
  label text not null check (length(trim(label)) between 2 and 200),
  amount_minor bigint not null check (amount_minor >= 0),
  currency_code text not null default 'TZS' check (currency_code ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now()
);
create index if not exists tuition_fees_institution on public.institution_tuition_fees(institution_id);
alter table public.institution_tuition_fees enable row level security;
revoke all on public.institution_tuition_fees from public, anon, authenticated;
grant select on public.institution_tuition_fees to authenticated;
create policy "institution admin reads own tuition fees" on public.institution_tuition_fees
  for select to authenticated using (public.gss_is_institution_admin(institution_id));
create policy "student reads tuition for own institutions" on public.institution_tuition_fees
  for select to authenticated
  using (exists (select 1 from public.student_enrollments e
                 where e.student_id = (select auth.uid())
                   and e.institution_id = institution_tuition_fees.institution_id));

-- Unified audit for institution catalogue writes.
create table if not exists public.institution_catalogue_audit (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  table_name text not null check (table_name in ('institution_programmes','institution_departments','institution_academic_years','institution_tuition_fees')),
  row_id uuid not null,
  action text not null check (action in ('insert','update','delete')),
  before jsonb,
  after jsonb,
  changed_by uuid not null references auth.users(id),
  changed_at timestamptz not null default now()
);
create index if not exists catalogue_audit_institution on public.institution_catalogue_audit(institution_id, changed_at desc);
alter table public.institution_catalogue_audit enable row level security;
revoke all on public.institution_catalogue_audit from public, anon, authenticated;
grant select on public.institution_catalogue_audit to authenticated;
create policy "institution admin reads own catalogue audit" on public.institution_catalogue_audit
  for select to authenticated using (public.gss_is_institution_admin(institution_id));

-- ============================================================================
-- 5. Integration status (mock / proposed; read-only to authenticated).
-- ============================================================================
create table if not exists public.integration_status (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 2 and 100),
  kind text not null check (kind in ('mobile_money','bank','institution_registry','sms','email','other')),
  status text not null default 'proposed' check (status in ('proposed','sandbox','live','disabled')),
  description text not null default '',
  updated_at timestamptz not null default now()
);
insert into public.integration_status(name, kind, status, description) values
  ('M-Pesa', 'mobile_money', 'sandbox', 'Sandbox only. Operator API not connected.'),
  ('Airtel Money', 'mobile_money', 'sandbox', 'Sandbox only. Operator API not connected.'),
  ('Mixx by Yas', 'mobile_money', 'sandbox', 'Sandbox only. Operator API not connected.'),
  ('CRDB Bank', 'bank', 'proposed', 'Proposed partner. No API contract.'),
  ('NMB Bank', 'bank', 'proposed', 'Proposed partner. No API contract.'),
  ('NBC Bank', 'bank', 'proposed', 'Proposed partner. No API contract.'),
  ('Stanbic Bank', 'bank', 'proposed', 'Proposed partner. No API contract.'),
  ('Institution registry', 'institution_registry', 'proposed', 'No data-sharing agreement.'),
  ('Email notifications', 'email', 'proposed', 'SMTP not configured.'),
  ('SMS notifications', 'sms', 'proposed', 'No SMS gateway.')
on conflict (name) do nothing;
alter table public.integration_status enable row level security;
revoke all on public.integration_status from public, anon;
grant select on public.integration_status to authenticated;
create policy "any authenticated reads integration status" on public.integration_status
  for select to authenticated using (true);

-- ============================================================================
-- 6. Support functions — student side.
-- ============================================================================
create or replace function public.gss_student_open_support_case(
  p_subject text, p_description text, p_transaction_id uuid, p_priority text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_priority text := coalesce(p_priority, 'normal');
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.gss_has_role('student') then raise exception 'Not authorized' using errcode = '42501'; end if;
  if length(trim(coalesce(p_subject, ''))) not between 3 and 200 then
    raise exception 'Subject must be 3-200 characters'; end if;
  if length(trim(coalesce(p_description, ''))) not between 10 and 4000 then
    raise exception 'Description must be 10-4000 characters'; end if;
  if v_priority not in ('low','normal','high','urgent') then raise exception 'Invalid priority'; end if;
  if p_transaction_id is not null then
    if not exists (select 1 from public.gss_transactions t
                   where t.id = p_transaction_id and t.student_id = auth.uid()) then
      raise exception 'Transaction not found'; end if;
  end if;
  insert into public.support_cases(student_id, transaction_id, subject, description, priority, status)
  values (auth.uid(), p_transaction_id, trim(p_subject), trim(p_description), v_priority, 'open')
  returning id into v_id;
  insert into public.notifications(user_id, title, body, category)
  values (auth.uid(), 'Support case opened',
          'Your case "' || trim(p_subject) || '" was received. Reference ' || v_id::text,
          'support');
  return v_id;
end $$;
revoke all on function public.gss_student_open_support_case(text,text,uuid,text) from public, anon;
grant execute on function public.gss_student_open_support_case(text,text,uuid,text) to authenticated;

create or replace function public.gss_student_add_support_note(p_case_id uuid, p_body text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if length(trim(coalesce(p_body, ''))) not between 1 and 4000 then
    raise exception 'Note must be 1-4000 characters'; end if;
  update public.support_cases set updated_at = now()
   where id = p_case_id and student_id = auth.uid() and status not in ('closed','resolved');
  if not found then raise exception 'Case not found or closed'; end if;
  insert into public.support_case_notes(case_id, author_id, body, visibility)
  values (p_case_id, auth.uid(), trim(p_body), 'student');
end $$;
revoke all on function public.gss_student_add_support_note(uuid,text) from public, anon;
grant execute on function public.gss_student_add_support_note(uuid,text) to authenticated;

create or replace function public.gss_student_close_support_case(p_case_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.support_cases set status = 'closed', updated_at = now()
   where id = p_case_id and student_id = auth.uid() and status <> 'closed';
  if not found then raise exception 'Case not found or already closed'; end if;
end $$;
revoke all on function public.gss_student_close_support_case(uuid) from public, anon;
grant execute on function public.gss_student_close_support_case(uuid) to authenticated;

create or replace function public.gss_student_support_cases()
returns table(id uuid, subject text, status text, priority text, transaction_id uuid, created_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select id, subject, status, priority, transaction_id, created_at, updated_at
    from public.support_cases
   where student_id = (select auth.uid())
   order by created_at desc limit 200;
$$;
revoke all on function public.gss_student_support_cases() from public, anon;
grant execute on function public.gss_student_support_cases() to authenticated;

create or replace function public.gss_student_support_case_detail(p_case_id uuid)
returns table(
  id uuid, subject text, description text, status text, priority text,
  transaction_id uuid, refund_request_id uuid, created_at timestamptz, updated_at timestamptz,
  note_id uuid, note_body text, note_author uuid, note_created_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
declare v_owner uuid;
begin
  select student_id into v_owner from public.support_cases where id = p_case_id;
  if v_owner is null then raise exception 'Case not found'; end if;
  if v_owner <> auth.uid() then raise exception 'Not authorized' using errcode = '42501'; end if;
  return query
    select c.id, c.subject, c.description, c.status, c.priority, c.transaction_id,
           c.refund_request_id, c.created_at, c.updated_at,
           n.id, n.body, n.author_id, n.created_at
      from public.support_cases c
      left join public.support_case_notes n
        on n.case_id = c.id and n.visibility = 'student'
     where c.id = p_case_id
     order by n.created_at;
end $$;
revoke all on function public.gss_student_support_case_detail(uuid) from public, anon;
grant execute on function public.gss_student_support_case_detail(uuid) to authenticated;

create or replace function public.gss_student_refund_requests()
returns table(id uuid, case_id uuid, transaction_id uuid, amount_minor bigint, currency_code text,
              reason text, status text, decided_at timestamptz, decision_note text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.id, r.case_id, r.transaction_id, r.amount_minor, r.currency_code,
         r.reason, r.status, r.decided_at, r.decision_note, r.created_at
    from public.support_refund_requests r
   where r.student_id = (select auth.uid())
   order by r.created_at desc limit 100;
$$;
revoke all on function public.gss_student_refund_requests() from public, anon;
grant execute on function public.gss_student_refund_requests() to authenticated;

-- Student-readable tuition fees for institutions they're enrolled at.
create or replace function public.gss_student_tuition_fees()
returns table(institution_id uuid, institution_name text, label text, amount_minor bigint, currency_code text,
              programme_name text, academic_year text)
language sql stable security definer set search_path = '' as $$
  select f.institution_id, i.name, f.label, f.amount_minor, f.currency_code,
         p.name, ay.year
    from public.institution_tuition_fees f
    join public.institutions i on i.id = f.institution_id
    left join public.institution_programmes p on p.id = f.programme_id
    left join public.institution_academic_years ay on ay.id = f.academic_year_id
   where exists (select 1 from public.student_enrollments e
                  where e.student_id = (select auth.uid())
                    and e.institution_id = f.institution_id)
   order by i.name, f.label
   limit 200;
$$;
revoke all on function public.gss_student_tuition_fees() from public, anon;
grant execute on function public.gss_student_tuition_fees() to authenticated;

-- ============================================================================
-- 7. Support functions — internal console.
-- ============================================================================
create or replace function public.gss_support_list_cases(p_status text, p_search text)
returns table(id uuid, student_id uuid, subject text, status text, priority text,
              assigned_to uuid, created_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.id, c.student_id, c.subject, c.status, c.priority, c.assigned_to, c.created_at, c.updated_at
    from public.support_cases c
   where (public.gss_has_role('support_agent') or public.gss_has_role('support_lead') or public.gss_has_role('platform_admin'))
     and (p_status is null or p_status = '' or c.status = p_status)
     and (p_search is null or p_search = ''
          or c.subject ilike '%' || p_search || '%'
          or c.description ilike '%' || p_search || '%'
          or c.id::text = p_search)
   order by c.created_at desc limit 200;
$$;
revoke all on function public.gss_support_list_cases(text,text) from public, anon;
grant execute on function public.gss_support_list_cases(text,text) to authenticated;

create or replace function public.gss_support_case_detail(p_case_id uuid)
returns table(
  id uuid, student_id uuid, subject text, description text, status text, priority text,
  transaction_id uuid, refund_request_id uuid, assigned_to uuid, created_at timestamptz, updated_at timestamptz,
  note_id uuid, note_body text, note_author uuid, note_visibility text, note_created_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.gss_has_role('support_agent') or public.gss_has_role('support_lead') or public.gss_has_role('platform_admin')) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return query
    select c.id, c.student_id, c.subject, c.description, c.status, c.priority,
           c.transaction_id, c.refund_request_id, c.assigned_to, c.created_at, c.updated_at,
           n.id, n.body, n.author_id, n.visibility, n.created_at
      from public.support_cases c
      left join public.support_case_notes n on n.case_id = c.id
     where c.id = p_case_id
     order by n.created_at;
end $$;
revoke all on function public.gss_support_case_detail(uuid) from public, anon;
grant execute on function public.gss_support_case_detail(uuid) to authenticated;

create or replace function public.gss_support_add_note(p_case_id uuid, p_body text, p_visibility text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_vis text := coalesce(p_visibility, 'internal'); v_student uuid;
begin
  if not (public.gss_has_role('support_agent') or public.gss_has_role('support_lead') or public.gss_has_role('platform_admin')) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_body, ''))) not between 1 and 4000 then
    raise exception 'Note must be 1-4000 characters'; end if;
  if v_vis not in ('internal','student') then raise exception 'Invalid visibility'; end if;
  select student_id into v_student from public.support_cases where id = p_case_id;
  if v_student is null then raise exception 'Case not found'; end if;
  insert into public.support_case_notes(case_id, author_id, body, visibility)
  values (p_case_id, auth.uid(), trim(p_body), v_vis);
  update public.support_cases set updated_at = now() where id = p_case_id;
  if v_vis = 'student' then
    insert into public.notifications(user_id, title, body, category)
    values (v_student, 'Update on your support case',
            'A support agent added a message to your case.', 'support');
  end if;
end $$;
revoke all on function public.gss_support_add_note(uuid,text,text) from public, anon;
grant execute on function public.gss_support_add_note(uuid,text,text) to authenticated;

create or replace function public.gss_support_set_case_status(p_case_id uuid, p_status text, p_assign_to uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not (public.gss_has_role('support_agent') or public.gss_has_role('support_lead') or public.gss_has_role('platform_admin')) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_status not in ('open','in_progress','awaiting_student','resolved','closed') then
    raise exception 'Invalid status'; end if;
  update public.support_cases
     set status = p_status, assigned_to = coalesce(p_assign_to, assigned_to), updated_at = now()
   where id = p_case_id;
  if not found then raise exception 'Case not found'; end if;
end $$;
revoke all on function public.gss_support_set_case_status(uuid,text,uuid) from public, anon;
grant execute on function public.gss_support_set_case_status(uuid,text,uuid) to authenticated;

create or replace function public.gss_support_search_transactions(p_query text)
returns table(id uuid, reference text, student_id uuid, global_student_id text,
              amount_minor bigint, currency_code text, transaction_type text, status text,
              description text, occurred_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select t.id, t.reference, t.student_id, g.global_student_id,
         t.amount_minor, t.currency_code, t.transaction_type, t.status,
         t.description, t.occurred_at
    from public.gss_transactions t
    left join public.student_global_ids g on g.student_id = t.student_id
   where (public.gss_has_role('support_agent') or public.gss_has_role('support_lead') or public.gss_has_role('platform_admin'))
     and coalesce(p_query, '') <> ''
     and (t.reference ilike '%' || p_query || '%'
       or t.student_id::text = p_query
       or g.global_student_id ilike '%' || p_query || '%'
       or t.description ilike '%' || p_query || '%')
   order by t.occurred_at desc limit 50;
$$;
revoke all on function public.gss_support_search_transactions(text) from public, anon;
grant execute on function public.gss_support_search_transactions(text) to authenticated;

create or replace function public.gss_support_request_refund(
  p_case_id uuid, p_transaction_id uuid, p_amount_minor bigint, p_currency_code text, p_reason text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_case public.support_cases%rowtype; v_tx public.gss_transactions%rowtype;
begin
  if not (public.gss_has_role('support_lead') or public.gss_has_role('platform_admin')) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  select * into v_case from public.support_cases where id = p_case_id;
  if v_case.id is null then raise exception 'Case not found'; end if;
  select * into v_tx from public.gss_transactions where id = p_transaction_id;
  if v_tx.id is null then raise exception 'Transaction not found'; end if;
  if v_tx.student_id <> v_case.student_id then
    raise exception 'Transaction does not belong to case owner'; end if;
  if p_amount_minor <= 0 or p_amount_minor > v_tx.amount_minor then
    raise exception 'Invalid refund amount'; end if;
  if p_currency_code !~ '^[A-Z]{3}$' then raise exception 'Invalid currency'; end if;
  if length(trim(coalesce(p_reason, ''))) not between 10 and 2000 then
    raise exception 'Reason must be 10-2000 characters'; end if;
  insert into public.support_refund_requests(case_id, transaction_id, student_id, amount_minor,
                                              currency_code, reason, status, created_by)
  values (p_case_id, p_transaction_id, v_case.student_id, p_amount_minor,
          p_currency_code, trim(p_reason), 'pending', auth.uid())
  returning id into v_id;
  update public.support_cases set refund_request_id = v_id, updated_at = now() where id = p_case_id;
  return v_id;
end $$;
revoke all on function public.gss_support_request_refund(uuid,uuid,bigint,text,text) from public, anon;
grant execute on function public.gss_support_request_refund(uuid,uuid,bigint,text,text) to authenticated;

create or replace function public.gss_support_list_refund_requests(p_status text)
returns table(id uuid, case_id uuid, transaction_id uuid, student_id uuid, amount_minor bigint,
              currency_code text, reason text, status text, decided_by uuid, decided_at timestamptz,
              decision_note text, created_by uuid, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.id, r.case_id, r.transaction_id, r.student_id, r.amount_minor,
         r.currency_code, r.reason, r.status, r.decided_by, r.decided_at,
         r.decision_note, r.created_by, r.created_at
    from public.support_refund_requests r
   where (public.gss_has_role('support_agent') or public.gss_has_role('support_lead') or public.gss_has_role('platform_admin'))
     and (p_status is null or p_status = '' or r.status = p_status)
   order by r.created_at desc limit 200;
$$;
revoke all on function public.gss_support_list_refund_requests(text) from public, anon;
grant execute on function public.gss_support_list_refund_requests(text) to authenticated;

-- ============================================================================
-- 8. Refund decision — platform_admin only. Writes audit row in same transaction.
-- ============================================================================
create or replace function public.gss_admin_decide_refund(
  p_refund_id uuid, p_decision text, p_note text
) returns void language plpgsql security definer set search_path = '' as $$
declare v_req public.support_refund_requests%rowtype; v_prev text;
begin
  if not public.gss_has_role('platform_admin') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_decision not in ('approved','rejected','processed') then
    raise exception 'Invalid decision'; end if;
  if length(trim(coalesce(p_note, ''))) not between 10 and 2000 then
    raise exception 'Note must be 10-2000 characters'; end if;
  select * into v_req from public.support_refund_requests where id = p_refund_id for update;
  if v_req.id is null then raise exception 'Refund request not found'; end if;
  if v_req.status = 'processed' then raise exception 'Refund already processed'; end if;
  if p_decision = 'approved'  and v_req.status <> 'pending' then raise exception 'Refund already decided'; end if;
  if p_decision = 'rejected'  and v_req.status <> 'pending' then raise exception 'Refund already decided'; end if;
  if p_decision = 'processed' and v_req.status <> 'approved' then raise exception 'Refund must be approved before processing'; end if;
  v_prev := v_req.status;
  update public.support_refund_requests
     set status = p_decision, decided_by = auth.uid(), decided_at = now(), decision_note = trim(p_note)
   where id = p_refund_id;
  insert into public.support_refund_audit(refund_request_id, previous_status, new_status, decided_by, note)
  values (p_refund_id, v_prev, p_decision, auth.uid(), trim(p_note));
  insert into public.notifications(user_id, title, body, category)
  select v_req.student_id,
         'Refund ' || p_decision,
         'Your refund request for ' || v_req.currency_code || ' ' ||
         (v_req.amount_minor / 100.0)::text || ' has been ' || p_decision || '.',
         'support';
  if p_decision = 'processed' then
    update public.support_cases set status = 'refunded', updated_at = now()
     where refund_request_id = p_refund_id;
  end if;
end $$;
revoke all on function public.gss_admin_decide_refund(uuid,text,text) from public, anon;
grant execute on function public.gss_admin_decide_refund(uuid,text,text) to authenticated;

-- ============================================================================
-- 9. Notifications functions.
-- ============================================================================
create or replace function public.gss_list_notifications(p_limit int)
returns table(id uuid, title text, body text, category text, read_at timestamptz, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select id, title, body, category, read_at, created_at
    from public.notifications
   where user_id = (select auth.uid())
   order by created_at desc
   limit least(coalesce(p_limit, 50), 200);
$$;
revoke all on function public.gss_list_notifications(int) from public, anon;
grant execute on function public.gss_list_notifications(int) to authenticated;

create or replace function public.gss_mark_notification_read(p_notification_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.notifications set read_at = now()
   where id = p_notification_id and user_id = auth.uid() and read_at is null;
  if not found then raise exception 'Notification not found'; end if;
end $$;
revoke all on function public.gss_mark_notification_read(uuid) from public, anon;
grant execute on function public.gss_mark_notification_read(uuid) to authenticated;

create or replace function public.gss_mark_all_notifications_read()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.notifications set read_at = now()
   where user_id = auth.uid() and read_at is null;
end $$;
revoke all on function public.gss_mark_all_notifications_read() from public, anon;
grant execute on function public.gss_mark_all_notifications_read() to authenticated;

-- ============================================================================
-- 10. Institution catalogue functions (read + write with audit).
-- ============================================================================
create or replace function public.gss_institution_list_catalogues()
returns table(kind text, id uuid, name text, code text, year text, active boolean,
              label text, amount_minor bigint, currency_code text,
              programme_name text, academic_year text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare v_inst uuid;
begin
  select r.institution_id into v_inst from public.user_role_assignments r
   where r.user_id = auth.uid() and r.role = 'institution_admin';
  if v_inst is null then raise exception 'Institution admin required' using errcode = '42501'; end if;
  return query
    select * from (
      select 'programme'::text as kind, p.id, p.name, p.code, null::text as year, null::boolean as active,
             null::text as label, null::bigint as amount_minor, null::text as currency_code,
             null::text as programme_name, null::text as academic_year, p.created_at
        from public.institution_programmes p where p.institution_id = v_inst
      union all
      select 'department'::text, d.id, d.name, null::text, null::text, null::boolean,
             null::text, null::bigint, null::text, null::text, null::text, d.created_at
        from public.institution_departments d where d.institution_id = v_inst
      union all
      select 'academic_year'::text, ay.id, ay.year, null::text, ay.year, ay.active,
             null::text, null::bigint, null::text, null::text, null::text, ay.created_at
        from public.institution_academic_years ay where ay.institution_id = v_inst
      union all
      select 'tuition_fee'::text, f.id, f.label, null::text, null::text, null::boolean,
             f.label, f.amount_minor, f.currency_code,
             p.name, ay.year, f.created_at
        from public.institution_tuition_fees f
        left join public.institution_programmes p on p.id = f.programme_id
        left join public.institution_academic_years ay on ay.id = f.academic_year_id
       where f.institution_id = v_inst
    ) as u
    order by u.kind, u.created_at;
end $$;
revoke all on function public.gss_institution_list_catalogues() from public, anon;
grant execute on function public.gss_institution_list_catalogues() to authenticated;

create or replace function public.gss_institution_upsert_programme(p_id uuid, p_name text, p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_inst uuid; v_id uuid; v_before jsonb; v_after jsonb; v_action text;
begin
  select r.institution_id into v_inst from public.user_role_assignments r
   where r.user_id = auth.uid() and r.role = 'institution_admin';
  if v_inst is null then raise exception 'Institution admin required' using errcode = '42501'; end if;
  if length(trim(coalesce(p_name, ''))) not between 2 and 200 then
    raise exception 'Name must be 2-200 characters'; end if;
  if p_code is not null and length(trim(p_code)) not between 1 and 50 then
    raise exception 'Code must be 1-50 characters'; end if;
  if p_id is null then
    insert into public.institution_programmes(institution_id, name, code)
    values (v_inst, trim(p_name), nullif(trim(coalesce(p_code,'')), null))
    returning id into v_id;
    v_action := 'insert'; v_before := null;
    select to_jsonb(t) into v_after from (select v_id as id, v_inst as institution_id, trim(p_name) as name,
      nullif(trim(coalesce(p_code,'')), null) as code) t;
  else
    select to_jsonb(t) into v_before from public.institution_programmes t where t.id = p_id and t.institution_id = v_inst;
    if v_before is null then raise exception 'Programme not found'; end if;
    update public.institution_programmes set name = trim(p_name), code = nullif(trim(coalesce(p_code,'')), null)
     where id = p_id and institution_id = v_inst returning id into v_id;
    v_action := 'update';
    select to_jsonb(t) into v_after from public.institution_programmes t where t.id = v_id;
  end if;
  insert into public.institution_catalogue_audit(institution_id, table_name, row_id, action, before, after, changed_by)
  values (v_inst, 'institution_programmes', v_id, v_action, v_before, v_after, auth.uid());
  return v_id;
end $$;
revoke all on function public.gss_institution_upsert_programme(uuid,text,text) from public, anon;
grant execute on function public.gss_institution_upsert_programme(uuid,text,text) to authenticated;

create or replace function public.gss_institution_delete_programme(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_inst uuid; v_before jsonb;
begin
  select r.institution_id into v_inst from public.user_role_assignments r
   where r.user_id = auth.uid() and r.role = 'institution_admin';
  if v_inst is null then raise exception 'Institution admin required' using errcode = '42501'; end if;
  select to_jsonb(t) into v_before from public.institution_programmes t where t.id = p_id and t.institution_id = v_inst;
  if v_before is null then raise exception 'Programme not found'; end if;
  delete from public.institution_programmes where id = p_id and institution_id = v_inst;
  insert into public.institution_catalogue_audit(institution_id, table_name, row_id, action, before, after, changed_by)
  values (v_inst, 'institution_programmes', p_id, 'delete', v_before, null, auth.uid());
end $$;
revoke all on function public.gss_institution_delete_programme(uuid) from public, anon;
grant execute on function public.gss_institution_delete_programme(uuid) to authenticated;

create or replace function public.gss_institution_upsert_department(p_id uuid, p_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_inst uuid; v_id uuid; v_before jsonb; v_after jsonb; v_action text;
begin
  select r.institution_id into v_inst from public.user_role_assignments r
   where r.user_id = auth.uid() and r.role = 'institution_admin';
  if v_inst is null then raise exception 'Institution admin required' using errcode = '42501'; end if;
  if length(trim(coalesce(p_name, ''))) not between 2 and 200 then
    raise exception 'Name must be 2-200 characters'; end if;
  if p_id is null then
    insert into public.institution_departments(institution_id, name) values (v_inst, trim(p_name))
    returning id into v_id;
    v_action := 'insert'; v_before := null;
  else
    select to_jsonb(t) into v_before from public.institution_departments t where t.id = p_id and t.institution_id = v_inst;
    if v_before is null then raise exception 'Department not found'; end if;
    update public.institution_departments set name = trim(p_name)
     where id = p_id and institution_id = v_inst returning id into v_id;
    v_action := 'update';
  end if;
  select to_jsonb(t) into v_after from public.institution_departments t where t.id = v_id;
  insert into public.institution_catalogue_audit(institution_id, table_name, row_id, action, before, after, changed_by)
  values (v_inst, 'institution_departments', v_id, v_action, v_before, v_after, auth.uid());
  return v_id;
end $$;
revoke all on function public.gss_institution_upsert_department(uuid,text) from public, anon;
grant execute on function public.gss_institution_upsert_department(uuid,text) to authenticated;

create or replace function public.gss_institution_delete_department(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_inst uuid; v_before jsonb;
begin
  select r.institution_id into v_inst from public.user_role_assignments r
   where r.user_id = auth.uid() and r.role = 'institution_admin';
  if v_inst is null then raise exception 'Institution admin required' using errcode = '42501'; end if;
  select to_jsonb(t) into v_before from public.institution_departments t where t.id = p_id and t.institution_id = v_inst;
  if v_before is null then raise exception 'Department not found'; end if;
  delete from public.institution_departments where id = p_id and institution_id = v_inst;
  insert into public.institution_catalogue_audit(institution_id, table_name, row_id, action, before, after, changed_by)
  values (v_inst, 'institution_departments', p_id, 'delete', v_before, null, auth.uid());
end $$;
revoke all on function public.gss_institution_delete_department(uuid) from public, anon;
grant execute on function public.gss_institution_delete_department(uuid) to authenticated;

create or replace function public.gss_institution_upsert_academic_year(p_id uuid, p_year text, p_active boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_inst uuid; v_id uuid; v_before jsonb; v_after jsonb; v_action text;
begin
  select r.institution_id into v_inst from public.user_role_assignments r
   where r.user_id = auth.uid() and r.role = 'institution_admin';
  if v_inst is null then raise exception 'Institution admin required' using errcode = '42501'; end if;
  if p_year !~ '^20[0-9]{2}/20[0-9]{2}$' then raise exception 'Use YYYY/YYYY'; end if;
  if split_part(p_year, '/', 2)::int <> split_part(p_year, '/', 1)::int + 1 then
    raise exception 'Academic year must contain consecutive years'; end if;
  if p_id is null then
    insert into public.institution_academic_years(institution_id, year, active)
    values (v_inst, p_year, coalesce(p_active, false))
    returning id into v_id;
    v_action := 'insert'; v_before := null;
  else
    select to_jsonb(t) into v_before from public.institution_academic_years t where t.id = p_id and t.institution_id = v_inst;
    if v_before is null then raise exception 'Academic year not found'; end if;
    update public.institution_academic_years set year = p_year, active = coalesce(p_active, false)
     where id = p_id and institution_id = v_inst returning id into v_id;
    v_action := 'update';
  end if;
  select to_jsonb(t) into v_after from public.institution_academic_years t where t.id = v_id;
  insert into public.institution_catalogue_audit(institution_id, table_name, row_id, action, before, after, changed_by)
  values (v_inst, 'institution_academic_years', v_id, v_action, v_before, v_after, auth.uid());
  return v_id;
end $$;
revoke all on function public.gss_institution_upsert_academic_year(uuid,text,boolean) from public, anon;
grant execute on function public.gss_institution_upsert_academic_year(uuid,text,boolean) to authenticated;

create or replace function public.gss_institution_delete_academic_year(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_inst uuid; v_before jsonb;
begin
  select r.institution_id into v_inst from public.user_role_assignments r
   where r.user_id = auth.uid() and r.role = 'institution_admin';
  if v_inst is null then raise exception 'Institution admin required' using errcode = '42501'; end if;
  select to_jsonb(t) into v_before from public.institution_academic_years t where t.id = p_id and t.institution_id = v_inst;
  if v_before is null then raise exception 'Academic year not found'; end if;
  delete from public.institution_academic_years where id = p_id and institution_id = v_inst;
  insert into public.institution_catalogue_audit(institution_id, table_name, row_id, action, before, after, changed_by)
  values (v_inst, 'institution_academic_years', p_id, 'delete', v_before, null, auth.uid());
end $$;
revoke all on function public.gss_institution_delete_academic_year(uuid) from public, anon;
grant execute on function public.gss_institution_delete_academic_year(uuid) to authenticated;

create or replace function public.gss_institution_upsert_tuition_fee(
  p_id uuid, p_label text, p_amount_minor bigint, p_currency_code text,
  p_programme_id uuid, p_academic_year_id uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_inst uuid; v_id uuid; v_before jsonb; v_after jsonb; v_action text;
begin
  select r.institution_id into v_inst from public.user_role_assignments r
   where r.user_id = auth.uid() and r.role = 'institution_admin';
  if v_inst is null then raise exception 'Institution admin required' using errcode = '42501'; end if;
  if length(trim(coalesce(p_label, ''))) not between 2 and 200 then
    raise exception 'Label must be 2-200 characters'; end if;
  if p_amount_minor is null or p_amount_minor < 0 then raise exception 'Amount must be >= 0'; end if;
  if p_currency_code is null or p_currency_code !~ '^[A-Z]{3}$' then raise exception 'Invalid currency'; end if;
  if p_programme_id is not null and not exists (select 1 from public.institution_programmes
        where id = p_programme_id and institution_id = v_inst) then
    raise exception 'Programme not found'; end if;
  if p_academic_year_id is not null and not exists (select 1 from public.institution_academic_years
        where id = p_academic_year_id and institution_id = v_inst) then
    raise exception 'Academic year not found'; end if;
  if p_id is null then
    insert into public.institution_tuition_fees(institution_id, programme_id, academic_year_id, label, amount_minor, currency_code)
    values (v_inst, p_programme_id, p_academic_year_id, trim(p_label), p_amount_minor, p_currency_code)
    returning id into v_id;
    v_action := 'insert'; v_before := null;
  else
    select to_jsonb(t) into v_before from public.institution_tuition_fees t where t.id = p_id and t.institution_id = v_inst;
    if v_before is null then raise exception 'Tuition fee not found'; end if;
    update public.institution_tuition_fees
       set label = trim(p_label), amount_minor = p_amount_minor, currency_code = p_currency_code,
           programme_id = p_programme_id, academic_year_id = p_academic_year_id
     where id = p_id and institution_id = v_inst returning id into v_id;
    v_action := 'update';
  end if;
  select to_jsonb(t) into v_after from public.institution_tuition_fees t where t.id = v_id;
  insert into public.institution_catalogue_audit(institution_id, table_name, row_id, action, before, after, changed_by)
  values (v_inst, 'institution_tuition_fees', v_id, v_action, v_before, v_after, auth.uid());
  return v_id;
end $$;
revoke all on function public.gss_institution_upsert_tuition_fee(uuid,text,bigint,text,uuid,uuid) from public, anon;
grant execute on function public.gss_institution_upsert_tuition_fee(uuid,text,bigint,text,uuid,uuid) to authenticated;

create or replace function public.gss_institution_delete_tuition_fee(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_inst uuid; v_before jsonb;
begin
  select r.institution_id into v_inst from public.user_role_assignments r
   where r.user_id = auth.uid() and r.role = 'institution_admin';
  if v_inst is null then raise exception 'Institution admin required' using errcode = '42501'; end if;
  select to_jsonb(t) into v_before from public.institution_tuition_fees t where t.id = p_id and t.institution_id = v_inst;
  if v_before is null then raise exception 'Tuition fee not found'; end if;
  delete from public.institution_tuition_fees where id = p_id and institution_id = v_inst;
  insert into public.institution_catalogue_audit(institution_id, table_name, row_id, action, before, after, changed_by)
  values (v_inst, 'institution_tuition_fees', p_id, 'delete', v_before, null, auth.uid());
end $$;
revoke all on function public.gss_institution_delete_tuition_fee(uuid) from public, anon;
grant execute on function public.gss_institution_delete_tuition_fee(uuid) to authenticated;

-- Institution-scoped audit log (catalogue changes only; institution_review_audit and
-- institution_admin_audit are platform-admin-only by existing policy).
create or replace function public.gss_institution_catalogue_audit_log(p_limit int)
returns table(id uuid, table_name text, row_id uuid, action text, changed_by uuid, changed_at timestamptz, before jsonb, after jsonb)
language sql stable security definer set search_path = '' as $$
  select a.id, a.table_name, a.row_id, a.action, a.changed_by, a.changed_at, a.before, a.after
    from public.institution_catalogue_audit a
   where a.institution_id = (
     select r.institution_id from public.user_role_assignments r
      where r.user_id = (select auth.uid()) and r.role = 'institution_admin' limit 1)
   order by a.changed_at desc
   limit least(coalesce(p_limit, 100), 500);
$$;
revoke all on function public.gss_institution_catalogue_audit_log(int) from public, anon;
grant execute on function public.gss_institution_catalogue_audit_log(int) to authenticated;

-- Institution admin's own institution detail (already public for verified institutions;
-- this returns the caller's own institution regardless of verification_status).
create or replace function public.gss_institution_self()
returns table(id uuid, name text, country_code text, verification_status text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select i.id, i.name, i.country_code, i.verification_status, i.created_at
    from public.institutions i
   where i.id = (
     select r.institution_id from public.user_role_assignments r
      where r.user_id = (select auth.uid()) and r.role = 'institution_admin' limit 1)
   limit 1;
$$;
revoke all on function public.gss_institution_self() from public, anon;
grant execute on function public.gss_institution_self() to authenticated;

-- Institution admin's own staff listing (only the sole institution_admin per policy).
create or replace function public.gss_institution_staff_listing()
returns table(user_id uuid, email text, role text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.user_id, u.email::text, r.role, r.created_at
    from public.user_role_assignments r
    join auth.users u on u.id = r.user_id
   where r.institution_id = (
     select x.institution_id from public.user_role_assignments x
      where x.user_id = (select auth.uid()) and x.role = 'institution_admin' limit 1)
     and r.role = 'institution_admin'
   order by r.created_at desc limit 50;
$$;
revoke all on function public.gss_institution_staff_listing() from public, anon;
grant execute on function public.gss_institution_staff_listing() to authenticated;

-- ============================================================================
-- 11. Platform admin functions: unified audit log, student list, institution list,
--     verification monitoring, integration list.
-- ============================================================================
create or replace function public.gss_admin_audit_log(p_limit int)
returns table(source text, id uuid, created_at timestamptz, actor uuid, summary text)
language sql stable security definer set search_path = '' as $$
  select 'institution_review'::text, a.id, a.created_at, a.reviewer_id,
         'Application ' || a.application_id::text || ' -> ' || a.decision
    from public.institution_review_audit a
  union all
  select 'institution_admin'::text, a.id, a.changed_at, a.changed_by,
         'Institution ' || a.institution_id::text || ': admin transfer'
    from public.institution_admin_audit a
  union all
  select 'refund_decision'::text, a.id, a.created_at, a.decided_by,
         'Refund ' || a.refund_request_id::text || ': ' || a.previous_status || ' -> ' || a.new_status
    from public.support_refund_audit a
  order by created_at desc
  limit case when public.gss_has_role('platform_admin')
            then least(coalesce(p_limit, 200), 500)
            else 0 end;
$$;
revoke all on function public.gss_admin_audit_log(int) from public, anon;
grant execute on function public.gss_admin_audit_log(int) to authenticated;

create or replace function public.gss_admin_list_students(p_search text, p_limit int)
returns table(user_id uuid, email text, display_name text, global_student_id text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, u.email::text, p.display_name, g.global_student_id, p.created_at
    from public.student_profiles p
    join auth.users u on u.id = p.id
    left join public.student_global_ids g on g.student_id = p.id
   where public.gss_has_role('platform_admin')
     and (p_search is null or p_search = ''
          or u.email ilike '%' || p_search || '%'
          or p.display_name ilike '%' || p_search || '%'
          or coalesce(g.global_student_id, '') ilike '%' || p_search || '%')
   order by p.created_at desc
   limit least(coalesce(p_limit, 100), 500);
$$;
revoke all on function public.gss_admin_list_students(text,int) from public, anon;
grant execute on function public.gss_admin_list_students(text,int) to authenticated;

create or replace function public.gss_admin_list_institutions(p_search text, p_status text)
returns table(id uuid, name text, country_code text, verification_status text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select i.id, i.name, i.country_code, i.verification_status, i.created_at
    from public.institutions i
   where public.gss_has_role('platform_admin')
     and (p_search is null or p_search = ''
          or i.name ilike '%' || p_search || '%'
          or i.country_code ilike '%' || p_search || '%')
     and (p_status is null or p_status = '' or i.verification_status = p_status)
   order by i.created_at desc limit 500;
$$;
revoke all on function public.gss_admin_list_institutions(text,text) from public, anon;
grant execute on function public.gss_admin_list_institutions(text,text) to authenticated;

create or replace function public.gss_admin_verification_monitoring(p_status text)
returns table(request_id uuid, student_name text, admission_number text, institution_name text,
              status text, created_at timestamptz, reviewed_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select q.id, p.display_name, e.admission_number, i.name,
         q.status, q.created_at, q.reviewed_at
    from public.enrollment_verification_requests q
    join public.student_enrollments e on e.id = q.enrollment_id
    join public.student_profiles p on p.id = q.student_id
    join public.institutions i on i.id = q.institution_id
   where public.gss_has_role('platform_admin')
     and (p_status is null or p_status = '' or q.status = p_status)
   order by q.created_at desc limit 500;
$$;
revoke all on function public.gss_admin_verification_monitoring(text) from public, anon;
grant execute on function public.gss_admin_verification_monitoring(text) to authenticated;

create or replace function public.gss_admin_list_integration_status()
returns table(id uuid, name text, kind text, status text, description text, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select s.id, s.name, s.kind, s.status, s.description, s.updated_at
    from public.integration_status s
   where public.gss_has_role('platform_admin')
   order by s.kind, s.name;
$$;
revoke all on function public.gss_admin_list_integration_status() from public, anon;
grant execute on function public.gss_admin_list_integration_status() to authenticated;

-- Platform analytics: aggregate counts that platform_admin can see.
create or replace function public.gss_admin_platform_analytics()
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when not public.gss_has_role('platform_admin') then null
         else jsonb_build_object(
           'students_verified',
             (select count(distinct e.student_id) from public.student_enrollments e where e.verification_status = 'verified'),
           'students_pending',
             (select count(distinct e.student_id) from public.student_enrollments e where e.verification_status = 'pending'),
           'students_rejected',
             (select count(distinct e.student_id) from public.student_enrollments e where e.verification_status = 'rejected'),
           'institutions_by_status',
             (select jsonb_object_agg(verification_status, cnt) from
               (select verification_status, count(*)::int cnt from public.institutions group by verification_status) s),
           'transactions_by_status',
             (select jsonb_object_agg(status, cnt) from
               (select status, count(*)::int cnt from public.gss_transactions group by status) s),
           'transactions_total_minor_by_currency',
             (select jsonb_object_agg(currency_code, total) from
               (select currency_code, sum(amount_minor)::bigint total from public.gss_transactions group by currency_code) s),
           'support_cases_by_status',
             (select jsonb_object_agg(status, cnt) from
               (select status, count(*)::int cnt from public.support_cases group by status) s),
           'refunds_by_status',
             (select jsonb_object_agg(status, cnt) from
               (select status, count(*)::int cnt from public.support_refund_requests group by status) s)
         ) end;
$$;
revoke all on function public.gss_admin_platform_analytics() from public, anon;
grant execute on function public.gss_admin_platform_analytics() to authenticated;

-- ============================================================================
-- 12. Country list (static, read-only). Returns the curated set of countries
--     supported for institution applications. Not a table — avoids another
--     migration dependency. Platform admins see this read-only list.
-- ============================================================================
create or replace function public.gss_admin_list_countries()
returns table(iso2 text, name text) language sql stable security definer set search_path = '' as $$
  select * from (values
    ('TZ'::text, 'Tanzania'::text),
    ('KE', 'Kenya'),
    ('UG', 'Uganda'),
    ('RW', 'Rwanda'),
    ('BI', 'Burundi'),
    ('CD', 'DR Congo'),
    ('ZM', 'Zambia'),
    ('MW', 'Malawi'),
    ('MZ', 'Mozambique'),
    ('NG', 'Nigeria'),
    ('GH', 'Ghana'),
    ('ZA', 'South Africa'),
    ('EG', 'Egypt'),
    ('IN', 'India'),
    ('CN', 'China'),
    ('US', 'United States'),
    ('GB', 'United Kingdom'),
    ('AE', 'United Arab Emirates')
  ) as t(iso2, name)
  where public.gss_has_role('platform_admin')
  order by name;
$$;
revoke all on function public.gss_admin_list_countries() from public, anon;
grant execute on function public.gss_admin_list_countries() to authenticated;
