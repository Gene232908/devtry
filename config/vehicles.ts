export const MAKES: { name: string; models: string[] }[] = [
  { name: "Rolls-Royce", models: ["Phantom", "Ghost", "Cullinan", "Wraith"] },
  { name: "Bentley", models: ["Bentayga", "Continental GT", "Flying Spur"] },
  { name: "Range Rover", models: ["Sport SVR", "Sport", "Velar", "Evoque"] },
  { name: "Mercedes-Benz", models: ["S-Class", "G-Class G63", "E-Class", "GLE"] },
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

export const EMIRATES = [
  "Abu Dhabi",
  "Dubai",
  "Sharjah",
  "Ajman",
  "Fujairah",
  "Ras Al Khaimah",
  "Umm Al Quwain",
] as const;
