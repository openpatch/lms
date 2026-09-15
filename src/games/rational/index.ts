import { rationalSpec } from "../../../shared/games/rational";
import { defineGame } from "../../lib/game-registry";
import {
  ArrangeClassAnswers,
  ArrangeReview,
  CalculateReview,
  ChangeReview,
  SignsReview,
} from "./stages/reviews";
import ArrangeStage, { ArrangeRulesExample } from "./stages/Arrange";
import CalculateStage, { CalculateRulesExample } from "./stages/Calculate";
import ChangeStage, { ChangeRulesExample } from "./stages/Change";
import SignsStage, { SignsRulesExample } from "./stages/Signs";

export default defineGame(rationalSpec, {
  arrange: {
    Component: ArrangeStage,
    RulesExample: ArrangeRulesExample,
    Review: ArrangeReview,
    ClassAnswers: ArrangeClassAnswers,
  },
  calculate: { Component: CalculateStage, RulesExample: CalculateRulesExample, Review: CalculateReview },
  signs: { Component: SignsStage, RulesExample: SignsRulesExample, Review: SignsReview },
  change: { Component: ChangeStage, RulesExample: ChangeRulesExample, Review: ChangeReview },
});
