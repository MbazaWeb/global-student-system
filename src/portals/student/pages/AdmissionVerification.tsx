import { useCallback, useEffect, useState, type FormEvent } from "react";
import { GraduationCap, Building2, BadgeCheck, Clock3, Send, FileText, LoaderCircle } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../auth/AuthProvider";

type Institution = { id: string; name: string; country_code: string };
const courseOptions = [
  "Bachelor of Computer Science", "Bachelor of Information Technology",
  "Bachelor of Business Administration", "Bachelor of Accounting and Finance",
  "Bachelor of Education", "Bachelor of Laws", "Bachelor of Nursing",
  "Bachelor of Civil Engineering", "Diploma in Business Administration",
  "Diploma in Information Technology", "Diploma in Clinical Medicine",
  "Certificate in Business Studies",
];
const currentYear = new Date().getFullYear();
const academicYearOptions = Array.from({ length: 9 }, (_, index) => {
  const year = currentYear + 2 - index;
  return `${year}/${year + 1}`;
});
type Enrollment = { id: string; institution_id: string; admission_number: string; verification_status: string; created_at: string; course_name?: string|null; academic_year?: string|null };
const mockInstitutions: Institution[] = import.meta.env.DEV ? [
  { id: "mock-institute-1", name: "Demo · Sunrise University", country_code: "TZ" },
  { id: "mock-institute-2", name: "Demo · Lakeside Institute of Technology", country_code: "TZ" },
  { id: "mock-institute-3", name: "Demo · Highlands Business College", country_code: "TZ" },
  { id: "mock-institute-4", name: "Demo · Coastal Health Sciences Institute", country_code: "TZ" },
  { id: "mock-institute-5", name: "Demo · Greenfield Education College", country_code: "TZ" },
] : [];
const statuses: Record<string, { label: string; style: string }> = {
  verified: { label: "Verified", style: "bg-emerald-50 text-emerald-700" },
  pending: { label: "Pending review", style: "bg-amber-50 text-amber-800" },
  review_required: { label: "Review required", style: "bg-blue-50 text-blue-700" },
  rejected: { label: "Not approved", style: "bg-red-50 text-red-700" },
};

