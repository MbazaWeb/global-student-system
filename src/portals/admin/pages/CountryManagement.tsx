import { useCallback, useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { adminService, type CountryRow } from "../services/adminService";

export default function CountryManagement() {
  const [rows, setRows] = useState<CountryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await adminService.listCountries());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load countries.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Globe size={24} aria-hidden="true" /></span>
        <div>
          <h1 className="text-3xl font-bold">Countries</h1>
          <p className="mt-1 text-sm text-slate-500">Read-only curated list of countries supported for institution applications.</p>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p role="status" className="text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <h3 className="font-bold">No countries available</h3>
          <p className="mt-2 text-sm text-slate-500">The curated list is empty. Contact the platform team.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr><th className="p-3">ISO 2</th><th className="p-3">Name</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.iso2} className="border-t">
                  <td className="p-3 font-mono text-xs">{r.iso2}</td>
                  <td className="p-3 font-semibold">{r.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
