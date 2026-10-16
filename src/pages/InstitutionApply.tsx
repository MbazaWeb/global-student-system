import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Building2, Check, ArrowLeft, Info, LoaderCircle } from "lucide-react";
import { supabase } from "../lib/supabase";

const COUNTRIES: { code: string; name: string }[] = [
  { code: "TZ", name: "Tanzania" },
  { code: "KE", name: "Kenya" },
  { code: "UG", name: "Uganda" },
  { code: "RW", name: "Rwanda" },
  { code: "BI", name: "Burundi" },
  { code: "CD", name: "DR Congo" },
  { code: "ZM", name: "Zambia" },
  { code: "MW", name: "Malawi" },
  { code: "MZ", name: "Mozambique" },
  { code: "NG", name: "Nigeria" },
  { code: "GH", name: "Ghana" },
  { code: "ZA", name: "South Africa" },
  { code: "EG", name: "Egypt" },
  { code: "IN", name: "India" },
  { code: "CN", name: "China" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "AE", name: "United Arab Emirates" },
];

// Tanzania regions (31 administrative regions as of 2024).
const TZ_REGIONS: string[] = [
  "Arusha", "Dar es Salaam", "Dodoma", "Geita", "Iringa", "Kagera",
  "Kigoma", "Kilimanjaro", "Lindi", "Manyara", "Mara", "Mbeya",
  "Morogoro", "Mtwara", "Mwanza", "Njombe", "Pemba North", "Pemba South",
  "Pwani", "Rukwa", "Ruvuma", "Shinyanga", "Simiyu", "Singida",
  "Songwe", "Tabora", "Tanga", "Unguja North", "Unguja South",
  "Unguja West", "Katavi",
];

// Regions by country. Only Tanzania has a curated list for now; other
// countries fall back to a free-text input.
const REGIONS_BY_COUNTRY: Record<string, string[]> = {
  TZ: TZ_REGIONS,
};

type Status = "idle" | "submitting" | "success" | "error";

export default function InstitutionApply() {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("TZ");
  const [email, setEmail] = useState("");
  const [institutionCode, setInstitutionCode] = useState("");
  const [region, setRegion] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    setMessage("");
    if (!supabase) {
      setStatus("error");
      setMessage("Supabase configuration is required.");
      return;
    }
    try {
      const { error } = await supabase.from("institution_applications").insert({
        institution_name: name.trim(),
        country_code: country.toUpperCase().trim(),
        contact_email: email.trim().toLowerCase(),
        institution_code: institutionCode.trim(),
        region: region.trim(),
      });
      if (error) throw error;
      setStatus("success");
      setMessage("Application received. GSS will review institutional authority before issuing staff invitations.");
      setName("");
      setEmail("");
      setCountry("TZ");
      setInstitutionCode("");
      setRegion("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Unable to submit your application. Please try again.");
    }
  }

  const fieldClass = "mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";
  const labelClass = "text-sm font-semibold text-slate-700";

  return (
    <main className="flex min-h-[100dvh] flex-col bg-[#f6f8fc]">
      <div className="rounded-b-[2.5rem] bg-gradient-to-br from-[#1761c5] to-[#0f347d] px-6 pb-12 pt-14 text-white">
        <div className="mx-auto max-w-md">
          <img src="/s-wallet.svg" alt="Global Student System logo" className="h-20 w-20 rounded-2xl bg-white object-contain p-2 shadow-lg" />
          <h1 className="mt-8 text-3xl font-extrabold">Institution onboarding</h1>
          <p className="mt-2 text-sm text-blue-100">Apply to register your institution on the Global Student System.</p>
        </div>
      </div>

      <div className="mx-auto -mt-6 w-full max-w-md flex-1 px-5 pb-8">
        <form onSubmit={submit} className="grid gap-5 rounded-3xl bg-white p-6 shadow-lg">
          <div>
            <h2 className="text-xl font-extrabold">Apply for institution access</h2>
            <p className="mt-1 text-sm text-slate-500">This application does not grant access to student records. GSS verifies institutional authority out-of-band before approval.</p>
          </div>

          <label className={labelClass}>Institution name
            <input
              required
              minLength={3}
              maxLength={200}
              autoComplete="organization"
              placeholder="e.g. University of Dar es Salaam"
              className={fieldClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={status === "submitting" || status === "success"}
            />
          </label>

          <label className={labelClass}>Institution code
            <input
              required
              minLength={1}
              maxLength={50}
              autoComplete="off"
              placeholder="e.g. UDSM-2026 or ministry-issued code"
              className={fieldClass}
              value={institutionCode}
              onChange={(e) => setInstitutionCode(e.target.value)}
              disabled={status === "submitting" || status === "success"}
            />
          </label>

          <label className={labelClass}>Country
            <select
              required
              className={fieldClass}
              value={country}
              onChange={(e) => { setCountry(e.target.value); setRegion(""); }}
              disabled={status === "submitting" || status === "success"}
            >
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
            </select>
          </label>

          <label className={labelClass}>Region / Province
            {REGIONS_BY_COUNTRY[country] ? (
              <select
                required
                className={fieldClass}
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                disabled={status === "submitting" || status === "success"}
              >
                <option value="">Select region</option>
                {REGIONS_BY_COUNTRY[country].map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            ) : (
              <input
                required
                minLength={1}
                maxLength={100}
                autoComplete="address-level1"
                placeholder="Enter region or province"
                className={fieldClass}
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                disabled={status === "submitting" || status === "success"}
              />
            )}
          </label>

          <label className={labelClass}>Official contact email
            <input
              required
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="registrar@institution.ac.tz"
              className={fieldClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === "submitting" || status === "success"}
            />
          </label>

          {status === "error" && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>
          )}

          {status === "success" && (
            <div role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
              <div className="flex items-start gap-2">
                <Check size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-semibold">Application received</p>
                  <p className="mt-1">{message}</p>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={status === "submitting" || status === "success"}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3.5 text-base font-bold text-white disabled:opacity-60"
          >
            {status === "submitting" ? (
              <><LoaderCircle size={18} className="animate-spin" aria-hidden="true" />Submitting…</>
            ) : (
              <><Building2 size={18} aria-hidden="true" />Submit application</>
            )}
          </button>

          {status === "success" && (
            <button
              type="button"
              onClick={() => { setStatus("idle"); setMessage(""); }}
              className="text-center text-sm font-semibold text-blue-700"
            >
              Submit another application
            </button>
          )}
        </form>

        <section className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <Info size={18} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
          <p className="text-xs leading-5 text-amber-900">
            This form submits an application only. It does not create an account, grant staff access, or expose any student records.
            A platform administrator will verify your institution's authority separately before approving.
          </p>
        </section>

        <Link to="/login" className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-blue-700">
          <ArrowLeft size={16} aria-hidden="true" />Back to sign in
        </Link>
        <p className="mt-9 text-center text-xs text-slate-400">Secure role-based access · Global Student System</p>
      </div>
    </main>
  );
}
