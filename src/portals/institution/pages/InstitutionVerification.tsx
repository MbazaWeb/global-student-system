import { Navigate } from "react-router-dom";

/** InstitutionVerification — redirect to /institution/apply per audit instructions.
 *  The apply form is the canonical entry point for institution onboarding. */
export default function InstitutionVerification() {
  return <Navigate to="/institution/apply" replace />;
}
