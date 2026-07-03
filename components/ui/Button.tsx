import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type ButtonStyleOptions = {
  variant?: "gold" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  Omit<ButtonStyleOptions, "className"> & {
    className?: string;
    loading?: boolean;
  };

const sizeClasses = {
  sm: "h-9 px-4 text-fluid--1",
  md: "h-11 px-5 text-fluid-0",
  lg: "h-12 px-6 text-fluid-0",
};

export function buttonClasses({ variant = "gold", size = "md", className }: ButtonStyleOptions = {}) {
  return cn(
    "inline-flex min-w-[44px] items-center justify-center gap-2 rounded-btn font-semibold transition-all duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-50",
    sizeClasses[size],
    variant === "gold" &&
      "btn-gold shadow-[0_16px_42px_-24px_rgba(243,222,138,.9)] hover:brightness-110 active:brightness-95",
    variant === "outline" && "border border-border-gold/70 bg-bg/30 text-text hover:border-gold hover:bg-surface-2",
    variant === "ghost" && "text-text-muted hover:text-text hover:bg-surface-2",
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "gold", size = "md", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={buttonClasses({ variant, size, className })}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
