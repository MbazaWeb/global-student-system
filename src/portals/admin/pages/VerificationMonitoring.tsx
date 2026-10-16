import { useCallback, useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { adminService, type VerificationMonitoringRow } from "../services/adminService";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800",
  verified: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
};

export default function VerificationMonitoring() {
  const [rows, setRows] = useState<VerificationMonitoringRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await adminService.verificationMonitoring(status));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load verification requests.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><ClipboardCheck size={24} aria-hidden="true" /></span>
        <div>
          <h1 className="text-3xl font-bold">Verification monitoring</h1>
          <p className="mt-1 text-sm text-slate-500">All enrollment verification requests across all institutions.</p>
        </div>
      </header>

      <section className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <select aria-label="Filter by status" className="min-h-11 rounded-lg border border-slate-200 p-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          {["", "pending", "verified", "rejected"].map((s) => <option key={s} value={s}>{s === "" ? "All statuses" : s}</option>)}
        </select>
        <button onClick={() => void load()} className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-semibold hover:bg-slate-50">Refresh</button>
      </section>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p role="status" className="text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <h3 className="font-bold">No verification requests</h3>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr><th className="p-3">Student</th><th className="p-3">Admission</th><th className="p-3">Institution</th><th className="p-3">Status</th><th className="p-3">Created</th><th className="p-3">Reviewed</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.request_id} className="border-t">
                  <td className="p-3 font-semibold">{r.student_name}</td>
                  <td className="p-3 font-mono text-xs">{r.admission_number}</td>
                  <td className="p-3">{r.institution_name}</td>
                  <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[r.status] ?? ""}`}>{r.status}</span></td>
                  <td className="p-3 text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="p-3 text-xs text-slate-500">{r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
