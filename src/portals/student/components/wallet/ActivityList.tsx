import { PROVIDERS, type PaymentPurpose, type PaymentResult } from "../../../../integrations/mobile-money/MobileMoneyAdapter";

const PURPOSE_LABEL: Record<PaymentPurpose, string> = {
  wallet_topup: "Wallet top-up",
  tuition: "Tuition payment",
  fees: "Fees payment",
  merchant: "Merchant payment",
  transfer: "Money transfer",
  withdraw: "Wakala withdrawal",
};

const STATUS_STYLE: Record<PaymentResult["status"], string> = {
  completed: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  failed: "bg-red-50 text-red-700",
};

export default function ActivityList({ items }: { items: PaymentResult[] }) {
  if (items.length === 0) {
    return <p className="rounded-2xl bg-white p-5 text-sm text-slate-500 shadow-sm">No payments yet. Top up to get started.</p>;
  }
  return (
    <ul className="divide-y divide-slate-100 rounded-2xl bg-white shadow-sm">
      {items.map((item) => {
        const provider = PROVIDERS.find((p) => p.id === item.provider);
        return (
          <li key={item.reference} className="flex items-center gap-3 p-4">
            <span aria-hidden="true" className="h-10 w-10 shrink-0 rounded-xl" style={{ background: provider?.accent }} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{item.purpose === "merchant" ? item.merchantName || "Merchant payment" : PURPOSE_LABEL[item.purpose]}</p>
              <p className="truncate text-xs text-slate-500">
                {item.provider === "wallet" ? "Main Wallet" : item.provider === "bank" ? item.bankName || "Bank" : provider?.name} · {item.maskedMsisdn} · {new Date(item.createdAt).toLocaleString()}
              </p>
              <p className="truncate font-mono text-[11px] text-slate-400">{item.reference}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-bold">TZS {item.amountTzs.toLocaleString("en-US")}</p>
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLE[item.status]}`}>
                {item.status}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
