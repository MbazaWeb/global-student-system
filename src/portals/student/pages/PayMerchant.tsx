import { useCallback, useEffect, useState } from "react";
import { Store, QrCode, Star, Clock3, LoaderCircle, CheckCircle2, ChevronRight } from "lucide-react";
import PaymentSheet from "../components/wallet/PaymentSheet";
import MerchantQrScanner from "../components/wallet/MerchantQrScanner";
import { walletService } from "../services/walletService";
import { useAuth } from "../../../auth/AuthProvider";
import { merchantNetworks, findDemoMerchant, parseMerchantQr, type Merchant, type MerchantNetwork } from "../../../integrations/mobile-money/merchantDirectory";

const resolveCode=(code:string)=>{const [network,number]=code.split(":");return findDemoMerchant(network,number);};

export default function PayMerchant(){
 const {user}=useAuth();
 const [network,setNetwork]=useState<MerchantNetwork|"">("");
 const [number,setNumber]=useState("");
 const [resolved,setResolved]=useState<Merchant|null>(null);
 const [looking,setLooking]=useState(false);
 const [lookupError,setLookupError]=useState("");
 const [amount,setAmount]=useState("");
 const [checkout,setCheckout]=useState(false);
 const [scanner,setScanner]=useState(false);
 const [balance,setBalance]=useState<number|null>(null);
 const [error,setError]=useState("");
 const [favourites,setFavourites]=useState<string[]>([]);
 const [recent,setRecent]=useState<{merchant:Merchant;amount:number;date:string}[]>([]);
 const storageKey=user?`gss-merchant-favourites-v1:${user.id}`:null;

 useEffect(()=>{
  setFavourites([]);
  if(!storageKey)return;
  try{const saved:unknown=JSON.parse(localStorage.getItem(storageKey)??"[]");if(Array.isArray(saved))setFavourites(saved.filter((code):code is string=>typeof code==="string"&&!!resolveCode(code)));}catch{setFavourites([]);}
 },[storageKey]);

 const refresh=useCallback(async()=>{
  if(!user){setBalance(null);setRecent([]);return;}
  try{
   const summary=await walletService.getSummary();setBalance(summary.balanceTzs);setError("");
   const seen=new Set<string>();
   setRecent(summary.activity.filter(item=>item.purpose==="merchant"&&item.status==="completed"&&item.merchantCode).flatMap(item=>{
    const merchant=resolveCode(item.merchantCode!);if(!merchant||seen.has(merchant.code))return [];seen.add(merchant.code);return [{merchant,amount:item.amountTzs,date:item.createdAt}];
   }).slice(0,5));
  }catch{setBalance(null);setRecent([]);setError("Unable to load your current wallet balance and recent payments.");}
 },[user]);
 useEffect(()=>{void refresh();},[refresh]);

 useEffect(()=>{
  setResolved(null);setLookupError("");setAmount("");setLooking(false);
  if(!network||!number)return;
  if(!/^\d{4,20}$/.test(number)){setLookupError("Enter a merchant number with 4–20 digits.");return;}
  setLooking(true);
  const timer=window.setTimeout(()=>{
   const merchant=findDemoMerchant(network,number);
   setResolved(merchant);setLooking(false);
   if(!merchant)setLookupError("Merchant not found on this network. Check the number and network.");
  },700);
  return()=>window.clearTimeout(timer);
 },[network,number]);

 function choose(merchant:Merchant){setNetwork(merchant.network);setNumber(merchant.number);setScanner(false);setError("");}
 const scan=useCallback((raw:string)=>{
  try{const data=parseMerchantQr(raw);setNetwork(data.network);setNumber(data.number);setScanner(false);setError("");}
  catch(e){setError(e instanceof Error?e.message:"Unable to read merchant QR.");}
 },[]);
 function favourite(){
  if(!resolved||!storageKey)return;
  const next=favourites.includes(resolved.code)?favourites.filter(code=>code!==resolved.code):[resolved.code,...favourites].slice(0,20);
  try{localStorage.setItem(storageKey,JSON.stringify(next));setFavourites(next);}catch{setError("Unable to save favourites in this browser.");}
 }
 const amountNumber=Number(amount);
 const validAmount=Number.isInteger(amountNumber)&&amountNumber>=100&&amountNumber<=3000000;
 const networkName=(id:string)=>merchantNetworks.find(item=>item.id===id)?.name??id;
 const field="mt-2 block min-h-12 w-full rounded-xl border border-slate-200 bg-white p-3 text-base outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100";
 return <main className="mx-auto max-w-2xl space-y-6 px-5 py-6">
  <header className="flex items-center gap-3"><span className="rounded-2xl bg-blue-50 p-3 text-blue-700"><Store aria-hidden="true"/></span><div><h1 className="text-2xl font-extrabold">Pay Merchant</h1><p className="mt-1 text-sm text-slate-500">Enter merchant details or scan a QR.</p></div></header>
  <section className="rounded-3xl bg-gradient-to-br from-[#1761c5] to-[#123b86] p-5 text-white" aria-label="Available wallet funds"><p className="text-sm text-blue-100">Main Wallet available balance</p><p className="mt-2 text-3xl font-extrabold">{balance===null?"Loading…":`TZS ${balance.toLocaleString("en-US")}`}</p></section>
  {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  <section aria-label="Merchant payment" className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
   <label className="block text-sm font-semibold text-slate-700">Network<select value={network} onChange={e=>setNetwork(e.target.value as MerchantNetwork|"")} className={field}><option value="">Select network</option>{merchantNetworks.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
   <label className="block text-sm font-semibold text-slate-700">Merchant number<input inputMode="numeric" autoComplete="off" maxLength={20} value={number} onChange={e=>setNumber(e.target.value.replace(/\D/g,""))} placeholder="Enter merchant number" className={field}/></label>
   <div className="flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-100"/>OR<span className="h-px flex-1 bg-slate-100"/></div>
   <button type="button" onClick={()=>setScanner(value=>!value)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 font-bold text-blue-700"><QrCode size={20} aria-hidden="true"/>Scan QR</button>
   {looking&&<div role="status" className="flex items-center gap-3 rounded-xl bg-blue-50 p-4 text-sm font-semibold text-blue-700"><LoaderCircle size={20} className="animate-spin" aria-hidden="true"/>Looking up merchant…</div>}
   {lookupError&&<p role="alert" className="text-sm text-red-700">{lookupError}</p>}
   {resolved&&!looking&&<div className="space-y-4">
    <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4"><CheckCircle2 className="shrink-0 text-emerald-700" aria-hidden="true"/><div className="min-w-0 flex-1"><p className="text-xs text-emerald-700">Demo merchant found</p><h2 className="mt-1 font-bold">{resolved.name}</h2><p className="mt-1 text-xs text-slate-500">{networkName(resolved.network)} · {resolved.number}</p></div><button type="button" onClick={favourite} aria-label={favourites.includes(resolved.code)?"Remove from favourites":"Add to favourites"} aria-pressed={favourites.includes(resolved.code)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-amber-500"><Star size={21} fill={favourites.includes(resolved.code)?"currentColor":"none"}/></button></div>
    <label className="block text-sm font-semibold text-slate-700">Amount (TZS)<input inputMode="numeric" value={amount} onChange={e=>setAmount(e.target.value.replace(/\D/g,"").slice(0,7))} placeholder="Enter amount to pay" className={field}/></label>
    {amount&&!validAmount&&<p className="text-xs text-red-700">Enter TZS 100–3,000,000.</p>}
    <button type="button" disabled={!validAmount} onClick={()=>setCheckout(true)} className="min-h-12 w-full rounded-xl bg-blue-700 font-bold text-white disabled:opacity-40">Continue to payment</button>
   </div>}
   <p className="text-xs leading-5 text-slate-400">Demo lookup only. Try M-Pesa merchant 100001. Real operator lookup and merchant QR formats are not connected.</p>
  </section>
  {scanner&&<MerchantQrScanner onScan={scan} onClose={()=>setScanner(false)}/>}
  <section aria-labelledby="favourites-heading"><h2 id="favourites-heading" className="flex items-center gap-2 font-bold"><Star size={18} className="text-amber-500" aria-hidden="true"/>Favourites</h2><div className="mt-3 space-y-2">{favourites.map(resolveCode).filter((item):item is Merchant=>!!item).map(item=><button key={item.code} type="button" onClick={()=>choose(item)} className="flex min-h-16 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left"><span><span className="block text-sm font-bold">{item.name}</span><span className="mt-1 block text-xs text-slate-500">{networkName(item.network)} · {item.number}</span></span><ChevronRight size={18} aria-hidden="true"/></button>)}</div>{!favourites.length&&<p className="mt-3 text-sm text-slate-500">Tap the star beside a merchant to save it here.</p>}</section>
  <section aria-labelledby="recent-pay-heading"><h2 id="recent-pay-heading" className="flex items-center gap-2 font-bold"><Clock3 size={18} className="text-blue-700" aria-hidden="true"/>Recent pay</h2><div className="mt-3 space-y-2">{recent.map(item=><button key={item.merchant.code} type="button" onClick={()=>choose(item.merchant)} className="flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left"><span><span className="block text-sm font-bold">{item.merchant.name}</span><span className="mt-1 block text-xs text-slate-500">{networkName(item.merchant.network)} · {item.merchant.number}</span></span><span className="text-right"><span className="block text-xs font-bold">TZS {item.amount.toLocaleString("en-US")}</span><span className="mt-1 block text-xs text-slate-400">{new Date(item.date).toLocaleDateString()}</span></span></button>)}</div>{!recent.length&&<p className="mt-3 text-sm text-slate-500">Completed merchant payments will appear here.</p>}</section>
  {checkout&&resolved&&<PaymentSheet initialPurpose="merchant" initialAmount={amountNumber} merchant={resolved} onClose={()=>setCheckout(false)} onFinished={refresh}/>}
 </main>;
}
