import { Navigate } from "react-router-dom";

/** PendingVerifications — redirect to the verification queue with a pending filter.
 *  The StudentVerification page already has its own status filter, so this
 *  route simply lands the user there. */
export default function PendingVerifications() {
  return <Navigate to="/institution/verification" replace />;
}
