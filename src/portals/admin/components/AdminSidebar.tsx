import { NavLink } from "react-router-dom";

const items = [
  { label: "Dashboard", to: "/admin/dashboard" },
  { label: "Institution approvals", to: "/admin/institutions/approvals" },
  { label: "Admin assignments", to: "/admin/institutions/admins" },
  { label: "Roles", to: "/admin/roles" },
  { label: "Institutions", to: "/admin/institutions" },
  { label: "Students", to: "/admin/students" },
  { label: "Users", to: "/admin/users" },
  { label: "Verification", to: "/admin/verification" },
  { label: "Audit log", to: "/admin/audit" },
  { label: "Analytics", to: "/admin/analytics" },
  { label: "Integrations", to: "/admin/integrations" },
  { label: "Bank vendors", to: "/admin/banks" },
  { label: "Countries", to: "/admin/countries" },
  { label: "Security", to: "/admin/security" },
  { label: "System", to: "/admin/system" },
];

/** AdminSidebar — vertical nav. Real component, ready to mount. */
export default function AdminSidebar() {
  return (
    <nav aria-label="Admin sidebar" className="flex flex-col gap-1 p-3">
      {items.map((i) => (
        <NavLink
          key={i.to}
          to={i.to}
          className={({ isActive }) =>
            `min-h-11 rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`
          }
        >
          {i.label}
        </NavLink>
      ))}
    </nav>
  );
}
