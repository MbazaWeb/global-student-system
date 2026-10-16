import BankPageShell from "../BankLayout";
import { MOCK_BANK_PROFILE, MOCK_API_CONNECTIONS, MOCK_BANK_TRANSACTIONS, MOCK_LINKED_ACCOUNTS } from "../services/bankService";

export default function BankDashboard() {
  return (
    <BankPageShell title="Bank dashboard" subtitle="Overview of the proposed bank integration.">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold">Bank profile</h2>
        <dl className="mt-3 divide-y divide-slate-100">
          <div className="flex items-center justify-between gap-3 py-3"><dt className="text-sm text-slate-500">Name</dt><dd className="font-semibold">{MOCK_BANK_PROFILE.name}</dd></div>
          <div className="flex items-center justify-between gap-3 py-3"><dt className="text-sm text-slate-500">Code</dt><dd className="font-mono text-xs">{MOCK_BANK_PROFILE.code}</dd></div>
          <div className="flex items-center justify-between gap-3 py-3"><dt className="text-sm text-slate-500">Status</dt><dd><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{MOCK_BANK_PROFILE.status}</span></dd></div>
        </dl>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-600">API connections</p><p className="mt-2 text-2xl font-bold">{MOCK_API_CONNECTIONS.length}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-600">Linked accounts</p><p className="mt-2 text-2xl font-bold">{MOCK_LINKED_ACCOUNTS.length}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-600">Transactions</p><p className="mt-2 text-2xl font-bold">{MOCK_BANK_TRANSACTIONS.length}</p></div>
      </section>
    </BankPageShell>
  );
}
