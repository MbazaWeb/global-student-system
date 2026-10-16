import BankPageShell from "../BankLayout";
import { MOCK_SETTLEMENTS } from "../services/bankService";

export default function PaymentSettlements() {
  return (
    <BankPageShell title="Payment settlements" subtitle="Mock settlement batches (no real money movement).">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Reference</th><th className="p-3">Total</th><th className="p-3">Status</th><th className="p-3">Settled</th></tr></thead>
          <tbody>
            {MOCK_SETTLEMENTS.map((s) => (
              <tr key={s.id} className="border-t"><td className="p-3 font-mono">{s.reference}</td><td className="p-3 font-semibold">{s.total}</td><td className="p-3">{s.status}</td><td className="p-3 text-xs text-slate-500">{s.settledAt}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </BankPageShell>
  );
}
