import twilio from "twilio";

// Server-only module: reads non-NEXT_PUBLIC_ env vars, so it is never bundled into client code.
// Only import this from Route Handlers / Server Components, never from "use client" files.

export type OtpErrorKind = "otp_send_failed" | "otp_invalid" | "otp_expired" | "rate_limited" | "network";

export class OtpError extends Error {
  kind: OtpErrorKind;

  constructor(kind: OtpErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

let cachedClient: ReturnType<typeof twilio> | null = null;

function getClient() {
  if (cachedClient) return cachedClient;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new OtpError("otp_send_failed", "Twilio credentials are not configured.");
  }

  cachedClient = twilio(accountSid, authToken);
  return cachedClient;
}

function getServiceSid() {
  const sid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!sid) {
    throw new OtpError("otp_send_failed", "Twilio Verify service is not configured.");
  }
  return sid;
}

/** Maps Twilio's numeric error codes to our app-level error kinds. See https://www.twilio.com/docs/api/errors. */
function mapTwilioError(err: unknown): OtpError {
  const code = (err as { code?: number })?.code;

  switch (code) {
    case 60200:
    case 21211:
      return new OtpError("otp_send_failed", "Enter a valid mobile number.");
    case 60203: // max send attempts reached
    case 60202: // max check attempts reached
    case 20429: // too many requests
      return new OtpError("rate_limited", "Too many attempts. Please try again later.");
    case 60404: // verification not found (expired/already checked)
      return new OtpError("otp_expired", "Code expired. Request a new one.");
    case 60410:
      return new OtpError("rate_limited", "Too many attempts. Please try again later.");
    default:
      return new OtpError("otp_send_failed", "Couldn't process your request. Please try again.");
  }
}

/** Starts an SMS OTP verification for a phone number already in E.164 format (e.g. +9715XXXXXXXX). */
export async function sendOtp(phoneE164: string): Promise<void> {
  try {
    await getClient().verify.v2.services(getServiceSid()).verifications.create({
      to: phoneE164,
      channel: "sms",
    });
  } catch (err) {
    throw mapTwilioError(err);
  }
}

/** Checks a submitted OTP code against Twilio Verify. Returns true only when Twilio reports "approved". */
export async function checkOtp(phoneE164: string, code: string): Promise<boolean> {
  try {
    const check = await getClient().verify.v2.services(getServiceSid()).verificationChecks.create({
      to: phoneE164,
      code,
    });
    return check.status === "approved";
  } catch (err) {
    const mapped = mapTwilioError(err);
    // Twilio returns 404 (60404) once a verification is checked/expired - treat as "wrong/expired", not a hard error.
    if (mapped.kind === "otp_expired") return false;
    throw mapped;
  }
}
