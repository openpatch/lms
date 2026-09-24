import type { SpreadsheetChoiceQuestion } from "../../../../shared/games/spreadsheet";
import i18n from "../../../i18n";

type Translate = (key: string) => string;

/** How an option reads: a formula or value as it stands, a chart kind or verdict in words. */
export function optionText(
  question: SpreadsheetChoiceQuestion,
  option: string,
  t: Translate = (key) => i18n.t(key),
): string {
  const prefix = optionKeyPrefix(question);
  return prefix ? t(`${prefix}.${option}`) : option;
}

/** Charts and verdicts predate `optionKeyPrefix`, so rounds saved before it still read. */
export function optionKeyPrefix(question: SpreadsheetChoiceQuestion): string | undefined {
  if (question.optionKeyPrefix) return question.optionKeyPrefix;
  if (question.kind === "chart") return "games.spreadsheet.chartKinds";
  if (question.kind === "check") return "games.spreadsheet.verdicts";
  return undefined;
}

export function choiceAnswerLabel(question: SpreadsheetChoiceQuestion, answer: string): string {
  const option = question.options[Number(answer)];
  return option === undefined ? answer : optionText(question, option);
}
