import { useTranslation } from "react-i18next";
import type { DeriveQuestion, OptimizeQuestion } from "../../../../shared/games/extremum";
import { derive, toLatex } from "../../../../shared/polynomial";
import type { StageReviewProps } from "../../../lib/game-registry";
import { Given, Solution } from "../../../components/review-parts";
import MathTex from "../../../components/Math";

/**
 * What a player sees once the round is over.
 *
 * The derivative is not stored with the question — the polynomial that was
 * asked about is, which is the better half of the deal: f′ comes back out of
 * it with `derive`, and there is one fewer thing in the payload for a curious
 * player to read off before answering.
 */

export function DeriveReview({ question, answer }: StageReviewProps<DeriveQuestion>) {
  return (
    <>
      <MathTex tex={`f(x) = ${question.functionLatex}`} className="text-gray-800" />
      <Given answer={answer}>
        {answer ? <MathTex tex={answer.answer} /> : null}
      </Given>
      {!answer?.correct && (
        <Solution>
          <MathTex tex={`f'(x) = ${toLatex(derive(question.polynomial))}`} />
        </Solution>
      )}
    </>
  );
}

/** Which card was the constraint and which the function to maximise. */
export function OptimizeReview({ question, answer }: StageReviewProps<OptimizeQuestion>) {
  const { t } = useTranslation();
  return (
    <>
      <p className="text-sm text-gray-800">
        <span className="mr-1">{question.icon}</span>
        {t(question.contextKey, question.params)}
      </p>
      <Given answer={answer}>
        <span className="text-gray-500">{answer?.correct ? "✓" : "✗"}</span>
      </Given>
      {!answer?.correct && (
        <Solution>
          <span className="flex flex-wrap items-baseline gap-3">
            {question.slotAnswers.map((latex, index) => (
              <MathTex key={index} tex={latex} />
            ))}
          </span>
        </Solution>
      )}
    </>
  );
}
