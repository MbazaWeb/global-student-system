import { Upload, Info } from "lucide-react";

/**
 * StudentImport — not enabled.
 *
 * Bulk import would require a new SECURITY DEFINER function that takes
 * institution-scoped rows and writes them via gss_submit_enrollment_details
 * (or a sibling). Per audit instructions, no new migration is added without
 * a clear spec; this page therefore shows an honest "not available" message
 * and points the user to the existing single-enrollment flow.
 *
 * Students are still the canonical source of enrollment submissions; an
 * institution-side import would bypass the student consent and RLS checks
 * that gss_submit_enrollment_details enforces.
 */
export default function StudentImport() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Upload size={24} aria-hidden="true" /></span>
        <div>
          <h1 className="text-3xl font-bold">Import students</h1>
          <p className="mt-1 text-sm text-slate-500">Bulk import is not enabled.</p>
        </div>
      </header>

      <section className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <Info className="shrink-0 text-amber-700" size={20} aria-hidden="true" />
        <div>
          <h2 className="font-bold text-amber-900">Why bulk import is not available</h2>
          <p className="mt-2 text-sm text-amber-800">
            Enrollment submissions must originate from the student. The <code className="rounded bg-amber-100 px-1">gss_submit_enrollment_details</code> RPC
            verifies the caller is the enrolled student, checks the institution is approved, and creates the verification request. An institution-side
            bulk import would bypass those student-consent and ownership checks.
          </p>
          <p className="mt-3 text-sm text-amber-800">
            If you need a batch intake flow, ask the platform team to spec a new RPC that accepts institution-scoped rows with explicit student consent
            captured out-of-band, plus an audit row per insert.
          </p>
        </div>
      </section>
    </main>
  );
}
