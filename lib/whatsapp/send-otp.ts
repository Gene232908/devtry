// Server-only module: sends the OTP via the Meta WhatsApp Cloud API. Never
// import this from "use client" files — it reads WHATSAPP_ACCESS_TOKEN,
// which must never reach the browser.

export type WhatsappErrorKind = "otp_send_failed" | "rate_limited" | "not_allowed" | "misconfigured";

export class WhatsappError extends Error {
  kind: WhatsappErrorKind;

  constructor(kind: WhatsappErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

function getConfig() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v25.0";

  if (!accessToken || !phoneNumberId) {
    throw new WhatsappError("misconfigured", "WhatsApp Cloud API is not fully configured (missing access token or phone number ID).");
  }

  return { accessToken, phoneNumberId, apiVersion };
}

/** Maps Meta Graph API error codes/subcodes to app-level error kinds. */
function mapMetaError(status: number, body: unknown): WhatsappError {
  const errorObj = (body as { error?: { code?: number; error_subcode?: number; message?: string } })?.error;
  const code = errorObj?.code;

  // 131056 = rate limit / too many messages.
  if (status === 429 || code === 131056) {
    return new WhatsappError("rate_limited", "Too many attempts. Please try again later.");
  }
  // 131026/131030 = undeliverable (unregistered test recipient); 131047 = the
  // 24-hour customer-service session window is closed (only applies to the
  // free-form test path below — the recipient needs to message the test
  // number again to reopen it).
  if (code === 131026 || code === 131030 || code === 131047) {
    return new WhatsappError("not_allowed", "This number can't receive messages from us yet.");
  }
  return new WhatsappError("otp_send_failed", "Couldn't send the code. Please try again.");
}

async function postToGraphApi(payload: unknown): Promise<void> {
  const { accessToken, phoneNumberId, apiVersion } = getConfig();

  const res = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // ignore parse failure, mapMetaError handles a null body
    }
    throw mapMetaError(res.status, body);
  }
}

/**
 * Sends the OTP via the approved Authentication template. This is the
 * production path — required for messaging a customer who has never
 * messaged the business first (no open session), which is the normal case
 * for a cold valuation-form lead. Requires WHATSAPP_TEMPLATE_NAME to be an
 * approved template, which in turn requires the Meta Business Portfolio to
 * be verified.
 */
async function sendTemplateOtp(phoneE164: string, code: string): Promise<void> {
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
  const templateLanguage = process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en";
  if (!templateName) {
    throw new WhatsappError("misconfigured", "WHATSAPP_TEMPLATE_NAME is not configured.");
  }

  await postToGraphApi({
    messaging_product: "whatsapp",
    to: phoneE164.replace(/^\+/, ""),
    type: "template",
    template: {
      name: templateName,
      language: { code: templateLanguage },
      components: [
        { type: "body", parameters: [{ type: "text", text: code }] },
        { type: "button", sub_type: "copy_code", index: "0", parameters: [{ type: "coupon_code", coupon_code: code }] },
      ],
    },
  });
}

/**
 * TEMPORARY test-mode path: sends the OTP as a plain free-form text message
 * instead of a template. WhatsApp allows free-form messages to a recipient
 * without any template approval, but ONLY within the 24-hour "customer
 * service window" that opens after the recipient messages the business
 * number first. Usable right now (no business verification needed) — the
 * tester just needs to send any message to the Meta test number once, then
 * request an OTP within 24 hours. NOT usable in production: a real customer
 * filling out the valuation form has never messaged the business first, so
 * no session window exists — sendTemplateOtp is the only path that works
 * for that case, which is why it remains the production default.
 */
async function sendFreeformOtp(phoneE164: string, code: string): Promise<void> {
  await postToGraphApi({
    messaging_product: "whatsapp",
    to: phoneE164.replace(/^\+/, ""),
    type: "text",
    text: { body: `Your CarVibeDubai verification code is ${code}. It expires in 5 minutes. Do not share this code with anyone.` },
  });
}

export async function sendWhatsappOtp(phoneE164: string, code: string): Promise<void> {
  if (process.env.WHATSAPP_TEST_MODE === "true") {
    return sendFreeformOtp(phoneE164, code);
  }
  return sendTemplateOtp(phoneE164, code);
}
