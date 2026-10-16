import { NavLink } from "react-router-dom";

/**
 * StudentSidebar — vertical nav for the student portal. Not currently mounted
 * (PortalNavigation renders a bottom nav on mobile and a top nav on desktop),
 * but kept as a real component for any future desktop sidebar layout.
 */
const items = [
  { label: "Wallet", to: "/student/wallet" },
  { label: "Merchant", to: "/student/merchant" },
  { label: "Profile", to: "/student/profile" },
  { label: "Global ID", to: "/student/identity" },
  { label: "Admissions", to: "/student/admission" },
  { label: "History", to: "/student/history" },
  { label: "Statements", to: "/student/transactions" },
  { label: "Family", to: "/student/guardians" },
  { label: "Bank", to: "/student/bank" },
  { label: "Documents", to: "/student/documents" },
  { label: "Notifications", to: "/student/notifications" },
  { label: "Support", to: "/student/support" },
  { label: "Settings", to: "/student/settings" },
];

export default function StudentSidebar() {
  return (
    <nav aria-label="Student sidebar" className="flex flex-col gap-1 p-3">
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
