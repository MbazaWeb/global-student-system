import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import WalletCard from "../components/WalletCard";
import PaymentSheet from "../components/wallet/PaymentSheet";
import ActivityList from "../components/wallet/ActivityList";
import { walletService, type WalletSummary } from "../services/walletService";
import { PROVIDERS, type PaymentPurpose } from "../../../integrations/mobile-money/MobileMoneyAdapter";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../auth/AuthProvider";
import { GraduationCap, Landmark, ShieldCheck } from "lucide-react";

export default function StudentWallet() {
  const {user}=useAuth();
  const [studentDetails,setStudentDetails]=useState<{institution:string;admission:string}|null>(null);
  const [detailsLoading,setDetailsLoading]=useState(true);
  const [detailsError,setDetailsError]=useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const paying = searchParams.get("pay") === "tuition";
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [sheet, setSheet] = useState<{ open: boolean; purpose: PaymentPurpose }>({ open: false, purpose: "wallet_topup" });

  const refresh = useCallback(async () => {
    setSummary(await walletService.getSummary());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(()=>{
    let active=true;
    async function load(){
      setDetailsLoading(true);setDetailsError("");setStudentDetails(null);
      try{
        if(!supabase||!user)throw new Error("Sign in to view your student details.");
        const {data,error}=await supabase.from("student_enrollments").select("institution_id,admission_number,verification_status").eq("student_id",user.id).order("created_at",{ascending:false});
        if(error)throw error;
        const enrollment=data?.find(item=>item.verification_status==="verified")??data?.[0];
        if(enrollment){
          const institution=await supabase.from("institutions").select("name").eq("id",enrollment.institution_id).maybeSingle();
          if(institution.error)throw institution.error;
          if(active)setStudentDetails({institution:institution.data?.name??"Not available",admission:enrollment.admission_number});
        }
      }catch(e){if(active)setDetailsError(e instanceof Error?e.message:"Unable to load student details.");}
      finally{if(active)setDetailsLoading(false);}
    }
    void load();return()=>{active=false;};
  },[user]);

  const openSheet = (purpose: PaymentPurpose) => setSheet({ open: true, purpose });
  const closeSheet = useCallback(() => {
    setSheet((s) => ({ ...s, open: false }));
    setSearchParams((params) => { params.delete("pay"); return params; }, { replace: true });
  }, [setSearchParams]);

  return (
    <main className="mx-auto max-w-md space-y-6 px-5 pb-12 pt-6">
      <header>
        <span className="mt-2 inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Sandbox preview</span>
      </header>

      <WalletCard
        balanceTzs={summary?.balanceTzs ?? 0}
        onTopUp={() => openSheet("wallet_topup")}
        onPayTuition={() => openSheet("tuition")}
      />

      <section aria-labelledby="student-fees-heading" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 p-5"><span className="rounded-xl bg-blue-50 p-2 text-blue-700"><GraduationCap size={22} aria-hidden="true" /></span><div><h2 id="student-fees-heading" className="font-extrabold">My tuition & fees</h2><p className="text-xs text-slate-500">Student and institution details</p></div></div>
        {detailsError&&<p role="alert" className="px-5 pt-4 text-sm text-red-700">{detailsError}</p>}
        <dl className="space-y-4 p-5">
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Course</dt><dd className="mt-1 text-sm font-semibold">Not available yet</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Institution name</dt><dd className="mt-1 text-sm font-semibold">{detailsLoading?"Loading…":detailsError?"Unavailable":studentDetails?.institution??"No enrollment added"}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admission number</dt><dd className="mt-1 text-sm font-semibold">{detailsLoading?"Loading…":detailsError?"Unavailable":studentDetails?.admission??"Not added"}</dd></div>
        </dl>
        <dl className="grid grid-cols-3 gap-2 border-t border-slate-100 bg-slate-50 p-4">{[{label:"My tuition fee",color:"text-slate-900"},{label:"Paid fee",color:"text-emerald-700"},{label:"Balance fee",color:"text-amber-700"}].map(item=><div key={item.label}><dt className="text-xs text-slate-500">{item.label}</dt><dd className={`mt-2 text-sm font-bold ${item.color}`}>Not available</dd></div>)}</dl>
        <p className="px-5 py-3 text-xs text-slate-500">Course and fee records are awaiting institution connection.</p>
        {!detailsLoading&&!studentDetails&&!detailsError&&<Link to="/student/admission" className="block px-5 pb-4 text-sm font-semibold text-blue-700">Add admission details →</Link>}
      </section>

      <section aria-labelledby="bank-account-heading" className="rounded-3xl bg-gradient-to-br from-slate-900 to-blue-950 p-5 text-white shadow-sm">
        <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Landmark size={22} aria-hidden="true"/><h2 id="bank-account-heading" className="font-extrabold">Integrated bank</h2></div><span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">Not connected</span></div>
        <dl className="mt-6 space-y-4"><div><dt className="text-xs text-blue-200">Bank name</dt><dd className="mt-1 font-semibold">No bank linked</dd></div><div><dt className="text-xs text-blue-200">Account name</dt><dd className="mt-1 text-sm">Not available</dd></div><div><dt className="text-xs text-blue-200">Account number</dt><dd className="mt-1 font-mono text-lg tracking-widest">•••• •••• ••••</dd></div></dl>
        <p className="mt-5 flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-blue-200"><ShieldCheck size={16} aria-hidden="true"/>Bank details appear after account linking and verification.</p>
      </section>

      <section aria-labelledby="networks-heading">
        <h2 id="networks-heading" className="text-sm font-extrabold">Add fund</h2>
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {PROVIDERS.map((p) => (
            <li key={p.id} className="rounded-xl bg-white p-3 text-center text-xs font-semibold shadow-sm">
              <span className="mx-auto mb-2 block h-3 w-3 rounded-full" style={{ background: p.accent }} aria-hidden="true" />
              {p.name}
            </li>
          ))}
          <li className="rounded-xl bg-white p-3 text-center text-xs font-semibold shadow-sm">
            <svg className="mx-auto mb-2 h-4 w-4 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="m3 9 9-6 9 6H3Zm0 12h18M6 10v8m6-8v8m6-8v8" />
            </svg>
            Bank
          </li>
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

      {(sheet.open || paying) && (
        <PaymentSheet initialPurpose={paying ? "tuition" : sheet.purpose} onClose={closeSheet} onFinished={refresh} />
      )}
    </main>
  );
}
