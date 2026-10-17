import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import PortalShell from "./components/shared/PortalShell";
import PortalNavigation from "./components/shared/PortalNavigation";
import TransactionHistory from "./components/shared/TransactionHistory";
import { Outlet } from "react-router-dom";
import ProtectedRoute from "./auth/ProtectedRoute";
import RoleGuard from "./auth/RoleGuard";
import Login from "./pages/Login";
import DemoStudentDashboard from "./pages/DemoStudentDashboard";
import Register from "./pages/Register";
import InstitutionApprovals from "./portals/admin/pages/InstitutionApprovals";
import InstitutionAdminAssignments from "./portals/admin/pages/InstitutionAdminAssignments";
import InstitutionManagement from "./portals/admin/pages/InstitutionManagement";
import CountryManagement from "./portals/admin/pages/CountryManagement";
import UserManagement from "./portals/admin/pages/UserManagement";
import AdminAuditLogs from "./portals/admin/pages/AuditLogs";
import SystemSettings from "./portals/admin/pages/SystemSettings";
import PlatformAnalytics from "./portals/admin/pages/PlatformAnalytics";
import IntegrationManagement from "./portals/admin/pages/IntegrationManagement";
import VerificationMonitoring from "./portals/admin/pages/VerificationMonitoring";
import BankVendorManagement from "./portals/admin/pages/BankVendorManagement";
import SecurityMonitoring from "./portals/admin/pages/SecurityMonitoring";
import StudentManagement from "./portals/admin/pages/StudentManagement";
import StudentVerification from "./portals/institution/pages/StudentVerification";
import AdmissionVerification from "./portals/student/pages/AdmissionVerification";
import StudentIdentity from "./portals/student/pages/StudentIdentity";
import StudentProfile from "./portals/student/pages/StudentProfile";
import StudentGrants from "./portals/student/pages/StudentGrants";

