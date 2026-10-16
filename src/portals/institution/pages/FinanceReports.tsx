import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { formatMinor } from "../../../lib/money";

type Row = {
  transaction_type: string;
  status: string;
  currency_code: string;
  transaction_count: number;
  total_minor: number;
};

export default function FinanceReports() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      if (!supabase) {
        if (active) { setError("Supabase is not configured."); setLoading(false); }
        return;
      }
      const { data, error } = await supabase.rpc("gss_institution_finance_summary");
      if (!active) return;
      setRows((data ?? []) as Row[]);
      setError(error?.message ?? "");
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const completedByCurrency = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const r of rows) if (r.status === "completed") totals[r.currency_code] = (totals[r.currency_code] ?? 0) + r.total_minor;
    return totals;
  }, [rows]);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="text-3xl font-bold">Finance Reports</h1>
        <p className="mt-2 text-slate-600">Payments for your institution. Read-only summary from the verified ledger.</p>
      </header>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {loading ? <p>Loading…</p> : (
        <>
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border bg-white p-5">
              <p className="text-sm text-slate-600">Collected (completed)</p>
              {Object.keys(completedByCurrency).length === 0
                ? <p className="mt-1 text-2xl font-bold">None yet</p>
                : Object.entries(completedByCurrency).map(([cur, minor]) => (
                    <p key={cur} className="mt-1 text-2xl font-bold">{formatMinor(minor, cur)}</p>
                  ))}
            </div>
            <div className="rounded-xl border bg-white p-5">
              <p className="text-sm text-slate-600">Transactions</p>
              <p className="mt-1 text-2xl font-bold">{rows.reduce((n, r) => n + r.transaction_count, 0)}</p>
            </div>
          </section>
          {rows.length > 0 && (
            <div className="overflow-x-auto rounded-xl border bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr><th className="p-3">Type</th><th className="p-3">Status</th><th className="p-3">Count</th><th className="p-3 text-right">Total</th></tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={`${r.transaction_type}-${r.status}-${r.currency_code}`} className="border-t">
                      <td className="p-3 capitalize">{r.transaction_type}</td>
                      <td className="p-3 capitalize">{r.status}</td>
                      <td className="p-3">{r.transaction_count}</td>
                      <td className="p-3 text-right font-semibold">{formatMinor(r.total_minor, r.currency_code)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  );
}
