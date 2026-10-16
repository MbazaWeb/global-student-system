import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../auth/AuthProvider";
type Request={id:string;institution_id:string;student_id:string;enrollment_id:string;status:string;created_at:string};
export default function StudentVerification(){
 const {user}=useAuth();const [requests,setRequests]=useState<Request[]>([]);
 const [error,setError]=useState("");const [notes,setNotes]=useState<Record<string,string>>({});
 const [loading,setLoading]=useState(true);const [busy,setBusy]=useState<string|null>(null);
 const load=useCallback(async()=>{if(!supabase){setError("Supabase is not configured.");setLoading(false);return;}
 const {data,error}=await supabase.from("enrollment_verification_requests").select("id,institution_id,student_id,enrollment_id,status,created_at").order("created_at",{ascending:false}).limit(100);
 setRequests((data??[]) as Request[]);setError(error?.message??"");setLoading(false);},[]);
 useEffect(()=>{void load();},[load]);
 async function decide(id:string,decision:"verified"|"rejected"){if(!supabase)return;setBusy(id);setError("");
 const {error}=await supabase.rpc("gss_decide_enrollment_verification",{p_request_id:id,p_decision:decision,p_note:notes[id]??""});
 setBusy(null);if(error)setError(error.message);else await load();}
 return <main className="mx-auto max-w-5xl p-6"><h1 className="text-3xl font-bold">Student Verification</h1><p className="text-slate-600 mt-2">Institution Admin only. Verify enrollment against official institutional records before approving.</p><p className="text-xs text-slate-500 mt-2">Signed in: {user?.email}</p>{error&&<p role="alert" className="text-red-700 mt-3">{error}</p>}{loading?<p>Loading…</p>:requests.length===0?<p className="mt-6">No verification requests.</p>:<div className="grid gap-4 mt-6">{requests.map(item=><section key={item.id} className="bg-white border rounded-xl p-5"><h2 className="font-bold">Enrollment {item.enrollment_id}</h2><p className="text-sm text-slate-600">Student: {item.student_id}</p><p className="text-sm">Status: {item.status}</p>{item.status==="pending"&&<><label className="block mt-3">Verification note<textarea maxLength={2000} className="block border rounded p-2 w-full" value={notes[item.id]??""} onChange={e=>setNotes(v=>({...v,[item.id]:e.target.value}))}/></label><div className="flex gap-3 mt-3"><button disabled={busy===item.id||(notes[item.id]??"").trim().length<10} onClick={()=>void decide(item.id,"verified")} className="border rounded px-4 py-2 disabled:opacity-40">Verify</button><button disabled={busy===item.id||(notes[item.id]??"").trim().length<10} onClick={()=>void decide(item.id,"rejected")} className="border rounded px-4 py-2 disabled:opacity-40">Reject</button></div></>}</section>)}</div>}</main>;
}
