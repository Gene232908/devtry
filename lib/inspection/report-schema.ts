import { z } from "zod";

export const ARRIVAL_STATUSES = ["not_arrived", "arrived"] as const;
export type ArrivalStatus = (typeof ARRIVAL_STATUSES)[number];

export const RESULT_VALUES = ["pass", "fail"] as const;
export type InspectionResult = (typeof RESULT_VALUES)[number];

export const EXTERNAL_BODY_ITEMS = [
  "Front bumper", "Rear bumper", "Bonnet", "Roof", "Boot trunk",
  "Driver front door", "Driver front wing", "Driver rear door", "Driver rear quarter",
  "Passenger front door", "Passenger front wing", "Passenger rear door", "Passenger rear quarter",
  "Driver front rim", "Driver rear rim", "Passenger front rim", "Passenger rear rim",
  "Front glass", "Rear glass", "Left glass", "Right glass", "Sunroof glass",
] as const;

export const MECHANICAL_ITEMS = [
  "Engine oil leak free", "Engine compartment firewall", "Engine fan", "No abnormal engine odor",
  "Brake hoses", "Shock absorber", "Tie rods", "Steering", "Axels", "Transfer case", "Clutch",
  "Differential", "Exhaust system", "Under carriage", "Braking system", "Head lights", "Warning lights",
  "Air bag", "Air condition and heat", "Driving electronics", "Navigation system", "Windows and sun roof",
  "Central locking", "Horn and radio", "Battery and battery cables", "Belts and pulleys",
  "Transmission oil leak free", "Transmission system",
] as const;

export const PHOTO_ANGLES = [
  "Front of vehicle", "Front bumper", "Front left three-quarter", "Front right three-quarter", "Left side", "Right side",
  "Rear of vehicle", "Rear bumper", "Rear left three-quarter", "Rear right three-quarter", "Bonnet", "Roof",
  "Front windscreen", "Rear windscreen", "Driver dashboard and odometer", "Steering wheel", "Front seats",
  "Rear seats", "Boot trunk", "Engine bay", "Driver front wheel and tyre", "Driver rear wheel and tyre",
  "Passenger front wheel and tyre", "Passenger rear wheel and tyre",
] as const;

export type PhotoAngle = (typeof PHOTO_ANGLES)[number];

// The stored angle stays stable for the database/PDF. The UI wording is more
// direct so an inspector can understand the required photo without knowing
// photography terminology such as "three-quarter".
export const PHOTO_REQUIREMENTS: ReadonlyArray<{ angle: PhotoAngle; title: string; guide: string }> = [
  { angle: "Front of vehicle", title: "Front of car", guide: "Stand directly in front. Include the bumper, grille, headlights and number plate." },
  { angle: "Front bumper", title: "Front bumper close-up", guide: "Stand close to the front bumper and photograph it edge to edge so scratches, dents and sensors are clear." },
  { angle: "Front left three-quarter", title: "Front-left corner", guide: "Stand at the front-left corner so the front and left side are both visible." },
  { angle: "Front right three-quarter", title: "Front-right corner", guide: "Stand at the front-right corner so the front and right side are both visible." },
  { angle: "Left side", title: "Full left side", guide: "Step back far enough to show the whole left side from bumper to bumper." },
  { angle: "Right side", title: "Full right side", guide: "Step back far enough to show the whole right side from bumper to bumper." },
  { angle: "Rear of vehicle", title: "Rear of car", guide: "Stand directly behind. Include the boot, rear bumper, lights and number plate." },
  { angle: "Rear bumper", title: "Rear bumper close-up", guide: "Stand close to the rear bumper and photograph it edge to edge so scratches, dents and sensors are clear." },
  { angle: "Rear left three-quarter", title: "Rear-left corner", guide: "Stand at the rear-left corner so the rear and left side are both visible." },
  { angle: "Rear right three-quarter", title: "Rear-right corner", guide: "Stand at the rear-right corner so the rear and right side are both visible." },
  { angle: "Bonnet", title: "Bonnet", guide: "Photograph the closed bonnet from the front, showing its full surface." },
  { angle: "Roof", title: "Roof", guide: "Show the full roof surface. Include the sunroof if the car has one." },
  { angle: "Front windscreen", title: "Front windscreen", guide: "Photograph the full windscreen clearly so chips or cracks can be seen." },
  { angle: "Rear windscreen", title: "Rear windscreen", guide: "Photograph the full rear glass clearly so chips or cracks can be seen." },
  { angle: "Driver dashboard and odometer", title: "Dashboard and mileage", guide: "Turn on the display and make sure the odometer reading is readable." },
  { angle: "Steering wheel", title: "Steering wheel", guide: "Photograph the steering wheel straight on, including visible controls or wear." },
  { angle: "Front seats", title: "Front seats", guide: "Open a front door and show both front seats, upholstery and centre console." },
  { angle: "Rear seats", title: "Rear seats", guide: "Open a rear door and show the full rear seat area and upholstery." },
  { angle: "Boot trunk", title: "Boot / trunk", guide: "Open the boot and show the inside, floor and side panels." },
  { angle: "Engine bay", title: "Engine bay", guide: "Open the bonnet and show the full engine bay in good light." },
  { angle: "Driver front wheel and tyre", title: "Driver-side front wheel and tyre", guide: "Photograph the full wheel, rim and tyre tread from close range." },
  { angle: "Driver rear wheel and tyre", title: "Driver-side rear wheel and tyre", guide: "Photograph the full wheel, rim and tyre tread from close range." },
  { angle: "Passenger front wheel and tyre", title: "Passenger-side front wheel and tyre", guide: "Photograph the full wheel, rim and tyre tread from close range." },
  { angle: "Passenger rear wheel and tyre", title: "Passenger-side rear wheel and tyre", guide: "Photograph the full wheel, rim and tyre tread from close range." },
];

