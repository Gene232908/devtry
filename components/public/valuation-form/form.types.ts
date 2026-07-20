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

export type FormState = "filling" | "validating" | "submitting" | "success";

export type PhoneVerificationStatus =
  | "unverified"
  | "sending"
  | "code_sent"
  | "verifying"
  | "verified"
  | "error";

export type PhoneVerification = {
  status: PhoneVerificationStatus;
  /** The exact phone value that was verified — used to detect edits after verification. */
  verifiedPhone: string | null;
  /** Server-issued proof required by the final submission; cleared whenever verification is invalidated. */
  proof: string | null;
  /** True when the server used its dev-only OTP bypass (no real WhatsApp message sent). */
  devBypass: boolean;
  /** Unix ms timestamp after which "Resend OTP" becomes available again. */
  resendAvailableAt: number | null;
  errorMessage: string | null;
};

export const emptyPhoneVerification: PhoneVerification = {
  status: "unverified",
  verifiedPhone: null,
  proof: null,
  devBypass: false,
  resendAvailableAt: null,
  errorMessage: null,
};

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
