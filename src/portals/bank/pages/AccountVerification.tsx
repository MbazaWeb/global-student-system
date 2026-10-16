import BankPageShell from "../BankLayout";
import { MOCK_ACCOUNT_VERIFICATIONS } from "../services/bankService";

export default function AccountVerification() {
  return (
    <BankPageShell title="Account verification" subtitle="Mock account verification queue (no real accounts).">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Account</th><th className="p-3">Status</th><th className="p-3">Verified</th></tr></thead>
          <tbody>
            {MOCK_ACCOUNT_VERIFICATIONS.map((v) => (
              <tr key={v.id} className="border-t"><td className="p-3 font-mono">{v.account}</td><td className="p-3">{v.status}</td><td className="p-3 text-xs text-slate-500">{v.verifiedAt}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </BankPageShell>
  );
}
