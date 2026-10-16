import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supportService, type RefundRequest } from "../services/supportService";
import { useAuth } from "../../../auth/AuthProvider";
import { formatMinor } from "../../../lib/money";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800",
  approved: "bg-blue-50 text-blue-700",
  rejected: "bg-red-50 text-red-700",
  processed: "bg-emerald-50 text-emerald-700",
};

const STATUSES = ["", "pending", "approved", "rejected", "processed"];

export default function SupportRefundList() {
  const { roles } = useAuth();
  const canDecide = roles.includes("platform_admin");
  const [items, setItems] = useState<RefundRequest[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await supportService.listRefundRequests(status));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load refund requests.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="text-3xl font-bold">Refund requests</h1>
        <p className="mt-2 text-slate-600">
          {canDecide
            ? "Review and decide refund requests. Decisions are audited and notify the student."
            : "View refund requests. Only platform admins can decide refunds."}
        </p>
      </header>

      <section className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <select
          aria-label="Filter by status"
          className="min-h-11 rounded-lg border border-slate-200 p-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s === "" ? "All statuses" : s}</option>)}
        </select>
        <button onClick={() => void load()} className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-semibold hover:bg-slate-50">Refresh</button>
      </section>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p role="status" className="text-slate-500">Loading…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <h3 className="font-bold">No refund requests</h3>
          <p className="mt-2 text-sm text-slate-500">{status ? `No ${status} refund requests.` : "Refund requests will appear here."}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Requested</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-t hover:bg-slate-50">
                  <td className="p-3 font-semibold">{formatMinor(r.amount_minor, r.currency_code)}</td>
                  <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[r.status] ?? ""}`}>{r.status}</span></td>
                  <td className="p-3 max-w-md truncate text-slate-600">{r.reason}</td>
                  <td className="p-3 text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-3"><Link to={`/support/cases/${r.case_id}`} className="font-semibold text-blue-700 underline">Open case</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
