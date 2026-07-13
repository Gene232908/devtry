"use client";

import Image from "next/image";
import { brandLogos, type BrandLogo } from "./carbrands/brand-images";

// A couple of stray tiny UI-icon SVGs ended up in the source folder (not
// brand marks) — exclude them from the marquee.
const logos = brandLogos.filter((l) => !l.svg);

// Slow, cinematic pace: duration is derived from the catalog size so the
// on-screen speed (px/s) stays constant even if logos are added or removed.
const TILE_WIDTH = 208; // desktop tile width (w-52)
const TILE_GAP = 32; // desktop gap (mr-8)
const SPEED_PX_PER_SEC = 46;
const LOOP_SECONDS = Math.round((logos.length * (TILE_WIDTH + TILE_GAP)) / SPEED_PX_PER_SEC);

function LogoTile({ logo, clone = false }: { logo: BrandLogo; clone?: boolean }) {
  return (
    <div
      aria-hidden={clone || undefined}
      className="relative mr-6 flex h-20 w-40 shrink-0 select-none items-center justify-center rounded-2xl bg-ivory p-4 shadow-[0_16px_34px_-16px_rgba(0,0,0,.7)] ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_38px_-14px_rgba(212,175,78,.35)] hover:ring-2 hover:ring-gold/60 sm:mr-8 sm:h-24 sm:w-52"
    >
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
    <div
      className="group relative w-full overflow-hidden py-3 sm:py-4"
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
      <div
        style={{ animationDuration: `${LOOP_SECONDS}s` }}
        className="flex w-max animate-marquee-slow will-change-transform group-hover:[animation-play-state:paused] motion-reduce:animate-none"
      >
        {logos.map((logo, i) => (
          <LogoTile key={`${logo.file}-${i}`} logo={logo} />
        ))}
        {logos.map((logo, i) => (
          <LogoTile key={`clone-${logo.file}-${i}`} logo={logo} clone />
        ))}
      </div>
    </div>
  );
}
