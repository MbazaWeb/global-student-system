import BankPageShell from "../BankLayout";
import { MOCK_BANK_TRANSACTIONS } from "../services/bankService";

export default function Transactions() {
  return (
    <BankPageShell title="Transactions" subtitle="Mock bank-side transactions (no real money movement).">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Reference</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Date</th></tr></thead>
          <tbody>
            {MOCK_BANK_TRANSACTIONS.map((t) => (
              <tr key={t.id} className="border-t"><td className="p-3 font-mono">{t.reference}</td><td className="p-3 font-semibold">{t.amount}</td><td className="p-3">{t.status}</td><td className="p-3 text-xs text-slate-500">{t.occurredAt}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </BankPageShell>
  );
}
