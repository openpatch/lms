import type { SpreadsheetChoiceQuestion } from "../../../../shared/games/spreadsheet";

export function choiceAnswerLabel(question: SpreadsheetChoiceQuestion, answer: string): string {
  const index = Number(answer);
  return question.options[index] ?? answer;
}
