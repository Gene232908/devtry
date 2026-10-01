import { describe, expect, it } from "vitest";
import { randomUuid } from "./random-id";

describe("randomUuid", () => {
  it("returns distinct RFC 4122 version 4 identifiers", () => {
    const first = randomUuid();
    const second = randomUuid();
    const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    expect(first).toMatch(uuidV4);
    expect(second).toMatch(uuidV4);
    expect(second).not.toBe(first);
  });
});

