import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-fluid--1 font-medium uppercase tracking-[0.14em] text-text-faint">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-12 w-full rounded-card border border-border-gold/45 bg-bg/45 px-4 text-fluid-0 text-text placeholder:text-text-faint outline-none transition-all duration-150",
            "focus:border-gold focus:bg-surface-2/80 focus:shadow-[0_0_0_3px_rgba(212,175,55,.16)]",
            error && "border-danger",
            className,
          )}
          aria-invalid={!!error}
          {...props}
        />
        {error && (
          <span className="text-fluid--1 text-danger" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
