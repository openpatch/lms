import type { ExpandQuestion } from "../../../../shared/games/terme";
import { createTermStage, TermExamples } from "./createTermStage";

/** Klammern auflösen — Distributivgesetz, Minus vor der Klammer, zwei Klammern. */
const ExpandStage = createTermStage<ExpandQuestion>({
  promptKey: "games.terme.prompts.expand",
  hintKey: "games.terme.hints.expand",
});

export default ExpandStage;

export function ExpandRulesExample() {
  return (
    <TermExamples
      examples={[
        ["3\\left(2x - 5\\right)", "6x - 15"],
        ["4a - \\left(3a - 7\\right)", "a + 7"],
        ["\\left(x + 3\\right)\\left(x - 2\\right)", "x^{2} + x - 6"],
      ]}
    />
  );
}
