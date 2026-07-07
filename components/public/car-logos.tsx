import type { SVGProps } from "react";

type LogoEntry = {
  name: string;
  id: number;
  img: React.ComponentType<SVGProps<SVGSVGElement>>;
};

function MercedesLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 96 64" aria-hidden="true" {...props}>
      <circle cx="48" cy="32" r="24" fill="none" stroke="#e7e8e5" strokeWidth="2.4" />
      <path d="M48 8v24M48 32 27 45M48 32l21 13" fill="none" stroke="#f2f2ee" strokeLinecap="round" strokeWidth="3" />
    </svg>
  );
}

function RangeRoverLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 96 64" aria-hidden="true" {...props}>
      <ellipse cx="48" cy="32" rx="38" ry="19" fill="none" stroke="#e9dfb4" strokeWidth="2.2" />
      <text x="48" y="30" textAnchor="middle" fill="#f4ecd2" fontSize="10.5" fontWeight="800" letterSpacing="1">
        RANGE
      </text>
      <text x="48" y="43" textAnchor="middle" fill="#f4ecd2" fontSize="10.5" fontWeight="800" letterSpacing="1">
        ROVER
      </text>
    </svg>
  );
}

function PorscheLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 96 64" aria-hidden="true" {...props}>
      <text
        x="48"
        y="38"
        textAnchor="middle"
        fill="#f0f0ec"
        fontSize="13.5"
        fontWeight="700"
        letterSpacing="1.5"
        fontFamily="Georgia, 'Times New Roman', serif"
      >
        PORSCHE
      </text>
    </svg>
  );
}

function BentleyLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 96 64" aria-hidden="true" {...props}>
      <path
        d="M46 26c-12-9-25-8-37-4 8 6 20 9 34 10M50 26c12-9 25-8 37-4-8 6-20 9-34 10"
        fill="none"
        stroke="#e7e8e4"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
      <path d="M15 22c8 5 18 8 29 9M81 22c-8 5-18 8-29 9" fill="none" stroke="#9a9d9c" strokeLinecap="round" strokeWidth="1" />
      <circle cx="48" cy="33" r="13" fill="none" stroke="#d9be6a" strokeWidth="2" />
      <text x="48" y="39" textAnchor="middle" fill="#f6f4ea" fontSize="15" fontWeight="800">
        B
      </text>
    </svg>
  );
}

function BmwLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 96 64" aria-hidden="true" {...props}>
      <circle cx="48" cy="32" r="24" fill="#0a0a0a" stroke="#e6e6e3" strokeWidth="2" />
      <circle cx="48" cy="32" r="15" fill="#f7f7f3" />
      <path d="M48 17a15 15 0 0 1 15 15H48ZM48 47a15 15 0 0 1-15-15h15Z" fill="#1c69d4" />
      <path d="M48 17a15 15 0 0 0-15 15h15ZM48 47a15 15 0 0 0 15-15H48Z" fill="#f7f7f3" />
      <circle cx="48" cy="32" r="15" fill="none" stroke="#0a0a0a" strokeWidth="1.2" />
    </svg>
  );
}

function AudiLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 96 64" aria-hidden="true" {...props}>
      {[30, 42, 54, 66].map((cx) => (
        <circle key={cx} cx={cx} cy="32" r="11" fill="none" stroke="#e7e8e5" strokeWidth="2.6" />
      ))}
    </svg>
  );
}

function ToyotaLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 96 64" aria-hidden="true" {...props}>
      <ellipse cx="48" cy="32" rx="32" ry="20" fill="none" stroke="#e7e8e5" strokeWidth="2.6" />
      <ellipse cx="48" cy="32" rx="12" ry="20" fill="none" stroke="#e7e8e5" strokeWidth="2.2" />
      <ellipse cx="48" cy="28" rx="21" ry="8.5" fill="none" stroke="#e7e8e5" strokeWidth="2.2" />
    </svg>
  );
}

function NissanLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 96 64" aria-hidden="true" {...props}>
      <circle cx="48" cy="32" r="23" fill="none" stroke="#dcdcda" strokeWidth="2.2" />
      <rect x="20" y="27" width="56" height="11" fill="#0a0a0a" stroke="#e7e8e5" strokeWidth="1.2" />
      <text x="48" y="35.5" textAnchor="middle" fill="#f4f4f0" fontSize="8.5" fontWeight="700" letterSpacing="0.5">
        NISSAN
      </text>
    </svg>
  );
}

function FerrariLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 96 64" aria-hidden="true" {...props}>
      <path d="M34 8h28l5 8v34l-19 6-19-6V16Z" fill="none" stroke="#e7e8e5" strokeWidth="2" />
      <rect x="34" y="8" width="9" height="6" fill="#1a7a3a" />
      <rect x="53" y="8" width="9" height="6" fill="#c0182a" />
      <path
        d="M40 44c3-11 12-9 11-19 6 6 2 18-4 21M39 22h18"
        fill="none"
        stroke="#f0d000"
        strokeLinecap="round"
        strokeWidth="2.2"
      />
      <text x="48" y="51" textAnchor="middle" fill="#f0d000" fontSize="6" fontWeight="800" letterSpacing="1">
        SF
      </text>
    </svg>
  );
}

function LamborghiniLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 96 64" aria-hidden="true" {...props}>
      <path d="M48 8 68 15v18c0 13-8 21-20 25-12-4-20-12-20-25V15Z" fill="none" stroke="#d9be6a" strokeWidth="2" />
      <path
        d="M37 40c5-14 17-14 22 0M39 29c6 3 12 3 18 0M39 25l-6-4M57 25l6-4"
        fill="none"
        stroke="#d9be6a"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export const carLogos: LogoEntry[] = [
  { name: "Mercedes-Benz", id: 1, img: MercedesLogo },
  { name: "BMW", id: 2, img: BmwLogo },
  { name: "Audi", id: 3, img: AudiLogo },
  { name: "Porsche", id: 4, img: PorscheLogo },
  { name: "Range Rover", id: 5, img: RangeRoverLogo },
  { name: "Bentley", id: 6, img: BentleyLogo },
  { name: "Toyota", id: 7, img: ToyotaLogo },
  { name: "Nissan", id: 8, img: NissanLogo },
  { name: "Ferrari", id: 9, img: FerrariLogo },
  { name: "Lamborghini", id: 10, img: LamborghiniLogo },
];
