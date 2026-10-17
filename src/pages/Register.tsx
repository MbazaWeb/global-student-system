import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "../lib/supabase";
import { normalizeTzMsisdn } from "../integrations/mobile-money/phone";

export default function Register(){
 const {user,loading}=useAuth();
 const [name,setName]=useState("");const [nida,setNida]=useState("");const [registration,setRegistration]=useState("");const [phone,setPhone]=useState("");const [password,setPassword]=useState("");const [otp,setOtp]=useState("");const [step,setStep]=useState<"register"|"verify">("register");const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 if(!loading&&user)return <Navigate to="/dashboard" replace/>;
 async function submit(e:FormEvent){e.preventDefault();setMessage("");if(!supabase){setMessage("Supabase configuration is required.");return;}
 const mobile=normalizeTzMsisdn(phone);
 if(!mobile){setMessage("Enter a valid Tanzanian mobile number.");return;}
 if(!/^\d{8}-\d{5}-\d{5}-\d{3}$/.test(nida)){setMessage("NIDA format: 19990101-12345-00000-123");return;}
 if(!registration.trim()){setMessage("Enter your student registration number.");return;}
 setBusy(true);
 try{
 const {error}=await supabase.auth.signUp({phone:"+"+mobile,password,options:{data:{display_name:name.trim()}}});
 if(error)throw error;
 setStep("verify");setMessage("Account created. Enter the SMS verification code sent to your mobile number.");
 }catch(e){setMessage(e instanceof Error?e.message:"Unable to register.");}finally{setBusy(false);}
 }
 async function verify(e:FormEvent){e.preventDefault();if(!supabase)return;const mobile=normalizeTzMsisdn(phone);if(!mobile)return;setBusy(true);setMessage("");
 try{const {error}=await supabase.auth.verifyOtp({phone:"+"+mobile,token:otp.trim(),type:"sms"});if(error)throw error;setMessage("Mobile number verified. Your account is ready.");}catch(e){setMessage(e instanceof Error?e.message:"Verification failed.");}finally{setBusy(false);}}
 return <main className="mx-auto max-w-lg p-8"><h1 className="text-3xl font-bold">Student registration</h1><p className="mt-2 text-slate-600">Register with your mobile number. Institution and banking staff continue to use invited accounts.</p>
 {step==="register"?<form onSubmit={submit} className="mt-6 grid gap-4">
 <label>Full name<input required minLength={2} maxLength={100} className="block w-full rounded border p-3" value={name} onChange={e=>setName(e.target.value)}/></label>
 <label>NIDA number<input required placeholder="19990101-12345-00000-123" pattern="[0-9]{8}-[0-9]{5}-[0-9]{5}-[0-9]{3}" className="block w-full rounded border p-3" value={nida} onChange={e=>setNida(e.target.value)}/></label>
 <label>Student registration number<input required maxLength={80} className="block w-full rounded border p-3" value={registration} onChange={e=>setRegistration(e.target.value)}/></label>
 <label>Mobile number<input required type="tel" autoComplete="tel" placeholder="07XXXXXXXX" className="block w-full rounded border p-3" value={phone} onChange={e=>setPhone(e.target.value)}/></label>
 <label>Password<input required type="password" minLength={8} autoComplete="new-password" className="block w-full rounded border p-3" value={password} onChange={e=>setPassword(e.target.value)}/></label>
 {message&&<p role="status">{message}</p>}<button disabled={busy||loading} className="rounded bg-blue-800 p-3 text-white">{busy?"Creating account…":"Create student account"}</button></form>:<form onSubmit={verify} className="mt-6 grid gap-4"><p>Verification code sent to {phone}.</p><label>SMS verification code<input required inputMode="numeric" autoComplete="one-time-code" className="block w-full rounded border p-3" value={otp} onChange={e=>setOtp(e.target.value)}/></label>{message&&<p role="status">{message}</p>}<button disabled={busy} className="rounded bg-blue-800 p-3 text-white">{busy?"Verifying…":"Verify mobile number"}</button></form>}
 <Link className="mt-6 block underline" to="/login">Already registered? Sign in</Link></main>;
}
