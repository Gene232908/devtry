import Image from "next/image";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  compact?: boolean;
  showText?: boolean;
  tone?: "dark" | "light";
  /**
   * "sm" fits inside a fixed-height bar (the 4rem admin header), where the
   * default mark is tall enough to collide with the header edges.
   */
  size?: "sm" | "md";
};

export function Logo({ className, compact = false, showText = true, tone = "dark", size = "md" }: LogoProps) {
  const isLight = tone === "light";
  const isSmall = size === "sm";

  return (
    <div className={cn("flex min-w-0 max-w-full items-center", isSmall ? "gap-2" : "gap-3", className)}>
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold/75 bg-[#0d0d0c] shadow-[0_0_14px_rgba(212,175,78,0.3),0_0_0_1px_rgba(243,222,138,0.25)] ring-1 ring-gold/20",
          isSmall ? "h-10 w-10 p-1.5" : compact ? "h-[3.25rem] w-[3.25rem] p-2" : "h-14 w-14 sm:h-16 sm:w-16 p-2.5",
        )}
      >
        <Image
          src="/images/logo-mark.png"
          alt={brand.name}
          width={128}
          height={128}
          priority
          className="h-full w-full object-contain filter contrast-110 brightness-110 drop-shadow-[0_2px_8px_rgba(212,175,78,0.45)]"
        />
      </span>

      {showText && (
        <span className={cn("min-w-0 flex-col leading-none", isSmall ? "hidden 2xl:flex" : "flex")}>
          <span
            className={cn(
              "font-display font-semibold uppercase leading-none",
              isSmall ? "text-[0.95rem]" : "text-[1.22rem] sm:text-[1.42rem]",
              isLight ? "text-[#181611]" : "text-text",
            )}
          >
            {brand.name}
          </span>
          {/* The tagline is dropped at "sm" — there is no vertical room for it
              in a fixed-height bar without crowding the wordmark. */}
          {!isSmall && (
            <span
              className={cn(
                "mt-1 hidden text-[0.58rem] font-medium uppercase sm:block",
                isLight ? "text-[#8b6f21]" : "text-gold",
              )}
            >
              Premium Car Valuation
            </span>
          )}
        </span>
      )}
    </div>
  );
}
