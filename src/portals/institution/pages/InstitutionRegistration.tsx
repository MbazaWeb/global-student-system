import { Navigate } from "react-router-dom";

/** InstitutionRegistration — redirect to /institution/apply per audit instructions.
 *  Avoids duplicating the application form. */
export default function InstitutionRegistration() {
  return <Navigate to="/institution/apply" replace />;
}
