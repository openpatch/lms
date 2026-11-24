import i18n from "../../../i18n";
import type {
  GraphQuestion,
  ModellQuestion,
  VorschriftQuestion,
} from "../../../../shared/games/zuordnung";

/**
 * How the answer grids and the host's debrief read an answer: the model in
 * words, the term as it was shown — or the number as it was typed.
 */
export function modellAnswerLabel(question: ModellQuestion, answer: string): string {
  const key = question.optionKeys[Number(answer)];
  return key ? i18n.t(key) : answer;
}

export function graphAnswerLabel(question: GraphQuestion, answer: string): string {
  if (question.task === "ablesen") return answer;
  const key = question.optionKeys[Number(answer)];
  return key ? i18n.t(key) : answer;
}

export function vorschriftAnswerLabel(question: VorschriftQuestion, answer: string): string {
  const option = question.options[Number(answer)];
  return option ?? answer;
}

