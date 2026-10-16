import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supportService, type SupportTransaction } from "../services/supportService";
import { formatMinor } from "../../../lib/money";

export default function SupportTransactionSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SupportTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const run = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setResults(await supportService.searchTransactions(q));
      setSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void run(query), 300);
    return () => window.clearTimeout(t);
  }, [query, run]);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="text-3xl font-bold">Transaction search</h1>
        <p className="mt-2 text-slate-600">Search by reference, student UUID, Global Student ID or description.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <input
          aria-label="Search transactions"
          className="min-h-11 w-full rounded-lg border border-slate-200 p-3 text-sm"
          placeholder="e.g. TX-1, GSS-0000100000, or a student UUID"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <p className="mt-2 text-xs text-slate-500">Up to 50 most recent matches.</p>
      </section>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p role="status" className="text-slate-500">Searching…</p>
      ) : searched && results.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <h3 className="font-bold">No matching transactions</h3>
          <p className="mt-2 text-sm text-slate-500">Try a different reference or identifier.</p>
        </div>
      ) : results.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3">Reference</th>
                <th className="p-3">Global Student ID</th>
                <th className="p-3">Type</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {results.map((t) => (
                <tr key={t.id} className="border-t hover:bg-slate-50">
                  <td className="p-3 font-mono text-xs">{t.reference}</td>
                  <td className="p-3 font-mono text-xs">{t.global_student_id ?? "—"}</td>
                  <td className="p-3 capitalize">{t.transaction_type}</td>
                  <td className="p-3 capitalize">{t.status}</td>
                  <td className="p-3 text-right font-semibold">{formatMinor(t.amount_minor, t.currency_code)}</td>
                  <td className="p-3 text-xs text-slate-500">{new Date(t.occurred_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-slate-500">Enter a search term above.</p>
      )}

      <nav className="flex flex-wrap gap-3">
        <Link to="/support/dashboard" className="text-sm font-semibold text-blue-700 underline">← Back to dashboard</Link>
      </nav>
    </main>
  );
}
