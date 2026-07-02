"use client";

import { ArrowRight, Star } from "lucide-react";
import { customerReviews } from "@/config/homepage";
import { openValuationModal } from "./open-valuation-modal";

export function ReviewsAndFinalCta() {
  return (
    <section className="relative overflow-hidden border-y border-border-gold/35 bg-[#0c0b09] py-16 sm:py-24">
      <div className="container">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[.95fr_1.05fr]">
          <div>
            <p className="text-fluid--1 font-bold uppercase text-gold">Customer Confidence</p>
            <h2 className="mt-4 max-w-xl font-display text-fluid-4 font-extrabold leading-[1.02] text-text">
              Designed for clarity before the first call.
            </h2>
            <p className="mt-5 max-w-lg text-fluid-0 leading-8 text-text-muted">
              The review format is ready for verified customer feedback once real testimonials are approved.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {customerReviews.map((review) => (
              <article
                key={`${review.name}-${review.vehicle}`}
                className="rounded-card border border-border-gold/45 bg-[linear-gradient(135deg,rgba(20,20,20,.94),rgba(8,8,8,.78))] p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-display text-fluid-1 font-bold text-text">{review.name}</p>
                    <p className="mt-1 text-fluid--1 text-text-faint">{review.vehicle}</p>
                  </div>
                  <div className="flex w-fit items-center gap-1 rounded-full border border-border-gold/50 px-3 py-1 text-fluid--1 font-bold text-gold">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    {review.rating}
                  </div>
                </div>
                <p className="mt-4 max-w-2xl text-fluid--1 leading-7 text-text-muted">{review.quote}</p>
                <p className="mt-4 text-[0.7rem] font-bold uppercase text-gold">Verified format pending real reviews</p>
              </article>
            ))}
          </div>
        </div>

        <div className="relative mt-10 overflow-hidden rounded-card border border-border-gold/60 bg-bg">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-cover opacity-45"
            style={{
              backgroundImage: "url('/images/carvibe-premium-evaluation-showcase.jpg')",
              backgroundPosition: "58% center",
            }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,8,8,.94),rgba(8,8,8,.68),rgba(8,8,8,.34))]" />
          <div className="relative p-6 sm:p-8 lg:p-10">
            <p className="text-fluid--1 font-bold uppercase text-gold">Next Step</p>
            <h2 className="mt-4 max-w-2xl font-display text-fluid-4 font-extrabold leading-[1.02] text-text">
              Your next car decision is closer than you think.
            </h2>
            <p className="mt-5 max-w-2xl text-fluid-0 leading-8 text-text-muted">
              Start with a free valuation and let the CarVibeDubai team review the details before the next conversation.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={openValuationModal}
                className="btn-gold inline-flex h-12 items-center justify-center gap-2 rounded-btn px-6 text-fluid-0 font-semibold transition-all hover:brightness-110"
              >
                Sell your car
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
