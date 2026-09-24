import { Recycle } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  compact?: boolean;
  className?: string;
};

/** Shared visual marker for the permanent Scrap inquiry origin. */
export function ScrapInquiryBadge({ compact = false, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center whitespace-nowrap rounded-full border border-gold/45 bg-gold/10 font-semibold uppercase tracking-[0.08em] text-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
        compact ? "gap-1 px-2 py-0.5 text-[10px]" : "gap-1.5 px-2.5 py-1 text-[11px]",
        className,
      )}
    >
      <Recycle className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden="true" />
      Scrap inquiry
    </span>
  );
}
