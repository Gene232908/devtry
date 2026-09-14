export type CatalogPostResult<T> =
  { ok: true; data: T } | { ok: false; message: string };

export async function postCatalog<T>(
  endpoint: string,
  body: unknown,
  failure: string,
): Promise<CatalogPostResult<T>> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.ok) {
      return {
        ok: false,
        message:
          response.status === 401
            ? "Your session expired. Sign in again, then retry this entry."
            : (json?.error?.message ?? `${failure} (HTTP ${response.status})`),
      };
    }
    return { ok: true, data: json.data as T };
  } catch {
    return { ok: false, message: "Network error. Please try again." };
  }
}
