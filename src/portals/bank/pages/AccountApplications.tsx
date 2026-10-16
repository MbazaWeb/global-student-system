import BankPageShell from "../BankLayout";
import { MOCK_ACCOUNT_APPLICATIONS } from "../services/bankService";

export default function AccountApplications() {
  return (
    <BankPageShell title="Account applications" subtitle="Mock student account applications (no real accounts).">
      {MOCK_ACCOUNT_APPLICATIONS.length === 0 ? (
        <p className="text-sm text-slate-500">No applications.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Applicant</th><th className="p-3">Status</th><th className="p-3">Submitted</th></tr></thead>
            <tbody>
              {MOCK_ACCOUNT_APPLICATIONS.map((a) => (
                <tr key={a.id} className="border-t"><td className="p-3 font-semibold">{a.applicant}</td><td className="p-3">{a.status}</td><td className="p-3 text-xs text-slate-500">{a.submittedAt}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </BankPageShell>
  );
}
