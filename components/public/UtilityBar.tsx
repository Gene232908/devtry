import { brand } from "@/config/brand";

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]" fill="currentColor">
      <path d="M14 13.5h2.5l.5-3H14V8.5c0-.9.25-1.5 1.53-1.5H17V4.36C16.73 4.32 15.8 4.25 14.7 4.25c-2.3 0-3.87 1.4-3.87 3.97V10.5H8.5v3H10.83V21h3.17v-7.5Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.9">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="4.1" />
      <circle cx="17.1" cy="6.9" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function UtilityBar() {
  return (
    <div className="fixed inset-x-0 top-0 z-[60] h-8 border-b border-gold/25 bg-black text-white/80">
      <div className="container flex h-full items-center justify-end text-[0.66rem] tracking-wide">
        <div className="flex items-center gap-4">
          <a
            href={brand.socials.facebook}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${brand.name} on Facebook`}
            className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-white/10 hover:text-gold"
          >
            <FacebookIcon />
          </a>
          <a
            href={brand.socials.instagram}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${brand.name} on Instagram`}
            className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-white/10 hover:text-gold"
          >
            <InstagramIcon />
          </a>
        </div>
      </div>
    </div>
  );
}
