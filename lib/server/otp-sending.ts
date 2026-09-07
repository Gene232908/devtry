/**
 * Emergency circuit breaker for paid WhatsApp OTP sends.
 *
 * Set WHATSAPP_OTP_SENDING_ENABLED=false in the server environment to stop
 * every OTP request before it can write an OTP row or call Meta. An unset or
 * malformed value deliberately keeps the current behaviour (sending enabled),
 * so existing local and test environments continue to work unchanged.
 */
export function isWhatsappOtpSendingEnabled(): boolean {
  return process.env.WHATSAPP_OTP_SENDING_ENABLED?.trim().toLowerCase() !== "false";
}
