import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { IdCard, GraduationCap, ShieldCheck, Clock3, Copy, Check, UserRound, ChevronRight } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../auth/AuthProvider";

type Identity={global_student_id:string;issued_at:string};
type Enrollment={admission_number:string;course_name:string|null;academic_year:string|null;verification_status:string;institution_id:string};

export default function StudentIdentity(){
 const {user}=useAuth();
 const [name,setName]=useState("");
 const [photo,setPhoto]=useState<string|null>(null);
 const [identity,setIdentity]=useState<Identity|null>(null);
 const [enrollment,setEnrollment]=useState<Enrollment|null>(null);
 const [institution,setInstitution]=useState("");
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [copied,setCopied]=useState(false);
 const [copyError,setCopyError]=useState("");
 const verified=enrollment?.verification_status==="verified";

 useEffect(()=>{
  let active=true;setLoading(true);setError("");setPhoto(null);setName("");setIdentity(null);setEnrollment(null);setInstitution("");setCopied(false);
  async function load(){
   try{
    if(!supabase||!user)throw new Error("Sign in to view your student identity.");
    const [p,i,e]=await Promise.all([
     supabase.from("student_profiles").select("display_name,avatar_path").eq("id",user.id).maybeSingle(),
     supabase.from("student_global_ids").select("global_student_id,issued_at").eq("student_id",user.id).maybeSingle(),
     supabase.from("student_enrollments").select("admission_number,course_name,academic_year,verification_status,institution_id").eq("student_id",user.id).order("created_at",{ascending:false}),
    ]);
    if(p.error||i.error||e.error)throw p.error||i.error||e.error;
    const selected=e.data?.find(item=>item.verification_status==="verified")??e.data?.[0]??null;
    if(active){setName(p.data?.display_name??"Student");setIdentity(i.data);setEnrollment(selected);}
    if(selected){
     const response=await supabase.from("institutions").select("name").eq("id",selected.institution_id).maybeSingle();
     if(response.error)throw response.error;
     if(active)setInstitution(response.data?.name??"Institution unavailable");
    }
    if(p.data?.avatar_path){
     const image=await supabase.storage.from("student-avatars").createSignedUrl(p.data.avatar_path,3600);
     if(active)setPhoto(image.data?.signedUrl??null);
    }
   }catch(e){if(active)setError(e instanceof Error?e.message:"Unable to load your Global ID.");}
   finally{if(active)setLoading(false);}
  }
  void load();return()=>{active=false;};
 },[user]);

 async function copy(){
  if(!identity)return;
  try{await navigator.clipboard.writeText(identity.global_student_id);setCopied(true);setCopyError("");}
  catch{setCopyError("Unable to copy automatically. Select and copy the ID displayed on your card.");}
 }
 return <main className="mx-auto max-w-2xl space-y-6 px-5 py-6">
  <header className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><IdCard size={25} aria-hidden="true"/></span><div><h1 className="text-2xl font-extrabold tracking-tight">Global ID</h1><p className="mt-1 text-sm text-slate-500">Your student identity, wherever you study.</p></div></header>
  {loading?<div role="status" className="animate-pulse space-y-5 rounded-3xl bg-slate-100 p-6"><div className="h-4 w-40 rounded bg-slate-200"/><div className="h-20 w-20 rounded-2xl bg-slate-200"/><div className="h-7 w-56 rounded bg-slate-200"/><p className="text-sm text-slate-500">Loading your student ID…</p></div>:error?<p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>:identity?<>
   <section aria-label="Digital student ID card" className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1761c5] to-[#123b86] p-6 text-white shadow-xl">
    <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full border-[24px] border-white/5"/>
    <div className="relative flex items-center justify-between gap-3"><div className="flex items-center gap-2"><GraduationCap size={24} aria-hidden="true"/><span className="text-xs font-bold tracking-widest">GLOBAL STUDENT SYSTEM</span></div><span className="rounded-full border border-white/20 px-3 py-1 text-[10px] font-semibold tracking-wide">DIGITAL ID</span></div>
    <div className="relative mt-7 flex items-center gap-4">
     {photo?<img src={photo} alt="Student profile" onError={()=>setPhoto(null)} className="h-20 w-20 shrink-0 rounded-2xl border-2 border-white/30 object-cover"/>:<div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/10"><UserRound size={35} aria-hidden="true"/></div>}
     <div className="min-w-0"><p className="text-xs text-blue-200">Student name</p><h2 className="mt-1 break-words text-xl font-extrabold">{name}</h2><p className="mt-2 text-xs text-blue-200">{institution||"Institution not added"}</p></div>
    </div>
    <div className="relative mt-7 rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-[10px] font-semibold uppercase tracking-widest text-blue-200">Global Student ID</p><p className="mt-2 select-all break-all font-mono text-2xl font-bold tracking-wide">{identity.global_student_id}</p><div className="mt-4 border-t border-white/10 pt-3"><p className="text-[10px] font-semibold uppercase tracking-widest text-blue-200">Admission number</p><p className="mt-1 select-all break-all font-mono text-lg font-bold">{enrollment?.admission_number||"Not added"}</p></div></div>
    <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3"><span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${verified?"bg-emerald-400/15 text-emerald-200":"bg-amber-400/15 text-amber-200"}`}>{verified?<ShieldCheck size={15} aria-hidden="true"/>:<Clock3 size={15} aria-hidden="true"/>}{verified?"Enrollment verified":"Enrollment not verified"}</span><p className="text-[11px] text-blue-200">Issued {new Date(identity.issued_at).toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"})}</p></div>
   </section>
   <button type="button" onClick={()=>void copy()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 font-bold text-blue-700">{copied?<Check size={18} aria-hidden="true"/>:<Copy size={18} aria-hidden="true"/>}{copied?"ID copied":"Copy student ID"}</button>
   {copyError&&<p role="alert" className="text-sm text-red-700">{copyError}</p>}
   <section aria-labelledby="enrollment-info-heading" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 id="enrollment-info-heading" className="font-extrabold">Enrollment details</h2><dl className="mt-4 divide-y divide-slate-100">{[{label:"Institution",value:institution||"Not added"},{label:"Admission number",value:enrollment?.admission_number||"Not added"},{label:"Course admitted",value:enrollment?.course_name||"Not provided"},{label:"Academic year",value:enrollment?.academic_year||"Not provided"}].map(item=><div key={item.label} className="py-3"><dt className="text-xs text-slate-500">{item.label}</dt><dd className="mt-1 break-words text-sm font-semibold">{item.value}</dd></div>)}</dl><Link to="/student/admission" className="mt-3 flex min-h-11 items-center justify-between text-sm font-semibold text-blue-700">Manage admissions<ChevronRight size={18} aria-hidden="true"/></Link></section>
  </>:<section className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center"><IdCard size={36} className="mx-auto text-blue-300" aria-hidden="true"/><h2 className="mt-3 font-bold">Your ID is being prepared</h2><p className="mt-2 text-sm text-slate-500">Your Global Student ID has not been issued yet. Please check again later.</p></section>}
  <p className="text-center text-xs leading-5 text-slate-400">Your GSS identity stays with you across institutions. Enrollment status is checked separately. This is not a government ID or bank KYC document.</p>
 </main>;
}
