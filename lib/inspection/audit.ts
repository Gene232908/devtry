import type { InspectionReportData } from "@/lib/inspection/report-schema";

const CARD_FIELDS: Record<string, Array<keyof InspectionReportData>> = {
  "Vehicle and registration": [
    "carMake", "carModel", "carTrim", "modelYear", "carSpecification", "chassisNumber",
    "exteriorColor", "bodyType", "transmission", "drive", "productionYear", "mileageKm",
    "numberOfKeys", "numberOfSeats", "cylinders", "engineSize", "engineNumber", "fuel",
    "rimSize", "basicNotes", "firstOwner", "mortgaged", "vehicleCategory", "insuranceType",
    "registrationExpiryDate", "registeredCityPlate", "plateNumber", "tcn", "servicePack",
    "serviceHistory", "lastServiced", "warranty",
  ],
  "External Body Condition": ["externalBody"],
  "Mechanical Components": ["mechanical"],
  "Tyres, accessories and interior": ["tyres", "interiorSeatType", "interiorNotes"],
};

export function inspectionChangedCards(before: Partial<InspectionReportData>, after: InspectionReportData) {
  return Object.entries(CARD_FIELDS).flatMap(([card, fields]) => {
    const changed = fields.filter((field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]));
    return changed.length ? [card] : [];
  });
}
