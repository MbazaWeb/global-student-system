import { useCallback, useEffect, useState } from "react";
import { Users, ShieldCheck, Info } from "lucide-react";
import { institutionService, type StaffRow } from "../services/institutionService";

/**
 * StaffManagement — READ-ONLY by policy.
 *
 * Per the project decision: institution_staff is forbidden (migration
 * 20261016000500 forbids it, 20261017000001 enforces it). Each institution
 * has at most one institution_admin (unique partial index
 * gss_one_institution_admin). StaffManagement therefore lists who holds
 * institution_admin for the caller's own institution and shows a notice
 * that staff accounts are not enabled. No grant function exists or is
 * added here.
 */
export default function StaffManagement() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setStaff(await institutionService.staff());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load staff listing.");
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
          <p className="mt-2 text-slate-600">Read-only listing of administrators for your institution.</p>
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
        ) : staff.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <h3 className="font-bold">No administrator assigned</h3>
            <p className="mt-2 text-sm text-slate-500">A platform admin must assign an institution admin via Admin Assignments.</p>
          </div>
        ) : (
          <ul className="mt-4 grid gap-3">
            {staff.map((s) => (
              <li key={s.user_id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-emerald-700"><ShieldCheck size={20} aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <p className="break-words font-semibold">{s.email}</p>
                  <p className="mt-1 font-mono text-xs text-slate-500">{s.user_id}</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold capitalize text-emerald-700">{s.role.replaceAll("_", " ")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
