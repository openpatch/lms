import type { RearrangeQuestion } from "../../../../shared/games/terme";
import { createTermStage, TermExamples } from "./createTermStage";

/** Umformen von Formeln (EdM 2.11): solve a formula for one of its variables. */
const RearrangeStage = createTermStage<RearrangeQuestion>({
  promptKey: "games.terme.prompts.rearrange",
  hintKey: "games.terme.hints.rearrange",
  lead: (question) => `${question.target} =`,
});

export default RearrangeStage;

export function RearrangeRulesExample() {
  return (
    <TermExamples
      examples={[
        ["A = a \\cdot b", "b = \\tfrac{A}{a}"],
        ["A = \\tfrac{a + c}{2} \\cdot h", "h = \\tfrac{2A}{a + c}"],
      ]}
    />
  );
}
