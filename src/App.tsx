import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
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

import StudentWallet from "./portals/student/pages/StudentWallet";
import GuardianRequests from "./portals/student/pages/GuardianRequests";
import GuardianDashboard from "./portals/guardian/pages/GuardianDashboard";
import ChildPayments from "./portals/guardian/pages/ChildPayments";
import FinanceReports from "./portals/institution/pages/FinanceReports";
import AdminDashboard from "./portals/admin/pages/AdminDashboard";
import RolesPermissions from "./portals/admin/pages/RolesPermissions";
import BankAccountLinking from "./portals/student/pages/BankAccountLinking";
import PayMerchant from "./portals/student/pages/PayMerchant";
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
function AuthenticatedLayout(){const {pathname}=useLocation();const student=pathname.startsWith("/student/");return <div className="min-h-[100dvh]"><PortalNavigation/><div className={student?"min-w-0 pb-[calc(6rem+env(safe-area-inset-bottom))]":"web-portal-content"}><Outlet/></div></div>}
function Splash(){
 const [done,setDone]=useState(false);
 useEffect(()=>{const timer=window.setTimeout(()=>setDone(true),1800);return()=>window.clearTimeout(timer)},[]);
 if(done)return <Navigate to="/login" replace/>;
 return <main aria-label="S Wallet is starting" className="relative isolate flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#101936] px-6 text-white">
  <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{background:"radial-gradient(ellipse 85% 48% at 52% 53%, #04b5c3 0%, #087aab 39%, #153a80 70%, #11162f 100%)"}}/>
  <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40" style={{background:"linear-gradient(165deg, #141321 0%, transparent 36%, transparent 68%, #069b9f 100%)"}}/>
  <div className="relative z-10 flex items-center justify-center gap-4 sm:gap-6">
   <img src="/s-wallet.svg" alt="S Wallet symbol" className="h-20 w-20 rounded-2xl bg-white object-contain p-1.5 shadow-xl sm:h-24 sm:w-24"/>
   <span className="text-4xl font-extrabold tracking-tight sm:text-5xl">S Wallet</span>
  </div>
 </main>;
}
export function Home(){
 const {user,signOut}=useAuth();
 return <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
  <header className="bg-[#1761c5] text-white"><div className="mx-auto flex max-w-lg items-center justify-between px-5 py-5"><div className="flex items-center gap-3"><img src="/s-wallet.svg" alt="S Wallet" className="h-11 w-11 rounded-xl bg-white object-contain p-1"/><div><p className="text-lg font-extrabold leading-tight">Global Student</p><p className="text-xs text-blue-100">System</p></div></div><Link to={user?"/dashboard":"/login"} className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">{user?"Dashboard":"Sign in"}</Link></div></header>
  <main className="mx-auto max-w-lg px-5 pb-12">
   <section className="pt-8"><p className="text-sm font-semibold text-blue-700">Welcome to GSS</p><h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight">Your student identity, in one place.</h1><p className="mt-3 text-sm leading-6 text-slate-600">Access your student profile, Global Student ID and education records through one secure account.</p></section>
   <section className="mt-7 rounded-3xl bg-gradient-to-br from-[#1761c5] to-[#123b86] p-6 text-white shadow-lg"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-blue-100">GLOBAL STUDENT ID</p><span className="rounded-full bg-white/15 px-3 py-1 text-xs">GSS</span></div><p className="mt-8 font-mono text-2xl font-bold tracking-wider">•••• •••• ••••</p><p className="mt-5 text-xs text-blue-100">Sign in to view your personal student identity.</p></section>
   <section className="mt-8"><h2 className="text-base font-extrabold">Quick access</h2><div className="mt-4 grid grid-cols-2 gap-3">
    <Link to={user?"/dashboard":"/register"} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md"><span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-2xl">🎓</span><span className="mt-4 block text-sm font-bold">Student account</span><span className="mt-1 block text-xs text-slate-500">{user?"Open dashboard":"Register now"}</span></Link>
    <Link to="/institution/apply" className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md"><span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-2xl">🏫</span><span className="mt-4 block text-sm font-bold">Institution</span><span className="mt-1 block text-xs text-slate-500">Apply for access</span></Link>
    <Link to="/login" className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md"><span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-2xl">🔐</span><span className="mt-4 block text-sm font-bold">Sign in</span><span className="mt-1 block text-xs text-slate-500">Secure login</span></Link>
    <Link to={user?"/student/identity":"/register"} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md"><span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-2xl">🪪</span><span className="mt-4 block text-sm font-bold">Student ID</span><span className="mt-1 block text-xs text-slate-500">View your identity</span></Link>
   </div></section>
   <p className="mt-8 text-center text-xs leading-5 text-slate-500">Banking and payments are not yet available.</p>
   {user&&<button onClick={()=>void signOut()} className="mt-5 w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold">Sign out</button>}
  </main><footer className="px-5 pb-6 text-center text-xs text-slate-400">© {new Date().getFullYear()} GSS</footer>
 </div>
}
export default function App(){return <Routes><Route path="/" element={<Splash/>}/><Route path="/login" element={<Login/>}/><Route path="/register" element={<Register/>}/><Route path="/institution/apply" element={<InstitutionApply/>}/><Route path="/unauthorized" element={<main className="p-8"><h1 className="text-2xl font-bold">Access not assigned</h1><p>Contact your administrator for a role assignment.</p><Link to="/">Home</Link></main>}/><Route element={<ProtectedRoute/>}><Route element={<AuthenticatedLayout/>}><Route path="/dashboard" element={<DashboardRouter/>}/><Route element={<RoleGuard allowed={["student"]}/>}><Route path="/student/admission" element={<AdmissionVerification/>}/><Route path="/student/identity" element={<StudentIdentity/>}/><Route path="/student/profile" element={<StudentProfile/>}/><Route path="/student/dashboard" element={<Navigate to="/student/wallet" replace/>}/><Route path="/student/history" element={<VerificationHistory/>}/><Route path="/student/transactions" element={<TransactionHistory scope="student"/>}/><Route path="/student/wallet" element={<StudentWallet/>}/><Route path="/student/guardians" element={<GuardianRequests/>}/><Route path="/student/bank" element={<BankAccountLinking/>}/><Route path="/student/merchant" element={<PayMerchant/>}/></Route><Route element={<RoleGuard allowed={["institution_admin"]}/>}><Route path="/institution/verification" element={<StudentVerification/>}/><Route path="/institution/dashboard" element={<InstitutionDashboard/>}/><Route path="/institution/students" element={<StudentDirectory/>}/><Route path="/institution/finance" element={<FinanceReports/>}/><Route path="/institution/transactions" element={<TransactionHistory scope="institution"/>}/></Route><Route element={<RoleGuard allowed={["parent_guardian"]}/>}><Route path="/guardian/dashboard" element={<GuardianDashboard/>}/><Route path="/guardian/children/:studentId/payments" element={<ChildPayments/>}/></Route><Route element={<RoleGuard allowed={["platform_admin"]}/>}><Route path="/admin/dashboard" element={<AdminDashboard/>}/><Route path="/admin/roles" element={<RolesPermissions/>}/><Route path="/admin/institutions/approvals" element={<InstitutionApprovals/>}/><Route path="/admin/institutions/admins" element={<InstitutionAdminAssignments/>}/></Route>{portals.filter(p=>p.key!=="institution"&&p.key!=="student"&&p.key!=="admin").map(p=><Route key={p.key} element={<RoleGuard allowed={p.roles}/>}> <Route path={`/${p.key}/dashboard`} element={<PortalShell title={`${p.name} Dashboard`} subtitle={p.description} portal={p.name} links={p.links}/>}/></Route>)}</Route></Route><Route path="*" element={<main className="p-8"><h1>Page not found</h1><Link to="/">Home</Link></main>}/></Routes>}
