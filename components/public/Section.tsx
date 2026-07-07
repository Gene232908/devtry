import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionProps = {
  id?: string;
  tone?: "default" | "panel";
  divider?: "none" | "hairline" | "gold";
  bleed?: boolean;
  className?: string;
  containerClassName?: string;
  children: ReactNode;
};

export function Section({
  id,
  tone = "default",
  divider = "none",
  bleed = false,
  className,
  containerClassName,
  children,
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "relative scroll-mt-28 py-section sm:scroll-mt-32",
        tone === "panel" && "bg-panel",
        divider === "hairline" && "hairline-t",
        className,
      )}
    >
      {divider === "gold" && <div aria-hidden="true" className="divider-gold-fade absolute inset-x-0 top-0" />}
      <div className={cn(!bleed && "container", containerClassName)}>{children}</div>
    </section>
  );
}
