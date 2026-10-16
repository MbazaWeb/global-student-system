import { Link, Route, Routes } from "react-router-dom";
import PortalShell from "./components/shared/PortalShell";
import PortalNavigation from "./components/shared/PortalNavigation";
import TransactionHistory from "./components/shared/TransactionHistory";
import { Outlet } from "react-router-dom";
import ProtectedRoute from "./auth/ProtectedRoute";
import RoleGuard from "./auth/RoleGuard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import InstitutionApprovals from "./portals/admin/pages/InstitutionApprovals";
import InstitutionAdminAssignments from "./portals/admin/pages/InstitutionAdminAssignments";
import StudentVerification from "./portals/institution/pages/StudentVerification";
import AdmissionVerification from "./portals/student/pages/AdmissionVerification";
import StudentIdentity from "./portals/student/pages/StudentIdentity";
import StudentProfile from "./portals/student/pages/StudentProfile";
import StudentDashboard from "./portals/student/pages/StudentDashboard";
import VerificationHistory from "./portals/student/pages/VerificationHistory";
import InstitutionDashboard from "./portals/institution/pages/InstitutionDashboard";
import StudentDirectory from "./portals/institution/pages/StudentDirectory";
import InstitutionApply from "./pages/InstitutionApply";
import DashboardRouter from "./pages/DashboardRouter";
import { useAuth } from "./auth/AuthProvider";
import type { PortalRole } from "./types/domain";
const portals:{key:string;name:string;description:string;roles:PortalRole[];links:string[]}[]=[
{key:"student",name:"Student",description:"Identity, enrollment and wallet",roles:["student"],links:["Profile","Admission Verification","Wallet","Bank Account Linking","Payments","Documents"]},
{key:"institution",name:"Institution",description:"Admissions, verification and finance",roles:["institution_admin"],links:["Student Directory","Admissions","Verification Queue","Enrollment","Finance Reports","Staff Management"]},
{key:"bank",name:"Bank Vendor",description:"Proposed CRDB partner — mock only",roles:["bank_admin","bank_officer"],links:["Account Applications","KYC Review","Linked Accounts","Transactions","Reconciliation","Audit Logs"]},
{key:"admin",name:"Super Admin",description:"Platform governance",roles:["platform_admin"],links:["Institution Approvals","Admin Assignments","Student Management","Bank Partner","Role Assignments","Security","Audit Logs"]}
];
function AuthenticatedLayout(){return <><PortalNavigation/><Outlet/></>}
function Home(){
 const {user,signOut}=useAuth();
 return <div className="min-h-screen bg-[#f6f8fc] text-slate-900">
  <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
   <Link to="/" className="flex min-w-0 items-center gap-3 no-underline"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-700 text-sm font-extrabold text-white">GSS</span><span className="text-sm font-bold tracking-tight sm:text-base">Global Student System</span></Link>
   <Link to={user?"/dashboard":"/login"} className="shrink-0 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50">{user?"Dashboard":"Sign in"}</Link>
  </div></header>
  <main><section className="relative overflow-hidden bg-gradient-to-br from-[#102d65] via-[#1746a2] to-[#2465d5] text-white"><div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-2 lg:items-center">
   <div><span className="inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide">ONE STUDENT · ONE GLOBAL IDENTITY</span>
   <h1 className="mt-6 max-w-2xl text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">Your education journey, connected.</h1>
   <p className="mt-5 max-w-xl text-base leading-7 text-blue-100 sm:text-lg">A secure digital home for student identity, institution applications and enrollment verification — built to connect learners and institutions.</p>
   <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">{user?<Link to="/dashboard" className="rounded-xl bg-white px-6 py-3.5 text-center font-bold text-blue-900 shadow-sm">Open my dashboard →</Link>:<><Link to="/register" className="rounded-xl bg-white px-6 py-3.5 text-center font-bold text-blue-900 shadow-sm">Create student account →</Link><Link to="/login" className="rounded-xl border border-white/40 bg-white/10 px-6 py-3.5 text-center font-bold text-white">I already have an account</Link></>}</div>
   <p className="mt-5 text-xs text-blue-100">Student accounts are self-registered. Institution access is subject to approval.</p></div>
   <div className="rounded-3xl border border-white/20 bg-white/10 p-5 shadow-2xl backdrop-blur-sm sm:p-7"><div className="rounded-2xl bg-white p-5 text-slate-900 shadow-lg sm:p-7"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-600">Digital Student Identity</p><h2 className="mt-2 text-xl font-extrabold">One connected profile</h2></div><span className="rounded-xl bg-blue-50 p-3 text-2xl">🎓</span></div><div className="mt-6 space-y-3"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Global Student ID</p><p className="mt-1 font-mono text-lg font-bold tracking-wider">GSS •••• ••••</p></div><div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-blue-50 p-4"><p className="text-xs text-slate-500">Identity</p><p className="mt-1 text-sm font-bold">Student profile</p></div><div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs text-slate-500">Education</p><p className="mt-1 text-sm font-bold">Enrollment records</p></div></div></div><p className="mt-5 text-xs text-slate-400">Illustrative preview · not an issued student ID</p></div></div>
  </div></section>
  <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8"><div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-wider text-blue-700">Explore GSS</p><h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">One platform, clear pathways</h2><p className="mt-3 text-slate-600">Choose the right starting point for your role.</p></div>
   <div className="mt-7 grid gap-4 md:grid-cols-3"><article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><span className="text-3xl">🎓</span><h3 className="mt-4 text-xl font-bold">For students</h3><p className="mt-2 min-h-16 text-sm leading-6 text-slate-600">Register, manage your profile and track your institution enrollment verification.</p><Link to={user?"/dashboard":"/register"} className="mt-5 inline-block font-bold text-blue-700">Student portal →</Link></article>
   <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><span className="text-3xl">🏛️</span><h3 className="mt-4 text-xl font-bold">For institutions</h3><p className="mt-2 min-h-16 text-sm leading-6 text-slate-600">Apply for institutional access and, once approved, manage enrollment verification.</p><Link to="/institution/apply" className="mt-5 inline-block font-bold text-blue-700">Apply as institution →</Link></article>
   <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><span className="text-3xl">🔒</span><h3 className="mt-4 text-xl font-bold">Secure access</h3><p className="mt-2 min-h-16 text-sm leading-6 text-slate-600">Authorized administrators use role-based portals to review and manage records.</p><Link to="/login" className="mt-5 inline-block font-bold text-blue-700">Authorized sign in →</Link></article></div>
  </section>
  <section className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-9 sm:flex-row sm:items-center sm:justify-between sm:px-8"><div><h2 className="text-lg font-bold">Building a connected education ecosystem</h2><p className="mt-1 text-sm text-slate-600">Banking and payments are not live. Financial integrations remain planned or mock-only.</p></div>{user&&<button onClick={()=>void signOut()} className="self-start rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Sign out</button>}</div></section></main>
  <footer className="px-5 py-6 text-center text-xs text-slate-500">© {new Date().getFullYear()} Global Student System · GSS</footer>
 </div>
}
export default function App(){return <Routes><Route path="/" element={<Home/>}/><Route path="/login" element={<Login/>}/><Route path="/register" element={<Register/>}/><Route path="/institution/apply" element={<InstitutionApply/>}/><Route path="/unauthorized" element={<main className="p-8"><h1 className="text-2xl font-bold">Access not assigned</h1><p>Contact your administrator for a role assignment.</p><Link to="/">Home</Link></main>}/><Route element={<ProtectedRoute/>}><Route element={<AuthenticatedLayout/>}><Route path="/dashboard" element={<DashboardRouter/>}/><Route element={<RoleGuard allowed={["student"]}/>}><Route path="/student/admission" element={<AdmissionVerification/>}/><Route path="/student/identity" element={<StudentIdentity/>}/><Route path="/student/profile" element={<StudentProfile/>}/><Route path="/student/dashboard" element={<StudentDashboard/>}/><Route path="/student/history" element={<VerificationHistory/>}/><Route path="/student/transactions" element={<TransactionHistory scope="student"/>}/></Route><Route element={<RoleGuard allowed={["institution_admin"]}/>}><Route path="/institution/verification" element={<StudentVerification/>}/><Route path="/institution/dashboard" element={<InstitutionDashboard/>}/><Route path="/institution/students" element={<StudentDirectory/>}/><Route path="/institution/transactions" element={<TransactionHistory scope="institution"/>}/></Route><Route element={<RoleGuard allowed={["platform_admin"]}/>}><Route path="/admin/institutions/approvals" element={<InstitutionApprovals/>}/><Route path="/admin/institutions/admins" element={<InstitutionAdminAssignments/>}/></Route>{portals.filter(p=>p.key!=="institution"&&p.key!=="student").map(p=><Route key={p.key} element={<RoleGuard allowed={p.roles}/>}> <Route path={`/${p.key}/dashboard`} element={<PortalShell title={`${p.name} Dashboard`} subtitle={p.description} portal={p.name} links={p.links}/>}/></Route>)}</Route></Route><Route path="*" element={<main className="p-8"><h1>Page not found</h1><Link to="/">Home</Link></main>}/></Routes>}
