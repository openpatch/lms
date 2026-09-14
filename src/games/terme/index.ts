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

export default defineGame(termeSpec, {
  build: { Component: BuildStage, RulesExample: BuildRulesExample },
  evaluate: { Component: EvaluateStage, RulesExample: EvaluateRulesExample },
  collect: { Component: CollectStage, RulesExample: CollectRulesExample },
  expand: { Component: ExpandStage, RulesExample: ExpandRulesExample },
  factor: { Component: FactorStage, RulesExample: FactorRulesExample },
  binomial: { Component: BinomialStage, RulesExample: BinomialRulesExample },
  zero: { Component: ZeroStage, RulesExample: ZeroRulesExample },
  fraction: { Component: FractionStage, RulesExample: FractionRulesExample },
  rearrange: { Component: RearrangeStage, RulesExample: RearrangeRulesExample },
  inequality: { Component: InequalityStage, RulesExample: InequalityRulesExample },
});
