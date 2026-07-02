import { cn } from "@/lib/utils";

type RadioOption = { label: string; value: string };

type RadioGroupProps = {
  name: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
};

export function RadioGroup({ name, options, value, onChange, error }: RadioGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {options.map((opt) => {
          const checked = value === opt.value;
          return (
            <label
              key={opt.value}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-card border p-3 transition-colors",
                checked
                  ? "border-gold bg-gold/10 text-text"
                  : "border-border-gold/45 bg-bg/35 text-text-muted hover:border-border-gold hover:text-text",
              )}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={checked}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                  checked ? "border-gold" : "border-border-gold",
                )}
              >
                {checked && <span className="h-2.5 w-2.5 rounded-full bg-gold" />}
              </span>
              <span className="text-fluid-0 font-medium">{opt.label}</span>
            </label>
          );
        })}
      </div>
      {error && (
        <span className="text-fluid--1 text-danger" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
