import { rationalSpec } from "../../../shared/games/rational";
import { defineGame } from "../../lib/game-registry";
import ArrangeStage, { ArrangeRulesExample } from "./stages/Arrange";
import CalculateStage, { CalculateRulesExample } from "./stages/Calculate";
import ChangeStage, { ChangeRulesExample } from "./stages/Change";
import SignsStage, { SignsRulesExample } from "./stages/Signs";

export default defineGame(rationalSpec, {
  arrange: { Component: ArrangeStage, RulesExample: ArrangeRulesExample },
  calculate: { Component: CalculateStage, RulesExample: CalculateRulesExample },
  signs: { Component: SignsStage, RulesExample: SignsRulesExample },
  change: { Component: ChangeStage, RulesExample: ChangeRulesExample },
});
