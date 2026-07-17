// Curated areas per emirate for the inspection-area cascading select.
// Not database-backed (unlike the vehicle catalog) — this is a small, stable
// geographic list rather than admin-managed content.
export const AREAS_BY_EMIRATE: Record<string, string[]> = {
  Dubai: [
    "Deira",
    "Bur Dubai",
    "Downtown Dubai",
    "Dubai Marina",
    "Jumeirah",
    "Business Bay",
    "Al Barsha",
    "Al Quoz",
    "Mirdif",
    "International City",
  ],
  "Abu Dhabi": [
    "Abu Dhabi City",
    "Al Reem Island",
    "Khalifa City",
    "Yas Island",
    "Saadiyat Island",
    "Al Ain",
    "Mussafah",
  ],
  Sharjah: ["Sharjah City", "Al Nahda", "Al Majaz", "Muwaileh", "Al Qasimia"],
  Ajman: ["Ajman City", "Al Nuaimiya", "Al Rashidiya"],
  "Ras Al Khaimah": ["RAK City", "Al Hamra", "Al Nakheel"],
  Fujairah: ["Fujairah City", "Dibba"],
  "Umm Al Quwain": ["UAQ City"],
};
