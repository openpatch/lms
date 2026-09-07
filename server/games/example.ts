import { exampleSpec } from "../../shared/games/example";
import type { StageHandler } from "../framework";
import { createStageGame } from "../framework";

/** Tap stage: no questions at all, just a click counter per player. */
const tapStage: StageHandler = {
  id: "tap",
  createQuestions: () => [],
  createExtra: () => ({ clicks: {} as Record<string, number> }),
  // Never called: the stage has no questions.
  evaluate: () => ({ correct: false, points: 0 }),

  onAction(data, payload, playerId) {
    if (payload.action !== "click") return false;
    const clicks = data.extra.clicks as Record<string, number>;
    clicks[playerId] = (clicks[playerId] ?? 0) + 1;
    return true;
  },

  scorePlayer(data, playerId) {
    const clicks = data.extra.clicks as Record<string, number>;
    return clicks[playerId] ?? 0;
  },
};

export default createStageGame(exampleSpec, [tapStage]);