// Approved 10 inspection items specifically for Scrap Inquiry inspections in exact order:
// 1. Front of car
// 2. Full left side
// 3. Full right side
// 4. Rear of car
// 5. Bonnet
// 6. Roof
// 7. Dashboard and mileage
// 8. Front seats
// 9. Rear seats
// 10. Engine bay
export const SCRAP_PHOTO_REQUIREMENTS: ReadonlyArray<{ angle: PhotoAngle; title: string; guide: string }> = [
  { angle: "Front of vehicle", title: "Front of car", guide: "Stand directly in front. Include the bumper, grille, headlights and number plate." },
  { angle: "Left side", title: "Full left side", guide: "Step back far enough to show the whole left side from bumper to bumper." },
  { angle: "Right side", title: "Full right side", guide: "Step back far enough to show the whole right side from bumper to bumper." },
  { angle: "Rear of vehicle", title: "Rear of car", guide: "Stand directly behind. Include the boot, rear bumper, lights and number plate." },
  { angle: "Bonnet", title: "Bonnet", guide: "Photograph the closed bonnet from the front, showing its full surface." },
  { angle: "Roof", title: "Roof", guide: "Show the full roof surface. Include the sunroof if the car has one." },
  { angle: "Driver dashboard and odometer", title: "Dashboard and mileage", guide: "Turn on the display and make sure the odometer reading is readable." },
  { angle: "Front seats", title: "Front seats", guide: "Open a front door and show both front seats, upholstery and centre console." },
  { angle: "Rear seats", title: "Rear seats", guide: "Open a rear door and show the full rear seat area and upholstery." },
  { angle: "Engine bay", title: "Engine bay", guide: "Open the bonnet and show the full engine bay in good light." },
];

export const SCRAP_PHOTO_ANGLES: ReadonlyArray<PhotoAngle> = SCRAP_PHOTO_REQUIREMENTS.map((r) => r.angle);

const optionalText = z.string().trim().max(300).optional().default("");
const optionalDate = z.string().trim().max(30).optional().default("");
const checkMap = () => z.record(z.string(), z.enum(RESULT_VALUES).optional());

const tyreSchema = z.object({
  result: z.enum(RESULT_VALUES).optional(),
  year: z.string().trim().regex(/^$|^\d{4}$/, "Use a four-digit tyre year").default(""),
  note: optionalText,
});

// Drafts may contain an in-progress value while the inspector is typing it
// (for example, "20" before completing "2025"). Final-format validation stays
// in inspectionReportSchema and is applied when the report is completed.
const draftTyreSchema = z.object({
  result: z.enum(RESULT_VALUES).optional(),
  year: z.string().trim().max(10).default(""),
  note: optionalText,
});

export const inspectionReportSchema = z.object({
  carMake: optionalText,
  carModel: optionalText,
  carTrim: optionalText,
  modelYear: z.string().trim().regex(/^$|^\d{4}$/, "Use a four-digit model year").default(""),
  carSpecification: optionalText,
  chassisNumber: optionalText,
  exteriorColor: optionalText,
  bodyType: optionalText,
  transmission: optionalText,
  drive: optionalText,
  productionYear: z.string().trim().regex(/^$|^\d{4}$/, "Use a four-digit production year").default(""),
  mileageKm: z.string().trim().regex(/^$|^\d{1,7}$/, "Enter a valid mileage").default(""),
  numberOfKeys: z.string().trim().regex(/^$|^\d{1,2}$/, "Enter the number of keys").default(""),
  numberOfSeats: z.string().trim().regex(/^$|^\d{1,2}$/, "Enter the number of seats").default(""),
  cylinders: optionalText,
  engineSize: optionalText,
  engineNumber: optionalText,
  fuel: optionalText,
  rimSize: optionalText,
  basicNotes: optionalText,
  firstOwner: z.enum(["yes", "no", "unknown"]).default("unknown"),
  mortgaged: z.enum(["yes", "no", "unknown"]).default("unknown"),
  vehicleCategory: optionalText,
  insuranceType: optionalText,
  registrationExpiryDate: optionalDate,
  registeredCityPlate: optionalText,
  plateNumber: optionalText,
  tcn: optionalText,
  servicePack: z.enum(["yes", "no", "unknown"]).default("unknown"),
  serviceHistory: z.enum(["yes", "no", "unknown"]).default("unknown"),
  lastServiced: optionalDate,
  warranty: z.enum(["yes", "no", "unknown"]).default("unknown"),
  externalBody: checkMap(),
  mechanical: checkMap(),
  failureNotes: z.record(z.string(), optionalText).default({}),
  tyres: z.object({
    driverFront: tyreSchema,
    driverRear: tyreSchema,
    passengerFront: tyreSchema,
    passengerRear: tyreSchema,
    spareTyre: z.enum(["yes", "no", "unknown"]).default("unknown"),
    truckToolsAvailable: z.enum(["yes", "no", "unknown"]).default("unknown"),
    serviceBook: z.enum(["yes", "no", "unknown"]).default("unknown"),
  }),
  interiorSeatType: z.enum(["leather", "fabric", "other", "unknown"]).default("unknown"),
  interiorNotes: optionalText,
});

