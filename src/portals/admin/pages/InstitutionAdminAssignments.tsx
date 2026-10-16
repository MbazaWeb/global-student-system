import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../../lib/supabase";
type Institution={id:string;name:string;country_code:string};
export default function InstitutionAdminAssignments(){
 const [institutions,setInstitutions]=useState<Institution[]>([]);
 const [institutionId,setInstitutionId]=useState("");const [userId,setUserId]=useState("");const [reason,setReason]=useState("");
 const [error,setError]=useState("");const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 const load=useCallback(async()=>{if(!supabase){setError("Supabase not configured.");return;}
 const {data,error}=await supabase.from("institutions").select("id,name,country_code").eq("verification_status","verified").order("name");
 setInstitutions((data??[]) as Institution[]);if(error)setError(error.message);},[]);
 useEffect(()=>{void load();},[load]);
 async function submit(e:FormEvent){e.preventDefault();if(!supabase)return;setError("");setMessage("");setBusy(true);
 const {error}=await supabase.rpc("gss_assign_institution_admin",{p_institution_id:institutionId,p_new_admin:userId.trim(),p_reason:reason.trim()});
 setBusy(false);if(error)setError(error.message);else{setMessage("Institution administrator assigned. Previous administrator access was revoked.");setUserId("");setReason("");}}
 return <main className="mx-auto max-w-3xl p-6"><h1 className="text-3xl font-bold">Institution Admin Assignment</h1><p className="mt-2 text-slate-600">Only one administrator is allowed per institution. Assigning a new one replaces the existing administrator atomically. Verify the user's identity and authority before proceeding.</p><form onSubmit={submit} className="grid gap-4 mt-6"><label>Approved institution<select required className="block w-full border rounded p-3" value={institutionId} onChange={e=>setInstitutionId(e.target.value)}><option value="">Select institution</option>{institutions.map(i=><option key={i.id} value={i.id}>{i.name} ({i.country_code})</option>)}</select></label><label>Confirmed Auth user UUID<input required className="block w-full border rounded p-3" value={userId} onChange={e=>setUserId(e.target.value)} placeholder="Existing user UUID"/></label><label>Reason for appointment or transfer<textarea required minLength={10} maxLength={2000} className="block w-full border rounded p-3" value={reason} onChange={e=>setReason(e.target.value)}/></label><button type="submit" disabled={busy} className="bg-blue-800 text-white rounded p-3 min-h-11">{busy?"Saving…":"Assign / Transfer Admin"}</button></form>{error&&<p role="alert" className="mt-4 text-red-700">{error}</p>}{message&&<p role="status" className="mt-4">{message}</p>}</main>;
}
