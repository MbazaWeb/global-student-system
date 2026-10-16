import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Stats = {
  institutions_verified: number;
  applications_open: number;
  verification_requests_pending: number;
  students: number;
  guardian_links_active: number;
  guardian_links_pending: number;
  transactions_completed: number;
  transactions_pending: number;
};

type Card = { label: string; value: number };

/** PlatformStats — reusable stats grid used by the admin dashboard.
 *  Calls gss_admin_dashboard_stats (returns null for non-platform_admin). */
export default function PlatformStats() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) {
        setError("Supabase is not configured.");
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase.rpc("gss_admin_dashboard_stats");
        if (error) throw error;
        if (active) {
          if (data === null) {
            setError("Not authorized. Platform admin role required.");
            setCards([]);
          } else {
            const s = data as Stats;
            setCards([
              { label: "Verified institutions", value: s.institutions_verified ?? 0 },
              { label: "Open applications", value: s.applications_open ?? 0 },
              { label: "Pending verifications", value: s.verification_requests_pending ?? 0 },
              { label: "Students", value: s.students ?? 0 },
              { label: "Active guardian links", value: s.guardian_links_active ?? 0 },
              { label: "Pending guardian links", value: s.guardian_links_pending ?? 0 },
              { label: "Completed payments", value: s.transactions_completed ?? 0 },
              { label: "Pending payments", value: s.transactions_pending ?? 0 },
            ]);
            setError("");
          }
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Unable to load stats.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  if (loading) return <p role="status" className="text-slate-500">Loading stats…</p>;
  if (error) return <p role="alert" className="text-sm text-red-700">{error}</p>;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-600">{c.label}</p>
          <p className="mt-2 text-3xl font-bold">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
