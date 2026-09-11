import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-card border border-white/[0.08] bg-[#0c0c0f] shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-colors",
        className,
      )}
      {...props}
    />
  );
}
