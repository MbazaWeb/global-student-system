import { useEffect, useState } from "react";
import type { PaymentPurpose, PaymentResult } from "../../../../integrations/mobile-money/MobileMoneyAdapter";
import { PROVIDERS, type MobileMoneyProvider } from "../../../../integrations/mobile-money/MobileMoneyAdapter";
import { detectProvider, maskMsisdn, normalizeTzMsisdn } from "../../../../integrations/mobile-money/phone";
import { walletService } from "../../services/walletService";
import { supabase } from "../../../../lib/supabase";
import { useAuth } from "../../../../auth/AuthProvider";
import { Link } from "react-router-dom";
import { getDemoBank, startBankOtp, confirmBankOtp, bankPayload, DEMO_OTP } from "../../../../integrations/banking/demoBankSecurity";

const PURPOSES: { id: PaymentPurpose; label: string; hint: string }[] = [
  { id: "wallet_topup", label: "Top up", hint: "Adds funds to your S Wallet balance." },
  { id: "tuition", label: "Tuition & fees", hint: "Pay your university tuition and institution fees together." },
  { id: "merchant", label: "Pay merchant", hint: "Pay a campus store, shop or service." },
];
const QUICK_AMOUNTS = [5000, 10000, 50000, 100000];
const MIN_TZS = 1000;
const MAX_TZS = 3000000;
const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 60;

type Step = "form" | "review" | "bank_otp" | "processing" | "done";

const money = (n: number) => `TZS ${n.toLocaleString("en-US")}`;

interface Props {
  initialAmount?: number;
  merchant?: { name:string; code:string };
  initialPurpose?: PaymentPurpose;
  initialSource?: MobileMoneyProvider;
  onClose: () => void;
  onFinished: () => void;
}

