import type { BinomialQuestion } from "../../../../shared/games/terme";
import { createTermStage, TermExamples } from "./createTermStage";

/** Die binomischen Formeln in beide Richtungen (EdM 2.8). */
const BinomialStage = createTermStage<BinomialQuestion>({
  promptKey: (question) =>
    question.direction === "expand"
      ? "games.terme.prompts.binomialExpand"
      : "games.terme.prompts.binomialFactor",
  hintKey: (question) =>
    question.direction === "expand"
      ? "games.terme.hints.binomialExpand"
      : "games.terme.hints.binomialFactor",
});

export default BinomialStage;

export function BinomialRulesExample() {
  return (
    <TermExamples
      examples={[
        ["\\left(a + b\\right)^{2}", "a^{2} + 2ab + b^{2}"],
        ["\\left(a - b\\right)^{2}", "a^{2} - 2ab + b^{2}"],
        ["\\left(a + b\\right)\\left(a - b\\right)", "a^{2} - b^{2}"],
      ]}
    />
  );
}
