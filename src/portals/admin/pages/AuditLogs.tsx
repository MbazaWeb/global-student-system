import { useCallback, useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { adminService, type AuditLogRow } from "../services/adminService";

const SOURCE_STYLE: Record<string, string> = {
  institution_review: "bg-blue-50 text-blue-700",
  institution_admin: "bg-violet-50 text-violet-700",
  refund_decision: "bg-amber-50 text-amber-800",
};

export default function AuditLogs() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await adminService.auditLog(500));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load audit log.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><ScrollText size={24} aria-hidden="true" /></span>
        <div>
          <h1 className="text-3xl font-bold">Audit log</h1>
          <p className="mt-1 text-sm text-slate-500">Unified log of institution review, admin transfer and refund decisions.</p>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p role="status" className="text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <h3 className="font-bold">No audit entries yet</h3>
          <p className="mt-2 text-sm text-slate-500">Audit entries from institution review, admin transfers and refund decisions will appear here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr><th className="p-3">When</th><th className="p-3">Source</th><th className="p-3">Summary</th><th className="p-3">Actor</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.source}-${r.id}`} className="border-t">
                  <td className="p-3 text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${SOURCE_STYLE[r.source] ?? ""}`}>{r.source.replaceAll("_", " ")}</span></td>
                  <td className="p-3 break-words">{r.summary}</td>
                  <td className="p-3 font-mono text-xs text-slate-500">{r.actor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
