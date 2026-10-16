import { useCallback, useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { institutionService, type CatalogueAuditRow } from "../services/institutionService";

export default function AuditLogs() {
  const [rows, setRows] = useState<CatalogueAuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await institutionService.auditLog(200));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load audit log.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><ScrollText size={24} aria-hidden="true" /></span>
        <div>
          <h1 className="text-3xl font-bold">Audit log</h1>
          <p className="mt-1 text-sm text-slate-500">Changes to programmes, departments, academic years and tuition fees.</p>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p role="status" className="text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <h3 className="font-bold">No audit entries yet</h3>
          <p className="mt-2 text-sm text-slate-500">Changes you make to programmes, departments, academic years and tuition fees will be recorded here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3">When</th>
                <th className="p-3">Table</th>
                <th className="p-3">Action</th>
                <th className="p-3">Changed by</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 text-xs text-slate-500">{new Date(r.changed_at).toLocaleString()}</td>
                  <td className="p-3 font-mono text-xs">{r.table_name}</td>
                  <td className="p-3 capitalize">{r.action}</td>
                  <td className="p-3 font-mono text-xs text-slate-500">{r.changed_by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
