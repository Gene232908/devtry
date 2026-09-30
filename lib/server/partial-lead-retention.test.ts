import { describe, expect, it } from "vitest";
import {
  PARTIAL_LEAD_RETENTION_BATCH_SIZE,
  PARTIAL_LEAD_RETENTION_MAX_BATCHES,
  executePartialLeadRetention,
  partialLeadRetentionCutoffs,
  shouldContinueRetentionBatch,
} from "./partial-lead-retention";

describe("incomplete-form retention policy", () => {
  it("archives after 30 days and deletes after 90 days", () => {
    const cutoffs = partialLeadRetentionCutoffs(new Date("2026-10-01T00:00:00.000Z"));

    expect(cutoffs.archiveCutoff).toBe("2026-09-01T00:00:00.000Z");
    expect(cutoffs.deleteCutoff).toBe("2026-07-03T00:00:00.000Z");
  });

  it("rejects an invalid reference date", () => {
    expect(() => partialLeadRetentionCutoffs(new Date("invalid"))).toThrow(
      "A valid retention reference date is required.",
    );
  });

  it("continues only while an archive or delete batch is full", () => {
    expect(shouldContinueRetentionBatch(PARTIAL_LEAD_RETENTION_BATCH_SIZE, 0)).toBe(true);
    expect(shouldContinueRetentionBatch(0, PARTIAL_LEAD_RETENTION_BATCH_SIZE)).toBe(true);
    expect(shouldContinueRetentionBatch(25, 10)).toBe(false);
  });

  it("aggregates full batches and stops after the first partial batch", async () => {
    const responses = [
      [{ archived_count: PARTIAL_LEAD_RETENTION_BATCH_SIZE, deleted_count: 2 }],
      [{ archived_count: 12, deleted_count: 3 }],
    ];
    const result = await executePartialLeadRetention(async () => ({
      data: responses.shift() ?? [],
      error: null,
    }), new Date("2026-10-01T00:00:00.000Z"));

    expect(result).toEqual({
      archived: PARTIAL_LEAD_RETENTION_BATCH_SIZE + 12,
      deleted: 5,
      batches: 2,
      backlogMayRemain: false,
    });
  });

  it("caps work per invocation and reports a possible backlog", async () => {
    let calls = 0;
    const result = await executePartialLeadRetention(async () => {
      calls += 1;
      return {
        data: [{ archived_count: PARTIAL_LEAD_RETENTION_BATCH_SIZE, deleted_count: 0 }],
        error: null,
      };
    });

    expect(calls).toBe(PARTIAL_LEAD_RETENTION_MAX_BATCHES);
    expect(result.backlogMayRemain).toBe(true);
  });

  it("fails closed on a database error or malformed counts", async () => {
    await expect(executePartialLeadRetention(async () => ({ data: null, error: { message: "database unavailable" } })))
      .rejects.toThrow("database unavailable");
    await expect(executePartialLeadRetention(async () => ({ data: [{ archived_count: -1 }], error: null })))
      .rejects.toThrow("Retention returned invalid counts.");
  });
});
