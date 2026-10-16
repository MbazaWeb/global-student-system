import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "../lib/supabase";
export default function Register(){
 const {user,loading}=useAuth();
 const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [name,setName]=useState("");const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 if(!loading&&user)return <Navigate to="/dashboard" replace/>;
 async function submit(e:FormEvent){e.preventDefault();setMessage("");if(!supabase){setMessage("Supabase configuration is required.");return;}setBusy(true);
 try{const {data,error}=await supabase.auth.signUp({email:email.trim(),password,options:{data:{display_name:name.trim()}}});
 if(error){setMessage(error.message);return;}
 setMessage(data.session?"Account created. Opening your student dashboard…":"Check your email for a confirmation link before signing in.");
 }catch{setMessage("Unable to connect. Please check your internet and try again.");}finally{setBusy(false);}}
 return <main className="mx-auto max-w-lg p-8"><h1 className="text-3xl font-bold">Student registration</h1><p className="text-slate-600 mt-2">Only student accounts may self-register. Institutions and banking staff require invitations.</p><form onSubmit={submit} className="grid gap-4 mt-6"><label>Full name<input required minLength={2} maxLength={100} className="block w-full border rounded p-3" value={name} onChange={e=>setName(e.target.value)}/></label><label>Email<input type="email" required autoComplete="email" className="block w-full border rounded p-3" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" required minLength={8} autoComplete="new-password" className="block w-full border rounded p-3" value={password} onChange={e=>setPassword(e.target.value)}/></label>{message&&<p role="status">{message}</p>}<button disabled={busy} className="bg-blue-800 text-white rounded p-3">{busy?"Creating account…":"Create student account"}</button></form><Link className="underline block mt-6" to="/login">Already registered? Sign in</Link></main>;
}
