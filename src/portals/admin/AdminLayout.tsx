import type { ReactNode } from "react";

/** AdminLayout — passthrough wrapper. Global AuthenticatedLayout handles chrome. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
