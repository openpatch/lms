import { bitflowSpec } from "../../../shared/games/bitflow";
import { defineGame } from "../../lib/game-registry";
import { ClassBoard, HostBoard, OwnSummary } from "./stages/Board";
import FlowStage from "./stages/Flow";

export default defineGame(bitflowSpec, {
  flow: {
    Component: FlowStage,
    questionless: true,
    scorePlayer: () => 0,
    HostView: HostBoard,
    RoundSummary: OwnSummary,
    ClassSummary: ClassBoard,
  },
});
