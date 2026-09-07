import { analysisSpec } from "../../../shared/games/analysis";
import { defineGame } from "../../lib/game-registry";
import MultipleChoiceStage, { MultipleChoiceRulesExample } from "./stages/MultipleChoice";
import {
  DrawDerivativeRulesExample,
  DrawDerivativeStage,
  DrawGraphRulesExample,
  DrawGraphStage,
} from "./stages/Draw";

export default defineGame(analysisSpec, {
  "multiple-choice": {
    Component: MultipleChoiceStage,
    RulesExample: MultipleChoiceRulesExample,
  },
  "draw-graph": { Component: DrawGraphStage, RulesExample: DrawGraphRulesExample },
  "draw-derivative": { Component: DrawDerivativeStage, RulesExample: DrawDerivativeRulesExample },
});
