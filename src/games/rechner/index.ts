import { rechnerSpec } from "../../../shared/games/rechner";
import { defineGame } from "../../lib/game-registry";
import BauenStage, { BauenRulesExample } from "./stages/Bauen";
import EvaStage, { EvaRulesExample } from "./stages/Eva";
import BinaerStage, { BinaerRulesExample } from "./stages/Binaer";
import FarbcodeStage, { FarbcodeRulesExample } from "./stages/Farbcode";
import RechnenStage, { RechnenRulesExample } from "./stages/Rechnen";
import GatterStage, { GatterRulesExample } from "./stages/Gatter";
import ProzessorStage, { ProzessorRulesExample } from "./stages/Prozessor";
import {
  BauenReview,
  BinaerReview,
  EvaReview,
  FarbcodeReview,
  GatterReview,
  ProzessorReview,
  RechnenReview,
} from "./stages/reviews";
import { bauenLabel, evaLabel, farbcodeLabel, prozessorLabel, rechnenLabel } from "./labels";

export default defineGame(rechnerSpec, {
  bauen: { Component: BauenStage, RulesExample: BauenRulesExample, Review: BauenReview, answerLabel: bauenLabel },
  eva: { Component: EvaStage, RulesExample: EvaRulesExample, Review: EvaReview, answerLabel: evaLabel },
  binaer: { Component: BinaerStage, RulesExample: BinaerRulesExample, Review: BinaerReview },
  farbcode: {
    Component: FarbcodeStage,
    RulesExample: FarbcodeRulesExample,
    Review: FarbcodeReview,
    answerLabel: farbcodeLabel,
  },
  rechnen: { Component: RechnenStage, RulesExample: RechnenRulesExample, Review: RechnenReview, answerLabel: rechnenLabel },
  gatter: { Component: GatterStage, RulesExample: GatterRulesExample, Review: GatterReview },
  prozessor: {
    Component: ProzessorStage,
    RulesExample: ProzessorRulesExample,
    Review: ProzessorReview,
    answerLabel: prozessorLabel,
  },
});
