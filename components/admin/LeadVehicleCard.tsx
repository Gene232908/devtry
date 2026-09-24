import { Card } from "@/components/ui/Card";
import { Lead } from "@/config/mock-data";

type Props = {
  lead: Lead;
};

export function LeadVehicleCard({ lead }: Props) {
  const carTitle = `${lead.year} ${lead.make} ${lead.model} ${lead.trim || ""}`.trim();
  const optionDisplay =
    lead.optionLevel ?? (lead.condition ? lead.condition.charAt(0).toUpperCase() + lead.condition.slice(1) : "—");

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h3 className="text-base font-semibold text-text">Vehicle Details</h3>
          <p className="text-sm font-medium text-gold mt-0.5">{carTitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm sm:grid-cols-4">
        <Detail label="Make" value={lead.make} />
        <Detail label="Model" value={lead.model} />
        <Detail label="Trim" value={lead.trim || "—"} />
        <Detail label="Year" value={String(lead.year)} />
        <Detail label="Mileage" value={`${lead.mileageKm.toLocaleString()} km`} />
        <Detail label="Specification" value={lead.specification || "—"} />
        <Detail label="Option Level" value={optionDisplay} />
        <Detail label="Location" value={lead.location || "—"} />
        <Detail label="Source" value={lead.inquiryType === "scrap" ? "Scrap Inquiry" : "Website Valuation"} />
      </div>

      {lead.inquiryType === "scrap" && (
        <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2">
          <Detail label="Scrap condition" value={lead.scrapCondition || "â€”"} />
          <Detail label="Scrap asking price" value={lead.scrapAskingPriceAed == null ? "â€”" : `AED ${lead.scrapAskingPriceAed.toLocaleString("en-US")}`} />
        </div>
      )}

      {lead.description ? (
        <div className="border-t border-border pt-4 min-w-0 max-w-full overflow-hidden">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Customer&apos;s Description</p>
          <p className="mt-1.5 text-sm leading-relaxed text-text font-normal whitespace-pre-wrap break-words break-all [overflow-wrap:anywhere]">{lead.description}</p>
        </div>
      ) : null}
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wider text-text-muted">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-text">{value}</p>
    </div>
  );
}
