import { popularBrands, type BrandMark } from "@/config/homepage";
import { Section } from "./Section";
import { SectionHeader } from "./SectionHeader";

function BrandMarkGraphic({ mark }: { mark: BrandMark }) {
  const common = "h-16 w-24 text-text-muted transition-colors duration-300 group-hover:text-gold";

  switch (mark) {
    case "mercedes":
      return (
        <svg viewBox="0 0 96 64" aria-hidden="true" className={common}>
          <circle cx="48" cy="32" r="24" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <path d="M48 10v22M48 32 29 45M48 32l19 13" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
        </svg>
      );
    case "range-rover":
      return (
        <svg viewBox="0 0 96 64" aria-hidden="true" className={common}>
          <ellipse cx="48" cy="32" rx="37" ry="19" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <text x="48" y="30" textAnchor="middle" className="fill-current text-[11px] font-extrabold">
            RANGE
          </text>
          <text x="48" y="43" textAnchor="middle" className="fill-current text-[11px] font-extrabold">
            ROVER
          </text>
        </svg>
      );
    case "porsche":
      return (
        <svg viewBox="0 0 96 64" aria-hidden="true" className={common}>
          <path d="M48 8 70 17v16c0 13-8 21-22 25-14-4-22-12-22-25V17Z" fill="none" stroke="currentColor" strokeWidth="2.1" />
          <path d="M48 9v48M27 25h42M32 17l9 8M64 17l-9 8M34 43h28" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
          <circle cx="48" cy="33" r="5" fill="currentColor" opacity=".8" />
        </svg>
      );
    case "bentley":
      return (
        <svg viewBox="0 0 96 64" aria-hidden="true" className={common}>
          <path d="M46 24c-12-9-24-8-36-4 8 6 19 9 33 10M50 24c12-9 24-8 36-4-8 6-19 9-33 10" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          <circle cx="48" cy="32" r="14" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <text x="48" y="38" textAnchor="middle" className="fill-current text-[18px] font-extrabold">
            B
          </text>
        </svg>
      );
    case "bmw":
      return (
        <svg viewBox="0 0 96 64" aria-hidden="true" className={common}>
          <circle cx="48" cy="32" r="25" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <circle cx="48" cy="32" r="16" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M48 16a16 16 0 0 1 16 16H48ZM48 48a16 16 0 0 1-16-16h16Z" fill="currentColor" opacity=".78" />
          <text x="48" y="13" textAnchor="middle" className="fill-current text-[8px] font-extrabold">
            BMW
          </text>
        </svg>
      );
    case "audi":
      return (
        <svg viewBox="0 0 96 64" aria-hidden="true" className={common}>
          {[29, 42, 55, 68].map((cx) => (
            <circle key={cx} cx={cx} cy="32" r="12" fill="none" stroke="currentColor" strokeWidth="2.2" />
          ))}
        </svg>
      );
    case "toyota":
      return (
        <svg viewBox="0 0 96 64" aria-hidden="true" className={common}>
          <ellipse cx="48" cy="32" rx="33" ry="20" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <ellipse cx="48" cy="32" rx="12" ry="20" fill="none" stroke="currentColor" strokeWidth="2" />
          <ellipse cx="48" cy="29" rx="22" ry="9" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case "nissan":
      return (
        <svg viewBox="0 0 96 64" aria-hidden="true" className={common}>
          <circle cx="48" cy="32" r="24" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <rect x="18" y="25" width="60" height="14" rx="2" fill="var(--bg)" stroke="currentColor" strokeWidth="2" />
          <text x="48" y="36" textAnchor="middle" className="fill-current text-[10px] font-extrabold">
            NISSAN
          </text>
        </svg>
      );
    case "ferrari":
      return (
        <svg viewBox="0 0 96 64" aria-hidden="true" className={common}>
          <path d="M35 8h26l6 9v36l-19 7-19-7V17Z" fill="none" stroke="currentColor" strokeWidth="2.1" />
          <path d="M38 21h20M38 46h20M43 40c3-10 11-8 10-18 6 6 2 17-4 20" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
        </svg>
      );
    case "lamborghini":
      return (
        <svg viewBox="0 0 96 64" aria-hidden="true" className={common}>
          <path d="M48 8 69 16v17c0 13-8 21-21 26-13-5-21-13-21-26V16Z" fill="none" stroke="currentColor" strokeWidth="2.1" />
          <path d="M37 38c5-13 17-13 22 0M39 28c6 3 12 3 18 0M38 26l-6-5M58 26l6-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
        </svg>
      );
    default:
      return null;
  }
}

export function BrandBrowse() {
  return (
    <Section id="brands">
      <SectionHeader
        align="split"
        eyebrow="Brands Customers Can Sell To Us"
        title="Recognizable badges, handled with a more premium intake."
        intro="These marques are shown as sell-side references. They help visitors understand the kind of vehicles CarVibeDubai can review after the free valuation form."
      />

      <div className="mt-12 overflow-hidden rounded-card border border-white/5 bg-white/5 lg:mt-16">
        <div className="grid grid-cols-2 gap-px lg:grid-cols-5">
          {popularBrands.map((brand) => (
            <article
              key={brand.name}
              className="group flex min-h-[170px] flex-col items-center justify-center bg-bg px-4 py-8 text-center sm:px-6"
            >
              <BrandMarkGraphic mark={brand.mark} />
              <p className="mt-4 font-display text-fluid--1 font-semibold text-text">{brand.name}</p>
              <p className="mt-1 text-[0.7rem] text-text-faint">{brand.segment}</p>
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}
