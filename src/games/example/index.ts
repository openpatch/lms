import { exampleSpec, tapScore } from "../../../shared/games/example";
import { defineGame } from "../../lib/game-registry";
import TapStage from "./stages/Tap";

export default defineGame(exampleSpec, {
  tap: {
    Component: TapStage,
    questionless: true,
    scorePlayer: tapScore,
  },
});
