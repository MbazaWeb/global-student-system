import BankPageShell from "../BankLayout";
import { MOCK_BANK_AUDIT } from "../services/bankService";

export default function AuditLogs() {
  return (
    <BankPageShell title="Audit logs" subtitle="Mock audit log (no real bank events).">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Action</th><th className="p-3">Actor</th><th className="p-3">When</th></tr></thead>
          <tbody>
            {MOCK_BANK_AUDIT.map((a) => (
              <tr key={a.id} className="border-t"><td className="p-3">{a.action}</td><td className="p-3 font-mono text-xs">{a.actor}</td><td className="p-3 text-xs text-slate-500">{a.at}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </BankPageShell>
  );
}
