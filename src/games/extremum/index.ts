import { extremumSpec } from "../../../shared/games/extremum";
import { defineGame } from "../../lib/game-registry";
import DeriveStage, { DeriveRulesExample } from "./stages/Derive";
import OptimizeStage, { OptimizeRulesExample } from "./stages/Optimize";

export default defineGame(extremumSpec, {
  derive: { Component: DeriveStage, RulesExample: DeriveRulesExample },
  optimize: { Component: OptimizeStage, RulesExample: OptimizeRulesExample },
});
