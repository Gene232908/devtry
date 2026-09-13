"use client";

import { Input } from "@/components/ui/Input";

type Props = {
  purchasePrice: string;
  purchasedAt: string;
  error?: string;
  disabled?: boolean;
  onPriceChange: (val: string) => void;
  onDateChange: (val: string) => void;
};

export function LeadPurchaseFields({
  purchasePrice,
  purchasedAt,
  error,
  disabled,
  onPriceChange,
  onDateChange,
}: Props) {
  return (
    <>
      <Input
        label="Purchase Price (AED) *"
        inputMode="numeric"
        value={purchasePrice}
        error={error}
        disabled={disabled}
        onChange={(e) => onPriceChange(e.target.value)}
        placeholder="e.g. 185000"
      />
      <Input
        label="Purchase date"
        type="date"
        value={purchasedAt}
        disabled={disabled}
        onChange={(e) => onDateChange(e.target.value)}
      />
      <p className="-mt-1 text-xs text-text-faint">
        {disabled
          ? "This car has been sold, so the price it was bought for can no longer be changed."
          : "Exactly what you paid the customer. Saving adds this car to your Inventory."}
      </p>
    </>
  );
}
