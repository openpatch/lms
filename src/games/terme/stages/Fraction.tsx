import type { FractionQuestion } from "../../../../shared/games/terme";
import { createTermStage, TermExamples } from "./createTermStage";

/** Verhältnis- und Bruchgleichungen, ohne Doppelbrüche (EdM 2.10). */
const FractionStage = createTermStage<FractionQuestion>({
  promptKey: (question) =>
    question.ask === "domain" ? "games.terme.prompts.domain" : "games.terme.prompts.fraction",
  hintKey: (question) =>
    question.ask === "domain" ? "games.terme.hints.domain" : "games.terme.hints.fraction",
  lead: (question) => `${question.variable} ${question.ask === "domain" ? "\\ne" : "="}`,
});

export default FractionStage;

export function FractionRulesExample() {
  return (
    <TermExamples
      examples={[
        ["\\frac{x}{4} = \\frac{6}{8}", "x = 3"],
        ["\\frac{12}{x} = 4", "x = 3"],
      ]}
    />
  );
}
