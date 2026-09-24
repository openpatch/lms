// The server half of a bitflow flow played by a class.
//
// It never sees the flow. The document sits at the address the teacher gave,
// and each player's device fetches it, runs it and marks it; what arrives here
// is where each player is and, once they have been marked, a report with every
// answer already taken out — checked again on the way in, since a device can
// be changed by the person holding it. So the server holds names against
// progress and results, and nothing of what anybody wrote.

import type { StageQuestion } from "../../shared/framework";
import { bitflowSpec } from "../../shared/games/bitflow";
import {
  FlowProgressSchema,
  MAX_PROGRESS_BYTES,
  type FlowExtra,
} from "../../shared/bitflow-progress";
import { createStageGame, type StageHandler } from "../framework";

const flowStage: StageHandler<StageQuestion> = {
  id: "flow",
  // There are no questions: the flow is marked on the player's device.
  forPlayer: (question) => question,

  createQuestions: () => [],

  // Never called: with no questions there is nothing to answer.
  evaluate: () => ({ correct: false, points: 0 }),

  createExtra: (): FlowExtra & Record<string, unknown> => ({ progress: {} }),

  getDurationSeconds: ({ settings }) => Number(settings.minutes) * 60,

  onAction(data, payload, playerId) {
    if (payload.action !== "progress") return false;
    // Measured before it is parsed: the shape below bounds the number of
    // steps, not how much text a tampered device can put in a detail field.
    if (JSON.stringify(payload.progress ?? null).length > MAX_PROGRESS_BYTES) return false;
    const parsed = FlowProgressSchema.safeParse(payload.progress);
    if (!parsed.success) return false;
    const extra = data.extra as unknown as FlowExtra;
    extra.progress = { ...extra.progress, [playerId]: parsed.data };
    return true;
  },

  // Each player sees their own progress and nobody else's.
  extraForPlayer(extra, playerId) {
    const own = (extra as unknown as FlowExtra).progress?.[playerId];
    return { progress: own ? { [playerId]: own } : {} };
  },

  // Over when everybody has finished the flow — or on the clock, or when the
  // teacher ends it.
  isFinished(data, players) {
    const progress = (data.extra as unknown as FlowExtra).progress ?? {};
    return players.every((player) => progress[player.id]?.status === "completed");
  },

  // Unranked: nobody wins a flow, so nobody is crowned for one.
  scorePlayer: () => 0,
};

export default createStageGame(bitflowSpec, [flowStage]);
