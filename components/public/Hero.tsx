import { Card } from "@/components/ui/Card";
import { ValuationForm } from "./valuation-form";
import { CarSkylineArt } from "./CarSkylineArt";
import { copy } from "@/config/copy";

export function Hero() {
  return (
    <section id="home" className="relative overflow-hidden border-b border-border-gold py-14 sm:py-20">
      <div className="container">
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 text-fluid--1 uppercase tracking-[0.2em] text-gold">{copy.hero.eyebrow}</p>
          <h1 className="font-display text-fluid-4 leading-tight text-text text-balance">
            {copy.hero.headline}
          </h1>
          <p className="mt-4 text-fluid-0 text-text-muted">{copy.hero.sub}</p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <Card className="p-6 sm:p-8">
            <ValuationForm />
          </Card>

          <Card className="hidden overflow-hidden p-0 lg:block">
            <CarSkylineArt className="h-full w-full" />
          </Card>
        </div>
      </div>
    </section>
  );
}
