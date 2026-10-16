import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
type Application={id:string;institution_name:string;country_code:string;contact_email:string;status:string;created_at:string};
export default function InstitutionApprovals(){
 const [items,setItems]=useState<Application[]>([]);const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");const [notes,setNotes]=useState<Record<string,string>>({});
 const [busy,setBusy]=useState<string|null>(null);
 const load=useCallback(async()=>{if(!supabase){setError("Configure Supabase first.");setLoading(false);return;}
  const {data,error}=await supabase.from("institution_applications").select("id,institution_name,country_code,contact_email,status,created_at").order("created_at",{ascending:false}).limit(100);
  setItems((data??[]) as Application[]);setError(error?.message??"");setLoading(false);},[]);
 useEffect(()=>{void load();},[load]);
 async function decide(id:string,decision:"reviewing"|"approved"|"rejected"){
  if(!supabase)return;setError("");setBusy(id);
  const {error}=await supabase.rpc("gss_review_institution",{p_application_id:id,p_decision:decision,p_note:notes[id]??""});
  setBusy(null);if(error)setError(error.message);else await load();
 }
 return <main className="max-w-6xl mx-auto p-6"><h1 className="text-3xl font-bold">Institution Approvals</h1><p className="text-slate-600 mt-2">Confirm institutional authority outside GSS before approval. Approval does not invite staff automatically.</p>{error&&<p role="alert" className="mt-4 text-red-700">{error}</p>}{loading?<p>Loading applications…</p>:items.length===0?<p className="mt-6">No applications available.</p>:<div className="grid gap-4 mt-6">{items.map(item=><article key={item.id} className="rounded-xl border bg-white p-5"><h2 className="font-bold">{item.institution_name}</h2><p className="text-sm text-slate-600">{item.country_code} · {item.contact_email} · {item.status}</p><p className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</p>{!["approved","rejected"].includes(item.status)&&<><label className="block mt-4 text-sm">Review note (10–2000 characters)<textarea className="block border rounded p-2 w-full mt-1" maxLength={2000} value={notes[item.id]??""} onChange={e=>setNotes(prev=>({...prev,[item.id]:e.target.value}))}/></label><div className="flex flex-wrap gap-2 mt-3">{(["reviewing","approved","rejected"] as const).map(decision=><button key={decision} disabled={busy===item.id||(notes[item.id]??"").trim().length<10||(decision==="approved"&&item.status!=="reviewing")} onClick={()=>void decide(item.id,decision)} className="border rounded px-3 py-2 disabled:opacity-40">{decision}</button>)}</div></>}</article>)}</div>}</main>;
}
