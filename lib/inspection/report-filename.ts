type VehicleReportIdentity = {
  carMake?: string | null;
  carModel?: string | null;
  modelYear?: string | number | null;
};

function cleanPart(value: string | number | null | undefined) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function inspectionReportTitle(vehicle: VehicleReportIdentity) {
  const identity = [vehicle.carMake, vehicle.carModel, vehicle.modelYear]
    .map(cleanPart)
    .filter(Boolean)
    .join(" ");
  return `Inspection Report For - ${identity || "Vehicle"}`;
}

export function inspectionReportFilename(vehicle: VehicleReportIdentity) {
  const safeTitle = inspectionReportTitle(vehicle)
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return `${safeTitle || "Inspection Report For - Vehicle"}.pdf`;
}
