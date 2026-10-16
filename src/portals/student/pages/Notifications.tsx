import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../auth/AuthProvider";
import { Bell, Check } from "lucide-react";

type Notification = {
  id: string;
  title: string;
  body: string;
  category: string;
  read_at: string | null;
  created_at: string;
};

const CATEGORY_STYLE: Record<string, string> = {
  general: "bg-slate-100 text-slate-600",
  payment: "bg-blue-50 text-blue-700",
  verification: "bg-emerald-50 text-emerald-700",
  support: "bg-amber-50 text-amber-800",
  system: "bg-violet-50 text-violet-700",
};

export default function Notifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase || !user) {
      setError("Supabase is not configured.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase.rpc("gss_list_notifications", { p_limit: 50 });
      if (error) throw error;
      setItems((data ?? []) as Notification[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markOne(id: string) {
    if (!supabase || busy) return;
    setBusy(id);
    try {
      const { error } = await supabase.rpc("gss_mark_notification_read", { p_notification_id: id });
      if (error) throw error;
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not mark notification.");
    } finally {
      setBusy(null);
    }
  }

  async function markAll() {
    if (!supabase || busy) return;
    setBusy("all");
    try {
      const { error } = await supabase.rpc("gss_mark_all_notifications_read");
      if (error) throw error;
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not mark all notifications.");
    } finally {
      setBusy(null);
    }
  }

  const unread = items.filter((n) => !n.read_at).length;

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-5 py-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Bell size={24} aria-hidden="true" /></span>
          <div>
            <h1 className="text-2xl font-extrabold">Notifications</h1>
            <p className="mt-1 text-sm text-slate-500">{unread > 0 ? `${unread} unread` : "All caught up"}</p>
          </div>
        </div>
        {unread > 0 && (
          <button type="button" disabled={busy === "all"} onClick={() => void markAll()} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold hover:bg-slate-50 disabled:opacity-40">
            {busy === "all" ? "Marking…" : "Mark all read"}
          </button>
        )}
      </header>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p role="status" className="text-slate-500">Loading notifications…</p>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <Bell className="mx-auto text-blue-300" size={36} aria-hidden="true" />
          <h3 className="mt-3 font-bold">No notifications yet</h3>
          <p className="mt-2 text-sm text-slate-500">Updates about your cases, payments and verification will appear here.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((n) => (
            <li key={n.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${n.read_at ? "border-slate-200" : "border-blue-300 bg-blue-50/30"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${CATEGORY_STYLE[n.category] ?? "bg-slate-100 text-slate-600"}`}>{n.category}</span>
                    <p className="font-bold">{n.title}</p>
                  </div>
                  {n.body && <p className="mt-2 break-words text-sm text-slate-700">{n.body}</p>}
                  <p className="mt-2 text-xs text-slate-400">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                {!n.read_at && (
                  <button
                    type="button"
                    disabled={busy === n.id}
                    onClick={() => void markOne(n.id)}
                    aria-label="Mark as read"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-700 text-white disabled:opacity-40"
                  >
                    <Check size={18} aria-hidden="true" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
