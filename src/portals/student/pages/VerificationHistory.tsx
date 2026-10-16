import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { History, ShieldCheck, Clock3, CircleX, Building2, ChevronRight } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../auth/AuthProvider";

type Review={id:string;enrollment_id:string;status:string;review_note:string|null;created_at:string;reviewed_at:string|null};
type Entry=Review & {institution:string;admission:string;course:string|null;year:string|null};
const statusInfo={
 pending:{label:"Pending review",style:"bg-amber-50 text-amber-800",Icon:Clock3},
 verified:{label:"Verified",style:"bg-emerald-50 text-emerald-700",Icon:ShieldCheck},
 rejected:{label:"Not approved",style:"bg-red-50 text-red-700",Icon:CircleX},
};
const date=(value:string)=>new Date(value).toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"});

export default function VerificationHistory(){
 const {user}=useAuth();
 const [reviews,setReviews]=useState<Entry[]>([]);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 const [filter,setFilter]=useState("all");
 useEffect(()=>{
  let active=true;setLoading(true);setError("");setReviews([]);
  async function load(){
   try{
    if(!supabase||!user)throw new Error("Sign in to view your verification history.");
    const requests=await supabase.from("enrollment_verification_requests").select("id,enrollment_id,status,review_note,created_at,reviewed_at").eq("student_id",user.id).order("created_at",{ascending:false}).limit(100);
    if(requests.error)throw requests.error;
    const rows=(requests.data??[]) as Review[];
    if(!rows.length)return;
    const enrollments=await supabase.from("student_enrollments").select("id,institution_id,admission_number,course_name,academic_year").eq("student_id",user.id).in("id",rows.map(row=>row.enrollment_id));
    if(enrollments.error)throw enrollments.error;
    const ids=[...new Set((enrollments.data??[]).map(row=>row.institution_id))];
    const institutions=ids.length?await supabase.from("institutions").select("id,name").in("id",ids):{data:[],error:null};
    if(institutions.error)throw institutions.error;
    if(active)setReviews(rows.map(row=>{
     const enrollment=enrollments.data?.find(item=>item.id===row.enrollment_id);
     return {...row,institution:institutions.data?.find(item=>item.id===enrollment?.institution_id)?.name??"Institution unavailable",admission:enrollment?.admission_number??"Not available",course:enrollment?.course_name??null,year:enrollment?.academic_year??null};
    }));
   }catch(e){if(active)setError(e instanceof Error?e.message:"Unable to load verification history.");}
   finally{if(active)setLoading(false);}
  }
  void load();return()=>{active=false;};
 },[user]);
 const visible=reviews.filter(row=>filter==="all"||row.status===filter);
 return <main className="mx-auto max-w-2xl space-y-6 px-5 py-6">
  <header className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><History size={25} aria-hidden="true"/></span><div><h1 className="text-2xl font-extrabold">History</h1><p className="mt-1 text-sm text-slate-500">Track your admission verification journey.</p></div></header>
  <section aria-label="Verification summary" className="rounded-3xl bg-gradient-to-br from-[#1761c5] to-[#123b86] p-5 text-white"><p className="text-sm font-semibold text-blue-100">Enrollment verification</p><p className="mt-2 text-xl font-extrabold">Every request. Every update.</p><dl className="mt-5 grid grid-cols-3 gap-3">{[{label:"Requests",count:reviews.length},{label:"Verified",count:reviews.filter(row=>row.status==="verified").length},{label:"Pending",count:reviews.filter(row=>row.status==="pending").length}].map(item=><div key={item.label} className="rounded-xl bg-white/10 p-3"><dt className="text-xs text-blue-100">{item.label}</dt><dd className="mt-1 text-2xl font-bold">{loading?"—":item.count}</dd></div>)}</dl></section>
  <div role="group" aria-label="Filter verification history" className="flex flex-wrap gap-2">{[{id:"all",label:"All"},{id:"pending",label:"Pending"},{id:"verified",label:"Verified"},{id:"rejected",label:"Not approved"}].map(item=><button key={item.id} type="button" aria-pressed={filter===item.id} onClick={()=>setFilter(item.id)} className={`min-h-11 rounded-full border px-4 text-xs font-semibold ${filter===item.id?"border-blue-700 bg-blue-700 text-white":"border-slate-200 bg-white text-slate-600"}`}>{item.label}</button>)}</div>
  {error&&<p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
  {loading?<p role="status" className="animate-pulse rounded-3xl bg-slate-100 p-6 text-sm text-slate-500">Loading verification history…</p>:!visible.length?<section className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center"><History size={34} className="mx-auto text-blue-300" aria-hidden="true"/><h2 className="mt-3 font-bold">{error?"History unavailable":reviews.length?"No matching requests":"No verification requests yet"}</h2><p className="mt-2 text-sm text-slate-500">{error?"Please try again later.":reviews.length?"Choose another status to view your requests.":"Submit your admission details to begin verification."}</p></section>:<section aria-label="Verification timeline" className="space-y-4">{visible.map(row=>{
   const state=statusInfo[row.status as keyof typeof statusInfo]??statusInfo.pending;
   const Icon=state.Icon;
   return <article key={row.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="flex items-start gap-3 p-5"><span className="rounded-xl bg-blue-50 p-2 text-blue-700"><Building2 size={22} aria-hidden="true"/></span><div className="min-w-0 flex-1"><h2 className="break-words font-extrabold">{row.institution}</h2><p className="mt-1 text-sm text-slate-500">Admission: <strong className="font-semibold text-slate-700">{row.admission}</strong></p>{row.course&&<p className="mt-2 text-sm text-slate-600">{row.course}</p>}{row.year&&<p className="mt-1 text-xs text-slate-400">Academic year {row.year}</p>}</div></div><div className="border-t border-slate-100 px-5 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${state.style}`}><Icon size={15} aria-hidden="true"/>{state.label}</span><ol className="mt-4 border-l-2 border-slate-100 pl-4 text-sm"><li className="pb-4"><p className="font-semibold">Request submitted</p><time dateTime={row.created_at} className="mt-1 block text-xs text-slate-400">{date(row.created_at)}</time></li><li><p className="font-semibold">{row.reviewed_at?"Institution reviewed":"Awaiting institution review"}</p>{row.reviewed_at?<time dateTime={row.reviewed_at} className="mt-1 block text-xs text-slate-400">{date(row.reviewed_at)}</time>:<p className="mt-1 text-xs text-slate-400">Your institution will confirm the outcome.</p>}</li></ol>{row.review_note&&<div className="mt-4 rounded-xl bg-slate-50 p-3"><h3 className="text-xs font-bold text-slate-500">Institution note</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">{row.review_note}</p></div>}</div></article>;
  })}</section>}
  <Link to="/student/admission" className="flex min-h-12 items-center justify-between rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700">Manage admissions<ChevronRight size={18} aria-hidden="true"/></Link>
  <p className="text-center text-xs leading-5 text-slate-400">Latest 100 verification requests. Local demo admissions are not included.</p>
 </main>;
}
