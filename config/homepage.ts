import {
  Banknote,
  BadgeCheck,
  Building2,
  Eye,
  LucideIcon,
  Wrench,
} from "lucide-react";

export type SellerAssurance = {
  title: string;
  body: string;
  icon: LucideIcon;
};

export type ScrapPoint = {
  title: string;
  body: string;
  icon: LucideIcon;
};

export const landingImages = {
  hero: "/images/hero-rolls-royce-v2.png",
  process: "/images/dubaii.png",
  contact: "/images/carvibe-real-nissan-patrol.jpeg",
  modal: "/images/carvibe-real-dubai-lamborghini.jpeg",
  scrap: "/images/scrapps.png",
};

export const sellerAssurances: SellerAssurance[] = [
  {
    title: "Fair, Market-Based Offers",
    body: "Every offer reflects real market demand, condition, and documentation - never a lowball guess.",
    icon: BadgeCheck,
  },
  {
    title: "Transparent From Day One",
    body: "No hidden fees or surprises. What we discussed and agreed upon is what you get.",
    icon: Eye,
  },
  {
    title: "Instant Cash",
    body: "Once we agree on a fair price, you get paid on the spot - quick and secure.",
    icon: Banknote,
  },
];

// "Scrap & Damaged Cars" section — we buy non-running / accident / old cars too.
export const scrapPoints: ScrapPoint[] = [
  {
    title: "Accident & Damaged",
    body: "Bumped, dented, or written off - we still make a fair cash offer based on parts and salvage value.",
    icon: Wrench,
  },
  {
    title: "Non-Running & Old",
    body: "Engine trouble, expired registration, or simply too old to drive? We take it off your hands.",
    icon: Building2,
  },
  {
    title: "Get Your Cash and Free Valuation",
    body: "Accept the cash and we take care of the paperworks for you.",
    icon: Banknote,
  },
];

export const sellingSteps = [
  {
    title: "Submit your car details",
    body: "Share contact information, car basics, mileage, condition, and inspection area.",
  },
  {
    title: "Receive a professional valuation",
    body: "The team reviews market demand and follows up directly through WhatsApp.",
  },
  {
    title: "Complete the sale securely",
    body: "Inspection, offer, documentation, payment, and handover stay coordinated.",
  },
];