export const inspectionDraftSchema = inspectionReportSchema.extend({
  modelYear: z.string().trim().max(30).default(""),
  productionYear: z.string().trim().max(30).default(""),
  mileageKm: z.string().trim().max(30).default(""),
  numberOfKeys: z.string().trim().max(30).default(""),
  numberOfSeats: z.string().trim().max(30).default(""),
  tyres: z.object({
    driverFront: draftTyreSchema,
    driverRear: draftTyreSchema,
    passengerFront: draftTyreSchema,
    passengerRear: draftTyreSchema,
    spareTyre: z.enum(["yes", "no", "unknown"]).default("unknown"),
    truckToolsAvailable: z.enum(["yes", "no", "unknown"]).default("unknown"),
    serviceBook: z.enum(["yes", "no", "unknown"]).default("unknown"),
  }),
});

export type InspectionReportData = z.infer<typeof inspectionReportSchema>;

export const EMPTY_INSPECTION_REPORT: InspectionReportData = inspectionReportSchema.parse({
  externalBody: {},
  mechanical: {},
  tyres: { driverFront: {}, driverRear: {}, passengerFront: {}, passengerRear: {} },
});

/** Keeps reports created before newer inspection sections were introduced readable. */
export function normalizeInspectionDraft(value: unknown) {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const rawTyres = raw.tyres && typeof raw.tyres === "object" ? raw.tyres as Record<string, unknown> : {};
  const mergeRecord = (key: string) => ({
    ...((EMPTY_INSPECTION_REPORT[key as keyof InspectionReportData] ?? {}) as Record<string, unknown>),
    ...(raw[key] && typeof raw[key] === "object" ? raw[key] as Record<string, unknown> : {}),
  });
  const mergeTyre = (key: "driverFront" | "driverRear" | "passengerFront" | "passengerRear") => ({
    ...EMPTY_INSPECTION_REPORT.tyres[key],
    ...(rawTyres[key] && typeof rawTyres[key] === "object" ? rawTyres[key] as Record<string, unknown> : {}),
  });
  return {
    ...EMPTY_INSPECTION_REPORT,
    ...raw,
    externalBody: mergeRecord("externalBody"),
    mechanical: mergeRecord("mechanical"),
    failureNotes: mergeRecord("failureNotes"),
    tyres: {
      ...EMPTY_INSPECTION_REPORT.tyres,
      ...rawTyres,
      driverFront: mergeTyre("driverFront"),
      driverRear: mergeTyre("driverRear"),
      passengerFront: mergeTyre("passengerFront"),
      passengerRear: mergeTyre("passengerRear"),
    },
  };
}

export function isCompleteInspectionReport(
  data: InspectionReportData,
  uploadedAngles: Iterable<string>,
  inquiryType: "valuation" | "scrap" = "valuation",
) {
  const photos = new Set(uploadedAngles);
  const requiredAngles = inquiryType === "scrap" ? SCRAP_PHOTO_ANGLES : PHOTO_ANGLES;
  const allChecksAnswered = [...EXTERNAL_BODY_ITEMS, ...MECHANICAL_ITEMS].every(
    (item) => data.externalBody[item] || data.mechanical[item],
  );
  const failuresExplained = [...EXTERNAL_BODY_ITEMS, ...MECHANICAL_ITEMS].every((item) => {
    const result = data.externalBody[item] ?? data.mechanical[item];
    return result !== "fail" || Boolean(data.failureNotes[item]?.trim());
  });
  const requiredTyres = [data.tyres.driverFront, data.tyres.driverRear, data.tyres.passengerFront, data.tyres.passengerRear];
  const tyresComplete = requiredTyres.every(
    (tyre) => Boolean(tyre.result && /^\d{4}$/.test(tyre.year) && (tyre.result !== "fail" || tyre.note.trim())),
  );
  const vehicleIdentified = Boolean(
    data.carMake && data.carModel && /^\d{4}$/.test(data.modelYear) && data.carSpecification && data.mileageKm,
  );
  return vehicleIdentified && allChecksAnswered && failuresExplained && tyresComplete && requiredAngles.every((angle) => photos.has(angle));
}
