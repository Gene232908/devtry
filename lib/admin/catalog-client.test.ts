import { afterEach, describe, expect, it, vi } from "vitest";
import { postCatalog } from "./catalog-client";

afterEach(() => vi.unstubAllGlobals());

describe("postCatalog", () => {
  it("returns the inserted record without requiring a full catalog reload", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              ok: true,
              data: { model: { id: "model-1", name: "A1" } },
            }),
            { status: 200 },
          ),
        ),
    );
    await expect(
      postCatalog("/models", { name: "A1" }, "Failed"),
    ).resolves.toEqual({
      ok: true,
      data: { model: { id: "model-1", name: "A1" } },
    });
  });

  it("explains an expired session instead of showing a generic add failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ ok: false }), { status: 401 }),
        ),
    );
    await expect(postCatalog("/models", {}, "Failed")).resolves.toEqual({
      ok: false,
      message: "Your session expired. Sign in again, then retry this entry.",
    });
  });

  it("keeps the server error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              ok: false,
              error: { message: "That model already exists for this brand." },
            }),
            { status: 409 },
          ),
        ),
    );
    await expect(postCatalog("/models", {}, "Failed")).resolves.toEqual({
      ok: false,
      message: "That model already exists for this brand.",
    });
  });
});
