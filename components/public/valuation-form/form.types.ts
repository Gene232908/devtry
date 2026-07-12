export type Condition = "excellent" | "good" | "fair";

export type ValuationFormValues = {
  make: string;
  model: string;
  year: string;
  mileageKm: string;
  condition: Condition | "";
  emirate: string;
  area: string;
  fullName: string;
  whatsapp: string;
  email: string;
  consent: boolean;
  honeypot: string;
};

export type FormErrors = Partial<Record<keyof ValuationFormValues, string>>;

export type FormState = "filling" | "validating" | "submitting" | "success";

export const emptyValues: ValuationFormValues = {
  make: "",
  model: "",
  year: "",
  mileageKm: "",
  condition: "",
  emirate: "",
  area: "",
  fullName: "",
  whatsapp: "",
  email: "",
  consent: false,
  honeypot: "",
};
