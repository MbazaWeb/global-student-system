import type { ReactNode } from "react";

/** InstitutionLayout — passthrough wrapper. Global AuthenticatedLayout handles chrome. */
export default function InstitutionLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
