import { termeSpec } from "../../../shared/games/terme";
import { defineGame } from "../../lib/game-registry";
import BinomialStage, { BinomialRulesExample } from "./stages/Binomial";
import BuildStage, { BuildRulesExample } from "./stages/Build";
import CollectStage, { CollectRulesExample } from "./stages/Collect";
import EvaluateStage, { EvaluateRulesExample } from "./stages/Evaluate";
import ExpandStage, { ExpandRulesExample } from "./stages/Expand";
import FactorStage, { FactorRulesExample } from "./stages/Factor";
import FractionStage, { FractionRulesExample } from "./stages/Fraction";
import InequalityStage, { InequalityRulesExample } from "./stages/Inequality";
import RearrangeStage, { RearrangeRulesExample } from "./stages/Rearrange";
import ZeroStage, { ZeroRulesExample } from "./stages/Zero";
import { BuildReview, EvaluateReview, TermReview, ZeroReview } from "./stages/reviews";

export default defineGame(termeSpec, {
  build: { Component: BuildStage, RulesExample: BuildRulesExample, Review: BuildReview },
  evaluate: { Component: EvaluateStage, RulesExample: EvaluateRulesExample, Review: EvaluateReview },
  collect: { Component: CollectStage, RulesExample: CollectRulesExample, Review: TermReview },
  expand: { Component: ExpandStage, RulesExample: ExpandRulesExample, Review: TermReview },
  factor: { Component: FactorStage, RulesExample: FactorRulesExample, Review: TermReview },
  binomial: { Component: BinomialStage, RulesExample: BinomialRulesExample, Review: TermReview },
  zero: { Component: ZeroStage, RulesExample: ZeroRulesExample, Review: ZeroReview },
  fraction: { Component: FractionStage, RulesExample: FractionRulesExample, Review: TermReview },
  rearrange: { Component: RearrangeStage, RulesExample: RearrangeRulesExample, Review: TermReview },
  inequality: { Component: InequalityStage, RulesExample: InequalityRulesExample, Review: TermReview },
});
