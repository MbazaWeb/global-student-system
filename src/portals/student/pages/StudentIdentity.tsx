import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../auth/AuthProvider";
type Profile={display_name:string};type StudentId={global_student_id:string;issued_at:string};
export default function StudentIdentity(){
 const {user}=useAuth();const [profile,setProfile]=useState<Profile|null>(null);
 const [identity,setIdentity]=useState<StudentId|null>(null);const [verified,setVerified]=useState(false);
 const [error,setError]=useState("");const [loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;async function load(){if(!supabase||!user){if(active){setError("Sign in and configure Supabase.");setLoading(false);}return;}
 const [p,i,e]=await Promise.all([supabase.from("student_profiles").select("display_name").eq("id",user.id).maybeSingle(),supabase.from("student_global_ids").select("global_student_id,issued_at").eq("student_id",user.id).maybeSingle(),supabase.from("student_enrollments").select("id").eq("student_id",user.id).eq("verification_status","verified").limit(1)]);
 if(active){setProfile(p.data);setIdentity(i.data);setVerified((e.data?.length??0)>0);setError(p.error?.message??i.error?.message??e.error?.message??"");setLoading(false);}}
 void load();return()=>{active=false;};},[user]);
 return <main className="mx-auto max-w-2xl p-6"><h1 className="text-3xl font-bold">Global Student ID</h1><p className="mt-2 text-slate-600">One permanent GSS ID across institutions. Enrollment verification is separate.</p>{loading?<p className="mt-6">Loading identity…</p>:error?<p role="alert" className="text-red-700 mt-6">{error}</p>:identity?<section className="mt-6 rounded-2xl border bg-slate-900 p-7 text-white"><p className="text-sm tracking-widest">GLOBAL STUDENT SYSTEM</p><h2 className="text-2xl font-bold mt-6">{profile?.display_name??"Student"}</h2><p className="font-mono text-xl mt-3">{identity.global_student_id}</p><p className="mt-5 text-sm">{verified?"Verified enrollment on record":"Enrollment not yet verified"}</p><p className="mt-2 text-xs text-slate-300">Issued {new Date(identity.issued_at).toLocaleDateString()}</p></section>:<p className="mt-6">Your Global Student ID has not been provisioned.</p>}<p className="mt-4 text-sm text-slate-600">This screen is not a government ID or bank KYC document. Verify institutional status through an authorized GSS workflow.</p><Link className="underline block mt-5" to="/student/admission">Manage admission verification</Link></main>;
}
