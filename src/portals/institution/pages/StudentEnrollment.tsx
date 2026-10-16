import { Link } from "react-router-dom";
import { ClipboardList } from "lucide-react";

/** StudentEnrollment — overview page pointing to the directory and verification queue.
 *  Actual enrollment intake happens student-side via gss_submit_enrollment_details;
 *  institution admins review and decide. */
export default function StudentEnrollment() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><ClipboardList size={24} aria-hidden="true" /></span>
        <div>
          <h1 className="text-3xl font-bold">Student enrollment</h1>
          <p className="mt-1 text-sm text-slate-500">Review and verify student enrollment requests.</p>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link to="/institution/students" className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-blue-300 hover:bg-blue-50">
          <h2 className="font-bold">Student directory</h2>
          <p className="mt-2 text-sm text-slate-600">View all enrolled students and their Global Student IDs.</p>
          <p className="mt-3 text-sm font-semibold text-blue-700">Open directory →</p>
        </Link>
        <Link to="/institution/verification" className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-blue-300 hover:bg-blue-50">
          <h2 className="font-bold">Verification queue</h2>
          <p className="mt-2 text-sm text-slate-600">Approve or reject pending enrollment requests.</p>
          <p className="mt-3 text-sm font-semibold text-blue-700">Open queue →</p>
        </Link>
      </section>

      <p className="text-xs text-slate-500">Students submit enrollment from their portal via <code className="rounded bg-slate-100 px-1">gss_submit_enrollment_details</code>. You review and decide via <code className="rounded bg-slate-100 px-1">gss_decide_enrollment_verification</code>.</p>
    </main>
  );
}
