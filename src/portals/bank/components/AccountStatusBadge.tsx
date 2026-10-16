/** AccountStatusBadge — small pill for mock bank account statuses. */
const STYLE: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-700",
  Pending: "bg-amber-50 text-amber-800",
  "Pending review": "bg-amber-50 text-amber-800",
  Verified: "bg-emerald-50 text-emerald-700",
  Settled: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-red-50 text-red-700",
  Disabled: "bg-slate-100 text-slate-600",
};

export default function AccountStatusBadge({ status }: { status: string }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STYLE[status] ?? "bg-slate-100 text-slate-600"}`}>{status}</span>;
}
