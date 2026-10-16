import { Landmark, Info } from "lucide-react";

const MOCK_BANKS = [
  { name: "CRDB Bank", code: "CRDB", country: "TZ", status: "Proposed" },
  { name: "NMB Bank", code: "NMB", country: "TZ", status: "Proposed" },
  { name: "NBC Bank", code: "NBC", country: "TZ", status: "Proposed" },
  { name: "Stanbic Bank", code: "STANBIC", country: "TZ", status: "Proposed" },
];

const STATUS_STYLE: Record<string, string> = {
  Proposed: "bg-slate-100 text-slate-600",
  Sandbox: "bg-amber-50 text-amber-800",
  Live: "bg-emerald-50 text-emerald-700",
};

/** BankVendorManagement — MOCK. Lists proposed bank partners. No real
 *  bank endpoints, credentials or account numbers are present. */
export default function BankVendorManagement() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Landmark size={24} aria-hidden="true" /></span>
        <div>
          <h1 className="text-3xl font-bold">Bank vendor management</h1>
          <p className="mt-1 text-sm text-slate-500">Proposed bank partners. No live bank integration is connected.</p>
        </div>
      </header>

      <section className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <Info className="shrink-0 text-amber-700" size={20} aria-hidden="true" />
        <p className="text-sm text-amber-800">This is a mock list of proposed bank partners. No bank API contracts, credentials or account numbers are stored in GSS. Live bank integration requires a licensed partner and a server-side flow.</p>
      </section>

      <ul className="grid gap-3">
        {MOCK_BANKS.map((b) => (
          <li key={b.code} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{b.name}</p>
                <p className="mt-1 font-mono text-xs text-slate-500">{b.code} · {b.country}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[b.status] ?? ""}`}>{b.status}</span>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
