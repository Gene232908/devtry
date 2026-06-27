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
          <label htmlFor={inputId} className="text-fluid--1 text-text-muted">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-11 w-full rounded-card border border-border bg-surface-2 px-4 text-fluid-0 text-text placeholder:text-text-faint outline-none transition-shadow duration-150",
            "focus:gold-glow focus:border-gold",
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
