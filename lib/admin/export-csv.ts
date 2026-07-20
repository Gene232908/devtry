import { Lead } from "@/config/mock-data";

export function exportLeadsCsv(leads: Lead[], filename = "carvibedubai-leads.csv") {
  const headers = ["Lead ID", "Name", "Mobile", "Email", "Make", "Model", "Trim", "Year", "Mileage (km)", "Option Level", "Description", "Status", "Estimated Value (AED)", "Date"];
  const rows = leads.map((l) => [
    l.id,
    l.fullName,
    l.phoneE164,
    l.email ?? "",
    l.make,
    l.model,
    l.trim,
    String(l.year),
    String(l.mileageKm),
    l.optionLevel ?? "",
    l.description,
    l.status,
    l.estimatedValueAed != null ? String(l.estimatedValueAed) : "",
    l.createdAt,
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
