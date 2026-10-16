import type { VerificationStatus } from "../../../types/domain";

const MAP: Record<string, { label: string; style: string }> = {
  pending: { label: "Pending", style: "bg-amber-50 text-amber-800" },
  verified: { label: "Verified", style: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "Not approved", style: "bg-red-50 text-red-700" },
  review_required: { label: "Review required", style: "bg-blue-50 text-blue-700" },
};

type Props = { status: VerificationStatus | string; className?: string };

/** AdmissionStatusBadge — small pill for the institution portal. */
export default function AdmissionStatusBadge({ status, className = "" }: Props) {
  const m = MAP[status] ?? { label: status, style: "bg-slate-100 text-slate-600" };
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${m.style} ${className}`}>{m.label}</span>;
}
