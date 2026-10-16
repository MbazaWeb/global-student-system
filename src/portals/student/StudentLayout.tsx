import type { ReactNode } from "react";

/**
 * StudentLayout is a passthrough wrapper retained for future per-portal
 * chrome. Today the global AuthenticatedLayout + PortalNavigation handle
 * layout. Keeping this as a real passthrough so consumers can wrap pages
 * without changing behaviour.
 */
export default function StudentLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
