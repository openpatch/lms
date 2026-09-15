import { extremumSpec } from "../../../shared/games/extremum";
import { defineGame } from "../../lib/game-registry";
import { DeriveReview, OptimizeReview } from "./stages/reviews";
import DeriveStage, { DeriveRulesExample } from "./stages/Derive";
import OptimizeStage, { OptimizeRulesExample } from "./stages/Optimize";

export default defineGame(extremumSpec, {
  derive: { Component: DeriveStage, RulesExample: DeriveRulesExample, Review: DeriveReview },
  optimize: { Component: OptimizeStage, RulesExample: OptimizeRulesExample, Review: OptimizeReview },
});
