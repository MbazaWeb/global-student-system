import BankPageShell from "../BankLayout";
import { MOCK_API_CONNECTIONS } from "../services/bankService";

export default function APIConnections() {
  return (
    <BankPageShell title="API connections" subtitle="Proposed bank API connections (mock).">
      <ul className="grid gap-3">
        {MOCK_API_CONNECTIONS.map((c) => (
          <li key={c.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{c.name}</p>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{c.status}</span>
            </div>
            <p className="mt-2 font-mono text-xs text-slate-500">{c.baseUrl}</p>
          </li>
        ))}
      </ul>
    </BankPageShell>
  );
}
