import { cookies } from "next/headers";

export function getViewedCookieName(role?: string | null): string {
  const normalized = role ? role.trim().toLowerCase() : "default";
  return `cvd_viewed_partial_leads_${normalized}`;
}

/**
 * Reads the list of partial lead IDs that have been viewed by a specific role in this browser session.
 */
export async function getViewedPartialLeadIds(role?: string | null): Promise<string[]> {
  try {
    const cookieStore = await cookies();
    const cookieName = getViewedCookieName(role);
    const val = cookieStore.get(cookieName)?.value;
    if (!val) return [];
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? (parsed.filter((item) => typeof item === "string") as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * Appends a partial lead ID to the viewed cookie list for a specific role.
 */
export async function addViewedPartialLeadId(id: string, role?: string | null): Promise<string[]> {
  if (!id) return [];
  try {
    const cookieStore = await cookies();
    const cookieName = getViewedCookieName(role);
    const val = cookieStore.get(cookieName)?.value;
    let list: string[] = [];
    if (val) {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) list = parsed.filter((item) => typeof item === "string");
      } catch {}
    }
    if (!list.includes(id)) {
      list.push(id);
    }
    cookieStore.set(cookieName, JSON.stringify(list), {
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      sameSite: "lax",
    });
    return list;
  } catch {
    return [id];
  }
}
