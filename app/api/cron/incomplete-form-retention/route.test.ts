import { afterEach, describe, expect, it } from "vitest";
import { GET } from "./route";

const previousSecret = process.env.CRON_SECRET;

afterEach(() => {
  if (previousSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = previousSecret;
});

describe("incomplete-form retention cron authorization", () => {
  it("fails closed when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const response = await GET(new Request("http://localhost/api/cron/incomplete-form-retention") as never);
    expect(response.status).toBe(503);
  });

  it("rejects a request without the matching bearer secret", async () => {
    process.env.CRON_SECRET = "test-secret-with-enough-length";
    const response = await GET(new Request("http://localhost/api/cron/incomplete-form-retention") as never);
    expect(response.status).toBe(401);
  });
});
