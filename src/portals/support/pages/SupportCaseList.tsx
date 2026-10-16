import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supportService, type SupportCaseListItem } from "../services/supportService";

const STATUS_STYLE: Record<string, string> = {
  open: "bg-amber-50 text-amber-800",
  in_progress: "bg-blue-50 text-blue-700",
  awaiting_student: "bg-violet-50 text-violet-700",
  resolved: "bg-emerald-50 text-emerald-700",
  closed: "bg-slate-100 text-slate-600",
  refunded: "bg-emerald-50 text-emerald-700",
};

const STATUSES = ["", "open", "in_progress", "awaiting_student", "resolved", "closed", "refunded"];

export default function SupportCaseList() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<SupportCaseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const status = params.get("status") ?? "";
  const search = params.get("q") ?? "";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await supportService.listCases(status, search));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load cases.");
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    void load();
  }, [load]);

  function update(next: { status?: string; q?: string }) {
    const merged = { status: next.status ?? status, q: next.q ?? search };
    const p = new URLSearchParams();
    if (merged.status) p.set("status", merged.status);
    if (merged.q) p.set("q", merged.q);
    setParams(p, { replace: true });
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="text-3xl font-bold">Support cases</h1>
        <p className="mt-2 text-slate-600">Search and filter all student support cases.</p>
      </header>

      <section className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <input
          aria-label="Search cases"
          className="min-h-11 flex-1 rounded-lg border border-slate-200 p-3 text-sm min-w-48"
          placeholder="Search by subject, description or case ID"
          value={search}
          onChange={(e) => update({ q: e.target.value })}
        />
        <select
          aria-label="Filter by status"
          className="min-h-11 rounded-lg border border-slate-200 p-3 text-sm"
          value={status}
          onChange={(e) => update({ status: e.target.value })}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s === "" ? "All statuses" : s.replaceAll("_", " ")}</option>
          ))}
        </select>
        <button onClick={() => void load()} className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-semibold hover:bg-slate-50">Refresh</button>
      </section>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p role="status" className="text-slate-500">Loading cases…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <h3 className="font-bold">No matching cases</h3>
          <p className="mt-2 text-sm text-slate-500">Try a different search or status filter.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3">Subject</th>
                <th className="p-3">Student</th>
                <th className="p-3">Status</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Opened</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t hover:bg-slate-50">
                  <td className="p-3"><Link to={`/support/cases/${c.id}`} className="font-semibold text-blue-700 hover:underline">{c.subject}</Link></td>
                  <td className="p-3 font-mono text-xs text-slate-500">{c.student_id}</td>
                  <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[c.status] ?? ""}`}>{c.status.replaceAll("_", " ")}</span></td>
                  <td className="p-3 capitalize text-xs">{c.priority}</td>
                  <td className="p-3 text-xs text-slate-500">{new Date(c.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
