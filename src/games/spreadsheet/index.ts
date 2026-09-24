import { spreadsheetSpec } from "../../../shared/games/spreadsheet";
import { defineGame } from "../../lib/game-registry";
import ChoiceStage, {
  ChartRulesExample,
  ChartStage,
  SpreadsheetRulesExample,
} from "./stages/ChoiceStage";
import { choiceAnswerLabel } from "./stages/answer-labels";
import { SpreadsheetReview } from "./stages/reviews";

export default defineGame(spreadsheetSpec, {
  references: {
    Component: ChoiceStage,
    RulesExample: SpreadsheetRulesExample,
    revealMs: 900,
    Review: SpreadsheetReview,
    answerLabel: choiceAnswerLabel,
  },
  growth: {
    Component: ChoiceStage,
    RulesExample: SpreadsheetRulesExample,
    revealMs: 900,
    Review: SpreadsheetReview,
    answerLabel: choiceAnswerLabel,
  },
  charts: {
    Component: ChartStage,
    RulesExample: ChartRulesExample,
    revealMs: 900,
    Review: SpreadsheetReview,
    answerLabel: choiceAnswerLabel,
  },
});
