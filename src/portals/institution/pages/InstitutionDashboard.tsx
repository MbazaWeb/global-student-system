import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../auth/AuthProvider";
type Enrollment={id:string;verification_status:string};
export default function InstitutionDashboard(){
 const {user}=useAuth();const [institutionId,setInstitutionId]=useState<string|null>(null);
 const [total,setTotal]=useState(0);const [pending,setPending]=useState(0);const [verified,setVerified]=useState(0);
 const [error,setError]=useState("");const [loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;async function load(){if(!supabase||!user){if(active){setError("Supabase is not configured.");setLoading(false);}return;}
 const role=await supabase.from("user_role_assignments").select("institution_id").eq("user_id",user.id).eq("role","institution_admin").maybeSingle();
 if(role.error||!role.data?.institution_id){if(active){setError(role.error?.message??"No institution assigned.");setLoading(false);}return;}
 const id=role.data.institution_id as string;
 const [e,q]=await Promise.all([supabase.from("student_enrollments").select("id,verification_status").eq("institution_id",id),supabase.from("enrollment_verification_requests").select("id").eq("institution_id",id).eq("status","pending")]);
 if(active){const records=(e.data??[]) as Enrollment[];setInstitutionId(id);setTotal(records.length);setVerified(records.filter(x=>x.verification_status==="verified").length);setPending(q.data?.length??0);setError(e.error?.message??q.error?.message??"");setLoading(false);}}
 void load();return()=>{active=false;};},[user]);
 return <main className="mx-auto max-w-5xl p-6"><h1 className="text-3xl font-bold">Institution Dashboard</h1><p className="text-slate-600 mt-2">Single Institution Admin · Enrollment oversight</p>{loading?<p className="mt-5">Loading…</p>:error?<p role="alert" className="mt-5 text-red-700">{error}</p>:<><p className="mt-4 text-sm text-slate-500">Institution: {institutionId}</p><div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">{[["Enrollment submissions",total],["Pending reviews",pending],["Verified enrollments",verified]].map(([label,value])=><div key={label} className="rounded-xl border p-5 bg-white"><p className="text-sm text-slate-600">{label}</p><p className="text-3xl font-bold mt-2">{value}</p></div>)}</div><Link className="inline-block underline mt-6" to="/institution/verification">Open verification queue</Link></>}</main>;
}
