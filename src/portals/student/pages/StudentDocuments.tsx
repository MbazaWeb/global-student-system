import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, ShieldCheck, Clock3, CircleX, Download } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../auth/AuthProvider";

/**
 * Student documents page. Without a dedicated documents table, this surfaces
 * the real, verifiable documents GSS already holds: the Global Student ID
 * and verified enrollment records. Each verified enrollment is a proof-of-
 * enrollment document. No new table was added; this page reads existing data.
 */
type Profile = { display_name: string; avatar_path: string | null };
type GlobalId = { global_student_id: string; issued_at: string };
type Enrollment = {
  id: string;
  admission_number: string;
  verification_status: string;
  course_name: string | null;
  academic_year: string | null;
  institution_id: string;
  created_at: string;
};
type Institution = { id: string; name: string };

const STATUS_ICON: Record<string, typeof ShieldCheck> = {
  verified: ShieldCheck,
  pending: Clock3,
  rejected: CircleX,
  review_required: Clock3,
};

export default function StudentDocuments() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [globalId, setGlobalId] = useState<GlobalId | null>(null);
  const [enrollments, setEnrollments] = useState<(Enrollment & { institution_name: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase || !user) {
        setError("Supabase is not configured.");
        setLoading(false);
        return;
      }
      try {
        const [p, g, e] = await Promise.all([
          supabase.from("student_profiles").select("display_name,avatar_path").eq("id", user.id).maybeSingle(),
          supabase.from("student_global_ids").select("global_student_id,issued_at").eq("student_id", user.id).maybeSingle(),
          supabase.from("student_enrollments").select("id,admission_number,verification_status,course_name,academic_year,institution_id,created_at").eq("student_id", user.id).order("created_at", { ascending: false }),
        ]);
        if (p.error || g.error || e.error) throw p.error || g.error || e.error;
        const rows = (e.data ?? []) as Enrollment[];
        const instIds = [...new Set(rows.map((r) => r.institution_id))];
        const instMap = new Map<string, string>();
        if (instIds.length > 0) {
          const { data: insts, error: ie } = await supabase.from("institutions").select("id,name").in("id", instIds);
          if (ie) throw ie;
          for (const i of (insts ?? []) as Institution[]) instMap.set(i.id, i.name);
        }
        if (active) {
          setProfile((p.data ?? null) as Profile | null);
          setGlobalId((g.data ?? null) as GlobalId | null);
          setEnrollments(rows.map((r) => ({ ...r, institution_name: instMap.get(r.institution_id) ?? "Institution unavailable" })));
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Unable to load documents.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [user]);

  function printGlobalId() {
    window.print();
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-5 py-6">
      <header className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><FileText size={24} aria-hidden="true" /></span>
        <div>
          <h1 className="text-2xl font-extrabold">Documents</h1>
          <p className="mt-1 text-sm text-slate-500">Your Global Student ID and verified enrollment records.</p>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p role="status" className="text-slate-500">Loading…</p>
      ) : (
        <>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold">Global Student ID</h2>
            {globalId ? (
              <>
                <p className="mt-3 break-all font-mono text-2xl font-bold tracking-wide">{globalId.global_student_id}</p>
                <p className="mt-2 text-xs text-slate-500">Issued {new Date(globalId.issued_at).toLocaleDateString()}</p>
                <p className="mt-2 text-xs text-slate-500">For {profile?.display_name ?? "Student"}</p>
                <button type="button" onClick={printGlobalId} className="mt-4 flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold hover:bg-slate-50">
                  <Download size={16} aria-hidden="true" /> Print / save as PDF
                </button>
                <p className="mt-3 text-xs text-slate-400">This is not a government ID or bank KYC document.</p>
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-500">Your Global Student ID has not been issued yet.</p>
            )}
          </section>

          <section>
            <h2 className="text-lg font-bold">Enrollment records</h2>
            {enrollments.length === 0 ? (
              <div className="mt-3 rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center">
                <h3 className="font-bold">No enrollment records</h3>
                <p className="mt-2 text-sm text-slate-500">Add your admission details to start verification.</p>
                <Link to="/student/admission" className="mt-3 inline-block font-semibold text-blue-700 underline">Add admission →</Link>
              </div>
            ) : (
              <ul className="mt-3 space-y-3">
                {enrollments.map((e) => {
                  const Icon = STATUS_ICON[e.verification_status] ?? Clock3;
                  return (
                    <li key={e.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <span className="rounded-xl bg-blue-50 p-2 text-blue-700"><FileText size={20} aria-hidden="true" /></span>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold">{e.institution_name}</h3>
                          <p className="mt-1 text-sm text-slate-600">Admission: <span className="font-semibold">{e.admission_number}</span></p>
                          {e.course_name && <p className="mt-1 text-sm text-slate-600">{e.course_name}</p>}
                          {e.academic_year && <p className="mt-1 text-xs text-slate-400">Academic year {e.academic_year}</p>}
                        </div>
                        <span className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold capitalize ${e.verification_status === "verified" ? "bg-emerald-50 text-emerald-700" : e.verification_status === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>
                          <Icon size={14} aria-hidden="true" />{e.verification_status.replaceAll("_", " ")}
                        </span>
                      </div>
                      {e.verification_status === "verified" && (
                        <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">This verified enrollment can be presented as proof of enrollment at {e.institution_name}.</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <p className="text-center text-xs text-slate-400">Official transcripts and certificates are issued by your institution, not GSS.</p>
        </>
      )}
    </main>
  );
}
