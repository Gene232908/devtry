// Make/model options moved to a database-backed catalog (car_makes/car_models
// tables) so admins can add/remove brands and models from /admin/catalog.
// See app/api/vehicles/route.ts for the public read endpoint.

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
