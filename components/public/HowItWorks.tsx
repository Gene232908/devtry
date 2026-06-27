import { ClipboardCheck, CalendarCheck, Search, Banknote, LucideIcon } from "lucide-react";
import { copy } from "@/config/copy";

const ICONS: Record<string, LucideIcon> = {
  ClipboardCheck,
  CalendarCheck,
  Search,
  Banknote,
};

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-b border-border-gold py-16 sm:py-20">
      <div className="container">
        <div className="mb-12 max-w-xl">
          <h2 className="font-display text-fluid-3 text-text">{copy.howItWorks.title}</h2>
          <p className="mt-3 text-fluid-0 text-text-muted">{copy.howItWorks.sub}</p>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {copy.howItWorks.steps.map((step, i) => {
            const Icon = ICONS[step.icon];
            return (
              <div key={step.title} className="relative flex flex-col gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border-gold bg-surface-2">
                  <Icon className="h-6 w-6 text-gold" />
                </div>
                <div>
                  <p className="mb-1 text-fluid--1 text-gold">{String(i + 1).padStart(2, "0")}</p>
                  <h3 className="font-display text-fluid-1 text-text">{step.title}</h3>
                  <p className="mt-1 text-fluid--1 text-text-muted">{step.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
