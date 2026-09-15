import { analysisSpec } from "../../../shared/games/analysis";
import { defineGame } from "../../lib/game-registry";
import { ChoiceReview, DrawClassAnswers, DrawReview } from "./stages/reviews";
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
    Review: ChoiceReview,
  },
  "draw-graph": {
    Component: DrawGraphStage,
    RulesExample: DrawGraphRulesExample,
    Review: DrawReview,
    ClassAnswers: DrawClassAnswers,
  },
  "draw-derivative": {
    Component: DrawDerivativeStage,
    RulesExample: DrawDerivativeRulesExample,
    Review: DrawReview,
    ClassAnswers: DrawClassAnswers,
  },
});
