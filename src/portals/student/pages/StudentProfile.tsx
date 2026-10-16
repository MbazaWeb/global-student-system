import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../auth/AuthProvider";
export default function StudentProfile(){
 const {user}=useAuth();const [name,setName]=useState("");const [phone,setPhone]=useState("");const [country,setCountry]=useState("");
 const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [error,setError]=useState("");const [message,setMessage]=useState("");
 useEffect(()=>{let active=true;async function load(){if(!supabase||!user){if(active){setError("Supabase is not configured.");setLoading(false);}return;}
 const {data,error}=await supabase.from("student_profiles").select("display_name,phone,country_code").eq("id",user.id).maybeSingle();
 if(active){if(data){setName(data.display_name??"");setPhone(data.phone??"");setCountry(data.country_code??"");}setError(error?.message??"");setLoading(false);}}
 void load();return()=>{active=false;};},[user]);
 async function submit(e:FormEvent){e.preventDefault();if(!supabase||!user)return;setError("");setMessage("");setSaving(true);
 const {error}=await supabase.from("student_profiles").update({display_name:name.trim(),phone:phone.trim()||null,country_code:country.trim().toUpperCase()||null}).eq("id",user.id);
 setSaving(false);if(error)setError(error.message);else setMessage("Profile updated. These details are self-reported and not identity-verified.");}
 return <main className="mx-auto max-w-2xl p-6"><h1 className="text-3xl font-bold">Student Profile</h1><p className="text-slate-600 mt-2">Manage contact details. Your Global Student ID and verified enrollments cannot be changed here.</p>{loading?<p className="mt-6">Loading…</p>:<form onSubmit={submit} className="grid gap-4 mt-6"><label>Full name<input required minLength={2} maxLength={100} className="block w-full border rounded p-3" value={name} onChange={e=>setName(e.target.value)}/></label><label>Email (managed in authentication)<input disabled value={user?.email??""} className="block w-full border rounded p-3 bg-slate-100"/></label><label>Phone (international format)<input type="tel" pattern="\\+[1-9][0-9]{6,14}" placeholder="+255712345678" className="block w-full border rounded p-3" value={phone} onChange={e=>setPhone(e.target.value)}/></label><label>Country (ISO two-letter code)<input pattern="[A-Za-z]{2}" maxLength={2} placeholder="TZ" className="block w-full border rounded p-3" value={country} onChange={e=>setCountry(e.target.value)}/></label><button disabled={saving} className="bg-blue-800 text-white rounded p-3">{saving?"Saving…":"Save profile"}</button></form>}{error&&<p role="alert" className="text-red-700 mt-4">{error}</p>}{message&&<p role="status" className="mt-4">{message}</p>}<Link to="/student/identity" className="underline block mt-6">View Global Student ID</Link></main>;
}
