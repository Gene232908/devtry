import {
  BadgeCheck,
  Banknote,
  BatteryCharging,
  Car,
  Crown,
  Gauge,
  Handshake,
  Landmark,
  LucideIcon,
  Route,
  ShieldCheck,
  Sparkles,
  Timer,
  Truck,
} from "lucide-react";

export type EvaluationProfile = {
  label: string;
  body: string;
  metric: string;
  icon: LucideIcon;
};

export type BrandMark =
  | "mercedes"
  | "range-rover"
  | "porsche"
  | "bentley"
  | "bmw"
  | "audi"
  | "toyota"
  | "nissan"
  | "ferrari"
  | "lamborghini";

export type PopularBrand = {
  name: string;
  mark: BrandMark;
  segment: string;
  note: string;
};

export type FeaturedVehicle = {
  badge: string;
  name: string;
  meta: string[];
  image: string;
  imagePosition: string;
  demand: string;
  reviewFocus: string;
};

export type BodyType = {
  label: string;
  count: string;
  icon: LucideIcon;
};

export type TrustPoint = {
  title: string;
  body: string;
  icon: LucideIcon;
};

export const evaluationProfiles: EvaluationProfile[] = [
  {
    label: "Luxury SUVs",
    body: "High-demand family and executive SUVs with clean condition, service context, and UAE-ready documents.",
    metric: "GCC and import-ready review",
    icon: Truck,
  },
  {
    label: "Executive sedans",
    body: "Premium daily cars and flagship sedans reviewed by year, mileage, trim, and market demand.",
    metric: "Condition-led valuation",
    icon: Crown,
  },
  {
    label: "Sports and coupes",
    body: "Performance cars need careful mileage, accident, modification, and ownership-history checks before offer discussion.",
    metric: "Specialist follow-up",
    icon: Gauge,
  },
  {
    label: "Clean daily cars",
    body: "Reliable sedans, hatchbacks, and family vehicles can still fit the buying criteria when the details are complete.",
    metric: "Fast first screening",
    icon: Car,
  },
];

export const popularBrands: PopularBrand[] = [
  { name: "Mercedes-Benz", mark: "mercedes", segment: "Luxury sedans and SUVs", note: "C-Class to G-Class" },
  { name: "Range Rover", mark: "range-rover", segment: "Premium SUVs", note: "Vogue, Sport, Velar" },
  { name: "Porsche", mark: "porsche", segment: "Performance and SUVs", note: "Cayenne, Macan, 911" },
  { name: "Bentley", mark: "bentley", segment: "Ultra-luxury", note: "GT, Flying Spur, Bentayga" },
  { name: "BMW", mark: "bmw", segment: "Executive and M models", note: "3, 5, 7, X series" },
  { name: "Audi", mark: "audi", segment: "Quattro and S-line", note: "A, Q, S, RS models" },
  { name: "Toyota", mark: "toyota", segment: "Reliable daily cars", note: "Land Cruiser, Prado, Camry" },
  { name: "Nissan", mark: "nissan", segment: "SUVs and sedans", note: "Patrol, Altima, X-Trail" },
  { name: "Ferrari", mark: "ferrari", segment: "Supercar interest", note: "Low-mileage examples" },
  { name: "Lamborghini", mark: "lamborghini", segment: "Exotic vehicles", note: "Urus and supercars" },
];

export const featuredVehicles: FeaturedVehicle[] = [
  {
    badge: "High-demand profile",
    name: "Luxury SUVs",
    meta: ["GCC or import", "Service history", "Family demand", "Premium trims"],
    image: "/images/carvibe-luxury-suv-preview.jpg",
    imagePosition: "56% center",
    demand: "Strong UAE resale interest",
    reviewFocus: "Mileage, trim, accident history, documents, and inspection area.",
  },
  {
    badge: "Specialist review",
    name: "Sports Coupes",
    meta: ["Low mileage", "Clean ownership", "Performance spec", "Original condition"],
    image: "/images/carvibe-sports-coupe-preview.jpg",
    imagePosition: "50% center",
    demand: "Offer depends on exact spec",
    reviewFocus: "Modifications, service records, accident checks, and market rarity.",
  },
  {
    badge: "Premium intake",
    name: "Executive Sedans",
    meta: ["Luxury cabin", "Clean mileage", "Clear documents", "Dubai-ready"],
    image: "/images/carvibe-premium-evaluation-showcase.jpg",
    imagePosition: "68% center",
    demand: "Reviewed for buyer confidence",
    reviewFocus: "Year, model, condition, option package, and ownership details.",
  },
];

export const bodyTypes: BodyType[] = [
  { label: "SUV", count: "Strong family demand", icon: Truck },
  { label: "Sedan", count: "Executive resale", icon: Car },
  { label: "Coupe", count: "Performance review", icon: Route },
  { label: "Convertible", count: "Lifestyle models", icon: Sparkles },
  { label: "Pickup", count: "Utility and fleet value", icon: Gauge },
  { label: "Electric", count: "EV and hybrid interest", icon: BatteryCharging },
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

export const trustPoints: TrustPoint[] = [
  {
    title: "Quality-first vehicle handling",
    body: "Each vehicle request is reviewed around condition, mileage, service context, and buyer confidence.",
    icon: BadgeCheck,
  },
  {
    title: "Transparent pricing support",
    body: "Customers get a clear follow-up path instead of vague instant numbers or rushed offers.",
    icon: ShieldCheck,
  },
  {
    title: "Professional automotive assistance",
    body: "WhatsApp coordination keeps selling, inspection, and next steps easy to understand.",
    icon: Handshake,
  },
];

export const businessStats = [
  { value: "15 min", label: "initial response target" },
  { value: "7", label: "UAE emirates supported" },
  { value: "3", label: "simple sale steps" },
  { value: "24/7", label: "online request access" },
];

export const financingHighlights = [
  { label: "Eligibility guidance", icon: Landmark },
  { label: "Monthly payment estimate", icon: Banknote },
  { label: "Clear advisor follow-up", icon: Timer },
];

export const customerReviews = [
  {
    name: "Dubai seller",
    vehicle: "Luxury SUV valuation",
    quote: "The process felt private, clear, and fast. I knew exactly what would happen next.",
    rating: "5.0",
  },
  {
    name: "Premium car owner",
    vehicle: "Sports car inspection",
    quote: "The WhatsApp follow-up made it easier than calling around different dealers.",
    rating: "5.0",
  },
  {
    name: "Family vehicle client",
    vehicle: "SUV sale request",
    quote: "The team understood the car details before asking for the inspection schedule.",
    rating: "5.0",
  },
];