import StudentWallet from "./portals/student/pages/StudentWallet";
import Notifications from "./portals/student/pages/Notifications";
import StudentDocuments from "./portals/student/pages/StudentDocuments";
import StudentSettings from "./portals/student/pages/Settings";
import TuitionFees from "./portals/student/pages/TuitionFees";
import StudentPayments from "./portals/student/pages/Payments";
import StudentTransactions from "./portals/student/pages/Transactions";
import BankAccountDetails from "./portals/student/pages/BankAccountDetails";
import GuardianRequests from "./portals/student/pages/GuardianRequests";
import GuardianDashboard from "./portals/guardian/pages/GuardianDashboard";
import ChildPayments from "./portals/guardian/pages/ChildPayments";
import FinanceReports from "./portals/institution/pages/FinanceReports";
import InstitutionGrants from "./portals/institution/pages/InstitutionGrants";
import AdminDashboard from "./portals/admin/pages/AdminDashboard";
import RolesPermissions from "./portals/admin/pages/RolesPermissions";
import BankAccountLinking from "./portals/student/pages/BankAccountLinking";
import PayMerchant from "./portals/student/pages/PayMerchant";
import VerificationHistory from "./portals/student/pages/VerificationHistory";
import InstitutionDashboard from "./portals/institution/pages/InstitutionDashboard";
import StudentDirectory from "./portals/institution/pages/StudentDirectory";
import Programmes from "./portals/institution/pages/Programmes";
import Departments from "./portals/institution/pages/Departments";
import AcademicYears from "./portals/institution/pages/AcademicYears";
import TuitionManagement from "./portals/institution/pages/TuitionManagement";
import StaffManagement from "./portals/institution/pages/StaffManagement";
import InstitutionProfile from "./portals/institution/pages/InstitutionProfile";
import IntegrationSettings from "./portals/institution/pages/IntegrationSettings";
import InstitutionAuditLogs from "./portals/institution/pages/AuditLogs";
import PaymentReconciliation from "./portals/institution/pages/PaymentReconciliation";
import StudentStatus from "./portals/institution/pages/StudentStatus";
import StudentAdmissions from "./portals/institution/pages/StudentAdmissions";
import StudentEnrollment from "./portals/institution/pages/StudentEnrollment";
import PendingVerifications from "./portals/institution/pages/PendingVerifications";
import StudentExport from "./portals/institution/pages/StudentExport";
import StudentImport from "./portals/institution/pages/StudentImport";
import InstitutionSettings from "./portals/institution/pages/Settings";
import InstitutionVerification from "./portals/institution/pages/InstitutionVerification";
import InstitutionRegistration from "./portals/institution/pages/InstitutionRegistration";
import InstitutionApply from "./pages/InstitutionApply";
import BankDashboard from "./portals/bank/pages/BankDashboard";
import BankProfile from "./portals/bank/pages/BankProfile";
import APIConnections from "./portals/bank/pages/APIConnections";
import AccountApplications from "./portals/bank/pages/AccountApplications";
import AccountVerification from "./portals/bank/pages/AccountVerification";
import BankAuditLogs from "./portals/bank/pages/AuditLogs";
import KYCReview from "./portals/bank/pages/KYCReview";
import LinkedAccounts from "./portals/bank/pages/LinkedAccounts";
import PaymentSettlements from "./portals/bank/pages/PaymentSettlements";
import Reconciliation from "./portals/bank/pages/Reconciliation";
import BankSettings from "./portals/bank/pages/Settings";
import BankTransactions from "./portals/bank/pages/Transactions";
import WebhookLogs from "./portals/bank/pages/WebhookLogs";
import DashboardRouter from "./pages/DashboardRouter";
import Support from "./portals/student/pages/Support";
import SupportDashboard from "./portals/support/pages/SupportDashboard";
import SupportCaseList from "./portals/support/pages/SupportCaseList";
import SupportCaseDetail from "./portals/support/pages/SupportCaseDetail";
import SupportTransactionSearch from "./portals/support/pages/SupportTransactionSearch";
import SupportRefundList from "./portals/support/pages/SupportRefundList";
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
export default function App(){return <Routes><Route path="/" element={<Splash/>}/><Route path="/login" element={<Login/>}/><Route path="/register" element={<Register/>}/><Route path="/demo/student" element={<DemoStudentDashboard/>}/><Route path="/institution/apply" element={<InstitutionApply/>}/><Route path="/unauthorized" element={<main className="p-8"><h1 className="text-2xl font-bold">Access not assigned</h1><p>Contact your administrator for a role assignment.</p><Link to="/">Home</Link></main>}/><Route element={<ProtectedRoute/>}><Route element={<AuthenticatedLayout/>}><Route path="/dashboard" element={<DashboardRouter/>}/><Route element={<RoleGuard allowed={["student"]}/>}><Route path="/student/admission" element={<AdmissionVerification/>}/><Route path="/student/identity" element={<StudentIdentity/>}/><Route path="/student/profile" element={<StudentProfile/>}/><Route path="/student/grants" element={<StudentGrants/>}/><Route path="/student/dashboard" element={<Navigate to="/student/wallet" replace/>}/><Route path="/student/history" element={<VerificationHistory/>}/><Route path="/student/transactions" element={<TransactionHistory scope="student"/>}/><Route path="/student/wallet" element={<StudentWallet/>}/><Route path="/student/guardians" element={<GuardianRequests/>}/><Route path="/student/bank" element={<BankAccountLinking/>}/><Route path="/student/bank/details" element={<BankAccountDetails/>}/><Route path="/student/merchant" element={<PayMerchant/>}/><Route path="/student/support" element={<Support/>}/><Route path="/student/notifications" element={<Notifications/>}/><Route path="/student/documents" element={<StudentDocuments/>}/><Route path="/student/settings" element={<StudentSettings/>}/><Route path="/student/tuition" element={<TuitionFees/>}/><Route path="/student/payments" element={<StudentPayments/>}/><Route path="/student/transactions-list" element={<StudentTransactions/>}/></Route><Route element={<RoleGuard allowed={["institution_admin"]}/>}><Route path="/institution/verification" element={<StudentVerification/>}/><Route path="/institution/dashboard" element={<InstitutionDashboard/>}/><Route path="/institution/students" element={<StudentDirectory/>}/><Route path="/institution/finance" element={<FinanceReports/>}/><Route path="/institution/grants" element={<InstitutionGrants/>}/><Route path="/institution/transactions" element={<TransactionHistory scope="institution"/>}/><Route path="/institution/programmes" element={<Programmes/>}/><Route path="/institution/departments" element={<Departments/>}/><Route path="/institution/academic-years" element={<AcademicYears/>}/><Route path="/institution/tuition" element={<TuitionManagement/>}/><Route path="/institution/staff" element={<StaffManagement/>}/><Route path="/institution/profile" element={<InstitutionProfile/>}/><Route path="/institution/integrations" element={<IntegrationSettings/>}/><Route path="/institution/audit" element={<InstitutionAuditLogs/>}/><Route path="/institution/reconciliation" element={<PaymentReconciliation/>}/><Route path="/institution/status" element={<StudentStatus/>}/><Route path="/institution/admissions" element={<StudentAdmissions/>}/><Route path="/institution/enrollment" element={<StudentEnrollment/>}/><Route path="/institution/pending" element={<PendingVerifications/>}/><Route path="/institution/export" element={<StudentExport/>}/><Route path="/institution/import" element={<StudentImport/>}/><Route path="/institution/settings" element={<InstitutionSettings/>}/><Route path="/institution/verify" element={<InstitutionVerification/>}/><Route path="/institution/register" element={<InstitutionRegistration/>}/></Route><Route element={<RoleGuard allowed={["parent_guardian"]}/>}><Route path="/guardian/dashboard" element={<GuardianDashboard/>}/><Route path="/guardian/children/:studentId/payments" element={<ChildPayments/>}/></Route><Route element={<RoleGuard allowed={["platform_admin"]}/>}><Route path="/admin/dashboard" element={<AdminDashboard/>}/><Route path="/admin/roles" element={<RolesPermissions/>}/><Route path="/admin/institutions/approvals" element={<InstitutionApprovals/>}/><Route path="/admin/institutions/admins" element={<InstitutionAdminAssignments/>}/><Route path="/admin/institutions" element={<InstitutionManagement/>}/><Route path="/admin/students" element={<StudentManagement/>}/><Route path="/admin/users" element={<UserManagement/>}/><Route path="/admin/verification" element={<VerificationMonitoring/>}/><Route path="/admin/audit" element={<AdminAuditLogs/>}/><Route path="/admin/analytics" element={<PlatformAnalytics/>}/><Route path="/admin/integrations" element={<IntegrationManagement/>}/><Route path="/admin/banks" element={<BankVendorManagement/>}/><Route path="/admin/countries" element={<CountryManagement/>}/><Route path="/admin/security" element={<SecurityMonitoring/>}/><Route path="/admin/system" element={<SystemSettings/>}/></Route><Route element={<RoleGuard allowed={["support_agent","support_lead","platform_admin"]}/>}><Route path="/support/dashboard" element={<SupportDashboard/>}/><Route path="/support/cases" element={<SupportCaseList/>}/><Route path="/support/cases/:caseId" element={<SupportCaseDetail/>}/><Route path="/support/transactions" element={<SupportTransactionSearch/>}/><Route path="/support/refunds" element={<SupportRefundList/>}/></Route>{portals.filter(p=>p.key!=="institution"&&p.key!=="student"&&p.key!=="admin"&&p.key!=="bank").map(p=><Route key={p.key} element={<RoleGuard allowed={p.roles}/>}> <Route path={`/${p.key}/dashboard`} element={<PortalShell title={`${p.name} Dashboard`} subtitle={p.description} portal={p.name} links={p.links}/>}/></Route>)}<Route element={<RoleGuard allowed={["bank_admin","bank_officer"]}/>}><Route path="/bank/dashboard" element={<BankDashboard/>}/><Route path="/bank/profile" element={<BankProfile/>}/><Route path="/bank/api" element={<APIConnections/>}/><Route path="/bank/applications" element={<AccountApplications/>}/><Route path="/bank/verification" element={<AccountVerification/>}/><Route path="/bank/audit" element={<BankAuditLogs/>}/><Route path="/bank/kyc" element={<KYCReview/>}/><Route path="/bank/linked" element={<LinkedAccounts/>}/><Route path="/bank/settlements" element={<PaymentSettlements/>}/><Route path="/bank/reconciliation" element={<Reconciliation/>}/><Route path="/bank/settings" element={<BankSettings/>}/><Route path="/bank/transactions" element={<BankTransactions/>}/><Route path="/bank/webhooks" element={<WebhookLogs/>}/></Route></Route></Route><Route path="*" element={<main className="p-8"><h1>Page not found</h1><Link to="/">Home</Link></main>}/></Routes>}
