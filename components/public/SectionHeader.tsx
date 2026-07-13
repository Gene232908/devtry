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
        align === "split" && "lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(18rem,0.45fr)] lg:items-end lg:gap-x-16",
        className,
      )}
    >
      <div>
        <p className="flex items-center gap-3 text-[0.82rem] font-semibold uppercase tracking-[0.18em] text-gold">
          <span aria-hidden="true" className="gold-rule" />
          {eyebrow}
        </p>
        <h2 className="mt-5 max-w-2xl font-display text-fluid-4 font-light leading-[1.08] text-text text-balance">
          {title}
        </h2>
      </div>
      {intro ? (
        <p
          className={cn(
            "mt-5 max-w-xl text-fluid-0 font-light leading-8 text-text-muted",
            align === "split" && "lg:mb-1.5 lg:max-w-md lg:justify-self-end",
          )}
        >
          {intro}
        </p>
      ) : null}
    </div>
  );
}
