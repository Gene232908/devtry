import nodemailer from "nodemailer";

type NewLeadNotification = {
  id: string;
  fullName: string;
  phoneE164: string;
  email: string | null;
  make: string;
  model: string;
  trim: string | null;
  year: number;
  mileageKm: number;
  mileageValue?: number;
  mileageUnit?: "km" | "miles";
  emirate: string;
  createdAt: string;
};

const SMTP_TIMEOUT_MS = 8_000;

function smtpConfig() {
  const user = (process.env.LEAD_NOTIFICATION_SMTP_USER ?? process.env.GMAIL_SMTP_USER)?.trim();
  // Gmail displays app passwords in groups, but SMTP expects the characters
  // without spaces. Keeping this server-only prevents accidental client leaks.
  const pass = (process.env.LEAD_NOTIFICATION_SMTP_APP_PASSWORD ?? process.env.GMAIL_SMTP_APP_PASSWORD)?.replace(/\s/g, "");
  if (!user || !pass) return null;

  return {
    user,
    pass,
    from: process.env.LEAD_NOTIFICATION_FROM?.trim() || `CarVibe Dubai <${user}>`,
  };
}

function transport() {
  const config = smtpConfig();
  if (!config) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: config.user, pass: config.pass },
  });
}

function withTimeout<T>(task: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Email provider timed out.")), SMTP_TIMEOUT_MS);
  });
  return Promise.race([task, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function formatVehicle(lead: NewLeadNotification): string {
  return [lead.year, lead.make, lead.model, lead.trim].filter(Boolean).join(" ");
}

export function formatNewLeadText(lead: NewLeadNotification): string {
  return [
    "A new valuation lead has arrived in CarVibe.",
    "",
    `Customer: ${lead.fullName}`,
    `Phone: ${lead.phoneE164}`,
    `Vehicle: ${formatVehicle(lead)}`,
    `Mileage: ${(lead.mileageValue ?? lead.mileageKm).toLocaleString()} ${lead.mileageUnit === "miles" ? "miles" : "km"}`,
    `Emirate: ${lead.emirate}`,
    `Received: ${new Date(lead.createdAt).toLocaleString("en-GB")}`,
    "",
    "Open the CarVibe admin dashboard to review and follow up.",
  ].join("\n");
}

export function isLeadNotificationConfigured(): boolean {
  return smtpConfig() !== null;
}

/** Validates the Gmail connection without sending a customer notification. */
export async function verifyLeadNotificationTransport(): Promise<void> {
  const client = transport();
  if (!client) throw new Error("Lead email is not configured on this server.");
  await withTimeout(client.verify());
}

/** Sends after a lead has been stored. Caller keeps the saved lead even if mail fails. */
export async function sendNewLeadNotification(recipient: string, lead: NewLeadNotification): Promise<void> {
  const config = smtpConfig();
  const client = transport();
  if (!config || !client) throw new Error("Lead email is not configured on this server.");

  await withTimeout(client.sendMail({
    from: config.from,
    to: recipient,
    subject: `New valuation lead - ${formatVehicle(lead)}`,
    text: formatNewLeadText(lead),
  }));
}

export async function sendLeadNotificationTest(recipient: string): Promise<void> {
  const config = smtpConfig();
  const client = transport();
  if (!config || !client) throw new Error("Lead email is not configured on this server.");

  await withTimeout(client.sendMail({
    from: config.from,
    to: recipient,
    subject: "CarVibe lead notifications are working",
    text: "This is a test notification from CarVibe. New valuation leads will be sent to this email address.",
  }));
}
