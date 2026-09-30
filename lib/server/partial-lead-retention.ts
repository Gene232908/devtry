export const PARTIAL_LEAD_ARCHIVE_DAYS = 30;
export const PARTIAL_LEAD_DELETE_DAYS = 90;
export const PARTIAL_LEAD_RETENTION_BATCH_SIZE = 1_000;
export const PARTIAL_LEAD_RETENTION_MAX_BATCHES = 5;

const DAY_MS = 86_400_000;

export function partialLeadRetentionCutoffs(now = new Date()) {
  if (Number.isNaN(now.getTime())) throw new Error("A valid retention reference date is required.");

  return {
    archiveCutoff: new Date(now.getTime() - PARTIAL_LEAD_ARCHIVE_DAYS * DAY_MS).toISOString(),
    deleteCutoff: new Date(now.getTime() - PARTIAL_LEAD_DELETE_DAYS * DAY_MS).toISOString(),
  };
}

export function shouldContinueRetentionBatch(archived: number, deleted: number) {
  return archived === PARTIAL_LEAD_RETENTION_BATCH_SIZE || deleted === PARTIAL_LEAD_RETENTION_BATCH_SIZE;
}

type RetentionRpcResult = {
  data: unknown;
  error: { message: string } | null;
};

export type RetentionRpc = (args: {
  p_archive_cutoff: string;
  p_delete_cutoff: string;
  p_batch_size: number;
}) => Promise<RetentionRpcResult>;

export async function executePartialLeadRetention(rpc: RetentionRpc, now = new Date()) {
  const { archiveCutoff, deleteCutoff } = partialLeadRetentionCutoffs(now);
  let archived = 0;
  let deleted = 0;
  let batches = 0;
  let backlogMayRemain = false;

  for (; batches < PARTIAL_LEAD_RETENTION_MAX_BATCHES; batches += 1) {
    const result = await rpc({
      p_archive_cutoff: archiveCutoff,
      p_delete_cutoff: deleteCutoff,
      p_batch_size: PARTIAL_LEAD_RETENTION_BATCH_SIZE,
    });
    if (result.error) throw new Error(result.error.message);

    const row = (result.data as Array<{ archived_count?: number | string; deleted_count?: number | string }> | null)?.[0];
    const batchArchived = Number(row?.archived_count ?? 0);
    const batchDeleted = Number(row?.deleted_count ?? 0);
    if (!Number.isSafeInteger(batchArchived) || batchArchived < 0 || !Number.isSafeInteger(batchDeleted) || batchDeleted < 0) {
      throw new Error("Retention returned invalid counts.");
    }

    archived += batchArchived;
    deleted += batchDeleted;

    if (!shouldContinueRetentionBatch(batchArchived, batchDeleted)) {
      batches += 1;
      break;
    }
    if (batches === PARTIAL_LEAD_RETENTION_MAX_BATCHES - 1) backlogMayRemain = true;
  }

  return { archived, deleted, batches, backlogMayRemain };
}
