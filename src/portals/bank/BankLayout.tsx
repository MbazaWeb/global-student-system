import type { ReactNode } from "react";
import { Info } from "lucide-react";

type Props = { title: string; subtitle: string; children: ReactNode };

/**
 * BankPageShell — shared chrome for every bank portal page. Renders the
 * MOCK / PROPOSED banner so no bank page can be mistaken for a live
 * integration.
 */
export default function BankPageShell({ title, subtitle, children }: Props) {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-slate-600">{subtitle}</p>
      </header>
      <section className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <Info className="shrink-0 text-amber-700" size={20} aria-hidden="true" />
        <p className="text-sm text-amber-800">
          <strong>MOCK / PROPOSED.</strong> The bank portal is a sandbox preview. No real bank endpoints, credentials or
          account numbers are stored in GSS. Live bank integration requires a licensed partner and a server-side flow.
        </p>
      </section>
      {children}
    </main>
  );
}
