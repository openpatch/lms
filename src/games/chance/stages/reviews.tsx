import { useTranslation } from "react-i18next";
import type { LaplaceQuestion, TreeQuestion } from "../../../../shared/games/chance";
import type { StageReviewProps } from "../../../lib/game-registry";
import { Given, Solution } from "../../../components/review-parts";
import MathTex from "../../../components/Math";

/**
 * What a player sees once the round is over: the situation in the words it was
 * asked in, and the probability it came to. A bare fraction on its own says
 * nothing about which of four urns it belonged to.
 */

export function LaplaceReview({ question, answer }: StageReviewProps<LaplaceQuestion>) {
  const { t } = useTranslation();
  return (
    <>
      <p className="text-sm text-gray-800">
        <span className="mr-1">{question.icon}</span>
        {t(question.setupKey, question.params)}
      </p>
      <p className="text-sm text-gray-600">{t(question.eventKey, question.params)}</p>
      <Given answer={answer}>
        {answer ? <MathTex tex={answer.answer} /> : null}
      </Given>
      {!answer?.correct && (
        <Solution>
          <MathTex tex={`\\frac{${question.favourable}}{${question.outcomes}}`} />
        </Solution>
      )}
    </>
  );
}

/** The two-stage tree: the four probabilities that belonged in the slots. */
export function TreeReview({ question, answer }: StageReviewProps<TreeQuestion>) {
  const { t } = useTranslation();
  return (
    <>
      <p className="text-sm text-gray-800">
        <span className="mr-1">{question.icon}</span>
        {t(question.setupKey, question.params)}
      </p>
      <Given answer={answer}>
        <span className="text-gray-500">{answer?.correct ? "✓" : "✗"}</span>
      </Given>
      {!answer?.correct && (
        <Solution>
          <span className="flex flex-wrap items-baseline gap-3">
            {question.slotAnswers.map((value, index) => (
              <MathTex key={index} tex={value.latex} />
            ))}
          </span>
        </Solution>
      )}
    </>
  );
}
