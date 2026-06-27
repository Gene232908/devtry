export function CarSkylineArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 600" className={className} role="img" aria-label="Luxury car against the Dubai skyline">
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1c1812" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </linearGradient>
        <linearGradient id="carGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a2a2a" />
          <stop offset="100%" stopColor="#050505" />
        </linearGradient>
        <linearGradient id="glow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--gold)" stopOpacity="0" />
          <stop offset="50%" stopColor="var(--gold)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="600" height="600" fill="url(#skyGrad)" />

      <g opacity="0.55" fill="#171410">
        <rect x="40" y="260" width="40" height="220" />
        <rect x="90" y="220" width="32" height="260" />
        <rect x="130" y="290" width="36" height="190" />
        <rect x="430" y="240" width="34" height="240" />
        <rect x="470" y="200" width="40" height="280" />
        <rect x="520" y="270" width="30" height="210" />
      </g>
      <g opacity="0.85" fill="#100e0a">
        <rect x="240" y="120" width="46" height="360" />
        <rect x="296" y="60" width="30" height="420" />
        <polygon points="296,60 311,20 326,60" />
        <rect x="336" y="160" width="38" height="320" />
      </g>

      <g opacity="0.5">
        {Array.from({ length: 14 }).map((_, i) => (
          <circle key={i} cx={300 + Math.sin(i * 9) * 220} cy={130 + (i % 5) * 60} r="1.4" fill="var(--gold-hi)" />
        ))}
      </g>

      <rect x="0" y="478" width="600" height="4" fill="url(#glow)" />

      <g transform="translate(80,300)">
        <ellipse cx="220" cy="186" rx="230" ry="14" fill="#000" opacity="0.5" />
        <path
          d="M10 150 Q20 90 100 80 L150 50 Q210 30 300 38 L360 60 Q410 75 430 110 L440 150 Z"
          fill="url(#carGrad)"
          stroke="var(--gold)"
          strokeWidth="1"
          strokeOpacity="0.4"
        />
        <rect x="60" y="140" width="380" height="34" rx="10" fill="url(#carGrad)" stroke="var(--gold)" strokeOpacity="0.35" />
        <circle cx="120" cy="180" r="34" fill="#050505" stroke="var(--gold-soft)" strokeWidth="3" />
        <circle cx="120" cy="180" r="12" fill="#1a1a1a" />
        <circle cx="370" cy="180" r="34" fill="#050505" stroke="var(--gold-soft)" strokeWidth="3" />
        <circle cx="370" cy="180" r="12" fill="#1a1a1a" />
        <rect x="40" y="120" width="18" height="14" rx="3" fill="var(--gold-hi)" opacity="0.9" />
        <rect x="155" y="58" width="160" height="56" rx="14" fill="#0c0c0c" opacity="0.85" />
      </g>
    </svg>
  );
}
