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

export type CustomerArrivalNotification = {
  leadId: string;
  customerName: string;
  vehicle: string;
  purchaserName?: string | null;
  confirmedByName: string;
  arrivedAt: string;
  inquiryType?: string | null;
};

export function formatCustomerArrivalText(data: CustomerArrivalNotification): string {
  return [
    "Customer has arrived at the CarVibe facility!",
    "",
    `Customer Name: ${data.customerName}`,
    `Vehicle: ${data.vehicle || "Not specified"}`,
    `Assigned Purchaser: ${data.purchaserName || "Pending / In queue"}`,
    `Confirmed By: ${data.confirmedByName}`,
    `Arrival Time: ${data.arrivedAt}`,
    `Type: ${data.inquiryType === "scrap" ? "Scrap Inquiry" : "Valuation Lead"}`,
    "",
    "Please proceed to the yard/inspection area or open CarVibe admin:",
    `${process.env.NEXT_PUBLIC_SITE_URL || "https://carvibedubai.com"}/admin/leads/${data.leadId}`,
  ].join("\n");
}

export function formatCustomerArrivalHtml(data: CustomerArrivalNotification): string {
  const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://carvibedubai.com"}/admin/leads/${data.leadId}`;
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #09090b; color: #f4f4f5; border-radius: 12px; overflow: hidden; border: 1px solid #27272a;">
      <div style="background: linear-gradient(135deg, #18181b, #09090b); padding: 24px; border-bottom: 3px solid #d4af37;">
        <span style="color: #d4af37; font-size: 11px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">CarVibe Dubai • Arrival Alert</span>
        <h2 style="margin: 8px 0 0; color: #ffffff; font-size: 22px;">Customer Has Arrived at the Yard</h2>
      </div>
      <div style="padding: 24px; font-size: 14px; line-height: 1.6;">
        <p style="margin: 0 0 16px; color: #e4e4e7;">A scheduled customer has arrived and is ready for vehicle inspection.</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr>
            <td style="padding: 8px 0; color: #a1a1aa; width: 140px;">Customer Name:</td>
            <td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${data.customerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #a1a1aa;">Vehicle:</td>
            <td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${data.vehicle || "Not specified"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #a1a1aa;">Assigned Purchaser:</td>
            <td style="padding: 8px 0; color: #d4af37; font-weight: 600;">${data.purchaserName || "Pending / In queue"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #a1a1aa;">Confirmed By:</td>
            <td style="padding: 8px 0; color: #ffffff;">${data.confirmedByName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #a1a1aa;">Arrival Time:</td>
            <td style="padding: 8px 0; color: #ffffff;">${data.arrivedAt}</td>
          </tr>
        </table>
        <div style="text-align: center; margin-top: 24px;">
          <a href="${adminUrl}" style="background: #d4af37; color: #000000; font-weight: 600; padding: 12px 24px; border-radius: 9999px; text-decoration: none; display: inline-block;">Open Lead & Start Inspection</a>
        </div>
      </div>
      <div style="background: #18181b; padding: 12px 24px; text-align: center; font-size: 11px; color: #71717a;">
        CarVibe Dubai • Automated Operations Dispatch
      </div>
    </div>
  `;
}

/** Sends automated arrival notification to assigned purchaser and owner(s). */
export async function sendCustomerArrivalNotification(
  recipients: string[],
  data: CustomerArrivalNotification,
): Promise<void> {
  const config = smtpConfig();
  const client = transport();
  if (!config || !client) {
    console.warn("[lead-notifications] SMTP not configured; arrival email skipped for", recipients);
    return;
  }

  const validRecipients = Array.from(new Set(recipients.map((r) => r.trim()).filter((r) => r.includes("@"))));
  if (validRecipients.length === 0) return;

  const subject = `Customer Arrived: ${data.customerName} - ${data.vehicle || "Vehicle Inspection"}`;
  await withTimeout(client.sendMail({
    from: config.from,
    to: validRecipients,
    subject,
    text: formatCustomerArrivalText(data),
    html: formatCustomerArrivalHtml(data),
  }));
}

export async function dispatchArrivalNotification(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  params: {
    leadId: string;
    customerName: string;
    vehicle: string;
    inquiryType?: string | null;
    purchaserId?: string | null;
    actorDisplayName: string;
  },
): Promise<void> {
  let purchaserEmail: string | null = null;
  let purchaserName: string | null = null;
  if (params.purchaserId) {
    const { data: purchaserProfile } = await supabase
      .from("profiles")
      .select("email, display_name")
      .eq("id", params.purchaserId)
      .maybeSingle();
    purchaserEmail = purchaserProfile?.email ?? null;
    purchaserName = purchaserProfile?.display_name ?? null;
  }

  const recipients = ["carvibe@cresvcs.com"];
  if (purchaserEmail) {
    recipients.push(purchaserEmail);
  }

  try {
    await sendCustomerArrivalNotification(recipients, {
      leadId: params.leadId,
      customerName: params.customerName,
      vehicle: params.vehicle,
      purchaserName,
      confirmedByName: params.actorDisplayName,
      arrivedAt: new Date().toLocaleString("en-GB", { timeZone: "Asia/Dubai" }) + " (UAE)",
      inquiryType: params.inquiryType,
    });
  } catch (err) {
    console.error("[lead-notifications] Arrival email dispatch failed:", err);
  }
}


