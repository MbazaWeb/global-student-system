import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supportService, type SupportCaseListItem } from "../services/supportService";

const STATUS_STYLE: Record<string, string> = {
  open: "bg-amber-50 text-amber-800",
  in_progress: "bg-blue-50 text-blue-700",
  awaiting_student: "bg-violet-50 text-violet-700",
  resolved: "bg-emerald-50 text-emerald-700",
  closed: "bg-slate-100 text-slate-600",
  refunded: "bg-emerald-50 text-emerald-700",
};

const PRIORITY_STYLE: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  normal: "bg-slate-100 text-slate-700",
  high: "bg-amber-50 text-amber-800",
  urgent: "bg-red-50 text-red-700",
};

export default function SupportDashboard() {
  const [cases, setCases] = useState<SupportCaseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCases(await supportService.listCases("", ""));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load support cases.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = {
    open: cases.filter((c) => c.status === "open").length,
    in_progress: cases.filter((c) => c.status === "in_progress").length,
    awaiting_student: cases.filter((c) => c.status === "awaiting_student").length,
    resolved: cases.filter((c) => c.status === "resolved").length,
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="text-3xl font-bold">Support console</h1>
        <p className="mt-2 text-slate-600">First-line support for student cases, transactions and refund requests.</p>
      </header>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Open", value: counts.open, to: "/support/cases?status=open" },
          { label: "In progress", value: counts.in_progress, to: "/support/cases?status=in_progress" },
          { label: "Awaiting student", value: counts.awaiting_student, to: "/support/cases?status=awaiting_student" },
          { label: "Resolved", value: counts.resolved, to: "/support/cases?status=resolved" },
        ].map((card) => (
          <Link key={card.label} to={card.to} className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-blue-300 hover:bg-blue-50">
            <p className="text-sm text-slate-600">{card.label}</p>
            <p className="mt-2 text-3xl font-bold">{loading ? "—" : card.value}</p>
          </Link>
        ))}
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Recent cases</h2>
          <Link to="/support/cases" className="text-sm font-semibold text-blue-700 underline">View all</Link>
        </div>
        {loading ? (
          <p role="status" className="mt-4 text-slate-500">Loading cases…</p>
        ) : cases.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <h3 className="font-bold">No support cases yet</h3>
            <p className="mt-2 text-sm text-slate-500">New cases opened by students will appear here.</p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Opened</th>
                </tr>
              </thead>
              <tbody>
                {cases.slice(0, 10).map((c) => (
                  <tr key={c.id} className="border-t hover:bg-slate-50">
                    <td className="p-3"><Link to={`/support/cases/${c.id}`} className="font-semibold text-blue-700 hover:underline">{c.subject}</Link></td>
                    <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[c.status] ?? "bg-slate-100 text-slate-600"}`}>{c.status.replaceAll("_", " ")}</span></td>
                    <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${PRIORITY_STYLE[c.priority] ?? ""}`}>{c.priority}</span></td>
                    <td className="p-3 text-xs text-slate-500">{new Date(c.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <nav className="flex flex-wrap gap-3">
        <Link to="/support/transactions" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">Search transactions</Link>
        <Link to="/support/refunds" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">Refund requests</Link>
      </nav>
    </main>
  );
}
