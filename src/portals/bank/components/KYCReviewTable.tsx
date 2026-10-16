/** KYCReviewTable — reusable mock table for KYC review rows. */
export default function KYCReviewTable({ rows }: { rows: { id: string; applicant: string; status: string; submittedAt: string }[] }) {
  if (rows.length === 0) return <p className="text-sm text-slate-500">No KYC reviews.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Applicant</th><th className="p-3">Status</th><th className="p-3">Submitted</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t"><td className="p-3 font-semibold">{r.applicant}</td><td className="p-3">{r.status}</td><td className="p-3 text-xs text-slate-500">{r.submittedAt}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
