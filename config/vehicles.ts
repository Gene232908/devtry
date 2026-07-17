export const MAKES: { name: string; models: string[] }[] = [
  { name: "Rolls-Royce", models: ["Phantom", "Ghost", "Cullinan", "Wraith"] },
  { name: "Bentley", models: ["Bentayga", "Continental GT", "Flying Spur"] },
  { name: "Range Rover", models: ["Sport SVR", "Sport", "Velar", "Evoque"] },
  { name: "Mercedes-Benz", models: ["S-Class", "G-Class G63", "E-Class", "GLE"] },
  { name: "BMW", models: ["5 Series", "X5", "3 Series"] },
  { name: "Lamborghini", models: ["Urus", "Huracán", "Aventador"] },
  { name: "Ferrari", models: ["488", "Roma", "Portofino", "F8"] },
  { name: "Porsche", models: ["Cayenne", "Panamera", "911"] },
  { name: "Toyota", models: ["Land Cruiser", "Camry", "Fortuner"] },
  { name: "Nissan", models: ["Patrol", "Altima", "X-Trail"] },
];

const currentYear = new Date().getFullYear();
export const YEARS: number[] = Array.from({ length: currentYear + 1 - 1990 + 1 }, (_, i) => currentYear + 1 - i);

export const MILEAGE_BRACKETS = [
  { label: "0 – 20,000 km", value: 10000 },
  { label: "20,000 – 50,000 km", value: 35000 },
  { label: "50,000 – 100,000 km", value: 75000 },
  { label: "100,000 – 150,000 km", value: 125000 },
  { label: "150,000+ km", value: 175000 },
];

// UAE-market option level, shown as a Basic Mode / Mid Mode / Full Option
// picker — same idea as the old Excellent/Good/Fair condition step.
export const OPTION_LEVELS = ["Basic Mode", "Mid Mode", "Full Option"] as const;

// Trim is a separate dropdown connected to the selected Make -> Model (demo
// catalog); falls back to a generic list when a model has no specific trims.
export const TRIM_FALLBACK = ["Standard", "Mid", "Top of the Range"];

export const TRIMS_BY_MODEL: Record<string, string[]> = {
  // Rolls-Royce
  Phantom: ["Standard Wheelbase", "Extended Wheelbase"],
  Ghost: ["Standard", "Extended", "Black Badge"],
  Cullinan: ["Standard", "Black Badge"],
  Wraith: ["Standard", "Black Badge"],
  // Bentley
  Bentayga: ["V8", "S", "Speed"],
  "Continental GT": ["V8", "S", "Speed"],
  "Flying Spur": ["V8", "S", "Speed"],
  // Range Rover
  "Sport SVR": ["Standard", "Carbon Edition"],
  Sport: ["SE", "HSE", "Autobiography"],
  Velar: ["S", "R-Dynamic SE", "R-Dynamic HSE"],
  Evoque: ["S", "R-Dynamic S", "R-Dynamic HSE"],
  // Mercedes-Benz
  "S-Class": ["S 450", "S 500", "S 580"],
  "G-Class G63": ["Standard", "AMG", "AMG Edition"],
  "E-Class": ["E 200", "E 300", "E 450"],
  GLE: ["GLE 350", "GLE 450", "GLE 63 AMG"],
  // BMW
  "5 Series": ["520i", "530i", "540i"],
  X5: ["xDrive40i", "M60i"],
  "3 Series": ["320i", "330i", "M340i"],
  // Lamborghini
  Urus: ["Base", "Performante"],
  "Huracán": ["EVO", "Tecnica", "STO"],
  Aventador: ["S", "SVJ", "Ultimae"],
  // Ferrari
  "488": ["GTB", "Spider", "Pista"],
  Roma: ["Standard", "Spider"],
  Portofino: ["Standard", "M"],
  F8: ["Tributo", "Spider"],
  // Porsche
  Cayenne: ["Base", "S", "Turbo GT"],
  Panamera: ["Base", "4S", "Turbo"],
  "911": ["Carrera", "Carrera S", "Turbo S"],
  // Toyota
  "Land Cruiser": ["GXR", "VXR", "GR Sport"],
  Camry: ["LE", "SE", "Grande"],
  Fortuner: ["EX", "VX", "Legender"],
  // Nissan
  Patrol: ["XE", "SE", "LE Platinum"],
  Altima: ["S", "SV", "SL"],
  "X-Trail": ["S", "SV", "SL"],
};

/** Demo trims for the selected model — falls back to a generic Standard/Mid/Top list. */
export function getTrims(model: string): string[] {
  if (!model) return [];
  return TRIMS_BY_MODEL[model] ?? TRIM_FALLBACK;
}

export const EMIRATES = [
  "Abu Dhabi",
  "Dubai",
  "Sharjah",
  "Ajman",
  "Fujairah",
  "Ras Al Khaimah",
  "Umm Al Quwain",
] as const;
