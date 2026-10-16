import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../auth/AuthProvider";
import { formatMinor } from "../../../lib/money";

type FeeRow = {
  institution_id: string;
  institution_name: string;
  label: string;
  amount_minor: number;
  currency_code: string;
  programme_name: string | null;
  academic_year: string | null;
};

type Transaction = {
  id: string;
  reference: string;
  amount_minor: number;
  currency_code: string;
  transaction_type: string;
  status: string;
  description: string;
  occurred_at: string;
};

export default function TuitionFees() {
  const { user } = useAuth();
  const [fees, setFees] = useState<FeeRow[]>([]);
  const [payments, setPayments] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase || !user) {
        setError("Supabase is not configured.");
        setLoading(false);
        return;
      }
      try {
        const [f, t] = await Promise.all([
          supabase.rpc("gss_student_tuition_fees"),
          supabase
            .from("gss_transactions")
            .select("id,reference,amount_minor,currency_code,transaction_type,status,description,occurred_at")
            .in("transaction_type", ["tuition", "fees"])
            .order("occurred_at", { ascending: false })
            .limit(50),
        ]);
        if (f.error) throw f.error;
        if (t.error) throw t.error;
        if (active) {
          setFees((f.data ?? []) as FeeRow[]);
          setPayments((t.data ?? []) as Transaction[]);
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Unable to load tuition fees.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [user]);

  const totalsByCurrency = payments
    .filter((p) => p.status === "completed")
    .reduce<Record<string, number>>((acc, p) => {
      acc[p.currency_code] = (acc[p.currency_code] ?? 0) + p.amount_minor;
      return acc;
    }, {});

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-5 py-6">
      <header className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><GraduationCap size={24} aria-hidden="true" /></span>
        <div>
          <h1 className="text-2xl font-extrabold">Tuition & fees</h1>
          <p className="mt-1 text-sm text-slate-500">Institution-published fees and your payment history.</p>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p role="status" className="text-slate-500">Loading…</p>
      ) : (
        <>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold">Published fees</h2>
            {fees.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Your institutions have not published fee schedules yet. Ask your institution admin to add tuition fees in their portal.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {fees.map((f, i) => (
                  <li key={i} className="py-3">
                    <p className="font-semibold">{f.label}</p>
                    <p className="mt-1 text-xs text-slate-500">{f.institution_name}{f.programme_name ? ` · ${f.programme_name}` : ""}{f.academic_year ? ` · ${f.academic_year}` : ""}</p>
                    <p className="mt-1 text-sm font-bold">{formatMinor(f.amount_minor, f.currency_code)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold">Tuition & fees paid</h2>
            {Object.keys(totalsByCurrency).length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No completed tuition or fee payments yet.</p>
            ) : (
              <div className="mt-3 space-y-1">
                {Object.entries(totalsByCurrency).map(([cur, minor]) => (
                  <p key={cur} className="text-2xl font-bold">{formatMinor(minor, cur)}</p>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-lg font-bold">Recent payments</h2>
            {payments.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No tuition or fee payments recorded yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-slate-500">{p.reference}</p>
                      <p className="mt-1 truncate text-sm text-slate-700">{p.description || "—"}</p>
                      <p className="mt-1 text-xs text-slate-400">{new Date(p.occurred_at).toLocaleDateString()} · <span className="capitalize">{p.status}</span></p>
                    </div>
                    <p className="shrink-0 font-bold">{formatMinor(p.amount_minor, p.currency_code)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Link to="/student/wallet" className="block rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-700">Pay tuition or fees →</Link>
        </>
      )}
    </main>
  );
}
