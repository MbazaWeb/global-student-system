import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { Plug, Info } from "lucide-react";

type Row = { id: string; name: string; kind: string; status: string; description: string; updated_at: string };

const STATUS_STYLE: Record<string, string> = {
  proposed: "bg-slate-100 text-slate-600",
  sandbox: "bg-amber-50 text-amber-800",
  live: "bg-emerald-50 text-emerald-700",
  disabled: "bg-red-50 text-red-700",
};

export default function IntegrationSettings() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (!supabase) throw new Error("Supabase is not configured.");
      const { data, error } = await supabase.from("integration_status").select("id,name,kind,status,description,updated_at").order("kind").order("name");
      if (error) throw error;
      setRows((data ?? []) as Row[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load integration status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Plug size={24} aria-hidden="true" /></span>
        <div>
          <h1 className="text-3xl font-bold">Integration settings</h1>
          <p className="mt-1 text-sm text-slate-500">Status of payment, banking and notification integrations.</p>
        </div>
      </header>

      <section className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <Info className="shrink-0 text-amber-700" size={20} aria-hidden="true" />
        <p className="text-sm text-amber-800">Integrations are configured by platform admins. Institution admins can view status only.</p>
      </section>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p role="status" className="text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <h3 className="font-bold">No integrations configured</h3>
        </div>
      ) : (
        <ul className="grid gap-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{r.name}</p>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[r.status] ?? ""}`}>{r.status}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500 capitalize">{r.kind.replaceAll("_", " ")}</p>
              {r.description && <p className="mt-2 text-sm text-slate-700">{r.description}</p>}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
