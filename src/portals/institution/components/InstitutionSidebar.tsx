import { NavLink } from "react-router-dom";

const items = [
  { label: "Dashboard", to: "/institution/dashboard" },
  { label: "Directory", to: "/institution/students" },
  { label: "Verification", to: "/institution/verification" },
  { label: "Finance", to: "/institution/finance" },
  { label: "Transactions", to: "/institution/transactions" },
  { label: "Programmes", to: "/institution/programmes" },
  { label: "Departments", to: "/institution/departments" },
  { label: "Academic years", to: "/institution/academic-years" },
  { label: "Tuition fees", to: "/institution/tuition" },
  { label: "Staff", to: "/institution/staff" },
  { label: "Profile", to: "/institution/profile" },
  { label: "Integrations", to: "/institution/integrations" },
  { label: "Audit log", to: "/institution/audit" },
  { label: "Settings", to: "/institution/settings" },
];

/** InstitutionSidebar — vertical nav. Real component, ready to mount. */
export default function InstitutionSidebar() {
  return (
    <nav aria-label="Institution sidebar" className="flex flex-col gap-1 p-3">
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
