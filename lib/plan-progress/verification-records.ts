import { getTenantRetainedRecords, saveTenantRetainedRecord } from "@/lib/retained-records";
import type { PlanExtraction } from "@/lib/plan-progress/types";

export type PlanVerificationQueue = {
  id: string;
  participantId: string;
  participantName: string;
  fileName: string;
  parserSource: string;
  queuedAt: string;
  items: PlanExtraction[];
};

export function parsePlanVerificationRecord(body: string) {
  try {
    const parsed = JSON.parse(body) as PlanVerificationQueue;
    if (!parsed?.id || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getPlanVerificationQueues(participantId?: string) {
  const records = await getTenantRetainedRecords("plan-verification-queue");
  return records
    .map((record) => parsePlanVerificationRecord(record.body))
    .filter((queue): queue is PlanVerificationQueue => Boolean(queue))
    .filter((queue) => !participantId || queue.participantId === participantId)
    .sort((a, b) => b.queuedAt.localeCompare(a.queuedAt));
}

export async function savePlanVerificationQueue(input: {
  participantId: string;
  participantName: string;
  fileName: string;
  parserSource: string;
  items: PlanExtraction[];
}) {
  const queuedAt = new Date().toISOString();
  const queue: PlanVerificationQueue = {
    id: `plan-queue-${input.participantId || "unassigned-client"}-${Date.now()}`,
    participantId: input.participantId || "unassigned-client",
    participantName: input.participantName || "Selected client",
    fileName: input.fileName,
    parserSource: input.parserSource || "chatgpt",
    queuedAt,
    items: input.items.map((item) => ({ ...item, verificationStatus: "pending" }))
  };

  const result = await saveTenantRetainedRecord({
    id: queue.id,
    type: "plan-verification-queue",
    title: `Plan verification queue - ${queue.participantName} - ${queue.fileName}`,
    body: JSON.stringify(queue, null, 2),
    savedAt: queuedAt
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("empowernotes:plan-verification-updated"));
  }

  return { ...result, queue };
}
