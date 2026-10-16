import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
type NavItem={label:string;to:string};
const groups:{role:string;items:NavItem[]}[]=[
 {role:"student",items:[{label:"Dashboard",to:"/student/dashboard"},{label:"Profile",to:"/student/profile"},{label:"Global ID",to:"/student/identity"},{label:"Admissions",to:"/student/admission"},{label:"History",to:"/student/history"},{label:"Statement",to:"/student/transactions"}]},
 {role:"institution_admin",items:[{label:"Dashboard",to:"/institution/dashboard"},{label:"Student Directory",to:"/institution/students"},{label:"Verification Queue",to:"/institution/verification"},{label:"Transactions",to:"/institution/transactions"}]},
 {role:"platform_admin",items:[{label:"Dashboard",to:"/admin/dashboard"},{label:"Institution Approvals",to:"/admin/institutions/approvals"},{label:"Admin Assignments",to:"/admin/institutions/admins"}]},
 {role:"bank_admin",items:[{label:"Dashboard",to:"/bank/dashboard"}]},
 {role:"bank_officer",items:[{label:"Dashboard",to:"/bank/dashboard"}]}
];
export default function PortalNavigation(){
 const {roles}=useAuth();
 const group=groups.find(g=>roles.includes(g.role as typeof roles[number]));
 if(!group)return null;
 return <nav aria-label="Portal navigation" className="border-b bg-white"><div className="mx-auto max-w-6xl flex flex-wrap gap-2 p-3">{group.items.map(item=><NavLink key={item.to} to={item.to} className={({isActive})=>`rounded-lg px-3 py-2 text-sm font-medium ${isActive?"bg-blue-800 text-white":"text-slate-700 hover:bg-slate-100"}`}>{item.label}</NavLink>)}</div></nav>;
}
