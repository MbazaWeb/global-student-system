import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { Settings as SettingsIcon, Building2, ShieldCheck, Plug, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../auth/AuthProvider";

export default function Settings() {
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [integrationCount, setIntegrationCount] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    try {
      const { count, error } = await supabase.from("integration_status").select("*", { count: "exact", head: true });
      if (error) throw error;
      setIntegrationCount(count ?? 0);
    } catch {
      setIntegrationCount(null);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function logout() {
    setSigningOut(true);
    setLogoutError("");
    try {
      await signOut();
    } catch {
      setLogoutError("Unable to sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><SettingsIcon size={24} aria-hidden="true" /></span>
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">Institution admin account and links.</p>
        </div>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold">Account</h2>
        <dl className="mt-3 divide-y divide-slate-100">
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="text-sm text-slate-500">Signed in as</dt>
            <dd className="break-all text-right text-sm font-semibold">{user?.email ?? "—"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="text-sm text-slate-500">User ID</dt>
            <dd className="break-all text-right font-mono text-xs">{user?.id ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold">Institution</h2>
        <ul className="mt-3 divide-y divide-slate-100">
          <li><Link to="/institution/profile" className="flex min-h-12 items-center justify-between gap-3 py-3"><span className="flex items-center gap-3"><Building2 size={18} aria-hidden="true" /> Profile</span><span className="text-sm text-blue-700">View →</span></Link></li>
          <li><Link to="/institution/staff" className="flex min-h-12 items-center justify-between gap-3 py-3"><span className="flex items-center gap-3"><ShieldCheck size={18} aria-hidden="true" /> Staff</span><span className="text-sm text-blue-700">View →</span></Link></li>
          <li><Link to="/institution/integrations" className="flex min-h-12 items-center justify-between gap-3 py-3"><span className="flex items-center gap-3"><Plug size={18} aria-hidden="true" /> Integrations</span><span className="text-sm text-slate-500">{integrationCount === null ? "—" : `${integrationCount} configured`}</span></Link></li>
        </ul>
      </section>

      <button type="button" onClick={() => void logout()} disabled={signingOut} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-3 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
        <LogOut size={19} aria-hidden="true" />{signingOut ? "Signing out…" : "Sign out"}
      </button>
      {logoutError && <p role="alert" className="text-sm text-red-700">{logoutError}</p>}
    </main>
  );
}
