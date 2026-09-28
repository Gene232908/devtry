import { PDFDocument } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";
import { EMPTY_INSPECTION_REPORT, PHOTO_ANGLES } from "@/lib/inspection/report-schema";

const onePixelPng = Uint8Array.from(Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9J1KQAAAAASUVORK5CYII=",
  "base64",
));
const reportData = { ...EMPTY_INSPECTION_REPORT, carMake: "Jetour", carModel: "T2 Luxury", modelYear: "2025" };

const query = (result: unknown) => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => result,
  };
  return chain;
};

const supabase = {
  from: (table: string) => {
    if (table === "inspection_reports") {
      return query({ data: { id: "report-1", report_data: reportData, completed_at: "2026-09-13T00:00:00.000Z", updated_by: null }, error: null });
    }
    return {
      select: () => ({
        eq: () => Promise.resolve({
          data: PHOTO_ANGLES.map((angle, index) => ({ angle, storage_path: `lead-1/${index}.png`, content_type: "image/png" })),
          error: null,
        }),
      }),
    };
  },
  storage: {
    from: () => ({
      download: async () => ({ data: new Blob([onePixelPng], { type: "image/png" }), error: null }),
    }),
  },
};

vi.mock("@/lib/inspection/access", () => ({
  authorizeInspectionLead: async () => ({ ok: true, supabase, lead: {} }),
}));

describe("GET /api/admin/leads/[id]/inspection/pdf", () => {
  it("embeds all required stored photos into a downloadable PDF", async () => {
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "lead-1" }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain('filename="Inspection Report For - Jetour T2 Luxury 2025.pdf"');
    expect(decodeURIComponent(response.headers.get("x-carvibe-filename") ?? "")).toBe("Inspection Report For - Jetour T2 Luxury 2025.pdf");
    expect(Number(response.headers.get("content-length"))).toBeGreaterThan(0);

    const document = await PDFDocument.load(await response.arrayBuffer());
    // The report keeps the supplied eight-page rhythm: three information pages
    // and five photo pages for all 24 angles, including bumper close-ups.
    expect(document.getPageCount()).toBe(8);
  });

  it("supports an internal binary response that download managers cannot intercept as an attachment", async () => {
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost?delivery=internal"), { params: Promise.resolve({ id: "lead-1" }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/octet-stream");
    expect(response.headers.get("content-disposition")).toBeNull();
    expect(response.headers.get("x-carvibe-payload")).toBe("inspection-pdf");
    const bytes = await response.arrayBuffer();
    expect(new TextDecoder("ascii").decode(bytes.slice(0, 5))).toBe("%PDF-");
    await expect(PDFDocument.load(bytes)).resolves.toBeDefined();
  });
});
