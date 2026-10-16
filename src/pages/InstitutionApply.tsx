import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
export default function InstitutionApply(){
 const [name,setName]=useState("");const [country,setCountry]=useState("TZ");const [email,setEmail]=useState("");const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 async function submit(e:FormEvent){e.preventDefault();setMessage("");if(!supabase){setMessage("Supabase configuration is required.");return;}setBusy(true);
 const {error}=await supabase.from("institution_applications").insert({institution_name:name.trim(),country_code:country.toUpperCase().trim(),contact_email:email.trim().toLowerCase()});
 setBusy(false);setMessage(error?error.message:"Application received. GSS will review institutional authority before issuing staff invitations.");}
 return <main className="max-w-lg mx-auto p-8"><h1 className="text-3xl font-bold">Institution onboarding</h1><p className="text-slate-600 mt-2">Application only. This does not grant access to student records.</p><form onSubmit={submit} className="grid gap-4 mt-6"><label>Institution name<input required minLength={3} maxLength={200} className="block w-full border p-3 rounded" value={name} onChange={e=>setName(e.target.value)}/></label><label>Country code (ISO 2)<input required pattern="[A-Za-z]{2}" maxLength={2} className="block w-full border p-3 rounded" value={country} onChange={e=>setCountry(e.target.value)}/></label><label>Official contact email<input required type="email" className="block w-full border p-3 rounded" value={email} onChange={e=>setEmail(e.target.value)}/></label>{message&&<p role="status">{message}</p>}<button disabled={busy} className="bg-blue-800 text-white rounded p-3">{busy?"Submitting…":"Submit application"}</button></form></main>;
}
