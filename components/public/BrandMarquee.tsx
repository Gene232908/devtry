"use client";

import Image from "next/image";
import { brandLogos, type BrandLogo } from "./carbrands/brand-images";
import { openValuationModal } from "./open-valuation-modal";

// A couple of stray tiny UI-icon SVGs ended up in the source folder (not
// brand marks) — exclude them from the marquee.
const allLogos = brandLogos.filter((l) => !l.svg);

/**
 * How many logos ride the belt.
 *
 * The full catalogue is ~150. Rendering all of them cost far more than it was
 * worth: the list has to be duplicated for the loop to be seamless, so the page
 * carried ~300 tiles, ~345 KB of HTML before a single image loaded, and a
 * 72,000px-wide animated element — roughly ten times what graphics hardware
 * will hold in one texture, which forces the browser to keep re-rasterising it
 * for as long as the animation runs. The whole page felt sluggish as a result.
 *
 * Only six or seven tiles are ever on screen at once, and the section's own
 * copy already says "Don't see your badge below? … we review almost every make
 * and model", so a representative sample says exactly what the full set said.
 * Raise this if more variety is wanted — the cost is roughly linear.
 */
const MARQUEE_LOGO_COUNT = 32;

// Sampled at an even stride rather than taking the first N, so the belt keeps
// the visual variety of the whole catalogue instead of showing one run of
// similar-looking marks.
const stride = Math.max(1, Math.floor(allLogos.length / MARQUEE_LOGO_COUNT));
const logos = allLogos.filter((_, i) => i % stride === 0).slice(0, MARQUEE_LOGO_COUNT);

// Slow, cinematic pace: duration is derived from the catalog size so the
// on-screen speed (px/s) stays constant even if logos are added or removed.
const TILE_WIDTH = 208; // desktop tile width (w-52)
const TILE_GAP = 32; // desktop gap (mr-8)
const SPEED_PX_PER_SEC = 46;
const LOOP_SECONDS = Math.round((logos.length * (TILE_WIDTH + TILE_GAP)) / SPEED_PX_PER_SEC);

/**
 * Presentational only — a plain div, not a button.
 *
 * Every tile used to be its own <button> with its own click handler. That meant
 * React had to hydrate hundreds of interactive elements before the page would
 * respond to anything, which is what made the first click after load feel
 * delayed. The whole belt is now one button (see below), so there is a single
 * handler and a single tab stop instead of hundreds.
 */
function LogoTile({ logo }: { logo: BrandLogo }) {
  return (
    <div className="relative mr-6 flex h-20 w-40 shrink-0 select-none items-center justify-center rounded-2xl bg-ivory p-4 shadow-[0_16px_34px_-16px_rgba(0,0,0,.7)] ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_38px_-14px_rgba(212,175,78,.35)] hover:ring-2 hover:ring-gold/60 sm:mr-8 sm:h-24 sm:w-52">
      <Image
        src={logo.img}
        alt=""
        width={192}
        height={80}
        draggable={false}
        className="pointer-events-none h-full w-full select-none object-contain [-webkit-user-drag:none]"
      />
    </div>
  );
}

export function BrandMarquee() {
  return (
    <button
      type="button"
      onClick={openValuationModal}
      aria-label="Get your free car valuation"
      className="group relative block w-full cursor-pointer overflow-hidden py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 sm:py-4"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* soft fade masks so tiles appear/disappear right at the viewport edge */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-[linear-gradient(90deg,#0b0b0a,rgba(11,11,10,0))] sm:w-40"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-[linear-gradient(270deg,#0b0b0a,rgba(11,11,10,0))] sm:w-40"
      />
      {/* No will-change here on purpose. It promotes the belt to its own
          compositor layer permanently, which is a win on a small element and a
          serious cost on one this wide — the browser holds the whole strip in
          memory for the entire life of the page. The transform animates fine
          without it. */}
      <div
        style={{ animationDuration: `${LOOP_SECONDS}s` }}
        className="flex w-max animate-marquee-slow group-hover:[animation-play-state:paused] motion-reduce:animate-none"
      >
        {logos.map((logo, i) => (
          <LogoTile key={`${logo.file}-${i}`} logo={logo} />
        ))}
        {/* Duplicated so translateX(-50%) lands exactly where the first copy
            started, making the loop seamless. */}
        {logos.map((logo, i) => (
          <LogoTile key={`clone-${logo.file}-${i}`} logo={logo} />
        ))}
      </div>
    </button>
  );
}
