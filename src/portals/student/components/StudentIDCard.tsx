import { GraduationCap } from "lucide-react";

type Props = { name: string; globalId?: string; institution?: string };

/**
 * StudentIDCard — compact, printable student ID card. Real component, ready
 * to mount. Not currently used (StudentIdentity renders its own richer card),
 * but kept as a reusable building block.
 */
export default function StudentIDCard({ name, globalId, institution }: Props) {
  return (
    <article className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1761c5] to-[#123b86] p-5 text-white">
      <div className="flex items-center gap-2">
        <GraduationCap size={20} aria-hidden="true" />
        <span className="text-[10px] font-bold tracking-widest">GLOBAL STUDENT SYSTEM</span>
      </div>
      <p className="mt-4 text-xs text-blue-200">Student name</p>
      <p className="mt-1 break-words text-lg font-extrabold">{name}</p>
      {institution && <p className="mt-1 text-xs text-blue-200">{institution}</p>}
      {globalId && (
        <p className="mt-4 break-all font-mono text-base font-bold tracking-wide">{globalId}</p>
      )}
    </article>
  );
}
