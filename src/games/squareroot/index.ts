import { squarerootSpec } from "../../../shared/games/squareroot";
import { defineGame } from "../../lib/game-registry";
import SpeedStage, { SpeedRulesExample } from "./stages/Speed";
import NumberLineStage, { NumberLineRulesExample } from "./stages/NumberLine";
import ClassifyStage, { ClassifyRulesExample } from "./stages/Classify";
import SimplifyStage, { SimplifyRulesExample } from "./stages/Simplify";
import BisectStage, { BisectRulesExample } from "./stages/Bisect";

export default defineGame(squarerootSpec, {
  speed: { Component: SpeedStage, RulesExample: SpeedRulesExample },
  numberline: { Component: NumberLineStage, RulesExample: NumberLineRulesExample },
  classify: { Component: ClassifyStage, RulesExample: ClassifyRulesExample },
  simplify: { Component: SimplifyStage, RulesExample: SimplifyRulesExample },
  bisect: { Component: BisectStage, RulesExample: BisectRulesExample },
});
