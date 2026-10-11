import { cookies } from "next/headers";

export const VIEWED_COOKIE_NAME = "cvd_viewed_partial_leads";

/**
 * Reads the list of partial lead IDs that have been viewed by staff in this browser session.
 */
export async function getViewedPartialLeadIds(): Promise<string[]> {
  try {
    const cookieStore = await cookies();
    const val = cookieStore.get(VIEWED_COOKIE_NAME)?.value;
    if (!val) return [];
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? (parsed.filter((item) => typeof item === "string") as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * Appends a partial lead ID to the viewed cookie list.
 */
export async function addViewedPartialLeadId(id: string): Promise<string[]> {
  if (!id) return [];
  try {
    const cookieStore = await cookies();
    const val = cookieStore.get(VIEWED_COOKIE_NAME)?.value;
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
    cookieStore.set(VIEWED_COOKIE_NAME, JSON.stringify(list), {
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      sameSite: "lax",
    });
    return list;
  } catch {
    return [id];
  }
}
