export const MAKES = [
  "Rolls-Royce",
  "Bentley",
  "Range Rover",
  "Mercedes-Benz",
  "Lamborghini",
  "Ferrari",
  "Porsche",
  "Toyota",
  "Nissan",
] as const;

export const MODELS: Record<string, string[]> = {
  "Rolls-Royce": ["Phantom", "Ghost", "Cullinan", "Wraith"],
  Bentley: ["Bentayga", "Continental GT", "Flying Spur"],
  "Range Rover": ["Sport SVR", "Sport", "Velar", "Evoque"],
  "Mercedes-Benz": ["S-Class", "G-Class G63", "E-Class", "GLE"],
  Lamborghini: ["Urus", "Huracán", "Aventador"],
  Ferrari: ["488", "Roma", "Portofino", "F8"],
  Porsche: ["Cayenne", "Panamera", "911"],
  Toyota: ["Land Cruiser", "Camry", "Fortuner"],
  Nissan: ["Patrol", "Altima", "X-Trail"],
};

const currentYear = new Date().getFullYear();
export const YEARS: number[] = Array.from({ length: currentYear + 1 - 1990 + 1 }, (_, i) => currentYear + 1 - i);

export const MILEAGE_BRACKETS = [
  { label: "0 – 20,000 km", value: 10000 },
  { label: "20,000 – 50,000 km", value: 35000 },
  { label: "50,000 – 100,000 km", value: 75000 },
  { label: "100,000 – 150,000 km", value: 125000 },
  { label: "150,000+ km", value: 175000 },
];

export const EMIRATES = [
  "Abu Dhabi",
  "Dubai",
  "Sharjah",
  "Ajman",
  "Fujairah",
  "Ras Al Khaimah",
  "Umm Al Quwain",
] as const;
