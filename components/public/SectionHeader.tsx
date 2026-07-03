import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  intro?: string;
  align?: "start" | "split";
  className?: string;
};

export function SectionHeader({ eyebrow, title, intro, align = "start", className }: SectionHeaderProps) {
  return (
    <div
      className={cn(
        align === "split" && "lg:grid lg:grid-cols-[1fr_auto] lg:items-end lg:gap-x-12",
        className,
      )}
    >
      <div>
        <p className="flex items-center gap-3 text-[0.72rem] font-semibold uppercase tracking-caps text-gold">
          <span aria-hidden="true" className="gold-rule" />
          {eyebrow}
        </p>
        <h2 className="mt-5 max-w-2xl font-display text-fluid-4 font-bold leading-[1.05] tracking-tight text-text text-balance">
          {title}
        </h2>
      </div>
      {intro ? (
        <p
          className={cn(
            "mt-5 max-w-xl text-fluid-0 leading-8 text-text-muted",
            align === "split" && "lg:mb-1.5 lg:max-w-md lg:justify-self-end",
          )}
        >
          {intro}
        </p>
      ) : null}
    </div>
  );
}
