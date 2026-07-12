import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-card border border-border-gold/55 bg-surface/80 card-shadow backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  );
}
