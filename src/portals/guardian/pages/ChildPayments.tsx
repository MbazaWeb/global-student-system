import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatMinor } from "../../../lib/money";
import { guardianService, type ChildPayment } from "../services/guardianService";

export default function ChildPayments() {
  const { studentId = "" } = useParams();
  const [items, setItems] = useState<ChildPayment[]>([]);
  const [studentName, setStudentName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [payments, children] = await Promise.all([
          guardianService.childPayments(studentId),
          guardianService.listChildren(),
        ]);
        if (!active) return;
        setItems(payments);
        setStudentName(children.find((c) => c.student_id === studentId)?.student_name ?? "");
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Could not load payments.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [studentId]);

  const completedTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const p of items) if (p.status === "completed") totals[p.currency_code] = (totals[p.currency_code] ?? 0) + p.amount_minor;
    return totals;
  }, [items]);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <Link to="/guardian/dashboard" className="text-sm underline">← Back to children</Link>
      <h1 className="text-3xl font-bold">Payments{studentName ? ` · ${studentName}` : ""}</h1>

      {error && <p role="alert" className="text-red-700">{error}</p>}
      {loading ? <p>Loading…</p> : (
        <>
          <section className="rounded-xl border bg-white p-5">
            <p className="text-sm text-slate-600">Completed to date</p>
            {Object.keys(completedTotals).length === 0
              ? <p className="mt-1 text-2xl font-bold">None</p>
              : Object.entries(completedTotals).map(([cur, minor]) => (
                  <p key={cur} className="mt-1 text-2xl font-bold">{formatMinor(minor, cur)}</p>
                ))}
          </section>

          {items.length === 0 ? (
            <p className="text-slate-600">No payments recorded.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="p-3">Date</th><th className="p-3">Reference</th><th className="p-3">Type</th>
                    <th className="p-3">Description</th><th className="p-3">Status</th><th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={p.reference} className="border-t">
                      <td className="p-3">{new Date(p.occurred_at).toLocaleDateString()}</td>
                      <td className="p-3 font-mono text-xs">{p.reference}</td>
                      <td className="p-3 capitalize">{p.transaction_type}</td>
                      <td className="p-3">{p.description}</td>
                      <td className="p-3 capitalize">{p.status}</td>
                      <td className="p-3 text-right font-semibold">{formatMinor(p.amount_minor, p.currency_code)}</td>
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
