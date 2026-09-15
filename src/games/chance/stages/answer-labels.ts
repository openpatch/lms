// What a stored answer means, for the host's debrief. Kept out of the review
// file so that both stay plain: components there, plain functions here.
import type { TreeAnswer, TreeQuestion } from "../../../../shared/games/chance";
import { cardsBySlot, parseAssignment } from "../../../../shared/matching";
import { equals } from "../../../../shared/rational-math";

/** Four branches and an event, in a line a teacher can read down a column of. */
export function treeLabel(question: TreeQuestion, answer: string): string {
  let sent: TreeAnswer | null = null;
  try {
    sent = JSON.parse(answer) as TreeAnswer;
  } catch {
    return answer;
  }
  const assignment = parseAssignment(
    JSON.stringify(sent?.assignment ?? []),
    question.cards.length,
    question.slotAnswers.length,
  );
  const bySlot = assignment ? cardsBySlot(assignment, question.slotAnswers.length) : null;
  const branches = bySlot
    ? bySlot.map((card, slot) =>
        card != null && equals(question.cards[card], question.slotAnswers[slot]) ? "✓" : "✗",
      )
    : ["✗", "✗", "✗", "✗"];
  return `${branches.join("")}  P = ${sent?.event ?? "–"}`;
}
