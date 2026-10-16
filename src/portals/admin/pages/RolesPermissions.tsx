import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../../lib/supabase";

type Assignment = { user_id: string; email: string; role: string; institution_id: string | null; created_at: string };

export default function RolesPermissions() {
  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) { setError("Supabase is not configured."); setLoading(false); return; }
    const { data, error } = await supabase.rpc("gss_admin_list_role_assignments");
    setItems((data ?? []) as Assignment[]);
    setError(error?.message ?? "");
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function grantGuardian(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true); setError(""); setNotice("");
    const { error } = await supabase.rpc("gss_admin_grant_guardian_role", { p_email: email.trim() });
    setBusy(false);
    if (error) setError(error.message);
    else { setNotice("Guardian access granted."); setEmail(""); await load(); }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6">
      <header>
        <h1 className="text-3xl font-bold">Roles & Permissions</h1>
        <p className="mt-2 text-slate-600">Guardian access is granted here only. Self-service signup never grants it.</p>
      </header>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-bold">Grant guardian access</h2>
        <form onSubmit={grantGuardian} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            Account email
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-72 rounded border p-2" />
          </label>
          <button type="submit" disabled={busy || !email.trim()} className="rounded bg-[#1761c5] px-4 py-2 font-semibold text-white disabled:opacity-40">
            {busy ? "Granting…" : "Grant guardian"}
          </button>
        </form>
        {notice && <p role="status" className="mt-3 text-sm text-emerald-700">{notice}</p>}
      </section>

      {error && <p role="alert" className="text-red-700">{error}</p>}
      {loading ? <p>Loading…</p> : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Institution</th><th className="p-3">Granted</th></tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={`${a.user_id}-${a.role}-${a.institution_id ?? "none"}`} className="border-t">
                  <td className="p-3">{a.email}</td>
                  <td className="p-3 font-mono text-xs">{a.role}</td>
                  <td className="p-3 font-mono text-xs">{a.institution_id ?? "—"}</td>
                  <td className="p-3">{new Date(a.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
