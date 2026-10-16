import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Pencil, UserRound, X, Check, ChevronDown } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../auth/AuthProvider";

type Details = { name: string; phone: string; country: string; dob: string; avatarPath:string };
const empty: Details = { name: "", phone: "", country: "", dob:"", avatarPath:"" };
const services = [
  { label: "Bank Integration", to: "/student/bank", description: "View bank connection and account details" },
  { label: "Global ID", to: "/student/identity", description: "View your digital student identity" },
  { label: "Admissions", to: "/student/admission", description: "Submit and manage your enrollment" },
  { label: "History", to: "/student/history", description: "Check your verification history" },
  { label: "Statement", to: "/student/transactions", description: "View your transaction statement" },
];

export default function StudentProfile() {
  const { user } = useAuth();
  const [details, setDetails] = useState<Details>(empty);
  const [saved, setSaved] = useState<Details>(empty);
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [enrollment, setEnrollment] = useState<{admission:string;institution:string;status:string;course:string;year:string}|null>(null);
  const [enrollmentLoading,setEnrollmentLoading]=useState(true);
  const [enrollmentError,setEnrollmentError]=useState("");
  const [photoFailed,setPhotoFailed]=useState(false);
  const [savedPhotoUrl,setSavedPhotoUrl]=useState<string|null>(null);
  const [photoFile,setPhotoFile]=useState<File|null>(null);
  const [photoPreview,setPhotoPreview]=useState<string|null>(null);
  const photoUrl=photoPreview??savedPhotoUrl;
  useEffect(()=>{
    if(!photoFile){setPhotoPreview(null);return;}
    const url=URL.createObjectURL(photoFile);setPhotoPreview(url);setPhotoFailed(false);
    return()=>URL.revokeObjectURL(url);
  },[photoFile]);
  useEffect(()=>{
    let active=true;setSavedPhotoUrl(null);
    if(!saved.avatarPath||!supabase)return;
    void supabase.storage.from("student-avatars").createSignedUrl(saved.avatarPath,3600).then(({data})=>{if(active){setSavedPhotoUrl(data?.signedUrl??null);setPhotoFailed(false);}});
    return()=>{active=false;};
  },[saved.avatarPath]);

  useEffect(()=>{
    let active=true;
    setEnrollment(null);setEnrollmentLoading(true);setEnrollmentError("");setPhotoFailed(false);
    async function loadEnrollment(){
      try{
        if(!supabase||!user)return;
        const response=await supabase.from("student_enrollments").select("institution_id,admission_number,verification_status,course_name,academic_year").eq("student_id",user.id).order("created_at",{ascending:false});
        if(response.error)throw response.error;
        const selected=response.data?.find(item=>item.verification_status==="verified")??response.data?.[0];
        if(!selected)return;
        const institution=await supabase.from("institutions").select("name").eq("id",selected.institution_id).maybeSingle();
        if(institution.error)throw institution.error;
        if(active)setEnrollment({admission:selected.admission_number,institution:institution.data?.name??"Not available",status:selected.verification_status,course:selected.course_name??"Not provided by institution",year:selected.academic_year??"Not provided by institution"});
      }catch(e){if(active)setEnrollmentError(e instanceof Error?e.message:"Unable to load enrollment details.");}
      finally{if(active)setEnrollmentLoading(false);}
    }
    void loadEnrollment();return()=>{active=false;};
  },[user]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setEditing(false);
    setError("");
    setMessage("");
    async function load() {
      try {
        if (!supabase || !user) throw new Error("Sign in to view your profile.");
        const { data, error } = await supabase.from("student_profiles")
          .select("display_name,phone,country_code,date_of_birth,avatar_path").eq("id", user.id).maybeSingle();
        if (error) throw error;
        if (active) {
          const next = { name: data?.display_name ?? "", phone: data?.phone ?? "", country: data?.country_code ?? "",dob:data?.date_of_birth??"",avatarPath:data?.avatar_path??"" };
          setDetails(next);
          setSaved(next);
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Unable to load your profile.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [user]);

  function cancel() {
    setPhotoFile(null);
    setDetails(saved);
    setEditing(false);
    setError("");
    setMessage("");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!editing || saving || !supabase || !user) return;
    setError(""); setMessage(""); setSaving(true);
    const next = { ...details, name: details.name.trim(), phone: details.phone.replace(/[\s()-]/g,""), country: details.country.trim().toUpperCase() };
    let uploadedPath:string|null=null;
    try {
      if(next.phone&&!/^[+]?[0-9]{7,15}$/.test(next.phone))throw new Error("Enter a valid local or international phone number.");
      if(next.dob&&next.dob>new Date().toLocaleDateString("en-CA"))throw new Error("Date of birth cannot be in the future.");
      if(photoFile){
        const extension={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"}[photoFile.type];
        if(!extension||photoFile.size>2097152)throw new Error("Choose a JPG, PNG or WebP image up to 2 MB.");
        uploadedPath=`${user.id}/${crypto.randomUUID()}.${extension}`;
        const upload=await supabase.storage.from("student-avatars").upload(uploadedPath,photoFile,{contentType:photoFile.type,upsert:false});
        if(upload.error)throw upload.error;
        next.avatarPath=uploadedPath;
      }
      const { data, error } = await supabase.from("student_profiles")
        .update({ display_name: next.name, phone: next.phone || null, country_code: next.country || null,date_of_birth:next.dob||null,avatar_path:next.avatarPath||null })
        .eq("id", user.id).select("id").single();
      if (error) throw error;
      if (!data) throw new Error("Profile could not be saved. Please try again.");
      setDetails(next); setSaved(next); setEditing(false);
      setPhotoFile(null);
      setMessage("Profile updated.");
    } catch (e) {
      if(uploadedPath)await supabase.storage.from("student-avatars").remove([uploadedPath]);
      setError(e instanceof Error ? e.message : "Unable to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const fieldClass = "mt-2 block w-full rounded-xl border border-slate-200 bg-white p-3 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 read-only:border-transparent read-only:bg-slate-50 read-only:text-slate-600";

  return <main className="mx-auto max-w-2xl p-6">
    <header className="flex items-center gap-3">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><UserRound aria-hidden="true" /></span>
      <div className="flex-1"><h1 className="text-2xl font-extrabold">My profile</h1><p className="mt-1 text-sm text-slate-500">{editing ? "Update your contact details." : "Tap the pen to edit your details."}</p></div>
      {!editing && <button type="button" disabled={loading || !!error} aria-label="Edit profile" title="Edit profile" onClick={() => { setExpanded(true); setEditing(true); setMessage(""); }} className="grid h-11 w-11 place-items-center rounded-full bg-blue-700 text-white shadow-sm hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-40"><Pencil size={18} aria-hidden="true" /></button>}
    </header>

    <section aria-label="Student summary" className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-4 bg-gradient-to-br from-blue-800 to-blue-950 p-5 text-white">
        {photoUrl&&!photoFailed?<img src={photoUrl} alt="Student profile picture" referrerPolicy="no-referrer" onError={()=>setPhotoFailed(true)} className="h-20 w-20 shrink-0 rounded-2xl border-2 border-white/30 object-cover"/>:<div role="img" aria-label="Profile picture not added" className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border-2 border-white/20 bg-white/10 text-2xl font-bold">{saved.name.trim()?saved.name.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join("").toUpperCase():<UserRound size={32} aria-hidden="true"/>}</div>}
        <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-blue-200">Student name</p><h2 className="mt-1 break-words text-xl font-extrabold">{loading?"Loading…":saved.name||"Name not provided"}</h2><span className="mt-2 inline-block rounded-full bg-white/10 px-3 py-1 text-xs capitalize">{enrollmentLoading?"Loading enrollment…":enrollment?.status.replaceAll("_"," ")??"No enrollment"}</span>{(!photoUrl||photoFailed)&&<p className="mt-2 text-xs text-blue-200">Profile picture not added</p>}</div>
      </div>
      <dl className="grid gap-4 p-5 sm:grid-cols-2">{[
        {label:"Student admission number",value:enrollmentLoading?"Loading…":enrollment?.admission??"Not provided"},
        {label:"Institution name",value:enrollmentLoading?"Loading…":enrollment?.institution??"Not provided"},
        {label:"Course admitted",value:enrollment?.course??"Not provided by institution"},
        {label:"Academic year",value:enrollment?.year??"Not provided by institution"},
        {label:"Year of study",value:"Not provided by institution"},
        {label:"Total fee (TZS)",value:"Not provided by institution"},
      ].map(item=><div key={item.label}><dt className="text-xs font-semibold text-slate-500">{item.label}</dt><dd className="mt-1 break-words text-sm font-bold text-slate-900">{enrollmentError&&(item.label==="Student admission number"||item.label==="Institution name")?"Unavailable":item.value}</dd></div>)}</dl>
      {enrollmentError&&<p role="alert" className="px-5 pb-4 text-sm text-red-700">{enrollmentError}</p>}
      {!enrollmentLoading&&!enrollment&&!enrollmentError&&<Link to="/student/admission" className="block px-5 pb-4 text-sm font-semibold text-blue-700">Add your admission details →</Link>}
    </section>

    {loading ? <p role="status" className="mt-6">Loading profile…</p> :
      <form onSubmit={submit} className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <button type="button" aria-expanded={expanded} aria-controls="personal-details" disabled={saving} onClick={() => setExpanded(value => !value)} className="flex min-h-11 w-full items-center justify-between gap-3 text-left font-bold focus-visible:outline-2 focus-visible:outline-blue-700"><span>Personal details<span className="mt-1 block text-xs font-normal text-slate-500">{expanded ? "Tap to fold" : "Tap to view your details"}</span></span><ChevronDown size={20} aria-hidden="true" className={`shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} /></button>
        <div id="personal-details" hidden={!expanded} className="mt-5">
        <fieldset disabled={saving} className="grid gap-5">
          <legend className="sr-only">Personal details</legend>
          <label className="text-sm font-semibold text-slate-700">Full name<input readOnly={!editing} required minLength={2} maxLength={100} autoComplete="name" className={fieldClass} value={details.name} onChange={e => setDetails({ ...details, name: e.target.value })} /></label>
          <label className="text-sm font-semibold text-slate-700">Email<input type="email" readOnly value={user?.email ?? ""} className={fieldClass} /><span className="mt-1 block text-xs font-normal text-slate-400">Managed through your sign-in account.</span></label>
          <label className="text-sm font-semibold text-slate-700">Phone number<input readOnly={!editing} type="tel" autoComplete="tel" placeholder={editing ? "0712 345 678" : "Not added"} className={fieldClass} value={details.phone} onChange={e => setDetails({ ...details, phone: e.target.value })} /><span className="mt-1 block text-xs font-normal text-slate-500">Local or international number. +255 is optional.</span></label>
          <label className="text-sm font-semibold text-slate-700">Date of birth<input type="date" readOnly={!editing} autoComplete="bday" max={new Date().toLocaleDateString("en-CA")} value={details.dob} onChange={e=>setDetails({...details,dob:e.target.value})} className={fieldClass}/></label>
          {editing&&<label className="text-sm font-semibold text-slate-700">Profile picture<input type="file" accept="image/jpeg,image/png,image/webp" className="mt-2 block w-full text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-blue-50 file:px-4 file:py-3 file:font-semibold file:text-blue-700" onChange={e=>{const file=e.target.files?.[0];if(!file)return;if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>2097152){setError("Choose a JPG, PNG or WebP image up to 2 MB.");e.target.value="";return;}setError("");setPhotoFile(file);}}/><span className="mt-2 block text-xs font-normal text-slate-500">JPG, PNG or WebP, up to 2 MB. Uploaded when you save changes.</span></label>}
          <label className="text-sm font-semibold text-slate-700">Country code<input readOnly={!editing} pattern="[A-Za-z]{2}" maxLength={2} placeholder={editing ? "TZ" : "Not added"} className={fieldClass} value={details.country} onChange={e => setDetails({ ...details, country: e.target.value })} /></label>
        </fieldset>
        {editing && <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" disabled={saving} onClick={cancel} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 font-semibold disabled:opacity-50"><X size={17} aria-hidden="true" />Cancel</button>
          <button type="submit" disabled={saving} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 font-semibold text-white disabled:opacity-50"><Check size={17} aria-hidden="true" />{saving ? "Saving…" : "Save changes"}</button>
        </div>}
        </div>
      </form>}
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
    <nav aria-label="Profile menu" className="mt-8"><h2 className="text-lg font-bold">Student services</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">{services.map(item => <Link key={item.to} to={item.to} className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-700"><span className="block font-semibold text-blue-800">{item.label} →</span><span className="mt-1 block text-sm text-slate-500">{item.description}</span></Link>)}</div></nav>
  </main>;
}
