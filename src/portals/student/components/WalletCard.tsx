import { useState } from "react";

interface Props {
  balanceTzs: number;
  onTopUp: () => void;
  onPayTuition: () => void;
}

export default function WalletCard({ balanceTzs, onTopUp, onPayTuition }: Props) {
  const [hidden, setHidden] = useState(false);
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
      </div>
    </section>
  );
}
