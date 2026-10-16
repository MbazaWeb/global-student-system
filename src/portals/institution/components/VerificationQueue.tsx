import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import AdmissionStatusBadge from "./AdmissionStatusBadge";

type Row = {
  request_id: string;
  student_name: string;
  admission_number: string;
  status: string;
  created_at: string;
  review_note: string | null;
};

type Props = { filter?: string };

/** VerificationQueue — reusable read-only queue list. Used by the institution
 *  portal's verification page. The actual decision buttons live on
 *  StudentVerification, which calls gss_decide_enrollment_verification. */
export default function VerificationQueue({ filter = "pending" }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (!supabase) throw new Error("Supabase is not configured.");
      const { data, error } = await supabase.rpc("gss_institution_verification_queue");
      if (error) throw error;
      const all = (data ?? []) as Row[];
      setRows(filter === "all" ? all : all.filter((r) => r.status === filter));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load verification queue.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  if (error) return <p role="alert" className="text-sm text-red-700">{error}</p>;
  if (loading) return <p role="status" className="text-sm text-slate-500">Loading…</p>;
  if (rows.length === 0) return <p className="text-sm text-slate-500">No {filter} verification requests.</p>;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.request_id} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-bold">{r.admission_number}</p>
              <p className="text-sm text-slate-600">{r.student_name}</p>
              <p className="text-xs text-slate-400">Requested {new Date(r.created_at).toLocaleString()}</p>
            </div>
            <AdmissionStatusBadge status={r.status} />
          </div>
          {r.review_note && <p className="mt-2 text-sm text-slate-700">{r.review_note}</p>}
        </li>
      ))}
    </ul>
  );
}
