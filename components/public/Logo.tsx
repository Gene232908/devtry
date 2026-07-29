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
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold/60 bg-[#10100f] shadow-[0_0_0_1px_rgba(243,222,138,.18),0_14px_34px_-20px_rgba(243,222,138,.7)]",
          isSmall ? "h-9 w-9" : compact ? "h-[3.25rem] w-[3.25rem]" : "h-14 w-14 sm:h-16 sm:w-16",
        )}
      >
        <Image
          src="/images/logo.png"
          alt=""
          width={128}
          height={128}
          priority
          className="h-[88%] w-[88%] object-contain"
        />
      </span>

      {showText && (
        <span className="flex min-w-0 flex-col leading-none">
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
