import { zuordnungSpec } from "../../../shared/games/zuordnung";
import { defineGame } from "../../lib/game-registry";
import { liveScore } from "../../../shared/framework";
import {
  GraphReview,
  ModellReview,
  TabelleReview,
  VorschriftReview,
} from "./stages/reviews";
import {
  graphAnswerLabel,
  modellAnswerLabel,
  vorschriftAnswerLabel,
} from "./stages/answer-labels";
import ModellStage, { ModellRulesExample } from "./stages/Modell";
import TabelleStage, { TabelleRulesExample } from "./stages/Tabelle";
import KuecheStage, { KuecheRulesExample } from "./stages/Kueche";
import KuecheSummary from "./stages/KuecheSummary";
import GraphStage, { GraphRulesExample } from "./stages/Graph";
import VorschriftStage, { VorschriftRulesExample } from "./stages/Vorschrift";

// The kitchen is a live station: there is no question list to review, the
// score comes from the round's tally, and the round ends with a summary.
const kuecheLive = {
  questionless: true,
  scorePlayer: liveScore,
  RoundSummary: KuecheSummary,
};

export default defineGame(zuordnungSpec, {
  modell: {
    Component: ModellStage,
    RulesExample: ModellRulesExample,
    Review: ModellReview,
    answerLabel: modellAnswerLabel,
  },
  tabelle: {
    Component: TabelleStage,
    RulesExample: TabelleRulesExample,
    Review: TabelleReview,
    // Hold the filled-in table on screen: the answer where the answer was given.
    revealMs: 2000,
    calculator: true,
  },
  kueche: {
    ...kuecheLive,
    Component: KuecheStage,
    RulesExample: KuecheRulesExample,
    // Scaling a recipe by a factor is exactly the arithmetic the calculator
    // is for — it sits in the bar next to "Servieren".
    calculator: true,
  },
  graph: {
    Component: GraphStage,
    RulesExample: GraphRulesExample,
    Review: GraphReview,
    answerLabel: graphAnswerLabel,
    revealMs: 2000,
    calculator: true,
  },
  vorschrift: {
    Component: VorschriftStage,
    RulesExample: VorschriftRulesExample,
    Review: VorschriftReview,
    answerLabel: vorschriftAnswerLabel,
  },
});
