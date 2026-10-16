import { useState, type FormEvent } from "react";
import { Landmark, ShieldCheck, Plus } from "lucide-react";

import { useAuth } from "../../../auth/AuthProvider";
import { normalizeTzMsisdn, maskMsisdn } from "../../../integrations/mobile-money/phone";
import { DEMO_PIN, DEMO_OTP, getDemoBank, startBankOtp, confirmBankOtp, linkDemoBank, type DemoBank } from "../../../integrations/banking/demoBankSecurity";

const bankOptions = ["CRDB Bank", "NMB Bank", "NBC Bank", "Stanbic Bank", "Absa Bank", "Exim Bank", "Equity Bank", "KCB Bank"];

export default function BankAccountLinking(){
 const {user}=useAuth();
 const [adding,setAdding]=useState(false);
 const [draft,setDraft]=useState<DemoBank>({bank:"",name:"",number:"",phone:""});
 const [bank,setBank]=useState<DemoBank|null>(()=>getDemoBank(user?.id??""));
 const [pin,setPin]=useState("");
 const [otp,setOtp]=useState("");
 const [challenge,setChallenge]=useState("");
 const [securityError,setSecurityError]=useState("");
 function save(event:FormEvent){
  event.preventDefault();setSecurityError("");
  try{
   if(!user)throw new Error("Sign in first.");
   if(challenge){
    const token=confirmBankOtp(challenge,user.id,otp);
    linkDemoBank(user.id,draft,token);setBank({...draft});setAdding(false);setChallenge("");setOtp("");return;
   }
   if(!bankOptions.includes(draft.bank))throw new Error("Select a bank from the list.");
   if(!draft.name.trim())throw new Error("Enter the account holder's name.");
   if(!/^\d{6,24}$/.test(draft.number))throw new Error("Account number must contain 6–24 digits.");
   const phone=normalizeTzMsisdn(draft.phone);
   if(!phone)throw new Error("Enter a complete bank-registered mobile number, e.g. 0712345678 (10 digits). +255 is optional.");
   if(pin!==DEMO_PIN)throw new Error("Use demo PIN 1234. Never enter your real bank PIN here.");
   const normalized={...draft,name:draft.name.trim(),phone};
   setDraft(normalized);setPin("");setChallenge(startBankOtp(user.id,JSON.stringify(normalized)));
  }catch(e){setSecurityError(e instanceof Error?e.message:"Confirmation failed.");}
 }
 return <main className="mx-auto max-w-2xl space-y-6 px-5 py-6">
  <header className="flex items-center gap-3"><span className="rounded-2xl bg-blue-50 p-3 text-blue-700"><Landmark aria-hidden="true"/></span><div><h1 className="text-2xl font-extrabold">Bank Integration</h1><p className="mt-1 text-sm text-slate-500">Your bank connection and account details.</p></div></header>
  <section className="rounded-3xl bg-gradient-to-br from-slate-900 to-blue-950 p-6 text-white" aria-label="Bank account">
   <div className="flex items-center justify-between"><Landmark size={28} aria-hidden="true"/><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">{bank?"Demo OTP confirmed":"Not connected"}</span></div>
   <dl className="mt-7 space-y-5"><div><dt className="text-xs text-blue-200">Bank name</dt><dd className="mt-1 font-bold">{bank?.bank??"No bank linked"}</dd></div><div><dt className="text-xs text-blue-200">Account name</dt><dd className="mt-1">{bank?.name??"Not available"}</dd></div><div><dt className="text-xs text-blue-200">Account number</dt><dd className="mt-1 font-mono text-xl tracking-widest">{bank?`•••• ${bank.number.slice(-4)}`:"•••• •••• ••••"}</dd></div></dl>
  </section>
  {!adding&&<button type="button" onClick={()=>{setDraft(bank??{bank:"",name:"",number:"",phone:""});setAdding(true);setChallenge("");setPin("");setOtp("");setSecurityError("");}} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 font-bold text-white hover:bg-blue-800"><Plus size={19} aria-hidden="true"/>{bank?"Edit bank":"Add bank"}</button>}
  {adding&&<form onSubmit={save} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Add bank</h2><p className="text-xs leading-5 text-slate-500">Demo preview only. Use test details only. Demo PIN: 1234. No real bank PIN or SMS is used. This demo connection clears on reload.</p><fieldset disabled={!!challenge} className="space-y-4"><legend className="sr-only">Bank account details</legend><label className="block text-sm font-semibold">Bank name<select required value={draft.bank} onChange={e=>setDraft({...draft,bank:e.target.value})} className="mt-2 block min-h-12 w-full rounded-xl border border-slate-200 bg-white p-3"><option value="">Select bank</option>{bankOptions.map(name=><option key={name} value={name}>{name}</option>)}</select></label><label className="block text-sm font-semibold">Account name<input required maxLength={100} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} placeholder="Name on the account" className="mt-2 block w-full rounded-xl border border-slate-200 p-3"/></label><label className="block text-sm font-semibold">Account number<input required inputMode="numeric" autoComplete="off" pattern="[0-9]{6,24}" maxLength={24} value={draft.number} onChange={e=>setDraft({...draft,number:e.target.value.replace(/\D/g,"")})} placeholder="Enter account number" className="mt-2 block w-full rounded-xl border border-slate-200 p-3"/></label><label className="block text-sm font-semibold">Bank-registered mobile number<input required type="tel" value={draft.phone} onChange={e=>setDraft({...draft,phone:e.target.value})} placeholder="0712 345 678" className="mt-2 block w-full rounded-xl border border-slate-200 p-3"/></label></fieldset>{!challenge?<label className="block text-sm font-semibold">Demo bank PIN<input required type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,""))} placeholder="Demo PIN: 1234" className="mt-2 block w-full rounded-xl border border-slate-200 p-3"/></label>:<div className="space-y-3 rounded-xl bg-blue-50 p-4"><p className="text-sm">Confirm mobile {maskMsisdn(draft.phone)}. In production the bank sends an SMS to the registered number.</p><p className="text-xs font-semibold">Demo OTP: {DEMO_OTP} · Expires in 5 minutes · No SMS sent</p><label className="block text-sm font-semibold">OTP code<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,""))} className="mt-2 w-full rounded-xl border border-slate-200 p-3"/></label><button type="button" onClick={()=>{setChallenge("");setOtp("");setSecurityError("");}} className="text-sm font-semibold text-blue-700">Start again</button></div>}{securityError&&<p role="alert" className="text-sm text-red-700">{securityError}</p>}<div className="grid grid-cols-2 gap-3"><button type="button" onClick={()=>setAdding(false)} className="min-h-12 rounded-xl border border-slate-200 font-semibold">Cancel</button><button className="min-h-12 rounded-xl bg-blue-700 font-bold text-white">{challenge?"Confirm OTP & add bank":"Request demo OTP"}</button></div></form>}
  <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4"><ShieldCheck className="shrink-0 text-blue-700" size={22} aria-hidden="true"/><div><h2 className="font-bold">Bank connection not available yet</h2><p className="mt-2 text-sm leading-6 text-slate-500">Account linking will be available once a banking partner is connected. Bank top-ups in the wallet currently use a sandbox simulation.</p></div></div>
 </main>;
}
