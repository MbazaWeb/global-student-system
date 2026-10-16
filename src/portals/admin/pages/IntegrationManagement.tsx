import { useCallback, useEffect, useState } from "react";
import { Plug } from "lucide-react";
import { adminService, type IntegrationRow } from "../services/adminService";

const STATUS_STYLE: Record<string, string> = {
  proposed: "bg-slate-100 text-slate-600",
  sandbox: "bg-amber-50 text-amber-800",
  live: "bg-emerald-50 text-emerald-700",
  disabled: "bg-red-50 text-red-700",
};

export default function IntegrationManagement() {
  const [rows, setRows] = useState<IntegrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await adminService.listIntegrations());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load integrations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Plug size={24} aria-hidden="true" /></span>
        <div>
          <h1 className="text-3xl font-bold">Integration management</h1>
          <p className="mt-1 text-sm text-slate-500">Read-only status of mobile money, banking, registry and notification integrations.</p>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p role="status" className="text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <h3 className="font-bold">No integrations configured</h3>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr><th className="p-3">Name</th><th className="p-3">Kind</th><th className="p-3">Status</th><th className="p-3">Description</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 font-semibold">{r.name}</td>
                  <td className="p-3 capitalize text-xs">{r.kind.replaceAll("_", " ")}</td>
                  <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[r.status] ?? ""}`}>{r.status}</span></td>
                  <td className="p-3 text-slate-600">{r.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
