import BankPageShell from "../BankLayout";
import { MOCK_LINKED_ACCOUNTS } from "../services/bankService";

export default function LinkedAccounts() {
  return (
    <BankPageShell title="Linked accounts" subtitle="Mock linked accounts (no real account numbers).">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Holder</th><th className="p-3">Account</th><th className="p-3">Currency</th><th className="p-3">Status</th></tr></thead>
          <tbody>
            {MOCK_LINKED_ACCOUNTS.map((a) => (
              <tr key={a.id} className="border-t"><td className="p-3 font-semibold">{a.holder}</td><td className="p-3 font-mono">{a.masked}</td><td className="p-3">{a.currency}</td><td className="p-3">{a.status}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </BankPageShell>
  );
}
