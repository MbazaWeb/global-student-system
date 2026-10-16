import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../../lib/supabase";
type Institution={id:string;name:string;country_code:string};
type Enrollment={id:string;institution_id:string;admission_number:string;verification_status:string;created_at:string};
export default function AdmissionVerification(){
 const [institutions,setInstitutions]=useState<Institution[]>([]);const [enrollments,setEnrollments]=useState<Enrollment[]>([]);
 const [institutionId,setInstitutionId]=useState("");const [admission,setAdmission]=useState("");
 const [error,setError]=useState("");const [notice,setNotice]=useState("");const [busy,setBusy]=useState(false);
 const load=useCallback(async()=>{if(!supabase){setError("Supabase is not configured.");return;}
 const [i,e]=await Promise.all([supabase.from("institutions").select("id,name,country_code").eq("verification_status","verified").order("name"),supabase.from("student_enrollments").select("id,institution_id,admission_number,verification_status,created_at").order("created_at",{ascending:false})]);
 setInstitutions((i.data??[]) as Institution[]);setEnrollments((e.data??[]) as Enrollment[]);
 if(i.error||e.error)setError(i.error?.message??e.error?.message??"");},[]);
 useEffect(()=>{void load();},[load]);
 async function submit(event:FormEvent){event.preventDefault();setError("");setNotice("");if(!supabase)return;
 setBusy(true);const {error}=await supabase.rpc("gss_submit_enrollment",{p_institution_id:institutionId,p_admission_number:admission.trim()});
 setBusy(false);if(error)setError(error.message);else{setNotice("Enrollment submitted. Awaiting institution verification.");setAdmission("");await load();}}
 return <main className="mx-auto max-w-4xl p-6"><h1 className="text-3xl font-bold">Admission Verification</h1><p className="mt-2 text-slate-600">Submit your institution and admission number for manual verification by the institution's sole admin. Submission is not proof of admission.</p><form onSubmit={submit} className="grid gap-4 mt-6 max-w-lg"><label>Institution<select required value={institutionId} onChange={e=>setInstitutionId(e.target.value)} className="block border rounded p-3 w-full"><option value="">Select approved institution</option>{institutions.map(i=><option key={i.id} value={i.id}>{i.name} ({i.country_code})</option>)}</select></label><label>Admission number<input required minLength={3} maxLength={60} value={admission} onChange={e=>setAdmission(e.target.value)} className="block border rounded p-3 w-full"/></label><button disabled={busy} className="bg-blue-800 text-white rounded p-3">{busy?"Submitting…":"Request verification"}</button></form>{error&&<p role="alert" className="text-red-700 mt-3">{error}</p>}{notice&&<p role="status" className="mt-3">{notice}</p>}<h2 className="text-xl font-bold mt-10">My enrollment requests</h2>{enrollments.length===0?<p className="mt-3">No enrollments submitted yet.</p>:<div className="grid gap-3 mt-4">{enrollments.map(e=><article key={e.id} className="border rounded p-4"><p className="font-semibold">{institutions.find(i=>i.id===e.institution_id)?.name??e.institution_id}</p><p>Admission: {e.admission_number}</p><p>Status: <strong>{e.verification_status}</strong></p></article>)}</div>}</main>;
}
