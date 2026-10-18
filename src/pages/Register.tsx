import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "../lib/supabase";
import { normalizeTzMsisdn } from "../integrations/mobile-money/phone";

const stages = ["Mobile number", "Verify code", "Set password"];

export default function Register() {
  const { user, loading } = useAuth();
  const [step, setStep] = useState(0);
  // True while registration is in progress. Stops the redirect to /dashboard that would
  // otherwise fire as soon as the OTP creates a session, before the password step.
  const [inFlow, setInFlow] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  if (!loading && user && !inFlow) return <Navigate to="/dashboard" replace />;

  const mobile = normalizeTzMsisdn(phone);

  async function next(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    if (!supabase) {
      setMessage("Service is temporarily unavailable.");
      return;
    }
    setBusy(true);
    try {
      if (step === 0) {
        if (!mobile) throw new Error("Enter a valid Tanzanian mobile number.");
        const { error } = await supabase.auth.signInWithOtp({ phone: `+${mobile}` });
        if (error) throw error;
        setStep(1);
        setMessage("We sent a verification code to your phone.");
      } else if (step === 1) {
        if (!mobile) throw new Error("Enter your mobile number again.");
        if (!/^\d{6,8}$/.test(otp)) throw new Error("Enter the verification code.");
        setInFlow(true);
        const { error } = await supabase.auth.verifyOtp({ phone: `+${mobile}`, token: otp, type: "sms" });
        if (error) throw error;
        setOtp("");
        setStep(2);
        setMessage("");
      } else {
        if (password.length < 6) throw new Error("Use at least 6 characters.");
        if (password !== confirm) throw new Error("Passwords do not match.");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setPassword("");
        setConfirm("");
        setInFlow(false);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const input = "mt-2 block w-full rounded-xl border border-slate-200 bg-white p-3.5 outline-none focus:border-blue-600";

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <img src="/s-wallet.svg" alt="S Wallet" className="h-14 w-14" />
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Student registration</h1>
            <p className="text-sm text-slate-500">Verify your phone, then set a password.</p>
          </div>
        </div>
        <div className="mb-3 flex gap-2" aria-label="Registration progress">
          {stages.map((label, i) => (
            <div key={label} title={label} className={`h-2 flex-1 rounded-full transition-all duration-500 ${i <= step ? "bg-blue-600" : "bg-slate-200"}`} />
          ))}
        </div>
        <p className="mb-6 text-sm font-semibold text-blue-700">Step {step + 1} of 3 · {stages[step]}</p>

        {!supabase && import.meta.env.DEV && (
          <p role="alert" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.
          </p>
        )}

        <form onSubmit={next} className="grid gap-4" key={step}>
          {step === 0 && (
            <>
              <p className="text-sm text-slate-600">Start with your Tanzanian mobile number.</p>
              <label className="text-sm font-semibold">
                Mobile number
                <input className={input} required type="tel" autoComplete="tel" placeholder="07XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
            </>
          )}
          {step === 1 && (
            <>
              <p className="text-sm text-slate-600">Enter the code sent to {mobile ? `+${mobile}` : "your phone"}.</p>
              <label className="text-sm font-semibold">
                Verification code
                <input className={input} required inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} />
              </label>
            </>
          )}
          {step === 2 && (
            <>
              <p className="text-sm text-slate-600">Choose a password of at least 6 characters. You will use it with your mobile number to sign in.</p>
              <label className="text-sm font-semibold">
                Password
                <input className={input} required type="password" autoComplete="new-password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>
              <label className="text-sm font-semibold">
                Confirm password
                <input className={input} required type="password" autoComplete="new-password" minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </label>
            </>
          )}
          {message && <p role="status" className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">{message}</p>}
          <div className="flex gap-3">
            {step === 1 && (
              <button type="button" onClick={() => { setStep(0); setOtp(""); setMessage(""); }} className="rounded-xl border px-5 py-3 font-semibold">
                Change number
              </button>
            )}
            <button disabled={busy || loading} className="flex-1 rounded-xl bg-blue-700 p-3 font-bold text-white disabled:opacity-60">
              {busy ? "Please wait…" : step === 2 ? "Finish" : "Continue →"}
            </button>
          </div>
        </form>
        <Link className="mt-6 block text-center text-sm font-semibold text-blue-700" to="/login">Already registered? Sign in</Link>
      </section>
    </main>
  );
}
