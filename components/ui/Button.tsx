import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "gold" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};

const sizeClasses = {
  sm: "h-9 px-4 text-fluid--1",
  md: "h-11 px-5 text-fluid-0",
  lg: "h-12 px-6 text-fluid-0",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "gold", size = "md", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-btn font-semibold tracking-wide transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed min-w-[44px]",
          sizeClasses[size],
          variant === "gold" && "btn-gold hover:brightness-110 active:brightness-95 shadow-[0_4px_18px_-4px_rgba(212,175,55,.5)]",
          variant === "outline" && "border border-border-gold text-text hover:bg-surface-2",
          variant === "ghost" && "text-text-muted hover:text-text hover:bg-surface-2",
          className,
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
