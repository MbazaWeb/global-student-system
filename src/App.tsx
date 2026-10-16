import { Link, Route, Routes } from "react-router-dom";
import PortalShell from "./components/shared/PortalShell";
import ProtectedRoute from "./auth/ProtectedRoute";
import RoleGuard from "./auth/RoleGuard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import InstitutionApprovals from "./portals/admin/pages/InstitutionApprovals";
import InstitutionAdminAssignments from "./portals/admin/pages/InstitutionAdminAssignments";
import StudentVerification from "./portals/institution/pages/StudentVerification";
import AdmissionVerification from "./portals/student/pages/AdmissionVerification";
import InstitutionApply from "./pages/InstitutionApply";
import DashboardRouter from "./pages/DashboardRouter";
import { useAuth } from "./auth/AuthProvider";
import type { PortalRole } from "./types/domain";
const portals:{key:string;name:string;description:string;roles:PortalRole[];links:string[]}[]=[
{key:"student",name:"Student",description:"Identity, enrollment and wallet",roles:["student"],links:["Registration","Profile","Admission Verification","Wallet","Bank Account Linking","Payments","Documents"]},
{key:"institution",name:"Institution",description:"Admissions, verification and finance",roles:["institution_admin"],links:["Student Directory","Admissions","Verification Queue","Enrollment","Finance Reports","Staff Management"]},
{key:"bank",name:"Bank Vendor",description:"Proposed CRDB partner — mock only",roles:["bank_admin","bank_officer"],links:["Account Applications","KYC Review","Linked Accounts","Transactions","Reconciliation","Audit Logs"]},
{key:"admin",name:"Super Admin",description:"Platform governance",roles:["platform_admin"],links:["Institution Approvals","Admin Assignments","Student Management","Bank Partner","Role Assignments","Security","Audit Logs"]}
];
function Home(){const {user,signOut}=useAuth();return <main className="max-w-5xl mx-auto p-8"><p className="font-bold text-blue-700">GSS · Global Student System</p><h1 className="text-4xl font-bold mt-3">Student identity and institution network</h1><p className="text-slate-600 mt-3">Approved roles are required to access each portal. Banking is mock-only.</p><div className="mt-6 flex gap-4">{user?<><Link className="underline" to="/dashboard">My dashboard</Link><button className="underline" onClick={()=>void signOut()}>Sign out</button></>:<Link className="underline" to="/login">Sign in</Link>}<Link className="underline" to="/register">Student registration</Link><Link className="underline" to="/institution/apply">Institution application</Link></div></main>}
export default function App(){return <Routes><Route path="/" element={<Home/>}/><Route path="/login" element={<Login/>}/><Route path="/register" element={<Register/>}/><Route path="/institution/apply" element={<InstitutionApply/>}/><Route path="/unauthorized" element={<main className="p-8"><h1 className="text-2xl font-bold">Access not assigned</h1><p>Contact your administrator for a role assignment.</p><Link to="/">Home</Link></main>}/><Route element={<ProtectedRoute/>}><Route path="/dashboard" element={<DashboardRouter/>}/><Route element={<RoleGuard allowed={["student"]}/>}><Route path="/student/admission" element={<AdmissionVerification/>}/></Route><Route element={<RoleGuard allowed={["institution_admin"]}/>}><Route path="/institution/verification" element={<StudentVerification/>}/></Route><Route element={<RoleGuard allowed={["platform_admin"]}/>}><Route path="/admin/institutions/approvals" element={<InstitutionApprovals/>}/><Route path="/admin/institutions/admins" element={<InstitutionAdminAssignments/>}/></Route>{portals.map(p=><Route key={p.key} element={<RoleGuard allowed={p.roles}/>}> <Route path={`/${p.key}/dashboard`} element={<PortalShell title={`${p.name} Dashboard`} subtitle={p.description} portal={p.name} links={p.links}/>}/></Route>)}</Route><Route path="*" element={<main className="p-8"><h1>Page not found</h1><Link to="/">Home</Link></main>}/></Routes>}
