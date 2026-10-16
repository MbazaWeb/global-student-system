import { Link } from "react-router-dom";
import { Landmark, ShieldCheck } from "lucide-react";
import { useAuth } from "../../../auth/AuthProvider";
import { getDemoBank } from "../../../integrations/banking/demoBankSecurity";

/**
 * Read-only view of the demo bank connection state. The actual linking flow
 * lives at /student/bank (BankAccountLinking). This page summarises what is
 * connected and points the user there to make changes. No real bank data is
 * stored — demoBankSecurity is an in-memory Map keyed by user id that clears
 * on reload.
 */
export default function BankAccountDetails() {
  const { user } = useAuth();
  const bank = user ? getDemoBank(user.id) : null;

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-5 py-6">
      <header className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Landmark size={24} aria-hidden="true" /></span>
        <div>
          <h1 className="text-2xl font-extrabold">Bank account</h1>
          <p className="mt-1 text-sm text-slate-500">Your demo bank connection summary.</p>
        </div>
      </header>

      <section className="rounded-3xl bg-gradient-to-br from-[#1761c5] to-[#123b86] p-6 text-white" aria-label="Bank account">
        <div className="flex items-center justify-between">
          <Landmark size={28} aria-hidden="true" />
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">{bank ? "Demo OTP confirmed" : "Not connected"}</span>
        </div>
        <dl className="mt-7 space-y-5">
          <div>
            <dt className="text-xs text-blue-200">Bank name</dt>
            <dd className="mt-1 font-bold">{bank?.bank ?? "No bank linked"}</dd>
          </div>
          <div>
            <dt className="text-xs text-blue-200">Account name</dt>
            <dd className="mt-1">{bank?.name ?? "Not available"}</dd>
          </div>
          <div>
            <dt className="text-xs text-blue-200">Account number</dt>
            <dd className="mt-1 font-mono text-xl tracking-widest">{bank ? `•••• ${bank.number.slice(-4)}` : "•••• •••• ••••"}</dd>
          </div>
        </dl>
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <ShieldCheck className="shrink-0 text-blue-700" size={22} aria-hidden="true" />
        <div>
          <h2 className="font-bold">Demo only</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">This connection is a sandbox simulation. It clears when you reload the page, and no real bank account is contacted. Live bank integration requires a licensed partner and a server-side flow.</p>
        </div>
      </div>

      <Link to="/student/bank" className="block rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-700">
        {bank ? "Edit bank connection →" : "Add a bank →"}
      </Link>
    </main>
  );
}
