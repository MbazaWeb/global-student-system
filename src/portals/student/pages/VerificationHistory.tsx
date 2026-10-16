import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../auth/AuthProvider";
type Review={id:string;enrollment_id:string;status:string;review_note:string|null;created_at:string;reviewed_at:string|null};
export default function VerificationHistory(){
 const {user}=useAuth();const [reviews,setReviews]=useState<Review[]>([]);const [error,setError]=useState("");const [loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;async function load(){if(!supabase||!user){if(active){setError("Supabase not configured.");setLoading(false);}return;}
 const {data,error}=await supabase.from("enrollment_verification_requests").select("id,enrollment_id,status,review_note,created_at,reviewed_at").eq("student_id",user.id).order("created_at",{ascending:false}).limit(100);
 if(active){setReviews((data??[]) as Review[]);setError(error?.message??"");setLoading(false);}}
 void load();return()=>{active=false;};},[user]);
 return <main className="mx-auto max-w-3xl p-6"><h1 className="text-3xl font-bold">Verification History</h1><p className="mt-2 text-slate-600">Your institution enrollment review outcomes.</p>{error&&<p role="alert" className="mt-4 text-red-700">{error}</p>}{loading?<p className="mt-5">Loading…</p>:reviews.length===0?<p className="mt-5">No verification requests yet.</p>:<div className="grid gap-4 mt-6">{reviews.map(r=><article key={r.id} className="rounded-xl border p-5"><p className="font-semibold">Enrollment: {r.enrollment_id}</p><p>Status: <strong>{r.status}</strong></p><p className="text-sm text-slate-500">Requested: {new Date(r.created_at).toLocaleDateString()}</p>{r.reviewed_at&&<p className="text-sm text-slate-500">Reviewed: {new Date(r.reviewed_at).toLocaleDateString()}</p>}{r.review_note&&<p className="mt-3 whitespace-pre-wrap">Review note: {r.review_note}</p>}</article>)}</div>}<Link to="/student/admission" className="underline block mt-6">Back to admissions</Link></main>;
}
