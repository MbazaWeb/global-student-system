import BankPageShell from "../BankLayout";
import { MOCK_BANK_PROFILE } from "../services/bankService";

export default function BankProfile() {
  return (
    <BankPageShell title="Bank profile" subtitle="Proposed bank partner profile (mock).">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <dl className="divide-y divide-slate-100">
          <div className="flex items-center justify-between gap-3 py-3"><dt className="text-sm text-slate-500">Name</dt><dd className="font-semibold">{MOCK_BANK_PROFILE.name}</dd></div>
          <div className="flex items-center justify-between gap-3 py-3"><dt className="text-sm text-slate-500">Code</dt><dd className="font-mono text-xs">{MOCK_BANK_PROFILE.code}</dd></div>
          <div className="flex items-center justify-between gap-3 py-3"><dt className="text-sm text-slate-500">Country</dt><dd className="font-mono text-xs">{MOCK_BANK_PROFILE.country}</dd></div>
          <div className="flex items-center justify-between gap-3 py-3"><dt className="text-sm text-slate-500">Status</dt><dd><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{MOCK_BANK_PROFILE.status}</span></dd></div>
          <div className="flex items-center justify-between gap-3 py-3"><dt className="text-sm text-slate-500">Contact email</dt><dd className="font-mono text-xs">{MOCK_BANK_PROFILE.contactEmail}</dd></div>
        </dl>
      </section>
    </BankPageShell>
  );
}