export default function PaymentSheet({ initialPurpose = "wallet_topup", initialAmount, initialSource, merchant, onClose, onFinished }: Props) {
  const {user}=useAuth();
  const [step, setStep] = useState<Step>("form");
  const [purpose, setPurpose] = useState<PaymentPurpose>(initialPurpose === "fees" ? "tuition" : initialPurpose);
  const [amountText, setAmountText] = useState(initialAmount ? String(initialAmount) : "");
  const [enrollments,setEnrollments]=useState<{id:string;admission_number:string;university:string;verification_status:string}[]>([]);
  const [enrollmentId,setEnrollmentId]=useState("");
  const [detailsLoading,setDetailsLoading]=useState(true);
  const [detailsError,setDetailsError]=useState("");
  const enrollment=enrollments.find(item=>item.id===enrollmentId);
  const university=enrollment?.university??"";
  const admission=enrollment?.admission_number??"";
  const [amountMode, setAmountMode] = useState<"full" | "custom">("custom");
  const [phone, setPhone] = useState("");
  const [source,setSource]=useState<MobileMoneyProvider|"bank"|"wallet"|"">(initialSource??"");
  const [savePreferred,setSavePreferred]=useState(false);
  const [savedPhone,setSavedPhone]=useState<{phone:string;source:MobileMoneyProvider}|null>(null);
  const preferredKey=user?`gss-preferred-topup-v1:${user.id}`:null;
  useEffect(()=>{
    if(!preferredKey||initialPurpose!=="wallet_topup")return;
    try{
      const raw=localStorage.getItem(preferredKey);
      const value=raw?JSON.parse(raw):null;
      if(value&&typeof value.phone==="string"&&PROVIDERS.some(p=>p.id===value.source)&&normalizeTzMsisdn(value.phone)&&detectProvider(normalizeTzMsisdn(value.phone)!)?.id===value.source){
        setSavedPhone(value);if(!initialSource){setSource(value.source);setPhone(value.phone);}
      }
    }catch{/* Preferred number is optional. */}
  },[preferredKey,initialPurpose,initialSource]);
  const [bankName,setBankName]=useState("");
  const [accountNumber,setAccountNumber]=useState("");
  const linkedBank=getDemoBank(user?.id??"");
  const [bankChallenge,setBankChallenge]=useState("");
  const [bankOtp,setBankOtp]=useState("");
  useEffect(()=>{const bank=getDemoBank(user?.id??"");if(bank){setBankName(bank.bank);setAccountNumber(bank.number);}},[user]);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isStudentPayment = purpose === "tuition" || purpose === "fees";
  const minimumAmount = purpose === "merchant" ? 100 : MIN_TZS;
  // No university invoice/balance source exists yet. Never substitute wallet funds for fee debt.
  const remainingBalance: number | null = null;
  const amount = isStudentPayment && amountMode === "full" ? (remainingBalance ?? 0) : Number(amountText);
  const msisdn = normalizeTzMsisdn(phone);
  const isBank=source==="bank";
  const isWallet=source==="wallet";
  const [walletBalance,setWalletBalance]=useState<number|null>(null);
  const [walletError,setWalletError]=useState("");
  useEffect(()=>{
    let active=true;
    const refresh=()=>{void walletService.getSummary().then(summary=>{if(active){setWalletBalance(summary.balanceTzs);setWalletError("");}}).catch(()=>{if(active){setWalletBalance(null);setWalletError("Unable to fetch your current wallet balance.");}});};
    refresh();
    const timer=isWallet&&step!=="done"?window.setInterval(refresh,2000):undefined;
    window.addEventListener("focus",refresh);
    return()=>{active=false;if(timer)window.clearInterval(timer);window.removeEventListener("focus",refresh);};
  },[isWallet,step]);
  const detectedProvider=msisdn?detectProvider(msisdn):null;
  const provider=isWallet?{id:"wallet" as const,name:"Main Wallet",operator:"S Wallet",accent:"#1761c5"}:isBank?{id:"bank" as const,name:bankName.trim()||"Bank",operator:"Bank account",accent:"#1761c5"}:PROVIDERS.find(item=>item.id===source)??null;
  const sourceValid=isWallet?purpose!=="wallet_topup"&&walletBalance!==null&&amount<=walletBalance:isBank?!!linkedBank&&bankName.trim().length>=2&&/^\d{6,24}$/.test(accountNumber):!!provider&&!!msisdn&&detectedProvider?.id===source;
  const detailsValid = !isStudentPayment || (!detailsLoading && !detailsError && !!enrollment && !!university && !!admission);
  const amountValid = detailsValid && (purpose!=="merchant"||!!merchant?.code) && Number.isInteger(amount) && amount >= minimumAmount && amount <= MAX_TZS && (!isStudentPayment || remainingBalance === null || amount <= remainingBalance);
  const purposeLabel = PURPOSES.find((p) => p.id === purpose)?.label ?? "";

  useEffect(()=>{
    let active=true;
    async function load(){
      setDetailsLoading(true);setDetailsError("");setEnrollments([]);setEnrollmentId("");
      try{
        if(!supabase||!user)throw new Error("Sign in to load your student details.");
        const {data,error}=await supabase.from("student_enrollments").select("id,institution_id,admission_number,verification_status").eq("student_id",user.id).order("created_at",{ascending:false});
        if(error)throw error;
        const rows=data??[];
        const ids=[...new Set(rows.map(row=>row.institution_id))];
        const institutions=ids.length?await supabase.from("institutions").select("id,name").in("id",ids):{data:[],error:null};
        if(institutions.error)throw institutions.error;
        const next=rows.map(row=>({...row,university:institutions.data?.find(i=>i.id===row.institution_id)?.name??""}));
        if(active){setEnrollments(next);setEnrollmentId(next.find(row=>row.verification_status==="verified")?.id??next[0]?.id??"");}
      }catch(e){if(active)setDetailsError(e instanceof Error?e.message:"Unable to load student details. Please reopen Pay to retry.");}
      finally{if(active)setDetailsLoading(false);}
    }
    void load();return()=>{active=false;};
  },[user]);

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

  async function submit(bankOtpToken?:string) {
    if(savePreferred&&preferredKey&&msisdn&&detectedProvider?.id===source&&source!=="bank"&&source!=="wallet"&&source){
      try{localStorage.setItem(preferredKey,JSON.stringify({phone:msisdn,source}));setSavedPhone({phone:msisdn,source});}catch{/* Payment remains available if browser storage is blocked. */}
    }
    if (!sourceValid || !provider || !amountValid) return;
    if(submitting)return;
    if(isBank&&!bankOtpToken){
      if(!linkedBank||!user){setError("Add and confirm your bank in Profile → Bank Integration first.");return;}
      setError("");setBankOtp("");setBankChallenge(startBankOtp(user.id,bankPayload(bankName,accountNumber,amount,purpose,purpose==="merchant"?merchant?.code:undefined)));setStep("bank_otp");return;
    }
    setSubmitting(true);
    setError("");
    try {
      const created = await walletService.requestPayment({
        provider: provider.id,
        msisdn: isBank || isWallet ? "" : msisdn!,
        bankName: isBank ? bankName.trim() : undefined,
        accountNumber: isBank ? accountNumber : undefined,
        bankOtpToken,
        merchantName:purpose==="merchant"?merchant?.name:undefined,
        merchantCode:purpose==="merchant"?merchant?.code:undefined,
        amountTzs: amount,
        purpose,
        description: purpose==="merchant"?`Merchant payment · ${merchant?.name} · ${merchant?.code}`:isStudentPayment ? `${purposeLabel} · ${university.trim()} · Admission ${admission.trim()}` : purposeLabel,
      });
      setResult(created);
      setTimedOut(false);
      if(created.status==="completed"){setStep("done");onFinished();}else setStep("processing");
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
            {step === "done" ? "Payment update" : purpose==="merchant"?"Pay merchant":isStudentPayment ? "Tuition & fees payment" : "Top up wallet"}
          </h2>
          {step !== "processing" && (
            <button type="button" onClick={onClose} aria-label="Close" className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-lg">×</button>
          )}
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {step === "form" && (
          <div className="mt-5 space-y-5">
            {initialPurpose!=="wallet_topup"&&<fieldset>
              <legend className="text-sm font-semibold text-slate-700">Purpose</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {PURPOSES.filter(p=>initialPurpose==="merchant"?p.id==="merchant":p.id!=="merchant").map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={purpose === p.id}
                    onClick={() => {setPurpose(p.id);if(p.id==="wallet_topup"&&source==="wallet")setSource("");}}
                    className={`min-h-11 rounded-xl border px-2 py-2 text-sm font-semibold ${purpose === p.id ? "border-[#1761c5] bg-blue-50 text-[#1761c5]" : "border-slate-200 text-slate-700"}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">{PURPOSES.find((p) => p.id === purpose)?.hint}</p>
            </fieldset>}
            {purpose==="merchant"&&merchant&&<section aria-label="Merchant details" className="rounded-2xl bg-blue-50 p-4"><p className="text-xs text-blue-700">Paying demo merchant</p><h3 className="mt-1 font-bold">{merchant.name}</h3><p className="mt-1 font-mono text-sm">Merchant code: {merchant.code}</p></section>}

            {isStudentPayment && <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4" aria-label="Student payment details">
              <h3 className="font-bold">Student payment details</h3>
              {detailsLoading ? <p role="status" className="text-sm text-slate-500">Loading your student details…</p> : detailsError ? <p role="alert" className="text-sm text-red-700">{detailsError}</p> : enrollments.length === 0 ? <p className="text-sm text-slate-600">No enrollment found. <Link to="/student/admission" onClick={onClose} className="font-semibold text-blue-700 underline">Add your admission details</Link> in Profile first.</p> : <>
                {enrollments.length>1 && <label className="block text-sm font-semibold">Select enrollment<select value={enrollmentId} onChange={e=>setEnrollmentId(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3">{enrollments.map(item=><option key={item.id} value={item.id}>{item.university||"University unavailable"} · {item.admission_number}</option>)}</select></label>}
                <dl className="divide-y divide-slate-200">
                  <Row label="University name" value={university||"Unavailable"} />
                  <Row label="Admission number" value={admission} />
                  <Row label="Enrollment status" value={enrollment?.verification_status??"Unavailable"} />
                  <Row label="Remaining balance" value="Not available yet" />
                </dl>
                <p className="text-xs text-slate-500">University and admission details come from your enrollment. Your university fee balance is not connected yet.</p>
              </>}
            </section>}

            <div>
              {isStudentPayment && <fieldset className="mb-4"><legend className="text-sm font-semibold text-slate-700">Amount to pay</legend><div className="mt-2 grid grid-cols-2 gap-2">{([{id:"full",label:"Pay full"},{id:"custom",label:"Enter amount"}] as const).map(option=><button key={option.id} type="button" disabled={option.id==="full"} title={option.id==="full"?"Available when your university fee balance is connected":undefined} aria-pressed={amountMode===option.id} onClick={()=>setAmountMode(option.id)} className={`min-h-11 rounded-xl border px-3 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${amountMode===option.id?"border-blue-700 bg-blue-50 text-blue-700":"border-slate-200 text-slate-700"}`}>{option.label}</button>)}</div></fieldset>}
              <>
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
              {amountText && (!Number.isInteger(amount) || amount < minimumAmount || amount > MAX_TZS) && (
                <p className="mt-2 text-xs text-red-600">Enter between {money(minimumAmount)} and TZS 3,000,000.</p>
              )}
              </>


            </div>

            <div className="space-y-4">
              <label htmlFor="funding-source" className="block text-sm font-semibold text-slate-700">Source of funds
                <select id="funding-source" value={source} onChange={e=>setSource(e.target.value as MobileMoneyProvider|"bank"|"wallet"|"")} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"><option value="">Select source of funds</option>{purpose!=="wallet_topup"&&<option value="wallet">Main Wallet</option>}{PROVIDERS.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}<option value="bank">Bank</option></select>
              </label>
              {isWallet ? <div className="rounded-2xl bg-blue-50 p-4"><p className="text-sm font-semibold text-blue-700">Main Wallet current balance</p><p className="mt-1 text-2xl font-bold text-blue-900">{walletBalance===null?"Loading…":money(walletBalance)}</p>{walletError&&<p role="alert" className="mt-2 text-sm text-red-700">{walletError}</p>}{walletBalance!==null&&amount>walletBalance?<p role="alert" className="mt-2 text-sm text-red-700">Insufficient funds. Top up your wallet or choose mobile money or bank.</p>:walletBalance!==null&&amountValid?<p className="mt-2 text-sm text-blue-700">Balance after payment: {money(walletBalance-amount)}</p>:null}</div> : isBank ? linkedBank ? <div className="rounded-2xl border border-slate-200 p-4"><p className="font-bold">{linkedBank.bank}</p><p className="mt-1 text-sm text-slate-600">{linkedBank.name} · •••• {linkedBank.number.slice(-4)}</p><p className="mt-2 text-xs text-slate-500">OTP confirmation to {maskMsisdn(linkedBank.phone)} is required for each payment.</p></div> : <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Add and confirm your bank account first. <Link to="/student/bank" className="font-semibold underline">Open Bank Integration</Link></p> : source ? <>
              <label htmlFor="pay-phone" className="text-sm font-semibold text-slate-700">{provider?.name} mobile number</label>
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
              {purpose==="wallet_topup"&&savedPhone&&<button type="button" onClick={()=>{setSource(savedPhone.source);setPhone(savedPhone.phone);}} className="mt-2 block text-sm font-semibold text-blue-700">Use saved number · {maskMsisdn(savedPhone.phone)}</button>}
              {purpose==="wallet_topup"&&msisdn&&detectedProvider?.id===source&&<label className="mt-3 flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={savePreferred} onChange={e=>setSavePreferred(e.target.checked)}/> Save as my preferred top-up number on this device</label>}
              {phone && !msisdn && <p className="mt-2 text-xs text-red-600">Enter a valid Tanzanian mobile number, for example 0744 123 456.</p>}
              {msisdn && !provider && <p className="mt-2 text-xs text-red-600">This number is not M-Pesa, Airtel Money or Mixx by Yas.</p>}
              {msisdn&&detectedProvider?.id!==source&&<p className="text-xs text-red-600">Enter a number for the selected operator.</p>}
              </> : null}
            </div>

            <button
              type="button"
              disabled={!amountValid || !sourceValid}
              onClick={() => setStep("review")}
              className="min-h-12 w-full rounded-2xl bg-[#1761c5] py-3 font-bold text-white disabled:bg-slate-300"
            >
              Review payment
            </button>
          </div>
        )}

        {step === "review" && provider && sourceValid && (
          <div className="mt-5 space-y-5">
            <dl className="divide-y divide-slate-100 rounded-2xl border border-slate-100">
              <Row label="Purpose" value={purposeLabel} />
              {purpose==="merchant"&&merchant&&<><Row label="Merchant" value={merchant.name}/><Row label="Merchant code" value={merchant.code}/></>}
              {isStudentPayment && <><Row label="University" value={university.trim()} /><Row label="Admission number" value={admission.trim()} /><Row label="Remaining balance" value="Not available yet" /></>}
              <Row label="Amount" value={money(amount)} />

              <Row label="Provider" value={provider.name} />
              {isWallet?<Row label="Wallet balance after payment" value={money((walletBalance??0)-amount)} />:<Row label={isBank?"Account number":"Mobile number"} value={isBank?`•••• ${accountNumber.slice(-4)}`:maskMsisdn(msisdn!)} />}
            </dl>
            <p className="text-xs text-slate-500">{isWallet?"Payment is deducted from your Main Wallet sandbox balance. No real money moves.":isBank?"Sandbox bank transfer simulation. No bank account is contacted and no real money moves.":"Sandbox mobile payment simulation. No real phone prompt is sent and no real money moves."}</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setStep("form")} className="min-h-12 rounded-2xl border border-slate-200 py-3 font-semibold">Back</button>
              <button type="button" disabled={submitting} onClick={() => void submit()} className="min-h-12 rounded-2xl bg-[#1761c5] py-3 font-bold text-white disabled:bg-slate-300">
                {submitting ? "Sending…" : "Confirm"}
              </button>
            </div>
          </div>
        )}

        {step === "bank_otp" && linkedBank && <div className="mt-5 space-y-4"><h3 className="font-bold">Confirm bank payment</h3><p className="text-sm text-slate-600">{money(amount)} from {bankName} · account ending {accountNumber.slice(-4)}.</p><p className="text-sm text-slate-600">OTP destination: {maskMsisdn(linkedBank.phone)}</p><p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Sandbox: no SMS sent. Demo OTP: {DEMO_OTP}. Expires in 5 minutes. Each bank payment requires a new confirmation.</p><label className="block text-sm font-semibold">OTP code<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={bankOtp} onChange={e=>setBankOtp(e.target.value.replace(/\D/g,""))} className="mt-2 w-full rounded-xl border border-slate-200 p-3"/></label><div className="grid grid-cols-2 gap-3"><button type="button" disabled={submitting} onClick={()=>{setStep("review");setBankOtp("");}} className="min-h-12 rounded-xl border border-slate-200 font-semibold">Back</button><button type="button" disabled={submitting||bankOtp.length!==6} onClick={()=>{try{if(!user)return;const token=confirmBankOtp(bankChallenge,user.id,bankOtp);void submit(token);}catch(e){setError(e instanceof Error?e.message:"OTP confirmation failed.");}}} className="min-h-12 rounded-xl bg-blue-700 font-bold text-white disabled:opacity-40">{submitting?"Processing…":"Confirm OTP & pay"}</button></div></div>}

        {step === "processing" && result && (
          <div className="mt-10 text-center" role="status" aria-live="polite">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-[#1761c5]" aria-hidden="true" />
            <p className="mt-5 font-bold">Processing sandbox payment</p>
            <p className="mt-2 text-sm text-slate-600">Simulating {isBank?"bank transfer":provider?.name+" approval"}. Keep this screen open.</p>
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
