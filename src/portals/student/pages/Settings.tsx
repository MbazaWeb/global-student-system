import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Settings as SettingsIcon, UserRound, Bell, ShieldCheck, Globe, LogOut } from "lucide-react";
import { useAuth } from "../../../auth/AuthProvider";
import { supabase } from "../../../lib/supabase";

/**
 * Student settings page. Read-only summary of account + preferences. The
 * editable surface is StudentProfile; this page surfaces the levers a student
 * can pull (profile, notifications, sign-out) and shows whether Supabase is
 * configured.
 */
export default function Settings() {
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [unread, setUnread] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase || !user) return;
      try {
        const { data, error } = await supabase.rpc("gss_list_notifications", { p_limit: 50 });
        if (error) throw error;
        if (active) setUnread((data ?? []).filter((n: { read_at: string | null }) => !n.read_at).length);
      } catch {
        if (active) setUnread(null);
      }
    }
    void load();
    return () => { active = false; };
  }, [user]);

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
    <main className="mx-auto max-w-2xl space-y-6 px-5 py-6">
      <header className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><SettingsIcon size={24} aria-hidden="true" /></span>
        <div>
          <h1 className="text-2xl font-extrabold">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">Account, preferences and security.</p>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
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

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold">Preferences</h2>
        <ul className="mt-3 divide-y divide-slate-100">
          <li>
            <Link to="/student/profile" className="flex min-h-12 items-center justify-between gap-3 py-3">
              <span className="flex items-center gap-3"><UserRound size={18} aria-hidden="true" /> Profile details</span>
              <span className="text-sm text-blue-700">Edit →</span>
            </Link>
          </li>
          <li>
            <Link to="/student/notifications" className="flex min-h-12 items-center justify-between gap-3 py-3">
              <span className="flex items-center gap-3"><Bell size={18} aria-hidden="true" /> Notifications</span>
              <span className="text-sm text-slate-500">{unread === null ? "—" : `${unread} unread`}</span>
            </Link>
          </li>
          <li>
            <Link to="/student/bank" className="flex min-h-12 items-center justify-between gap-3 py-3">
              <span className="flex items-center gap-3"><ShieldCheck size={18} aria-hidden="true" /> Bank integration</span>
              <span className="text-sm text-blue-700">Manage →</span>
            </Link>
          </li>
        </ul>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold">Regional</h2>
        <div className="mt-3 flex items-center gap-3 text-sm text-slate-600">
          <Globe size={18} aria-hidden="true" />
          <span>Wallet currency: TZS (Tanzanian Shilling). Mobile-money providers are scoped to Tanzania.</span>
        </div>
      </section>

      <button
        type="button"
        onClick={() => void logout()}
        disabled={signingOut}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-3 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        <LogOut size={19} aria-hidden="true" />
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
      {logoutError && <p role="alert" className="text-sm text-red-700">{logoutError}</p>}
    </main>
  );
}
