import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "../lib/supabase";
import { normalizeTzMsisdn } from "../integrations/mobile-money/phone";
import { signInDemo } from "../demo/demoEnrollment";
export default function Login(){
 const {user,loading}=useAuth();const location=useLocation();const navigate=useNavigate();
 const [identifier,setIdentifier]=useState("");const [password,setPassword]=useState("");const [showPassword,setShowPassword]=useState(false);const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 const from=(location.state as {from?:string}|null)?.from;
 if(!loading&&user)return <Navigate to={from?.startsWith("/")&&!from.startsWith("//")?from:"/dashboard"} replace/>;
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError("");
 
 try{const value=identifier.trim();const phone=normalizeTzMsisdn(value);if(!phone&&!value.includes("@")){setError("Enter a valid mobile number or staff email.");return;}if(phone&&/^\d{4}$/.test(password)&&signInDemo(phone,password)){navigate("/demo/student",{replace:true});return;}if(phone&&/^\d{4}$/.test(password)){setError("Demo account not found or PIN incorrect. Complete demo registration in this browser session first.");return;}if(!supabase){setError("Service is temporarily unavailable.");return;}const result=await supabase.auth.signInWithPassword(phone?{phone:"+"+phone,password}:{email:value,password});if(result.error)setError(result.error.message);}catch{setError("Unable to connect. Please check your internet and try again.");}finally{setBusy(false);}}
 return <main className="flex min-h-[100dvh] flex-col bg-[#f6f8fc]"><div className="rounded-b-[2.5rem] bg-gradient-to-br from-[#1761c5] to-[#0f347d] px-6 pb-12 pt-14 text-white"><div className="mx-auto max-w-md"><img src="/s-wallet.svg" alt="S Wallet logo" className="h-20 w-20 rounded-2xl bg-white object-contain p-2 shadow-lg"/><h1 className="mt-8 text-3xl font-extrabold">Welcome back</h1><p className="mt-2 text-sm text-blue-100">Sign in to your Global Student System account.</p></div></div>
 <div className="mx-auto -mt-6 w-full max-w-md flex-1 px-5 pb-8"><form onSubmit={submit} className="grid gap-5 rounded-3xl bg-white p-6 shadow-lg"><div><h2 className="text-xl font-extrabold">Sign in</h2><p className="mt-1 text-sm text-slate-500">Enter your account details to continue.</p></div>
 <label className="text-sm font-semibold text-slate-700">Mobile number (demo students) or email (staff)<input required type="text" autoComplete="username" placeholder="07XXXXXXXX or staff@example.com" className="mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-base outline-none focus:border-blue-600" value={identifier} onChange={e=>setIdentifier(e.target.value)}/></label>
 <label className="text-sm font-semibold text-slate-700">PIN (demo students) or password (staff)<div className="relative mt-2"><input required type={showPassword?"text":"password"} autoComplete="current-password" placeholder="4-digit demo PIN or staff password" className="block w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 pr-16 text-base outline-none focus:border-blue-600" value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" onClick={()=>setShowPassword(v=>!v)} className="absolute inset-y-0 right-3 text-sm font-semibold text-blue-700">{showPassword?"Hide":"Show"}</button></div></label>
 {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
 <button disabled={busy||loading} className="rounded-xl bg-blue-700 px-5 py-3.5 text-base font-bold text-white disabled:opacity-60">{busy?"Signing in…":loading?"Checking session…":"Sign in →"}</button>
 <p className="text-center text-sm text-slate-600">New student? <Link to="/register" className="font-bold text-blue-700">Create an account</Link></p></form>
 <Link to="/institution/apply" className="mt-6 block text-center text-sm font-semibold text-blue-700">Apply for institution access →</Link>
 <p className="mt-9 text-center text-xs text-slate-400">Secure role-based access · Global Student System</p></div></main>;
}
