// What a player's device reports while it works through a bitflow flow.
//
// The flow runs entirely on the device: it grades in the browser, keeps the
// attempt in the browser, and sends the server one thing — where the player is
// and how it went, as bitflow's shareable report. That report has had every
// answer taken out by `createShareableReport` before it leaves; the schema
// below is what makes that hold even for a device someone has tampered with.
// A node report is a strict object, so one carrying an `answer` key — or any
// key this does not name — is refused outright, not filtered.
//
// Mirrors `@bitflow/core`'s report shape on purpose rather than importing it:
// the server never needs bitflow itself, only to check what it is sent.

import { z } from "zod";

const ResultStateSchema = z.enum(["correct", "wrong", "unknown"]);

const ScoreSchema = z.object({
  earned: z.number().finite(),
  possible: z.number().finite().nonnegative(),
});

const ResultSchema = z.object({
  state: ResultStateSchema,
  score: ScoreSchema.optional(),
  feedback: z
    .array(
      z.object({
        message: z.string().max(2_000),
        severity: z.enum(["error", "warning", "info", "success"]),
      }),
    )
    .max(50)
    .optional(),
  allowRetry: z.boolean().optional(),
  detail: z.record(z.string(), z.unknown()).optional(),
});

/** One step's report, without the answer — and refusing one that has it. */
export const ShareableNodeReportSchema = z.strictObject({
  nodeId: z.string().min(1).max(200),
  bitType: z.string().min(1).max(100),
  result: ResultSchema.optional(),
  tries: z.number().int().nonnegative(),
  elapsedMs: z.number().nonnegative().optional(),
});

export const ShareableReportSchema = z.object({
  schemaVersion: z.literal(1),
  flowId: z.string().min(1),
  flowSchemaVersion: z.number().int(),
  attemptId: z.string().min(1),
  status: z.enum(["completed", "abandoned"]),
  subject: z.object({ id: z.string().optional(), label: z.string().optional() }).optional(),
  nodeReports: z.array(ShareableNodeReportSchema).max(500),
  score: ScoreSchema.optional(),
  startedAt: z.string(),
  completedAt: z.string(),
});
export type ShareableReport = z.infer<typeof ShareableReportSchema>;

/** Where one player is in the flow, and — once they have been marked on
 *  anything — their report. */
export const FlowProgressSchema = z.object({
  status: z.enum(["inProgress", "completed", "abandoned"]),
  visited: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  report: ShareableReportSchema.optional(),
});
export type FlowProgress = z.infer<typeof FlowProgressSchema>;

/** A report frame is refused above this size, however it is shaped. */
export const MAX_PROGRESS_BYTES = 200_000;

/** What the stage keeps in `extra`: one entry per player. */
export interface FlowExtra {
  progress: Record<string, FlowProgress>;
}

/** A player's earned and possible points, if their report has a score yet. */
export function scoreOf(progress: FlowProgress | undefined): { earned: number; possible: number } | null {
  const score = progress?.report?.score;
  return score && score.possible > 0 ? score : null;
}
