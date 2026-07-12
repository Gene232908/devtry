import { BadgeCheck, Eye, Handshake, LucideIcon, MapPin, Scale } from "lucide-react";

export type SellerAssurance = {
  title: string;
  body: string;
  icon: LucideIcon;
};

export type InspectionOption = {
  title: string;
  body: string;
  icon: LucideIcon;
};

export const landingImages = {
  hero: "/images/hero-rolls-royce-v2.png",
  process: "/images/dubaii.jpeg",
  contact: "/images/carvibe-real-nissan-patrol.jpeg",
  modal: "/images/carvibe-real-dubai-lamborghini.jpeg",
};

export const sellerAssurances: SellerAssurance[] = [
  {
    title: "Fair, Market-Based Offers",
    body: "Every offer reflects real market demand, condition, and documentation - never a lowball guess.",
    icon: BadgeCheck,
  },
  {
    title: "Transparent From Day One",
    body: "No hidden fees or surprise deductions. What we discuss on WhatsApp is what we honor at handover.",
    icon: Eye,
  },
  {
    title: "A Deal We Both Agree On",
    body: "Nothing is final until both sides are comfortable. Negotiation stays open, honest, and pressure-free.",
    icon: Scale,
  },
];

export const inspectionOptions: InspectionOption[] = [
  {
    title: "Your Location",
    body: "We can come to your home, office, or preferred spot anywhere across the UAE for the inspection.",
    icon: MapPin,
  },
  {
    title: "Meet Halfway",
    body: "Prefer a public meeting point instead? We agree on a convenient spot together before confirming.",
    icon: Handshake,
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

