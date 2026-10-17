import { Link } from "react-router-dom";
import { ArrowLeft, GraduationCap, Landmark, ShieldCheck, Wallet, BookOpen, Clock3 } from "lucide-react";

const sections = [
  { title: "Government loans", description: "Approved loan amounts, disbursement schedules and repayment information when verified funding records are available.", icon: Landmark },
  { title: "Grants & scholarships", description: "Track non-repayable funding and sponsorship awards from verified funding providers.", icon: GraduationCap },
  { title: "Funding allocations", description: "See how disbursed funding is allocated to tuition, accommodation, meals, books and other eligible costs.", icon: BookOpen },
];

export default function StudentGrants() {
  return <main className="mx-auto max-w-2xl space-y-5 px-5 py-6 pb-28">
    <Link to="/student/profile" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-blue-700"><ArrowLeft size={18} /> Back to profile</Link>
    <header className="rounded-3xl bg-gradient-to-br from-[#1761c5] to-[#123b86] p-6 text-white shadow-sm">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15"><GraduationCap size={25} /></span>
      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-blue-100">Student funding center</p>
      <h1 className="mt-1 text-2xl font-extrabold">Grants & Loans</h1>
      <p className="mt-2 text-sm leading-6 text-blue-100">Your education funding, disbursements and remaining balances in one place.</p>
    </header>
    <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
      <ShieldCheck size={21} className="mt-0.5 shrink-0" />
      <p><strong>No verified funding connected yet.</strong> Funding information will appear when your institution or funding provider connects and confirms your records. No loan or grant has been assumed.</p>
    </div>
    <section aria-label="Funding overview" className="grid grid-cols-2 gap-3">
      {[
        { label: "Approved funding", icon: GraduationCap },
        { label: "Amount disbursed", icon: Landmark },
        { label: "Remaining allocation", icon: Wallet },
        { label: "Awaiting disbursement", icon: Clock3 },
      ].map(item => <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <item.icon size={20} className="text-blue-700" aria-hidden="true" />
        <p className="mt-3 text-xs font-semibold text-slate-500">{item.label}</p>
        <p className="mt-1 text-lg font-extrabold text-slate-900">Not available</p>
      </div>)}
    </section>
    <section className="space-y-3">
      <h2 className="text-lg font-extrabold">Funding details</h2>
      {sections.map(({ title, description, icon: Icon }) => <article key={title} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><Icon size={20} /></span>
        <div><h3 className="font-bold text-slate-900">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{description}</p><p className="mt-2 text-xs font-semibold text-slate-500">Awaiting verified data</p></div>
      </article>)}
    </section>
    <p className="rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">Approved funding is not the same as cash available to spend. Tuition paid directly to an institution, restricted allocations and undisbursed amounts must be tracked separately.</p>
  </main>;
}
