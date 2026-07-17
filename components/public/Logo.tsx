import Image from "next/image";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  compact?: boolean;
  showText?: boolean;
  tone?: "dark" | "light";
};

export function Logo({ className, compact = false, showText = true, tone = "dark" }: LogoProps) {
  const isLight = tone === "light";

  return (
    <div className={cn("flex min-w-0 max-w-full items-center gap-3", className)}>
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold/60 bg-[#10100f] shadow-[0_0_0_1px_rgba(243,222,138,.18),0_14px_34px_-20px_rgba(243,222,138,.7)]",
          compact ? "h-[3.25rem] w-[3.25rem]" : "h-14 w-14 sm:h-16 sm:w-16",
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
              "font-display text-[1.22rem] font-semibold uppercase leading-none sm:text-[1.42rem]",
              isLight ? "text-[#181611]" : "text-text",
            )}
          >
            {brand.name}
          </span>
          <span
            className={cn(
              "mt-1 hidden text-[0.58rem] font-medium uppercase sm:block",
              isLight ? "text-[#8b6f21]" : "text-gold",
            )}
          >
            Premium Car Valuation
          </span>
        </span>
      )}
    </div>
  );
}
