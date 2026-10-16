import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
import { Wallet, Store, CreditCard, UserRound, Users, GraduationCap, LogOut } from "lucide-react";
import { useAuth } from "../../auth/AuthProvider";
type NavItem={label:string;to:string};
const groups:{role:string;items:NavItem[]}[]=[
 {role:"student",items:[{label:"Wallet",to:"/student/wallet"},{label:"Merchant",to:"/student/merchant"},{label:"Pay",to:"/student/wallet?pay=tuition"},{label:"Profile",to:"/student/profile"},{label:"Family",to:"/student/guardians"}]},
 {role:"institution_admin",items:[{label:"Dashboard",to:"/institution/dashboard"},{label:"Student Directory",to:"/institution/students"},{label:"Verification Queue",to:"/institution/verification"},{label:"Transactions",to:"/institution/transactions"},{label:"Finance",to:"/institution/finance"}]},
 {role:"platform_admin",items:[{label:"Dashboard",to:"/admin/dashboard"},{label:"Institution Approvals",to:"/admin/institutions/approvals"},{label:"Admin Assignments",to:"/admin/institutions/admins"},{label:"Roles",to:"/admin/roles"}]},
 {role:"parent_guardian",items:[{label:"Children",to:"/guardian/dashboard"}]},
 {role:"support_agent",items:[{label:"Dashboard",to:"/support/dashboard"},{label:"Cases",to:"/support/cases"},{label:"Transactions",to:"/support/transactions"},{label:"Refunds",to:"/support/refunds"}]},
 {role:"support_lead",items:[{label:"Dashboard",to:"/support/dashboard"},{label:"Cases",to:"/support/cases"},{label:"Transactions",to:"/support/transactions"},{label:"Refunds",to:"/support/refunds"}]},
 {role:"bank_admin",items:[{label:"Dashboard",to:"/bank/dashboard"}]},
 {role:"bank_officer",items:[{label:"Dashboard",to:"/bank/dashboard"}]}
];
export default function PortalNavigation(){
 const {roles,user,signOut}=useAuth();
 const [signingOut,setSigningOut]=useState(false);
 const [logoutError,setLogoutError]=useState("");
 const location=useLocation();
 const paying=location.pathname==="/student/wallet"&&new URLSearchParams(location.search).get("pay")==="tuition";
 const available=groups.filter(g=>roles.includes(g.role as typeof roles[number]));
 const group=available.find(g=>g.items.some(item=>location.pathname.startsWith(item.to.split("?")[0].split("/").slice(0,2).join("/")+"/")))??available.find(g=>g.role==="platform_admin")??available.find(g=>g.role==="institution_admin")??available[0];
 if(!group)return null;
 if(group.role==="student"){
  const icons=[Wallet,Store,CreditCard,UserRound,Users];
  return <nav aria-label="Portal navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] backdrop-blur" style={{paddingBottom:"env(safe-area-inset-bottom)"}}><div className="mx-auto flex max-w-2xl overflow-x-auto px-2 py-2">{group.items.map((item,index)=>{const Icon=icons[index];return <NavLink key={item.to} to={item.to} className={({isActive})=>`flex min-h-14 min-w-[72px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-blue-700 ${(item.label==="Pay"?paying:isActive&&!paying)?"bg-blue-50 text-blue-700":"text-slate-500 hover:bg-slate-50 hover:text-blue-700"}`}><Icon size={20} aria-hidden="true"/>{item.label}</NavLink>;})}</div></nav>;
 }
 const portalName=group.role==="platform_admin"?"Admin Portal":group.role==="institution_admin"?"Institution Portal":group.role==="support_agent"||group.role==="support_lead"?"Support Console":"Bank Portal";
 async function logout(){setSigningOut(true);setLogoutError("");try{await signOut();}catch{setLogoutError("Unable to sign out. Please try again.");}finally{setSigningOut(false);}}
 return <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm print:hidden">
  <div className="bg-gradient-to-r from-[#1761c5] to-[#123b86] text-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8"><div className="flex items-center gap-3"><span className="rounded-xl bg-white/15 p-2.5"><GraduationCap size={28} aria-hidden="true"/></span><div><p className="text-xs font-semibold tracking-widest text-blue-100">GLOBAL STUDENT SYSTEM</p><p className="mt-1 text-xl font-extrabold">{portalName}</p></div></div><div className="flex items-center gap-4"><div className="hidden text-right sm:block"><p className="max-w-64 truncate text-sm font-semibold">{user?.email}</p><p className="mt-1 text-xs text-blue-100">Administrative workspace</p></div><button type="button" disabled={signingOut} onClick={()=>void logout()} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-semibold hover:bg-white/20 disabled:opacity-50"><LogOut size={17} aria-hidden="true"/>{signingOut?"Signing out…":"Sign out"}</button></div></div></div>
  <nav aria-label="Portal navigation" className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-5 py-3 sm:px-8">{group.items.map(item=><NavLink key={item.to} to={item.to} className={({isActive})=>`flex min-h-11 shrink-0 items-center rounded-xl px-4 text-sm font-semibold transition-colors ${isActive?"bg-blue-50 text-blue-800":"text-slate-600 hover:bg-slate-50 hover:text-blue-700"}`}>{item.label}</NavLink>)}</nav>
  {logoutError&&<p role="alert" className="mx-auto max-w-7xl px-8 pb-3 text-sm text-red-700">{logoutError}</p>}
 </header>;
}
