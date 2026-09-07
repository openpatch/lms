import { exampleSpec } from "../../../shared/games/example";
import { defineGame } from "../../lib/game-registry";
import TapStage from "./stages/Tap";
import { clicksOf } from "./score";

export default defineGame(exampleSpec, {
  tap: {
    Component: TapStage,
    questionless: true,
    scorePlayer: clicksOf,
  },
});
