import { NavLink } from "react-router-dom";

/** BankSidebar — vertical nav. Real component, ready to mount. */
const items = [{ label: "Dashboard", to: "/bank/dashboard" }];

export default function BankSidebar() {
  return (
    <nav aria-label="Bank sidebar" className="flex flex-col gap-1 p-3">
      {items.map((i) => (
        <NavLink key={i.to} to={i.to} className={({ isActive }) => `min-h-11 rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}>{i.label}</NavLink>
      ))}
    </nav>
  );
}
