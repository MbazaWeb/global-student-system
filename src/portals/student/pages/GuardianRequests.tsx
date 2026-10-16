import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../auth/AuthProvider";

type GuardianLink = { id: string; relationship: string; status: string; created_at: string };

const RELATIONSHIP_LABEL: Record<string, string> = {
  parent: "Parent",
  legal_guardian: "Legal guardian",
  sponsor: "Sponsor",
  other: "Other",
};

export default function GuardianRequests() {
  const { user } = useAuth();
  const [links, setLinks] = useState<GuardianLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase || !user) {
      setError("Supabase is not configured.");
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("guardian_links")
      .select("id,relationship,status,created_at")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false });
    setLinks((data ?? []) as GuardianLink[]);
    setError(error?.message ?? "");
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(id: string, action: "accept" | "decline" | "revoke") {
    if (!supabase) return;
    setBusy(id);
    setError("");
    const result =
      action === "revoke"
        ? await supabase.rpc("gss_student_revoke_guardian_link", { p_link_id: id })
        : await supabase.rpc("gss_student_decide_guardian_link", { p_link_id: id, p_accept: action === "accept" });
    setBusy(null);
    if (result.error) setError(result.error.message);
    else await load();
  }

  const pending = links.filter((l) => l.status === "pending");
  const active = links.filter((l) => l.status === "active");

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <header>
        <h1 className="text-3xl font-bold">Family access</h1>
        <p className="mt-2 text-slate-600">Only people you approve can see your enrollments and payments.</p>
      </header>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {loading ? <p>Loading…</p> : (
        <>
          <section>
            <h2 className="text-xl font-bold">Pending requests</h2>
            {pending.length === 0 ? <p className="mt-3 text-slate-600">No pending requests.</p> : (
              <ul className="mt-3 grid gap-3">
                {pending.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
                    <div>
                      <p className="font-semibold">{RELATIONSHIP_LABEL[l.relationship] ?? l.relationship}</p>
                      <p className="text-xs text-slate-500">Requested {new Date(l.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button disabled={busy === l.id} onClick={() => void act(l.id, "accept")} className="min-h-11 rounded bg-[#1761c5] px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">Approve</button>
                      <button disabled={busy === l.id} onClick={() => void act(l.id, "decline")} className="min-h-11 rounded border px-3 py-2 text-sm font-semibold disabled:opacity-40">Decline</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h2 className="text-xl font-bold">Approved</h2>
            {active.length === 0 ? <p className="mt-3 text-slate-600">No approved family members.</p> : (
              <ul className="mt-3 grid gap-3">
                {active.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
                    <div>
                      <p className="font-semibold">{RELATIONSHIP_LABEL[l.relationship] ?? l.relationship}</p>
                      <p className="text-xs text-slate-500">Approved access</p>
                    </div>
                    <button disabled={busy === l.id} onClick={() => void act(l.id, "revoke")} className="min-h-11 rounded border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-40">Revoke access</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
