// What a stored answer means, for the host's debrief. Kept out of the review
// file so that both stay plain: components there, plain functions here.
import type {
  SwapAnswer,
  SwapQuestion,
  UntangleAnswer,
  UntangleQuestion,
} from "../../../../shared/games/intuition";
import { countCrossings } from "../../../../shared/intuition-graph";
import type { Point } from "../../../../shared/intuition-graph";

/** How the layout was left, for the host's list. */
export function kabelLabel(question: UntangleQuestion, answer: string): string {
  let nodes: Point[] | null = null;
  try {
    nodes = (JSON.parse(answer) as UntangleAnswer)?.nodes ?? null;
  } catch {
    nodes = null;
  }
  if (!Array.isArray(nodes)) return "–";
  return `${countCrossings(nodes, question.edges)} ✕`;
}

/** How many swaps it took, for the host's list. */
export function nachbarnLabel(question: SwapQuestion, answer: string): string {
  try {
    const sent = JSON.parse(answer) as SwapAnswer;
    const swaps = Array.isArray(sent?.swaps) ? sent.swaps.length : null;
    return swaps == null ? "–" : `${swaps} / ${question.minSwaps}`;
  } catch {
    return "–";
  }
}
