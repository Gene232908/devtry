"use client";

import { ArrowRight, BadgeCheck, FileCheck, ShieldCheck } from "lucide-react";
import { sellingSteps } from "@/config/homepage";
import { openValuationModal } from "./open-valuation-modal";

export function SellExperience() {
  return (
    <section
      id="sell-your-car"
      className="relative scroll-mt-28 overflow-hidden bg-[#080808] py-16 sm:scroll-mt-32 sm:py-24"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(243,222,138,.72),transparent)]" />
      <div className="container">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_.95fr] lg:items-stretch">
          <div className="relative min-h-[500px] overflow-hidden rounded-card border border-border-gold/55 bg-bg">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-cover"
              style={{
                backgroundImage: "url('/images/carvibe-valuation-desk.jpg')",
                backgroundPosition: "52% center",
              }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,7,7,.08),rgba(7,7,7,.9))]" />
            <div className="relative flex h-full min-h-[500px] flex-col justify-end p-6 sm:p-8">
              <p className="text-fluid--1 font-bold uppercase text-gold">Sell Your Car</p>
              <h2 className="mt-4 max-w-xl font-display text-fluid-4 font-extrabold leading-[1.02] text-text">
                A private sale path built around valuation, inspection, and secure handover.
              </h2>
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {["Fast vehicle valuation", "Transparent follow-up", "Hassle-free documents"].map((item) => (
                  <div key={item} className="rounded-card border border-white/10 bg-bg/70 p-3 text-fluid--1 text-text-muted backdrop-blur-md">
                    <BadgeCheck className="mb-3 h-4 w-4 text-gold" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-card border border-border-gold/55 bg-[linear-gradient(145deg,rgba(22,22,22,.96),rgba(9,9,9,.88))] p-6 sm:p-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-fluid--1 font-bold uppercase text-gold">Professional Process</p>
                <h3 className="mt-3 font-display text-fluid-3 font-extrabold leading-tight text-text">
                  Three clear steps from request to decision.
                </h3>
              </div>
              <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-full border border-border-gold/70 text-gold sm:flex">
                <ShieldCheck className="h-6 w-6" />
              </span>
            </div>

            <div className="relative mt-10 space-y-7">
              <div className="absolute left-[1.35rem] top-4 h-[calc(100%-2rem)] w-px bg-[linear-gradient(180deg,rgba(243,222,138,.8),rgba(74,61,31,.18))]" />
              {sellingSteps.map((step, index) => (
                <div key={step.title} className="relative flex gap-4">
                  <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/75 bg-bg font-display text-fluid--1 font-bold text-gold">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="rounded-card border border-border-gold/35 bg-bg/45 p-4">
                    <h4 className="font-display text-fluid-0 font-bold text-text">{step.title}</h4>
                    <p className="mt-2 text-fluid--1 leading-6 text-text-muted">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-9 border-t border-border-gold/35 pt-6">
              <button
                type="button"
                onClick={openValuationModal}
                className="btn-gold inline-flex h-12 w-full items-center justify-center gap-2 rounded-btn px-6 text-fluid-0 font-semibold transition-all hover:brightness-110 sm:w-auto"
              >
                Start free valuation
                <ArrowRight className="h-4 w-4" />
              </button>
              <div className="mt-4 flex items-center gap-2 text-fluid--1 text-text-muted">
                <FileCheck className="h-4 w-4 text-gold" />
                Documentation and backend storage remain pending final approval.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
