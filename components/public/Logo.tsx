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
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold/55 bg-[#10100f] shadow-[0_10px_24px_-20px_rgba(15,15,15,.9)]",
          compact ? "h-10 w-10" : "h-11 w-11 sm:h-12 sm:w-12",
        )}
      >
        <Image
          src="/images/logo.svg"
          alt=""
          width={96}
          height={96}
          priority
          className="h-[86%] w-[86%] object-contain"
        />
      </span>

      {showText && (
        <span className="flex min-w-0 flex-col leading-none">
          <span
            className={cn(
              "font-display text-[1.12rem] font-extrabold uppercase leading-none sm:text-[1.25rem]",
              isLight ? "text-[#181611]" : "text-text",
            )}
          >
            {brand.name}
          </span>
          <span
            className={cn(
              "mt-1 hidden text-[0.58rem] font-bold uppercase sm:block",
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
