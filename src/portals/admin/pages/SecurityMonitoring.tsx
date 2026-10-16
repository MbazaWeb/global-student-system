import { ShieldAlert, Info } from "lucide-react";
import { adminService, type AuditLogRow } from "../services/adminService";
import { useCallback, useEffect, useState } from "react";

/**
 * SecurityMonitoring — read-only view of security-relevant audit events.
 * Today the unified audit log (gss_admin_audit_log) is the closest thing
 * to a security event feed: it captures institution review decisions,
 * admin transfers and refund decisions. A dedicated security events table
 * would require a new migration; this page surfaces what we have.
 */
export default function SecurityMonitoring() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await adminService.auditLog(100));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load security events.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><ShieldAlert size={24} aria-hidden="true" /></span>
        <div>
          <h1 className="text-3xl font-bold">Security monitoring</h1>
          <p className="mt-1 text-sm text-slate-500">Security-relevant audit events. A dedicated security event feed is not yet implemented.</p>
        </div>
      </header>

      <section className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <Info className="shrink-0 text-amber-700" size={20} aria-hidden="true" />
        <p className="text-sm text-amber-800">
          This page shows the most recent 100 entries from the unified audit log. A dedicated security events table
          (failed logins, rate-limit hits, suspicious activity) is not yet implemented and would require a new migration
          plus an event-ingestion path.
        </p>
      </section>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p role="status" className="text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <h3 className="font-bold">No security events recorded</h3>
          <p className="mt-2 text-sm text-slate-500">Audit events will appear here once admins take actions.</p>
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
                  <td className="p-3 capitalize text-xs">{r.source.replaceAll("_", " ")}</td>
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
