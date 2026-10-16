-- GSS payment ledger foundation. No client can create or alter financial records.
-- Only trusted, independently verified payment integrations may post transactions later.
create table if not exists public.gss_transactions (
 id uuid primary key default gen_random_uuid(),
 reference text not null unique,
 student_id uuid not null references public.student_profiles(id),
 institution_id uuid not null references public.institutions(id),
 enrollment_id uuid references public.student_enrollments(id),
 amount_minor bigint not null check(amount_minor > 0),
 currency_code text not null check(currency_code ~ '^[A-Z]{3}$'),
 transaction_type text not null check(transaction_type in ('tuition','fees','refund','other')),
 status text not null check(status in ('pending','completed','failed','reversed')),
 description text not null default '',
 occurred_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 constraint gss_transaction_description_length check(char_length(description)<=500)
);
create index if not exists gss_transactions_student_date on public.gss_transactions(student_id,occurred_at desc);
create index if not exists gss_transactions_institution_date on public.gss_transactions(institution_id,occurred_at desc);
alter table public.gss_transactions enable row level security;
revoke all on public.gss_transactions from public,anon,authenticated;
grant select on public.gss_transactions to authenticated;
create policy "Students view own transactions" on public.gss_transactions
 for select to authenticated using(student_id=(select auth.uid()));
create policy "Institution admin views own institution transactions" on public.gss_transactions
 for select to authenticated using(public.gss_is_institution_admin(institution_id));
-- No insert/update/delete grants or policies for browser users.
-- Production posting must validate payment provider signatures and enrollment ownership server-side.
