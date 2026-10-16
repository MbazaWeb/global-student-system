import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Stats = Record<string, number>;

const LABELS: { key: string; label: string }[] = [
  { key: "institutions_verified", label: "Verified institutions" },
  { key: "applications_open", label: "Open institution applications" },
  { key: "verification_requests_pending", label: "Pending enrollment verifications" },
  { key: "students", label: "Student profiles" },
  { key: "guardian_links_active", label: "Active guardian links" },
  { key: "guardian_links_pending", label: "Guardian requests awaiting approval" },
  { key: "transactions_completed", label: "Completed payments" },
  { key: "transactions_pending", label: "Pending payments" },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!supabase) {
        if (active) { setError("Supabase is not configured."); setLoading(false); }
        return;
      }
      const { data, error } = await supabase.rpc("gss_admin_dashboard_stats");
      if (!active) return;
      setStats((data ?? null) as Stats | null);
      setError(error?.message ?? (data === null ? "Not authorized." : ""));
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-3xl font-bold">Platform Dashboard</h1>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {loading ? <p>Loading…</p> : stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LABELS.map(({ key, label }) => (
            <div key={key} className="rounded-xl border bg-white p-5">
              <p className="text-sm text-slate-600">{label}</p>
              <p className="mt-2 text-3xl font-bold">{stats[key] ?? 0}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
