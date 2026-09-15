import { squarerootSpec } from "../../../shared/games/squareroot";
import { defineGame } from "../../lib/game-registry";
import {
  BisectReview,
  ClassifyReview,
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
  numberline: { Component: NumberLineStage, RulesExample: NumberLineRulesExample, Review: RootReview },
  classify: { Component: ClassifyStage, RulesExample: ClassifyRulesExample, Review: ClassifyReview },
  simplify: { Component: SimplifyStage, RulesExample: SimplifyRulesExample, Review: SimplifyReview },
  bisect: { Component: BisectStage, RulesExample: BisectRulesExample, Review: BisectReview },
});
