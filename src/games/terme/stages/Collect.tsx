import type { CollectQuestion } from "../../../../shared/games/terme";
import { createTermStage, TermExamples } from "./createTermStage";

/** Gleichartige Terme zusammenfassen, Produkte ausrechnen (EdM 2.2 und 2.3). */
const CollectStage = createTermStage<CollectQuestion>({
  promptKey: "games.terme.prompts.collect",
  hintKey: "games.terme.hints.collect",
});

export default CollectStage;

export function CollectRulesExample() {
  return (
    <TermExamples
      examples={[
        ["3a + 4b - a + 2b", "2a + 6b"],
        ["5x \\cdot (-3y)", "-15xy"],
      ]}
    />
  );
}
