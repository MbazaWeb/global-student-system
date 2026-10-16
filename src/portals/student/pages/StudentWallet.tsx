import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import WalletCard from "../components/WalletCard";
import PaymentSheet from "../components/wallet/PaymentSheet";
import ActivityList from "../components/wallet/ActivityList";
import { walletService, type WalletSummary } from "../services/walletService";
import { PROVIDERS, type PaymentPurpose } from "../../../integrations/mobile-money/MobileMoneyAdapter";

export default function StudentWallet() {
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [sheet, setSheet] = useState<{ open: boolean; purpose: PaymentPurpose }>({ open: false, purpose: "wallet_topup" });

  const refresh = useCallback(async () => {
    setSummary(await walletService.getSummary());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openSheet = (purpose: PaymentPurpose) => setSheet({ open: true, purpose });
  const closeSheet = useCallback(() => setSheet((s) => ({ ...s, open: false })), []);

  return (
    <main className="mx-auto max-w-md space-y-6 px-5 pb-12 pt-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">S Wallet</h1>
        <p className="mt-1 text-sm text-slate-600">Pay tuition and fees with mobile money.</p>
      </header>

      <WalletCard
        balanceTzs={summary?.balanceTzs ?? 0}
        onTopUp={() => openSheet("wallet_topup")}
        onPayTuition={() => openSheet("tuition")}
      />

      <section aria-labelledby="networks-heading">
        <h2 id="networks-heading" className="text-sm font-extrabold">Supported networks</h2>
        <ul className="mt-3 grid grid-cols-3 gap-2">
          {PROVIDERS.map((p) => (
            <li key={p.id} className="rounded-xl bg-white p-3 text-center text-xs font-semibold shadow-sm">
              <span className="mx-auto mb-2 block h-3 w-3 rounded-full" style={{ background: p.accent }} aria-hidden="true" />
              {p.name}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="activity-heading">
        <div className="flex items-center justify-between">
          <h2 id="activity-heading" className="text-sm font-extrabold">Recent activity</h2>
          <Link to="/student/transactions" className="text-sm font-semibold text-[#1761c5]">Ledger</Link>
        </div>
        <div className="mt-3">
          <ActivityList items={summary?.activity ?? []} />
        </div>
      </section>

      <p className="text-center text-xs leading-5 text-slate-500">
        Sandbox preview. Live payments require operator approval and a server-side integration.
      </p>

      {sheet.open && (
        <PaymentSheet initialPurpose={sheet.purpose} onClose={closeSheet} onFinished={refresh} />
      )}
    </main>
  );
}
