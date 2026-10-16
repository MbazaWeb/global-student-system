import BankPageShell from "../BankLayout";
import { MOCK_WEBHOOK_LOGS } from "../services/bankService";

export default function WebhookLogs() {
  return (
    <BankPageShell title="Webhook logs" subtitle="Mock webhook receipts (no real webhooks).">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Event</th><th className="p-3">Status</th><th className="p-3">Received</th></tr></thead>
          <tbody>
            {MOCK_WEBHOOK_LOGS.map((w) => (
              <tr key={w.id} className="border-t"><td className="p-3 font-mono">{w.event}</td><td className="p-3">{w.status}</td><td className="p-3 text-xs text-slate-500">{w.receivedAt}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </BankPageShell>
  );
}
