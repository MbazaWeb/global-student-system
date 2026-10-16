import { useCallback, useEffect, useState } from "react";
import { Users, Info, Building2 } from "lucide-react";
import { institutionService, type InstitutionSelf } from "../services/institutionService";
import { useAuth } from "../../../auth/AuthProvider";

/**
 * StaffManagement — READ-ONLY by policy.
 *
 * institution_staff is forbidden (migration 20261016000500 forbids it,
 * 20261017000001 enforces it, 20261017000003 drops the dead staff_listing
 * function). Each institution has at most one institution_admin. This page
 * shows the institution name and the signed-in admin's email, plus a notice
 * that staff accounts are not enabled. No function grants institution_staff.
 */
export default function StaffManagement() {
  const { user } = useAuth();
  const [inst, setInst] = useState<InstitutionSelf | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setInst(await institutionService.self());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load institution details.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Users size={24} aria-hidden="true" /></span>
        <div>
          <h1 className="text-3xl font-bold">Staff management</h1>
          <p className="mt-2 text-slate-600">Read-only. Staff accounts are not enabled on this platform.</p>
        </div>
      </header>

      <section className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <Info className="shrink-0 text-amber-700" size={20} aria-hidden="true" />
        <div>
          <h2 className="font-bold text-amber-900">Staff accounts are not enabled</h2>
          <p className="mt-1 text-sm text-amber-800">
            GSS allows exactly one institution admin per institution. Additional staff accounts
            (the <code className="rounded bg-amber-100 px-1">institution_staff</code> role) are
            forbidden by policy. To change the administrator, a platform admin uses
            Admin Assignments.
          </p>
        </div>
      </section>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      <section>
        <h2 className="text-xl font-bold">Institution administrator</h2>
        {loading ? (
          <p role="status" className="mt-4 text-slate-500">Loading…</p>
        ) : (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-emerald-700"><Building2 size={20} aria-hidden="true" /></span>
              <div className="min-w-0 flex-1">
                <p className="break-words font-semibold">{user?.email ?? "—"}</p>
                <p className="mt-1 text-xs text-slate-500">{inst?.name ?? "Institution unavailable"} · {inst?.country_code ?? ""}</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Institution admin</span>
            </div>
            <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
              You are the sole administrator for this institution. Platform admins manage assignments via Admin Assignments.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
