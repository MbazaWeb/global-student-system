import { useState } from "react";

interface Props {
  balanceTzs: number;
  onTopUp: () => void;
  onPayTuition: () => void;
}

export default function WalletCard({ balanceTzs, onTopUp, onPayTuition }: Props) {
  const [hidden, setHidden] = useState(false);
  const [notice, setNotice] = useState<"Transfer" | "Withdraw" | null>(null);
  return (
    <section aria-labelledby="wallet-balance-label" className="rounded-3xl bg-gradient-to-br from-[#1761c5] to-[#123b86] p-6 text-white shadow-lg">
      <div className="flex items-center justify-between">
        <p id="wallet-balance-label" className="text-sm font-semibold text-blue-100">S Wallet balance</p>
        <span className="rounded-full bg-amber-300 px-3 py-1 text-xs font-bold text-amber-950">SANDBOX</span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-3xl font-extrabold tracking-tight">{hidden ? "TZS ••••••" : `TZS ${balanceTzs.toLocaleString("en-US")}`}</p>
        <button
          type="button"
          onClick={() => setHidden((h) => !h)}
          aria-pressed={hidden}
          className="min-h-11 rounded-full bg-white/15 px-4 text-xs font-semibold"
        >
          {hidden ? "Show balance" : "Hide balance"}
        </button>
      </div>
      <p className="mt-2 text-xs text-blue-100">Test funds only. No real money is held or moved.</p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button type="button" onClick={onTopUp} className="min-h-12 rounded-2xl bg-white py-3 text-sm font-bold text-[#1761c5]">Top up</button>
        <button type="button" onClick={onPayTuition} className="min-h-12 rounded-2xl bg-white/15 py-3 text-sm font-bold text-white">Pay tuition</button>
        <button type="button" onClick={() => setNotice("Transfer")} className="min-h-12 rounded-2xl border border-white/30 bg-white/15 py-3 text-sm font-bold text-white hover:bg-white/25">Transfer</button>
        <button type="button" onClick={() => setNotice("Withdraw")} className="min-h-12 rounded-2xl border border-white/30 bg-white/15 py-3 text-sm font-bold text-white hover:bg-white/25">Withdraw</button>
      </div>
      {notice && <div role="dialog" aria-modal="true" aria-labelledby="wallet-action-title" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-5"><div className="w-full max-w-sm rounded-2xl bg-white p-6 text-slate-900 shadow-xl"><h2 id="wallet-action-title" className="text-xl font-extrabold">{notice}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{notice} is not available in sandbox yet. Your test wallet balance has not changed. Real transfers and withdrawals will require secure payment-provider integration and transaction verification.</p><button type="button" autoFocus onClick={() => setNotice(null)} className="mt-5 min-h-11 w-full rounded-xl bg-blue-700 px-4 font-bold text-white">Close</button></div></div>}
    </section>
  );
}
