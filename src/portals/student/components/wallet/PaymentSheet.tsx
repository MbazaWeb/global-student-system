import { useEffect, useState } from "react";
import type { PaymentPurpose, PaymentResult } from "../../../../integrations/mobile-money/MobileMoneyAdapter";
import { detectProvider, maskMsisdn, normalizeTzMsisdn } from "../../../../integrations/mobile-money/phone";
import { walletService } from "../../services/walletService";

const PURPOSES: { id: PaymentPurpose; label: string; hint: string }[] = [
  { id: "wallet_topup", label: "Top up", hint: "Adds funds to your S Wallet balance." },
  { id: "tuition", label: "Tuition", hint: "Pays a tuition invoice." },
  { id: "fees", label: "Fees", hint: "Pays institution fees." },
];
const QUICK_AMOUNTS = [5000, 10000, 50000, 100000];
const MIN_TZS = 1000;
const MAX_TZS = 3000000;
const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 60;

type Step = "form" | "review" | "processing" | "done";

const money = (n: number) => `TZS ${n.toLocaleString("en-US")}`;

interface Props {
  initialPurpose?: PaymentPurpose;
  onClose: () => void;
  onFinished: () => void;
}

export default function PaymentSheet({ initialPurpose = "wallet_topup", onClose, onFinished }: Props) {
  const [step, setStep] = useState<Step>("form");
  const [purpose, setPurpose] = useState<PaymentPurpose>(initialPurpose);
  const [amountText, setAmountText] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const amount = Number(amountText);
  const msisdn = normalizeTzMsisdn(phone);
  const provider = msisdn ? detectProvider(msisdn) : null;
  const amountValid = Number.isInteger(amount) && amount >= MIN_TZS && amount <= MAX_TZS;
  const purposeLabel = PURPOSES.find((p) => p.id === purpose)?.label ?? "";

  // Close on Escape, except while a payment is awaiting approval.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && step !== "processing") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, onClose]);

  // Poll the payment status while the student approves on their phone.
  useEffect(() => {
    if (step !== "processing" || !result) return;
    let active = true;
    let polls = 0;
    let timer: number | undefined;
    const tick = async () => {
      polls += 1;
      try {
        const next = await walletService.getPaymentStatus(result.reference);
        if (!active) return;
        if (next.status !== "pending") {
          setResult(next);
          setStep("done");
          onFinished();
          return;
        }
        if (polls >= MAX_POLLS) {
          setTimedOut(true);
          setStep("done");
          return;
        }
        timer = window.setTimeout(tick, POLL_INTERVAL_MS);
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Status check failed.");
          setStep("done");
        }
      }
    };
    timer = window.setTimeout(tick, POLL_INTERVAL_MS);
    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [step, result, onFinished]);

  async function submit() {
    if (!msisdn || !provider) return;
    setSubmitting(true);
    setError("");
    try {
      const created = await walletService.requestPayment({
        provider: provider.id,
        msisdn,
        amountTzs: amount,
        purpose,
        description: purposeLabel,
      });
      setResult(created);
      setTimedOut(false);
      setStep("processing");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the payment.");
      setStep("review");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="payment-title" className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4">
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 id="payment-title" className="text-lg font-extrabold">
            {step === "done" ? "Payment update" : "Mobile money payment"}
          </h2>
          {step !== "processing" && (
            <button type="button" onClick={onClose} aria-label="Close" className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-lg">×</button>
          )}
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {step === "form" && (
          <div className="mt-5 space-y-5">
            <fieldset>
              <legend className="text-sm font-semibold text-slate-700">Purpose</legend>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {PURPOSES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={purpose === p.id}
                    onClick={() => setPurpose(p.id)}
                    className={`min-h-11 rounded-xl border px-2 py-2 text-sm font-semibold ${purpose === p.id ? "border-[#1761c5] bg-blue-50 text-[#1761c5]" : "border-slate-200 text-slate-700"}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">{PURPOSES.find((p) => p.id === purpose)?.hint}</p>
            </fieldset>

            <div>
              <label htmlFor="pay-amount" className="text-sm font-semibold text-slate-700">Amount (TZS)</label>
              <input
                id="pay-amount"
                inputMode="numeric"
                autoComplete="off"
                placeholder="e.g. 10000"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value.replace(/\D/g, "").slice(0, 7))}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-lg font-bold focus:border-[#1761c5] focus:outline-none"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((q) => (
                  <button key={q} type="button" onClick={() => setAmountText(String(q))} className="min-h-11 rounded-full bg-slate-100 px-4 text-xs font-semibold">
                    {q.toLocaleString("en-US")}
                  </button>
                ))}
              </div>
              {amountText && !amountValid && (
                <p className="mt-2 text-xs text-red-600">Enter between TZS 1,000 and TZS 3,000,000.</p>
              )}
            </div>

            <div>
              <label htmlFor="pay-phone" className="text-sm font-semibold text-slate-700">Mobile number</label>
              <input
                id="pay-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="0744 123 456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-lg font-bold focus:border-[#1761c5] focus:outline-none"
              />
              {provider && (
                <p className="mt-2 flex items-center gap-2 text-sm font-semibold">
                  <span className="h-3 w-3 rounded-full" style={{ background: provider.accent }} aria-hidden="true" />
                  {provider.name} · {provider.operator}
                </p>
              )}
              {phone && !msisdn && <p className="mt-2 text-xs text-red-600">Enter a valid Tanzanian mobile number, for example 0744 123 456.</p>}
              {msisdn && !provider && <p className="mt-2 text-xs text-red-600">This number is not M-Pesa, Airtel Money or Mixx by Yas.</p>}
            </div>

            <button
              type="button"
              disabled={!amountValid || !provider}
              onClick={() => setStep("review")}
              className="min-h-12 w-full rounded-2xl bg-[#1761c5] py-3 font-bold text-white disabled:bg-slate-300"
            >
              Review payment
            </button>
          </div>
        )}

        {step === "review" && provider && msisdn && (
          <div className="mt-5 space-y-5">
            <dl className="divide-y divide-slate-100 rounded-2xl border border-slate-100">
              <Row label="Purpose" value={purposeLabel} />
              <Row label="Amount" value={money(amount)} />
              <Row label="Provider" value={provider.name} />
              <Row label="Number" value={maskMsisdn(msisdn)} />
            </dl>
            <p className="text-xs text-slate-500">You will receive a prompt on your phone to approve this payment. Sandbox: no real money moves.</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setStep("form")} className="min-h-12 rounded-2xl border border-slate-200 py-3 font-semibold">Back</button>
              <button type="button" disabled={submitting} onClick={() => void submit()} className="min-h-12 rounded-2xl bg-[#1761c5] py-3 font-bold text-white disabled:bg-slate-300">
                {submitting ? "Sending…" : "Confirm"}
              </button>
            </div>
          </div>
        )}

        {step === "processing" && result && (
          <div className="mt-10 text-center" role="status" aria-live="polite">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-[#1761c5]" aria-hidden="true" />
            <p className="mt-5 font-bold">Waiting for approval</p>
            <p className="mt-2 text-sm text-slate-600">Approve the request on {provider?.name ?? "your phone"}. Keep this screen open.</p>
            <p className="mt-4 font-mono text-xs text-slate-500">Ref {result.reference}</p>
          </div>
        )}

        {step === "done" && (
          <div className="mt-6 space-y-4 text-center" role="status">
            {result?.status === "completed" && !timedOut ? (
              <>
                <p className="text-4xl" aria-hidden="true">✅</p>
                <p className="font-bold">Payment completed</p>
                <p className="text-sm text-slate-600">{money(result.amountTzs)} via {provider?.name}</p>
              </>
            ) : result?.status === "failed" ? (
              <>
                <p className="text-4xl" aria-hidden="true">⚠️</p>
                <p className="font-bold">Payment failed</p>
                <p className="text-sm text-slate-600">{result.failureReason ?? "Please try again."}</p>
              </>
            ) : (
              <>
                <p className="font-bold">Still processing</p>
                <p className="text-sm text-slate-600">Check your activity in a few minutes.</p>
              </>
            )}
            {result && <p className="font-mono text-xs text-slate-500">Ref {result.reference}</p>}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {result?.status === "failed" ? (
                <button type="button" onClick={() => { setResult(null); setError(""); setStep("review"); }} className="min-h-12 rounded-2xl border border-slate-200 py-3 font-semibold">Try again</button>
              ) : <span />}
              <button type="button" onClick={onClose} className="min-h-12 rounded-2xl bg-[#1761c5] py-3 font-bold text-white">Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-bold">{value}</dd>
    </div>
  );
}
