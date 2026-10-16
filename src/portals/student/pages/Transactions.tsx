import { Navigate } from "react-router-dom";

/**
 * Transactions is a thin redirect to the shared TransactionHistory component
 * mounted at /student/transactions. Keeping the route alive so links resolve.
 */
export default function Transactions() {
  return <Navigate to="/student/transactions" replace />;
}
