import type {
  BugQuestion,
  CodeChoiceQuestion,
  LogicQuestion,
  StructogramQuestion,
} from "../../../../shared/games/java";

/**
 * What a stored answer means, for the host's debrief.
 *
 * A stage that takes typed text needs nothing here — what the player wrote is
 * what they wrote. These are the stages whose answers are stored as the index
 * of the thing that was picked, which on a list of "what the class said" would
 * otherwise be a column of small numbers.
 */

export function choiceLabel(question: CodeChoiceQuestion, answer: string): string {
  return question.options[Number(answer)] ?? answer;
}

export function logicLabel(question: LogicQuestion, answer: string): string {
  if (question.kind === "reading") return question.options[Number(answer)] ?? answer;
  return answer;
}

export function structogramLabel(_question: StructogramQuestion, answer: string): string {
  return `#${Number(answer) + 1}`;
}

export function bugLabel(_question: BugQuestion, answer: string): string {
  const line = Number(answer);
  return Number.isFinite(line) ? `#${line + 1}` : answer;
}
