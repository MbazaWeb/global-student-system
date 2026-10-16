import AdmissionStatusBadge from "./AdmissionStatusBadge";

type Row = {
  enrollment_id: string;
  student_name: string;
  global_student_id: string | null;
  admission_number: string;
  verification_status: string;
  submitted_at: string;
};

type Props = { rows: Row[]; loading?: boolean };

/** StudentTable — reusable table for institution directory views. */
export default function StudentTable({ rows, loading }: Props) {
  if (loading) return <p role="status" className="text-sm text-slate-500">Loading…</p>;
  if (rows.length === 0) return <p className="text-sm text-slate-500">No students.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="p-3">Student</th>
            <th className="p-3">Global ID</th>
            <th className="p-3">Admission</th>
            <th className="p-3">Status</th>
            <th className="p-3">Submitted</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.enrollment_id} className="border-t">
              <td className="p-3 font-semibold">{r.student_name}</td>
              <td className="p-3 font-mono text-xs">{r.global_student_id ?? "—"}</td>
              <td className="p-3">{r.admission_number}</td>
              <td className="p-3"><AdmissionStatusBadge status={r.verification_status} /></td>
              <td className="p-3 text-xs text-slate-500">{new Date(r.submitted_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
