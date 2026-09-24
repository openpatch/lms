import { spreadsheetSpec } from "../../../shared/games/spreadsheet";
import { defineGame } from "../../lib/game-registry";
import ChoiceStage, {
  ChartRulesExample,
  ChartStage,
  CheckRulesExample,
  ConditionRulesExample,
  FunctionRulesExample,
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
  functions: {
    Component: ChoiceStage,
    RulesExample: FunctionRulesExample,
    revealMs: 900,
    Review: SpreadsheetReview,
    answerLabel: choiceAnswerLabel,
  },
  conditions: {
    Component: ChoiceStage,
    RulesExample: ConditionRulesExample,
    revealMs: 900,
    Review: SpreadsheetReview,
    answerLabel: choiceAnswerLabel,
  },
  check: {
    Component: ChoiceStage,
    RulesExample: CheckRulesExample,
    revealMs: 900,
    Review: SpreadsheetReview,
    answerLabel: choiceAnswerLabel,
  },
});
