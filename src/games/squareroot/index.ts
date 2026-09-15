import { squarerootSpec } from "../../../shared/games/squareroot";
import { defineGame } from "../../lib/game-registry";
import {
  BisectClassAnswers,
  BisectReview,
  ClassifyReview,
  NumberLineClassAnswers,
  NumberLineReview,
  RootReview,
  SimplifyReview,
} from "./stages/reviews";
import SpeedStage, { SpeedRulesExample } from "./stages/Speed";
import NumberLineStage, { NumberLineRulesExample } from "./stages/NumberLine";
import ClassifyStage, { ClassifyRulesExample } from "./stages/Classify";
import SimplifyStage, { SimplifyRulesExample } from "./stages/Simplify";
import BisectStage, { BisectRulesExample } from "./stages/Bisect";

export default defineGame(squarerootSpec, {
  speed: { Component: SpeedStage, RulesExample: SpeedRulesExample, Review: RootReview },
  numberline: {
    Component: NumberLineStage,
    RulesExample: NumberLineRulesExample,
    Review: NumberLineReview,
    ClassAnswers: NumberLineClassAnswers,
    // A beat with the root on the line before the next one comes up. Long
    // enough to see how far off the guess was, short enough that ten of them
    // still fit in a minute.
    revealMs: 1600,
  },
  classify: { Component: ClassifyStage, RulesExample: ClassifyRulesExample, Review: ClassifyReview },
  simplify: { Component: SimplifyStage, RulesExample: SimplifyRulesExample, Review: SimplifyReview },
  bisect: {
    Component: BisectStage,
    RulesExample: BisectRulesExample,
    Review: BisectReview,
    ClassAnswers: BisectClassAnswers,
  },
});
