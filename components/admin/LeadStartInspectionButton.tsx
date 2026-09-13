import Link from "next/link";
import { ClipboardPenLine } from "lucide-react";

type Props = {
  leadId: string;
  visible: boolean;
};

/** The only UI entry point that starts an on-site purchaser inspection. */
export function LeadStartInspectionButton({ leadId, visible }: Props) {
  if (!visible) return null;

  return (
    <Link
      href={`/admin/leads/${encodeURIComponent(leadId)}/inspection`}
      className="group relative inline-flex min-h-11 overflow-hidden items-center justify-center gap-2 rounded-btn border border-emerald-300/70 bg-emerald-500 px-4 text-sm font-semibold text-emerald-950 shadow-[0_0_0_3px_rgba(16,185,129,.14),0_14px_30px_-14px_rgba(16,185,129,.9)] transition hover:bg-emerald-400 hover:shadow-[0_0_0_5px_rgba(16,185,129,.16),0_16px_34px_-14px_rgba(16,185,129,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
    >
      <span className="pointer-events-none absolute inset-y-0 left-[-35%] z-0 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent animate-inspection-shine motion-reduce:animate-none" />
      <span className="relative z-10 inline-flex items-center gap-2">
        <ClipboardPenLine className="h-4 w-4" />
        Start inspection
      </span>
    </Link>
  );
}
