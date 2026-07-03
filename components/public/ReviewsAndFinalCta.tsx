"use client";

import { ArrowRight, MessageCircle, Star } from "lucide-react";
import { customerReviews } from "@/config/homepage";
import { whatsappLink } from "@/config/brand";
import { buttonClasses } from "@/components/ui/Button";
import { openValuationModal } from "./open-valuation-modal";
import { Section } from "./Section";
import { SectionHeader } from "./SectionHeader";

export function ReviewsAndFinalCta() {
  return (
    <>
      <Section>
        <SectionHeader
          align="split"
          eyebrow="Customer Confidence"
          title="Designed for clarity before the first call."
          intro="The review format is ready for verified customer feedback once real testimonials are approved."
        />

        <div className="mt-10 divide-y divide-white/5 lg:mt-14">
          {customerReviews.map((review) => (
            <article key={`${review.name}-${review.vehicle}`} className="py-7 first:pt-0">
              <div className="flex items-center gap-1 text-gold">
                <Star className="h-3.5 w-3.5 fill-current" />
                <span className="text-fluid--1 font-semibold">{review.rating}</span>
              </div>
              <p className="mt-3 max-w-3xl font-display text-fluid-1 font-medium leading-relaxed text-text">
                &ldquo;{review.quote}&rdquo;
              </p>
              <p className="mt-3 text-[0.72rem] font-semibold uppercase tracking-caps text-text-faint">
                {review.name} — {review.vehicle}
              </p>
            </article>
          ))}
        </div>
        <p className="mt-6 text-fluid--1 text-text-faint">Verified format pending real reviews.</p>
      </Section>

      <Section tone="panel" divider="gold" className="text-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,.08),transparent_60%)]"
        />
        <div className="relative mx-auto max-w-2xl">
          <p className="flex items-center justify-center gap-3 text-[0.72rem] font-semibold uppercase tracking-caps text-gold">
            <span aria-hidden="true" className="gold-rule" />
            Next Step
            <span aria-hidden="true" className="gold-rule" />
          </p>
          <h2 className="mt-5 font-display text-fluid-4 font-bold leading-[1.05] tracking-tight text-text text-balance sm:text-fluid-5">
            Your next car decision is closer than you think.
          </h2>
          <p className="mt-5 text-fluid-0 leading-8 text-text-muted">
            Start with a free valuation and let the CarVibeDubai team review the details before the next conversation.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <button type="button" onClick={openValuationModal} className={buttonClasses({ size: "lg" })}>
              Sell your car
              <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href={whatsappLink("Hi, I'd like to get my free car valuation.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center gap-2 text-fluid-0 font-semibold text-text-muted transition-colors hover:text-gold"
            >
              <MessageCircle className="h-4 w-4" />
              Message on WhatsApp
            </a>
          </div>
        </div>
      </Section>
    </>
  );
}
