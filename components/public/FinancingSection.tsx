import { FileCheck } from "lucide-react";
import { financingHighlights } from "@/config/homepage";

export function FinancingSection() {
  return (
    <section
      id="financing"
      className="relative scroll-mt-28 overflow-hidden bg-[#080808] py-16 sm:scroll-mt-32 sm:py-24"
    >
      <div className="container">
        <div className="grid grid-cols-1 overflow-hidden rounded-card border border-border-gold/55 bg-[linear-gradient(145deg,rgba(21,21,21,.97),rgba(8,8,8,.9))] lg:grid-cols-[.92fr_1.08fr]">
          <div className="relative min-h-[420px] p-6 sm:p-8">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-cover opacity-35"
              style={{
                backgroundImage: "url('/images/carvibe-luxury-suv-preview.jpg')",
                backgroundPosition: "56% center",
              }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,8,.16),rgba(8,8,8,.94))]" />
            <div className="relative flex h-full min-h-[360px] flex-col justify-end">
              <p className="text-fluid--1 font-bold uppercase text-gold">Financing Support</p>
              <h2 className="mt-4 max-w-lg font-display text-fluid-4 font-extrabold leading-[1.02] text-text">
                Make the monthly picture easier to understand.
              </h2>
              <p className="mt-5 max-w-lg text-fluid-0 leading-8 text-text-muted">
                Financing can be prepared as an advisor-assisted flow once bank partners, rules, and approval details are provided.
              </p>
            </div>
          </div>

          <div className="border-t border-border-gold/35 p-6 sm:p-8 lg:border-l lg:border-t-0">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {financingHighlights.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-card border border-border-gold/40 bg-bg/45 p-4">
                    <Icon className="h-5 w-5 text-gold" />
                    <p className="mt-4 text-fluid--1 font-semibold leading-6 text-text">{item.label}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 rounded-card border border-border-gold/45 bg-bg/50 p-4 sm:p-5">
              <p className="text-fluid--1 font-bold uppercase text-text-faint">Payment estimator preview</p>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  ["Vehicle price", "AED 250,000"],
                  ["Down payment", "20%"],
                  ["Term", "60 months"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-card border border-border-gold/35 bg-[#11100e] p-4">
                    <p className="text-[0.7rem] font-bold uppercase text-text-faint">{label}</p>
                    <p className="mt-2 font-display text-fluid-1 font-bold text-text">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-col gap-3 border-t border-border-gold/35 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-fluid--1 text-text-muted">Estimated monthly range</p>
                  <p className="mt-1 font-display text-fluid-2 font-extrabold text-gold">Advisor quote</p>
                </div>
                <div className="inline-flex min-h-12 items-center gap-2 rounded-btn border border-border-gold/65 bg-bg/45 px-5 text-fluid--1 font-semibold text-text-muted">
                  <FileCheck className="h-4 w-4 text-gold" />
                  Bank rules required before live launch
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
