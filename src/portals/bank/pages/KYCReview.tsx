import BankPageShell from "../BankLayout";
import { MOCK_KYC_REVIEWS } from "../services/bankService";

export default function KYCReview() {
  return (
    <BankPageShell title="KYC review" subtitle="Mock KYC review queue (no real identities).">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Applicant</th><th className="p-3">Status</th><th className="p-3">Submitted</th></tr></thead>
          <tbody>
            {MOCK_KYC_REVIEWS.map((k) => (
              <tr key={k.id} className="border-t"><td className="p-3 font-semibold">{k.applicant}</td><td className="p-3">{k.status}</td><td className="p-3 text-xs text-slate-500">{k.submittedAt}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </BankPageShell>
  );
}
