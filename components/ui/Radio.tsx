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
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        {options.map((opt) => {
          const checked = value === opt.value;
          return (
            <label key={opt.value} className="flex cursor-pointer items-center gap-2.5 select-none">
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
                  "flex h-5 w-5 items-center justify-center rounded-full border transition-colors",
                  checked ? "border-gold" : "border-border-gold",
                )}
              >
                {checked && <span className="h-2.5 w-2.5 rounded-full bg-gold" />}
              </span>
              <span className={cn("text-fluid-0", checked ? "text-text" : "text-text-muted")}>{opt.label}</span>
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
