export type Condition = "excellent" | "good" | "fair";

export type ValuationFormValues = {
  make: string;
  model: string;
  year: string;
  mileageKm: string;
  condition: Condition | "";
  emirate: string;
  fullName: string;
  whatsapp: string;
  email: string;
  consent: boolean;
  honeypot: string;
};

export type FormErrors = Partial<Record<keyof ValuationFormValues, string>>;

export type FormState =
  | "filling"
  | "validating"
  | "sending_otp"
  | "otp_entry"
  | "verifying_otp"
  | "submitting"
  | "success";

export const emptyValues: ValuationFormValues = {
  make: "",
  model: "",
  year: "",
  mileageKm: "",
  condition: "",
  emirate: "",
  fullName: "",
  whatsapp: "",
  email: "",
  consent: false,
  honeypot: "",
};
