import { Navigate } from "react-router-dom";

/**
 * Payments is a thin redirect to the wallet, which is the actual payments hub
 * for students (top-up, tuition, merchant). The Transactions page covers the
 * ledger view. Keeping the route alive so existing links don't 404.
 */
export default function Payments() {
  return <Navigate to="/student/wallet" replace />;
}
