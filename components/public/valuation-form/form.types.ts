export type OptionLevel = "Basic Mode" | "Mid Mode" | "Full Option";

export type ValuationFormValues = {
  fullName: string;
  whatsapp: string;
  year: string;
  make: string;
  model: string;
  mileageKm: string;
  description: string;
  trim: string;
  optionLevel: OptionLevel | "";
  location: string;
  email: string;
  consent: boolean;
  honeypot: string;
};

export type FormErrors = Partial<Record<keyof ValuationFormValues, string>>;

export type FormState = "filling" | "validating" | "otp_entry" | "verifying_otp" | "submitting" | "success";

export const emptyValues: ValuationFormValues = {
  fullName: "",
  whatsapp: "",
  year: "",
  make: "",
  model: "",
  mileageKm: "",
  description: "",
  trim: "",
  optionLevel: "",
  location: "",
  email: "",
  consent: false,
  honeypot: "",
};
