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

const SMTP_TIMEOUT_MS = 15_000;

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
  // Use port 465 SSL directly to prevent connection drops on Vercel/serverless
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
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
  const isScrap = data.inquiryType === "scrap";
  const typeLabel = isScrap ? "Scrap Inquiry" : "Valuation Lead";
  return [
    `Customer has arrived at the CarVibe facility! [${typeLabel}]`,
    "",
    `Inquiry Type: ${typeLabel}`,
    `Customer Name: ${data.customerName}`,
    `Vehicle: ${data.vehicle || "Not specified"}`,
    `Assigned Purchaser: ${data.purchaserName || "Pending / In queue"}`,
    `Confirmed By: ${data.confirmedByName}`,
    `Arrival Time: ${data.arrivedAt}`,
    "",
    "Please proceed to the yard/inspection area or open CarVibe admin:",
    `${process.env.NEXT_PUBLIC_SITE_URL || "https://carvibedubai.com"}/admin/leads/${data.leadId}${isScrap ? "?origin=scrap" : ""}`,
  ].join("\n");
}

export function formatCustomerArrivalHtml(data: CustomerArrivalNotification): string {
  const isScrap = data.inquiryType === "scrap";
  const typeLabel = isScrap ? "Scrap / Salvage Inquiry" : "Car Valuation Lead";
  const badgeBorder = isScrap ? "#ef4444" : "#3b82f6";
  const badgeBg = isScrap ? "#450a0a" : "#1e3a5f";
  const badgeTextColor = isScrap ? "#fca5a5" : "#93c5fd";
  const headerBorderColor = isScrap ? "#ef4444" : "#d4af37";
  const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://carvibedubai.com"}/admin/leads/${data.leadId}${isScrap ? "?origin=scrap" : ""}`;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #09090b; color: #f4f4f5; border-radius: 12px; overflow: hidden; border: 1px solid #27272a;">
      <div style="background: linear-gradient(135deg, #18181b, #09090b); padding: 24px; border-bottom: 3px solid ${headerBorderColor};">
        <div style="margin-bottom: 10px;">
          <span style="color: #a1a1aa; font-size: 11px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">CarVibe Dubai • Arrival Alert</span>
          <span style="display: inline-block; margin-left: 10px; padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: ${badgeBg}; color: ${badgeTextColor}; border: 1px solid ${badgeBorder}; text-transform: uppercase; letter-spacing: 0.5px;">
            ${isScrap ? "⚠️ " : "🚗 "}${typeLabel}
          </span>
        </div>
        <h2 style="margin: 4px 0 0; color: #ffffff; font-size: 22px;">Customer Has Arrived at the Yard</h2>
      </div>
      <div style="padding: 24px; font-size: 14px; line-height: 1.6;">
        <p style="margin: 0 0 16px; color: #e4e4e7;">A customer has arrived and is ready for vehicle inspection at the facility.</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr>
            <td style="padding: 8px 0; color: #a1a1aa; width: 140px;">Inquiry Type:</td>
            <td style="padding: 8px 0; color: ${isScrap ? "#f87171" : "#60a5fa"}; font-weight: 700;">
              ${isScrap ? "🔴 Scrap Inquiry (Salvage Vehicle)" : "🔵 Valuation Lead"}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #a1a1aa;">Customer Name:</td>
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
          <a href="${adminUrl}" style="background: ${isScrap ? "#ef4444" : "#d4af37"}; color: ${isScrap ? "#ffffff" : "#000000"}; font-weight: 600; padding: 12px 24px; border-radius: 9999px; text-decoration: none; display: inline-block;">
            Open ${isScrap ? "Scrap Inquiry" : "Lead"} &amp; Start Inspection
          </a>
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

  const isScrap = data.inquiryType === "scrap";
  const typeTag = isScrap ? "[Scrap Inquiry]" : "[Valuation Lead]";
  const subject = `${typeTag} Customer Arrived: ${data.customerName} - ${data.vehicle || "Vehicle Inspection"}`;
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

  // 1. Fetch current Notify email from Settings
  let notifyEmail: string | null = null;
  try {
    const { data: settings } = await supabase
      .from("settings")
      .select("notify_email")
      .eq("id", 1)
      .maybeSingle();
    if (typeof settings?.notify_email === "string" && settings.notify_email.trim()) {
      notifyEmail = settings.notify_email.trim();
    }
  } catch {}

  // 2. Fetch active Super Admin / Manager emails
  let adminEmails: string[] = [];
  try {
    const { data: adminProfiles } = await supabase
      .from("profiles")
      .select("email")
      .in("role", ["admin", "manager"])
      .eq("is_active", true);
    adminEmails = (adminProfiles ?? []).map((p: { email: string }) => p.email?.trim()).filter(Boolean);
  } catch {}

  const config = smtpConfig();
  const recipients = [
    notifyEmail,
    ...adminEmails,
    purchaserEmail,
    "carvibe@cresvcs.com",
    "carvibedubai@cresvcs.com",
    config?.user,
  ].filter((r): r is string => Boolean(r && r.includes("@")));

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

export type ArrivalReversalNotification = {
  leadId: string;
  customerName: string;
  vehicle: string;
  requesterName: string;
  requesterRole: string;
  reason: string;
  requestedAt: string;
  inquiryType?: string | null;
};

export function formatArrivalReversalText(data: ArrivalReversalNotification): string {
  const roleLabel =
    data.requesterRole === "call_center"
      ? "Customer Service (Call Centre)"
      : data.requesterRole === "purchaser"
      ? "Purchaser"
      : data.requesterRole;
  const isScrap = data.inquiryType === "scrap";
  const typeLabel = isScrap ? "Scrap Inquiry" : "Valuation Lead";

  return [
    `CarVibe Dubai • Arrival Reversal Approval Request [${typeLabel}]`,
    "",
    "A staff member has submitted a request for Sir Nash to review and approve turning off customer arrival status.",
    "",
    `Inquiry Type: ${typeLabel}`,
    `Staff Member: ${data.requesterName} (${roleLabel})`,
    `Customer: ${data.customerName}`,
    `Vehicle: ${data.vehicle || "Not specified"}`,
    `Reason: "${data.reason}"`,
    `Request Time: ${data.requestedAt}`,
    "",
    "Review and approve or decline this request in the CarVibe Admin Dashboard:",
    `${process.env.NEXT_PUBLIC_SITE_URL || "https://carvibedubai.com"}/admin/leads/${data.leadId}${isScrap ? "?origin=scrap" : ""}`,
  ].join("\n");
}

export function formatArrivalReversalHtml(data: ArrivalReversalNotification): string {
  const isScrap = data.inquiryType === "scrap";
  const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://carvibedubai.com"}/admin/leads/${data.leadId}${isScrap ? "?origin=scrap" : ""}`;
  const roleLabel =
    data.requesterRole === "call_center"
      ? "Customer Service (Call Centre)"
      : data.requesterRole === "purchaser"
      ? "Purchaser"
      : data.requesterRole;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #09090b; color: #f4f4f5; border-radius: 12px; overflow: hidden; border: 1px solid #27272a;">
      <div style="background: linear-gradient(135deg, #1c1917, #09090b); padding: 24px; border-bottom: 3px solid #f59e0b;">
        <div style="margin-bottom: 8px;">
          <span style="color: #f59e0b; font-size: 11px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">CarVibe Dubai • Action Required</span>
          <span style="display: inline-block; margin-left: 10px; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 700; background: ${isScrap ? "#450a0a" : "#1e3a5f"}; color: ${isScrap ? "#fca5a5" : "#93c5fd"}; border: 1px solid ${isScrap ? "#ef4444" : "#3b82f6"}; text-transform: uppercase;">
            ${isScrap ? "Scrap Inquiry" : "Valuation Lead"}
          </span>
        </div>
        <h2 style="margin: 4px 0 0; color: #ffffff; font-size: 20px;">Customer Arrival Reversal Request</h2>
      </div>
      <div style="padding: 24px; font-size: 14px; line-height: 1.6;">
        <p style="margin: 0 0 16px; color: #e4e4e7;">A staff member has submitted a request for Sir Nash to review and approve turning off customer arrival.</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 0; color: #a1a1aa; width: 140px;">Inquiry Type:</td>
            <td style="padding: 8px 0; color: ${isScrap ? "#f87171" : "#60a5fa"}; font-weight: 600;">${isScrap ? "🔴 Scrap Inquiry" : "🔵 Valuation Lead"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #a1a1aa;">Staff Member:</td>
            <td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${data.requesterName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #a1a1aa;">Staff Role:</td>
            <td style="padding: 8px 0; color: #f59e0b; font-weight: 600;">${roleLabel}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #a1a1aa;">Customer:</td>
            <td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${data.customerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #a1a1aa;">Vehicle:</td>
            <td style="padding: 8px 0; color: #ffffff;">${data.vehicle || "Not specified"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #a1a1aa;">Request Time:</td>
            <td style="padding: 8px 0; color: #ffffff;">${data.requestedAt}</td>
          </tr>
        </table>
        <div style="margin: 16px 0; padding: 14px 16px; background: #18181b; border-left: 3px solid #f59e0b; border-radius: 6px;">
          <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #f59e0b; margin-bottom: 4px;">Stated Reason</div>
          <div style="color: #f4f4f5; font-style: italic;">&ldquo;${data.reason}&rdquo;</div>
        </div>
        <div style="text-align: center; margin-top: 24px;">
          <a href="${adminUrl}" style="background: #f59e0b; color: #000000; font-weight: 600; padding: 12px 24px; border-radius: 9999px; text-decoration: none; display: inline-block;">Review &amp; Approve in Admin</a>
        </div>
      </div>
      <div style="background: #18181b; padding: 12px 24px; text-align: center; font-size: 11px; color: #71717a;">
        CarVibe Dubai • Operations &amp; Audit Alert
      </div>
    </div>
  `;
}

export async function sendArrivalReversalNotification(
  recipients: string[],
  data: ArrivalReversalNotification,
): Promise<void> {
  const config = smtpConfig();
  const client = transport();
  if (!config || !client) {
    console.warn("[lead-notifications] SMTP not configured; arrival reversal email skipped for", recipients);
    return;
  }

  const validRecipients = Array.from(new Set(recipients.map((r) => r.trim()).filter((r) => r.includes("@"))));
  if (validRecipients.length === 0) return;

  const isScrap = data.inquiryType === "scrap";
  const typeTag = isScrap ? "[Scrap Inquiry]" : "[Valuation Lead]";
  const roleLabel = data.requesterRole === "call_center" ? "Customer Service" : data.requesterRole;
  const subject = `${typeTag} [Approval Required] Arrival Reversal Request by ${data.requesterName} (${roleLabel}) - ${data.customerName}`;
  await withTimeout(client.sendMail({
    from: config.from,
    to: validRecipients,
    subject,
    text: formatArrivalReversalText(data),
    html: formatArrivalReversalHtml(data),
  }));
}

export async function dispatchArrivalReversalRequestNotification(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  params: {
    leadId: string;
    customerName: string;
    vehicle: string;
    inquiryType?: string | null;
    requesterName: string;
    requesterRole: string;
    reason: string;
  },
): Promise<void> {
  // 1. Fetch current Notify email from Settings
  let notifyEmail: string | null = null;
  try {
    const { data: settings } = await supabase
      .from("settings")
      .select("notify_email")
      .eq("id", 1)
      .maybeSingle();
    if (typeof settings?.notify_email === "string" && settings.notify_email.trim()) {
      notifyEmail = settings.notify_email.trim();
    }
  } catch {}

  // 2. Fetch active Super Admin / Manager emails
  let adminEmails: string[] = [];
  try {
    const { data: adminProfiles } = await supabase
      .from("profiles")
      .select("email")
      .in("role", ["admin", "manager"])
      .eq("is_active", true);
    adminEmails = (adminProfiles ?? []).map((p: { email: string }) => p.email?.trim()).filter(Boolean);
  } catch {}

  const config = smtpConfig();
  const recipients = [
    notifyEmail,
    ...adminEmails,
    "carvibe@cresvcs.com",
    "carvibedubai@cresvcs.com",
    config?.user,
  ].filter((r): r is string => Boolean(r && r.includes("@")));

  try {
    await sendArrivalReversalNotification(recipients, {
      leadId: params.leadId,
      customerName: params.customerName,
      vehicle: params.vehicle,
      inquiryType: params.inquiryType,
      requesterName: params.requesterName,
      requesterRole: params.requesterRole,
      reason: params.reason,
      requestedAt: new Date().toLocaleString("en-GB", { timeZone: "Asia/Dubai" }) + " (UAE)",
    });
  } catch (err) {
    console.error("[lead-notifications] Arrival reversal email dispatch failed:", err);
  }
}



