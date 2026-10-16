import { useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "../lib/supabase";
export default function Login(){
 const {user}=useAuth();const location=useLocation();
 const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 const from=(location.state as {from?:string}|null)?.from;
 if(user)return <Navigate to={from?.startsWith("/")&&!from.startsWith("//")?from:"/dashboard"} replace/>;
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError("");
 if(!supabase){setError("Supabase is not configured.");setBusy(false);return;}
 const result=await supabase.auth.signInWithPassword({email,password});if(result.error)setError(result.error.message);setBusy(false);}
 return <main className="mx-auto max-w-md p-8"><h1 className="text-3xl font-bold">GSS Sign in</h1><p className="mt-2 text-slate-600">Access is granted by authorized GSS administrators.</p><form className="grid gap-4 mt-6" onSubmit={submit}><label>Email<input required type="email" autoComplete="email" className="block w-full border p-3 rounded" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input required type="password" autoComplete="current-password" className="block w-full border p-3 rounded" value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p role="alert" className="text-red-700">{error}</p>}<button disabled={busy} className="bg-blue-800 text-white rounded p-3">{busy?"Signing in…":"Sign in"}</button></form></main>;
}
