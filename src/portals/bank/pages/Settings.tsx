import BankPageShell from "../BankLayout";
import { Info } from "lucide-react";

export default function Settings() {
  return (
    <BankPageShell title="Settings" subtitle="Bank portal settings (mock).">
      <section className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <Info className="shrink-0 text-slate-500" size={20} aria-hidden="true" />
        <p className="text-sm text-slate-600">No configurable settings are stored on the bank portal. API keys, webhook secrets and credentials belong server-side and are not exposed to browser code.</p>
      </section>
    </BankPageShell>
  );
}
