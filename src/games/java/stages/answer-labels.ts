import type {
  BugQuestion,
  CodeChoiceQuestion,
  LogicQuestion,
  RobotCell,
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

/** The "x,y" a robot answer is stored as, or null for anything else. */
export function readCell(answer: string | undefined): RobotCell | null {
  if (!answer) return null;
  const [x, y] = answer.split(",").map(Number);
  return Number.isInteger(x) && Number.isInteger(y) ? { x, y } : null;
}

/** A square, as a person would say it: column letter, row number from the top. */
export function cellName(cell: RobotCell): string {
  return `${String.fromCharCode(65 + cell.x)}${cell.y + 1}`;
}

export function robotLabel(_question: unknown, answer: string): string {
  const cell = readCell(answer);
  return cell ? cellName(cell) : answer;
}
