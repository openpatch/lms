import { chanceSpec } from "../../../shared/games/chance";
import { defineGame } from "../../lib/game-registry";
import { LaplaceReview, TreeReview } from "./stages/reviews";
import LaplaceStage, { LaplaceRulesExample } from "./stages/Laplace";
import TreeStage, { TreeRulesExample } from "./stages/Tree";

export default defineGame(chanceSpec, {
  laplace: { Component: LaplaceStage, RulesExample: LaplaceRulesExample, Review: LaplaceReview },
  tree: { Component: TreeStage, RulesExample: TreeRulesExample, Review: TreeReview },
});
