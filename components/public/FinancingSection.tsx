import { FileCheck } from "lucide-react";
import { financingHighlights } from "@/config/homepage";
import { Section } from "./Section";

const ESTIMATOR_ROWS: [string, string][] = [
  ["Vehicle price", "AED 250,000"],
  ["Down payment", "20%"],
  ["Term", "60 months"],
];

export function FinancingSection() {
  return (
    <Section id="financing">
      <div className="grid grid-cols-1 overflow-hidden rounded-card border border-white/5 bg-panel lg:grid-cols-[.92fr_1.08fr]">
        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-cover"
            style={{
              backgroundImage: "url('/images/carvibe-luxury-suv-preview.jpg')",
              backgroundPosition: "56% center",
            }}
          />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />

          <div className="relative flex h-full min-h-[360px] flex-col justify-end p-6 sm:p-8 lg:min-h-[420px]">
            <p className="flex items-center gap-3 text-[0.72rem] font-semibold uppercase tracking-caps text-gold">
              <span aria-hidden="true" className="gold-rule" />
              Financing Support
            </p>
            <h2 className="mt-4 max-w-lg font-display text-fluid-4 font-bold leading-[1.05] tracking-tight text-text">
              Make the monthly picture easier to understand.
            </h2>
            <p className="mt-4 max-w-lg text-fluid-0 leading-8 text-text-muted">
              Financing can be prepared as an advisor-assisted flow once bank partners, rules, and approval details are
              provided.
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="divide-y divide-white/5">
            {financingHighlights.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3 py-3.5 first:pt-0">
                  <Icon className="h-5 w-5 shrink-0 text-gold" />
                  <p className="text-fluid--1 font-semibold text-text">{item.label}</p>
                </div>
              );
            })}
          </div>

          <div className="hairline-t mt-6 pt-6">
            <p className="text-[0.7rem] font-semibold uppercase tracking-caps text-text-faint">
              Payment estimator preview
            </p>
            <div className="mt-3">
              {ESTIMATOR_ROWS.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 border-b border-white/5 py-3">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-caps text-text-faint">{label}</p>
                  <p className="font-display text-fluid-0 font-semibold text-text">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-fluid--1 text-text-muted">Estimated monthly range</p>
                <p className="mt-1 font-display text-fluid-2 font-bold text-gold">Advisor quote</p>
              </div>
              <div className="flex items-center gap-2 text-fluid--1 text-text-muted">
                <FileCheck className="h-4 w-4 shrink-0 text-text-faint" />
                Bank rules required before live launch
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
