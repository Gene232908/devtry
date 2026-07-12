"use client";

import { landingImages } from "@/config/homepage";
import { openValuationModal } from "./open-valuation-modal";

export function Hero() {
  return (
    <section id="home" className="relative isolate overflow-hidden bg-bg">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover animate-hero-focus will-change-[transform,filter] motion-reduce:animate-none"
        style={{
          backgroundImage: `url('${landingImages.hero}')`,
          backgroundPosition: "70% 55%",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,8,8,.96)_0%,rgba(8,8,8,.86)_30%,rgba(8,8,8,.52)_50%,rgba(8,8,8,.12)_70%,rgba(8,8,8,0)_86%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,8,.4)_0%,transparent_22%,transparent_58%,rgba(8,8,8,.72)_82%,rgba(10,10,10,1)_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[16%] top-1/2 h-[58vh] w-[52%] -translate-y-1/2 bg-[radial-gradient(closest-side,rgba(255,255,255,.08),rgba(255,255,255,.02)_52%,transparent_74%)] mix-blend-screen blur-[55px]"
      />

      <div className="container relative z-10 flex min-h-[85svh] items-center pb-16 pt-36 sm:pt-40 lg:pb-20 lg:pt-44">
        <div className="w-full max-w-[40rem] [&>*]:animate-hero-rise [&>*]:motion-reduce:animate-none">
          <h1
            className="font-display font-semibold leading-[1.12] text-white text-balance [text-shadow:0_2px_20px_rgba(0,0,0,.7),0_1px_4px_rgba(0,0,0,.6)] [animation-delay:.45s]"
          >
            <span className="block text-[clamp(2.15rem,1.7rem+2.1vw,3.65rem)]">We Buy Your Car Across the UAE</span>
            <span className="mt-2 block whitespace-nowrap text-[clamp(1rem,0.8rem+1.6vw,2.15rem)] tracking-[0.02em] text-gold [text-shadow:0_2px_18px_rgba(0,0,0,.75),0_0_18px_rgba(212,175,78,.25)]">
              Fast, Fair &amp; Hassle-Free.
            </span>
          </h1>
          <p className="mt-5 max-w-[32rem] text-fluid--1 font-light leading-7 text-white/85 [text-shadow:0_1px_12px_rgba(0,0,0,.75)] [animation-delay:.6s]">
            Selling is simple: share your car details, get a free professional
            valuation, and our team follows up directly on WhatsApp. Buying a
            car with CarVibeDubai is launching soon.
          </p>

          <button
            type="button"
            onClick={openValuationModal}
            className="mt-8 inline-flex h-12 items-center justify-center border border-white/60 px-7 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-text transition-colors hover:border-gold hover:text-gold [animation-delay:.75s]"
          >
            Get Your Free Valuation
          </button>

          <p className="mt-4 text-[0.72rem] font-light text-white/50 [animation-delay:.9s]">
            Free request / WhatsApp follow-up / Fair, transparent negotiation
          </p>
        </div>
      </div>
    </section>
  );
}
