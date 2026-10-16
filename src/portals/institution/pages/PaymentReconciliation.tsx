import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { formatMinor } from "../../../lib/money";
import { ArrowLeftRight } from "lucide-react";

type Transaction = {
  id: string;
  reference: string;
  student_id: string;
  amount_minor: number;
  currency_code: string;
  transaction_type: string;
  status: string;
  description: string;
  occurred_at: string;
};

export default function PaymentReconciliation() {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (!supabase) throw new Error("Supabase is not configured.");
      const { data, error } = await supabase
        .from("gss_transactions")
        .select("id,reference,student_id,amount_minor,currency_code,transaction_type,status,description,occurred_at")
        .order("occurred_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      setRows((data ?? []) as Transaction[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load transactions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visible = rows.filter((r) => status === "all" || r.status === status);

  const totals = visible.reduce<Record<string, { count: number; minor: number }>>((acc, r) => {
    const key = r.currency_code;
    acc[key] = acc[key] ?? { count: 0, minor: 0 };
    acc[key].count += 1;
    if (r.status === "completed") acc[key].minor += r.amount_minor;
    return acc;
  }, {});

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><ArrowLeftRight size={24} aria-hidden="true" /></span>
        <div>
          <h1 className="text-3xl font-bold">Payment reconciliation</h1>
          <p className="mt-1 text-sm text-slate-500">Institution transactions from the verified ledger.</p>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      <section className="flex flex-wrap gap-3">
        <select aria-label="Filter by status" className="min-h-11 rounded-lg border border-slate-200 p-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          {["all", "pending", "completed", "failed", "reversed"].map((s) => <option key={s} value={s}>{s === "all" ? "All statuses" : s[0].toUpperCase() + s.slice(1)}</option>)}
        </select>
        <button onClick={() => void load()} className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-semibold hover:bg-slate-50">Refresh</button>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {Object.entries(totals).map(([cur, t]) => (
          <div key={cur} className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-600">{cur} — {t.count} transactions</p>
            <p className="mt-2 text-2xl font-bold">{formatMinor(t.minor, cur)}</p>
            <p className="mt-1 text-xs text-slate-500">Completed total</p>
          </div>
        ))}
        {Object.keys(totals).length === 0 && !loading && (
          <p className="text-sm text-slate-500">No transactions to reconcile.</p>
        )}
      </section>

      {loading ? (
        <p role="status" className="text-slate-500">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <h3 className="font-bold">No transactions</h3>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3">Reference</th>
                <th className="p-3">Student</th>
                <th className="p-3">Type</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-t hover:bg-slate-50">
                  <td className="p-3 font-mono text-xs">{r.reference}</td>
                  <td className="p-3 font-mono text-xs text-slate-500">{r.student_id}</td>
                  <td className="p-3 capitalize">{r.transaction_type}</td>
                  <td className="p-3 capitalize">{r.status}</td>
                  <td className="p-3 text-right font-semibold">{formatMinor(r.amount_minor, r.currency_code)}</td>
                  <td className="p-3 text-xs text-slate-500">{new Date(r.occurred_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
