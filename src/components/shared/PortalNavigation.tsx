import { NavLink, useLocation } from "react-router-dom";
import { Wallet, Store, CreditCard, UserRound } from "lucide-react";
import { useAuth } from "../../auth/AuthProvider";
type NavItem={label:string;to:string};
const groups:{role:string;items:NavItem[]}[]=[
 {role:"student",items:[{label:"Wallet",to:"/student/wallet"},{label:"Merchant",to:"/student/merchant"},{label:"Pay",to:"/student/wallet?pay=tuition"},{label:"Profile",to:"/student/profile"}]},
 {role:"institution_admin",items:[{label:"Dashboard",to:"/institution/dashboard"},{label:"Student Directory",to:"/institution/students"},{label:"Verification Queue",to:"/institution/verification"},{label:"Transactions",to:"/institution/transactions"}]},
 {role:"platform_admin",items:[{label:"Dashboard",to:"/admin/dashboard"},{label:"Institution Approvals",to:"/admin/institutions/approvals"},{label:"Admin Assignments",to:"/admin/institutions/admins"}]},
 {role:"bank_admin",items:[{label:"Dashboard",to:"/bank/dashboard"}]},
 {role:"bank_officer",items:[{label:"Dashboard",to:"/bank/dashboard"}]}
];
export default function PortalNavigation(){
 const {roles}=useAuth();
 const location=useLocation();
 const paying=location.pathname==="/student/wallet"&&new URLSearchParams(location.search).get("pay")==="tuition";
 const group=groups.find(g=>roles.includes(g.role as typeof roles[number]));
 if(!group)return null;
 if(group.role==="student"){
  const icons=[Wallet,Store,CreditCard,UserRound];
  return <nav aria-label="Portal navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] backdrop-blur" style={{paddingBottom:"env(safe-area-inset-bottom)"}}><div className="mx-auto flex max-w-2xl overflow-x-auto px-2 py-2">{group.items.map((item,index)=>{const Icon=icons[index];return <NavLink key={item.to} to={item.to} className={({isActive})=>`flex min-h-14 min-w-[72px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-blue-700 ${(item.label==="Pay"?paying:isActive&&!paying)?"bg-blue-50 text-blue-700":"text-slate-500 hover:bg-slate-50 hover:text-blue-700"}`}><Icon size={20} aria-hidden="true"/>{item.label}</NavLink>;})}</div></nav>;
 }
 return <nav aria-label="Portal navigation" className="border-b bg-white"><div className="mx-auto max-w-6xl flex flex-wrap gap-2 p-3">{group.items.map(item=><NavLink key={item.to} to={item.to} className={({isActive})=>`rounded-lg px-3 py-2 text-sm font-medium ${isActive?"bg-blue-800 text-white":"text-slate-700 hover:bg-slate-100"}`}>{item.label}</NavLink>)}</div></nav>;
}
