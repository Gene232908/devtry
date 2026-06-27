import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 48 48" className="h-9 w-9 shrink-0" aria-hidden="true">
        <circle cx="24" cy="24" r="22" fill="none" stroke="var(--gold)" strokeWidth="1.2" />
        <path
          d="M16 30c0-8 4-13 8-13s8 5 8 13M16 30c2-5 5-8 8-8s6 3 8 8"
          fill="none"
          stroke="var(--gold)"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <circle cx="24" cy="24" r="2.2" fill="var(--gold)" />
      </svg>
      <span className="font-display text-fluid-1 tracking-wide text-text">{brand.name}</span>
    </div>
  );
}
