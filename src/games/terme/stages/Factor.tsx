import type { FactorQuestion } from "../../../../shared/games/terme";
import { createTermStage, TermExamples } from "./createTermStage";

/** Ausklammern: das Distributivgesetz rückwärts (EdM 2.6). */
const FactorStage = createTermStage<FactorQuestion>({
  promptKey: "games.terme.prompts.factor",
  hintKey: "games.terme.hints.factor",
});

export default FactorStage;

export function FactorRulesExample() {
  return (
    <TermExamples
      examples={[
        ["12x + 18", "6\\left(2x + 3\\right)"],
        ["4a^{2} - 6ab", "2a\\left(2a - 3b\\right)"],
      ]}
    />
  );
}