export default function AdmissionVerification() {
  const { user } = useAuth();
  const [institutions, setInstitutions] = useState<Institution[]>(mockInstitutions);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [institutionId, setInstitutionId] = useState("");
  const [admission, setAdmission] = useState("");
  const [course,setCourse]=useState("");
  const [academicYear,setAcademicYear]=useState("");
  const yearValid=/^20\d{2}\/20\d{2}$/.test(academicYear)&&Number(academicYear.slice(5))===Number(academicYear.slice(0,4))+1;
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (!supabase || !user) throw new Error("Sign in to view your admissions.");
      const [i, e] = await Promise.all([
        supabase.from("institutions").select("id,name,country_code").eq("verification_status", "verified").order("name"),
        supabase.from("student_enrollments").select("id,institution_id,admission_number,verification_status,created_at,course_name,academic_year").eq("student_id", user.id).order("created_at", { ascending: false }),
      ]);
      if (i.error || e.error) throw i.error || e.error;
      setInstitutions([...((i.data ?? []) as Institution[]), ...mockInstitutions]);
      setEnrollments(previous => [...previous.filter(item => item.id.startsWith("mock-enrollment-")), ...((e.data ?? []) as Enrollment[])]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load admissions. Please try again.");
    } finally { setLoading(false); }
  }, [user]);
  useEffect(() => { void load(); }, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase || busy || !institutionId || admission.trim().length < 3 || course.trim().length<2 || !yearValid) return;
    setError(""); setNotice(""); setBusy(true);
    try {
      if (mockInstitutions.some(item => item.id === institutionId)) {
        if (enrollments.some(item => item.institution_id === institutionId && item.admission_number === admission.trim())) {
          throw new Error("You already submitted this demo admission number.");
        }
        setEnrollments(previous => [{ id: `mock-enrollment-${crypto.randomUUID()}`, institution_id: institutionId, admission_number: admission.trim(), course_name:course.trim(), academic_year:academicYear, verification_status: "pending", created_at: new Date().toISOString() }, ...previous]);
        setNotice("Demo enrollment added to this preview only. It is not sent to an institution and clears when you reload.");
        setAdmission("");
        return;
      }
      const { error } = await supabase.rpc("gss_submit_enrollment_details", { p_institution_id: institutionId, p_admission_number: admission.trim(), p_course_name:course.trim(), p_academic_year:academicYear });
      if (error) throw error;
      setNotice("Admission details submitted. Your institution will review your enrollment.");
      setAdmission("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit your request. Please try again.");
    } finally { setBusy(false); }
  }

  return <main className="mx-auto max-w-2xl space-y-6 px-5 py-6">
    <header className="flex items-center gap-3">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><GraduationCap size={25} aria-hidden="true" /></span>
      <div><h1 className="text-2xl font-extrabold tracking-tight">Admissions</h1><p className="mt-1 text-sm text-slate-500">Connect your student enrollment.</p></div>
    </header>

    <section className="rounded-3xl bg-gradient-to-br from-[#1761c5] to-[#123b86] p-5 text-white" aria-label="Admission overview">
      <p className="text-sm font-semibold text-blue-100">Your education journey</p>
      <p className="mt-2 text-xl font-bold">One identity. Your institution.</p>
      <p className="mt-2 text-sm leading-6 text-blue-100">Add your admission number so your institution can confirm your enrollment.</p>
      <dl className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white/10 p-3"><dt className="text-xs text-blue-100">Submitted</dt><dd className="mt-1 text-2xl font-bold">{loading ? "—" : enrollments.length}</dd></div><div className="rounded-2xl bg-white/10 p-3"><dt className="text-xs text-blue-100">Verified</dt><dd className="mt-1 text-2xl font-bold">{loading ? "—" : enrollments.filter(e => e.verification_status === "verified").length}</dd></div></dl>
    </section>

    <section aria-labelledby="admission-form-heading" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 id="admission-form-heading" className="text-lg font-extrabold">Add admission details</h2>
      <p className="mt-1 text-sm text-slate-500">Use the details on your admission letter.</p>
      {mockInstitutions.length > 0 && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Five demo institutions are available for testing. Demo requests stay in this local preview.</p>}
      <form onSubmit={submit} className="mt-5 grid gap-5">
        <fieldset disabled={busy || loading} className="grid gap-5">
          <legend className="sr-only">Institution and admission number</legend>
          <label className="text-sm font-semibold text-slate-700">Institution<select required value={institutionId} onChange={e => setInstitutionId(e.target.value)} className="mt-2 block min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"><option value="">{loading ? "Loading institutions…" : "Select your institution"}</option>{institutions.map(i => <option key={i.id} value={i.id}>{i.name} ({i.country_code})</option>)}</select></label>
          {!loading && institutions.length === 0 && !error && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">No approved institutions are available yet. Please check again later.</p>}
          <label className="text-sm font-semibold text-slate-700">Admission number<input required minLength={3} maxLength={60} autoComplete="off" placeholder="Enter your admission number" value={admission} onChange={e => setAdmission(e.target.value)} className="mt-2 block min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /><span className="mt-2 block text-xs font-normal text-slate-500">Enter it exactly as issued by your institution.</span></label>
          <label className="text-sm font-semibold text-slate-700">Course admitted<select required value={course} onChange={e=>setCourse(e.target.value)} className="mt-2 block min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"><option value="">Select your course</option>{courseOptions.map(option=><option key={option} value={option}>{option}</option>)}</select><span className="mt-2 block text-xs font-normal text-slate-500">Sample course list. Institution course catalogs are not connected yet.</span></label>
          <label className="text-sm font-semibold text-slate-700">Academic year<select required value={academicYear} onChange={e=>setAcademicYear(e.target.value)} className="mt-2 block min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"><option value="">Select academic year</option>{academicYearOptions.map(year=><option key={year} value={year}>{year}</option>)}</select></label>
        </fieldset>
        <button disabled={busy || loading || !institutionId || admission.trim().length < 3 || course.trim().length < 2 || !yearValid} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40">{busy ? <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}{busy ? "Submitting…" : "Request verification"}</button>
      </form>
      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500"><BadgeCheck size={17} className="mt-0.5 shrink-0" aria-hidden="true" />Your institution reviews every request. Enrollment is confirmed only when the status shows Verified.</p>
    </section>

    {error && <div role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {notice && <div role="status" className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</div>}

    <section aria-labelledby="enrollment-list-heading">
      <div className="flex items-center justify-between"><h2 id="enrollment-list-heading" className="text-lg font-extrabold">My enrollments</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{enrollments.length}</span></div>
      {loading ? <p role="status" className="mt-4 text-sm text-slate-500">Loading enrollments…</p> : error && enrollments.length === 0 ? <p className="mt-4 text-sm text-slate-500">Enrollment records could not be loaded.</p> : enrollments.length === 0 ? <div className="mt-4 rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center"><FileText className="mx-auto text-blue-400" size={32} aria-hidden="true" /><h3 className="mt-3 font-bold">No enrollments yet</h3><p className="mt-2 text-sm text-slate-500">Add your institution and admission number above to get started.</p></div> : <div className="mt-4 grid gap-3">{enrollments.map(e => {
        const status = statuses[e.verification_status] ?? { label: "Under review", style: "bg-slate-100 text-slate-700" };
        return <article key={e.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start gap-3"><span className="rounded-xl bg-blue-50 p-2 text-blue-700"><Building2 size={20} aria-hidden="true" /></span><div className="min-w-0 flex-1"><h3 className="break-words font-bold">{institutions.find(i => i.id === e.institution_id)?.name ?? "Institution details unavailable"}</h3><p className="mt-1 break-words text-sm text-slate-500">Admission: <span className="font-semibold text-slate-700">{e.admission_number}</span></p><p className="mt-2 text-sm font-semibold text-slate-700">{e.course_name || "Course not provided"}</p><p className="mt-1 text-xs text-slate-500">Academic year: {e.academic_year || "Not provided"}</p></div></div><div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${status.style}`}>{e.verification_status === "verified" ? <BadgeCheck size={14} aria-hidden="true" /> : <Clock3 size={14} aria-hidden="true" />}{status.label}</span><time dateTime={e.created_at} className="text-xs text-slate-400">{new Date(e.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</time></div></article>;
      })}</div>}
    </section>
  </main>;
}
