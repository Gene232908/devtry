import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export type PartialDealState = {
  purchasePrice: string;
  purchasedAt: string;
  fullName: string;
  make: string;
  model: string;
  year: string;
  trim: string;
  mileageKm: string;
  emirate: string;
  inspectionScheduledAt: string;
  markVerified: boolean;
};

export type PartialDealErrors = {
  notes?: string;
  purchasePrice?: string;
  fullName?: string;
  make?: string;
  model?: string;
  trim?: string;
  year?: string;
  emirate?: string;
  inspectionScheduledAt?: string;
};

type Props = {
  deal: PartialDealState;
  errors: PartialDealErrors;
  isInspectionScheduled: boolean;
  isDeal: boolean;
  makeOptions: { label: string; value: string }[];
  modelOptions: { label: string; value: string }[];
  trimOptions: { label: string; value: string }[];
  emirateOptions: { label: string; value: string }[];
  setDeal: React.Dispatch<React.SetStateAction<PartialDealState>>;
};

export function PartialLeadConversionFields({
  deal,
  errors,
  isInspectionScheduled,
  isDeal,
  makeOptions,
  modelOptions,
  trimOptions,
  emirateOptions,
  setDeal,
}: Props) {
  return (
    <div className="flex flex-col gap-4 rounded-card border border-gold/40 bg-gold/5 p-4">
      <div>
        <p className="text-sm font-semibold text-gold">
          {isInspectionScheduled ? "Confirm details before scheduling" : "Confirm details before recording the purchase"}
        </p>
        <p className="mt-1 text-xs text-text-muted leading-relaxed">
          {isInspectionScheduled
            ? "Saving creates a real lead, records the inspection, and automatically assigns a Purchaser."
            : "Saving creates a real lead and adds the car to Inventory."}{" "}
          The form values are only a prefill — complete or correct them from the call first.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {isDeal ? (
          <>
            <Input
              label="Purchase price (AED) *"
              inputMode="numeric"
              value={deal.purchasePrice}
              error={errors.purchasePrice}
              onChange={(e) => setDeal((d) => ({ ...d, purchasePrice: e.target.value }))}
            />
            <Input
              label="Purchase date"
              type="date"
              value={deal.purchasedAt}
              onChange={(e) => setDeal((d) => ({ ...d, purchasedAt: e.target.value }))}
            />
          </>
        ) : (
          <Input
            label="Inspection date and time *"
            type="datetime-local"
            value={deal.inspectionScheduledAt}
            error={errors.inspectionScheduledAt}
            onChange={(e) => setDeal((d) => ({ ...d, inspectionScheduledAt: e.target.value }))}
          />
        )}
        <Input
          label="Customer name *"
          value={deal.fullName}
          error={errors.fullName}
          onChange={(e) => setDeal((d) => ({ ...d, fullName: e.target.value }))}
        />
        <Select
          label="Inspection emirate *"
          placeholder="Select emirate"
          options={emirateOptions}
          value={deal.emirate}
          error={errors.emirate}
          onChange={(emirate) => setDeal((d) => ({ ...d, emirate }))}
        />
        <Select
          label="Make *"
          placeholder="Select make"
          options={makeOptions}
          value={deal.make}
          error={errors.make}
          onChange={(make) => setDeal((d) => ({ ...d, make, model: "", trim: "" }))}
        />
        <Select
          label="Model *"
          placeholder={deal.make ? "Select model" : "Choose make first"}
          options={modelOptions}
          value={deal.model}
          error={errors.model}
          disabled={!deal.make}
          onChange={(model) => setDeal((d) => ({ ...d, model, trim: "" }))}
        />
        <Input
          label="Year *"
          inputMode="numeric"
          value={deal.year}
          error={errors.year}
          onChange={(e) => setDeal((d) => ({ ...d, year: e.target.value }))}
        />
        <Select
          label="Trim (optional)"
          placeholder={deal.model ? "Select trim" : "Choose model first"}
          options={trimOptions}
          value={deal.trim}
          error={errors.trim}
          disabled={!deal.model}
          onChange={(trim) => setDeal((d) => ({ ...d, trim }))}
        />
        <Input
          label="Mileage (km)"
          inputMode="numeric"
          value={deal.mileageKm}
          onChange={(e) => setDeal((d) => ({ ...d, mileageKm: e.target.value }))}
        />
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 text-xs text-text-muted mt-1">
        <input
          type="checkbox"
          checked={deal.markVerified}
          onChange={(e) => setDeal((d) => ({ ...d, markVerified: e.target.checked }))}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-border-gold bg-surface-2 accent-[--gold]"
        />
        <span>
          I have spoken to this customer on this number — mark it as verified.
          <span className="block text-text-faint mt-0.5">
            Leave unticked if the purchase was arranged some other way.
          </span>
        </span>
      </label>
    </div>
  );
}
