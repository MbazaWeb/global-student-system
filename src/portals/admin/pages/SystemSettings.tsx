import { useCallback, useEffect, useState } from "react";
import { Settings as SettingsIcon, Plug, ShieldCheck } from "lucide-react";
import { adminService, type IntegrationRow } from "../services/adminService";

export default function SystemSettings() {
  const [rows, setRows] = useState<IntegrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await adminService.listIntegrations());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load system settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const STATUS_STYLE: Record<string, string> = {
    proposed: "bg-slate-100 text-slate-600",
    sandbox: "bg-amber-50 text-amber-800",
    live: "bg-emerald-50 text-emerald-700",
    disabled: "bg-red-50 text-red-700",
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><SettingsIcon size={24} aria-hidden="true" /></span>
        <div>
          <h1 className="text-3xl font-bold">System settings</h1>
          <p className="mt-1 text-sm text-slate-500">Read-only view of integration and feature flags.</p>
        </div>
      </header>

      <section className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <ShieldCheck className="shrink-0 text-amber-700" size={20} aria-hidden="true" />
        <p className="text-sm text-amber-800">Settings are configured via migrations and server-side secrets. This page is a read-only dashboard of the current state.</p>
      </section>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      <section>
        <h2 className="flex items-center gap-2 text-xl font-bold"><Plug size={18} aria-hidden="true" /> Integrations</h2>
        {loading ? (
          <p role="status" className="mt-4 text-slate-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No integrations configured.</p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {rows.map((r) => (
              <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{r.name}</p>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[r.status] ?? ""}`}>{r.status}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500 capitalize">{r.kind.replaceAll("_", " ")}</p>
                {r.description && <p className="mt-2 text-sm text-slate-700">{r.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
