import { rationalSpec } from "../../../shared/games/rational";
import { defineGame } from "../../lib/game-registry";
import {
  ArrangeClassAnswers,
  ArrangeReview,
  CalculateReview,
  ChangeReview,
  OrderReview,
  SignsReview,
  TermValueReview,
  WallReview,
} from "./stages/reviews";
import ArrangeStage, { ArrangeRulesExample } from "./stages/Arrange";
import CalculateStage, { CalculateRulesExample } from "./stages/Calculate";
import ChangeStage, { ChangeRulesExample } from "./stages/Change";
import OrderStage, { OrderRulesExample } from "./stages/Order";
import SignsStage, {
  PowersRulesExample,
  SignsRulesExample,
  TermsRulesExample,
} from "./stages/Signs";
import WallStage, { WallRulesExample } from "./stages/Wall";

export default defineGame(rationalSpec, {
  arrange: {
    Component: ArrangeStage,
    RulesExample: ArrangeRulesExample,
    Review: ArrangeReview,
    ClassAnswers: ArrangeClassAnswers,
  },
  order: { Component: OrderStage, RulesExample: OrderRulesExample, Review: OrderReview },
  calculate: { Component: CalculateStage, RulesExample: CalculateRulesExample, Review: CalculateReview },
  signs: { Component: SignsStage, RulesExample: SignsRulesExample, Review: SignsReview },
  change: { Component: ChangeStage, RulesExample: ChangeRulesExample, Review: ChangeReview },
  // Both are a term to work out, played the way the sign duel is
  powers: { Component: SignsStage, RulesExample: PowersRulesExample, Review: TermValueReview },
  terms: { Component: SignsStage, RulesExample: TermsRulesExample, Review: TermValueReview },
  wall: { Component: WallStage, RulesExample: WallRulesExample, Review: WallReview },
});
