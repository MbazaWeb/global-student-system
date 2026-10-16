import { useCallback, useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { fetchPlatformAnalytics } from "../services/analyticsService";

type Stats = Record<string, unknown>;

function fmt(value: unknown): string {
  if (value === null || value === undefined) return "0";
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export default function PlatformAnalytics() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const s = await fetchPlatformAnalytics();
      setStats(s);
      setError(s === null ? "Not authorized. Platform admin role required." : "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const cards = stats ? Object.entries(stats).filter(([, v]) => typeof v === "number") : [];

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><BarChart3 size={24} aria-hidden="true" /></span>
        <div>
          <h1 className="text-3xl font-bold">Platform analytics</h1>
          <p className="mt-1 text-sm text-slate-500">Aggregate counts across students, institutions, transactions, support and refunds.</p>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p role="status" className="text-slate-500">Loading…</p>
      ) : stats && cards.length > 0 ? (
        <>
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {cards.map(([key, value]) => (
              <div key={key} className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs text-slate-500">{key.replaceAll("_", " ")}</p>
                <p className="mt-2 text-2xl font-bold">{fmt(value)}</p>
              </div>
            ))}
          </section>
          {stats.institutions_by_status && (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="font-bold">Institutions by status</h2>
              <pre className="mt-3 overflow-x-auto text-xs">{JSON.stringify(stats.institutions_by_status, null, 2)}</pre>
            </section>
          )}
          {stats.transactions_by_status && (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="font-bold">Transactions by status</h2>
              <pre className="mt-3 overflow-x-auto text-xs">{JSON.stringify(stats.transactions_by_status, null, 2)}</pre>
            </section>
          )}
          {stats.support_cases_by_status && (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="font-bold">Support cases by status</h2>
              <pre className="mt-3 overflow-x-auto text-xs">{JSON.stringify(stats.support_cases_by_status, null, 2)}</pre>
            </section>
          )}
          {stats.refunds_by_status && (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="font-bold">Refunds by status</h2>
              <pre className="mt-3 overflow-x-auto text-xs">{JSON.stringify(stats.refunds_by_status, null, 2)}</pre>
            </section>
          )}
        </>
      ) : null}
    </main>
  );
}
