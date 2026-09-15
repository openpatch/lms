import { chanceSpec } from "../../../shared/games/chance";
import { defineGame } from "../../lib/game-registry";
import { LaplaceReview, TreeReview } from "./stages/reviews";
import { treeLabel } from "./stages/answer-labels";
import LaplaceStage, { LaplaceRulesExample } from "./stages/Laplace";
import TreeStage, { TreeRulesExample } from "./stages/Tree";

export default defineGame(chanceSpec, {
  laplace: { Component: LaplaceStage, RulesExample: LaplaceRulesExample, Review: LaplaceReview },
  tree: {
    Component: TreeStage,
    RulesExample: TreeRulesExample,
    Review: TreeReview,
    // Without this the host's debrief lists the raw JSON the board sends.
    answerLabel: treeLabel,
  },
});
