import type { InequalityQuestion } from "../../../../shared/games/terme";
import { createTermStage, TermExamples } from "./createTermStage";

/** Ungleichungen (EdM 2.12) — the whole solution is typed, relation included,
 *  because deciding whether the relation turns round is the exercise. */
const InequalityStage = createTermStage<InequalityQuestion>({
  promptKey: "games.terme.prompts.inequality",
  hintKey: "games.terme.hints.inequality",
  lead: "",
});

export default InequalityStage;

export function InequalityRulesExample() {
  return (
    <TermExamples
      examples={[
        ["3x - 5 < 7", "x < 4"],
        ["-2x > 6", "x < -3"],
      ]}
    />
  );
}
