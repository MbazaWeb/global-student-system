import { ShieldCheck, Clock3, CircleX } from "lucide-react";

type Props = { status: string; className?: string };

const MAP: Record<string, { label: string; style: string; Icon: typeof ShieldCheck }> = {
  verified: { label: "Verified", style: "bg-emerald-50 text-emerald-700", Icon: ShieldCheck },
  pending: { label: "Pending", style: "bg-amber-50 text-amber-800", Icon: Clock3 },
  review_required: { label: "Review required", style: "bg-blue-50 text-blue-700", Icon: Clock3 },
  rejected: { label: "Not approved", style: "bg-red-50 text-red-700", Icon: CircleX },
};

/**
 * VerificationBadge — small pill showing an enrollment verification status.
 * Real component, ready to mount on any enrollment row.
 */
export default function VerificationBadge({ status, className = "" }: Props) {
  const m = MAP[status] ?? { label: status, style: "bg-slate-100 text-slate-600", Icon: Clock3 };
  const Icon = m.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${m.style} ${className}`}>
      <Icon size={14} aria-hidden="true" />
      {m.label}
    </span>
  );
}
