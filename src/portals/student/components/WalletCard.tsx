import { useState, type FormEvent } from "react";
import { walletService } from "../services/walletService";
import { normalizeTzMsisdn } from "../../../integrations/mobile-money/phone";

interface Props {
  balanceTzs: number;
  onTopUp: () => void;
  onPayTuition: () => void;
  onOutgoingComplete: () => void;
}

export default function WalletCard({ balanceTzs, onTopUp, onPayTuition, onOutgoingComplete }: Props) {
  const [hidden, setHidden] = useState(false);
  const [notice, setNotice] = useState<"Transfer" | "Withdraw" | null>(null);
  const [destination,setDestination]=useState("");
  const [channel,setChannel]=useState<"mobile"|"bank">("mobile");
  const [bankName,setBankName]=useState("");
  const [agentCode,setAgentCode]=useState("");
  const [amount,setAmount]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");
  async function submit(e:FormEvent){
    e.preventDefault();if(!notice||busy)return;
    setError("");setSuccess("");setBusy(true);
    try{
      let target="";
      if(notice==="Transfer"&&channel==="bank"){
        if(!bankName.trim())throw new Error("Enter the recipient bank name.");
        if(!/^\\d{6,24}$/.test(destination.trim()))throw new Error("Enter a bank account number with 6–24 digits.");
        target="BANK:"+bankName.trim()+":"+destination.trim();
      }else if(notice==="Withdraw"){
        if(!/^[a-zA-Z0-9-]{3,30}$/.test(agentCode.trim()))throw new Error("Enter a valid Wakala agent code.");
        target="AGENT:"+agentCode.trim();
      }else{
        const phone=normalizeTzMsisdn(destination);
        if(!phone)throw new Error("Enter a valid Tanzanian mobile number.");
        target=phone;
      }
      const result=await walletService.sandboxOutgoing(notice==="Transfer"?"transfer":"withdraw",Number(amount),target);
      setSuccess(`Sandbox ${notice.toLowerCase()} completed. Reference: ${result.reference}`);
      onOutgoingComplete();
    }catch(e){setError(e instanceof Error?e.message:"Transaction failed.");}
    finally{setBusy(false);}
  }
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
        <button type="button" onClick={() => {setNotice("Transfer");setError("");setSuccess("");setAmount("");setDestination("");setChannel("mobile");setBankName("");setAgentCode("");}} className="min-h-12 rounded-2xl border border-white/30 bg-white/15 py-3 text-sm font-bold text-white hover:bg-white/25">Transfer</button>
        <button type="button" onClick={() => {setNotice("Withdraw");setError("");setSuccess("");setAmount("");setDestination("");}} className="min-h-12 rounded-2xl border border-white/30 bg-white/15 py-3 text-sm font-bold text-white hover:bg-white/25">Withdraw</button>
      </div>
      {notice && <div role="dialog" aria-modal="true" aria-labelledby="wallet-action-title" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-5"><div className="w-full max-w-sm rounded-2xl bg-white p-6 text-slate-900 shadow-xl"><h2 id="wallet-action-title" className="text-xl font-extrabold">{notice} · Sandbox</h2><p className="mt-2 text-sm text-slate-600">Test transaction only. No real funds will move.</p>{success?<><p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p><button type="button" onClick={()=>setNotice(null)} className="mt-5 min-h-11 w-full rounded-xl bg-blue-700 font-bold text-white">Done</button></>:<form onSubmit={submit} className="mt-4 space-y-4">{notice==="Transfer"&&<fieldset className="space-y-2"><legend className="text-sm font-semibold">Transfer to</legend><div className="grid grid-cols-2 gap-2"><button type="button" aria-pressed={channel==="mobile"} onClick={()=>{setChannel("mobile");setDestination("");setError("");}} className={`rounded-xl border p-3 text-sm font-semibold ${channel==="mobile"?"border-blue-600 bg-blue-50 text-blue-700":"text-slate-700"}`}>Mobile Money</button><button type="button" aria-pressed={channel==="bank"} onClick={()=>{setChannel("bank");setDestination("");setError("");}} className={`rounded-xl border p-3 text-sm font-semibold ${channel==="bank"?"border-blue-600 bg-blue-50 text-blue-700":"text-slate-700"}`}>Bank Account</button></div></fieldset>}
{notice==="Transfer"&&channel==="bank"&&<label className="block text-sm font-semibold">Recipient bank name<input required value={bankName} onChange={e=>setBankName(e.target.value)} placeholder="Bank name" className="mt-2 w-full rounded-xl border p-3"/></label>}
{notice==="Transfer"&&<label className="block text-sm font-semibold">{channel==="bank"?"Recipient bank account number":"Recipient mobile money number"}<input type={channel==="bank"?"text":"tel"} inputMode={channel==="bank"?"numeric":"tel"} required value={destination} onChange={e=>setDestination(e.target.value)} placeholder={channel==="bank"?"Account number":"07XXXXXXXX"} className="mt-2 w-full rounded-xl border p-3"/></label>}
{notice==="Withdraw"&&<><p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Sandbox Wakala withdrawal only. No real cash-out instruction or agent payout is issued.</p><label className="block text-sm font-semibold">Wakala agent code<input required value={agentCode} onChange={e=>setAgentCode(e.target.value)} placeholder="Agent code" className="mt-2 w-full rounded-xl border p-3"/></label></>}<label className="block text-sm font-semibold">Amount (TZS)<input type="number" required min="1000" max="3000000" step="1" value={amount} onChange={e=>setAmount(e.target.value)} className="mt-2 w-full rounded-xl border p-3"/></label>{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}<div className="grid grid-cols-2 gap-2"><button type="button" disabled={busy} onClick={()=>setNotice(null)} className="min-h-11 rounded-xl border font-semibold">Cancel</button><button type="submit" disabled={busy} className="min-h-11 rounded-xl bg-blue-700 font-bold text-white disabled:opacity-50">{busy?"Processing…":"Confirm"}</button></div></form>}</div></div>}
    </section>
  );
}
