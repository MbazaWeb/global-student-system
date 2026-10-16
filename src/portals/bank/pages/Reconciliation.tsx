import BankPageShell from "../BankLayout";
import { MOCK_RECONCILIATION } from "../services/bankService";

export default function Reconciliation() {
  return (
    <BankPageShell title="Reconciliation" subtitle="Mock reconciliation between bank and ledger (no real data).">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Reference</th><th className="p-3">Bank status</th><th className="p-3">Ledger status</th><th className="p-3">Match</th></tr></thead>
          <tbody>
            {MOCK_RECONCILIATION.map((r) => (
              <tr key={r.id} className="border-t"><td className="p-3 font-mono">{r.reference}</td><td className="p-3">{r.bankStatus}</td><td className="p-3">{r.ledgerStatus}</td><td className="p-3"><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{r.match}</span></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </BankPageShell>
  );
}
