import { useTranslation } from "react-i18next";
import type {
  ArrangeQuestion,
  CalculateQuestion,
  ChangeQuestion,
  SignsQuestion,
} from "../../../../shared/games/rational";
import { operatorLatex, toValue } from "../../../../shared/rational-math";
import type { StageReviewProps } from "../../../lib/game-registry";
import { Given, Solution } from "../../../components/review-parts";
import MathTex from "../../../components/Math";

/**
 * What a player sees once the round is over.
 *
 * Every question here carries the LaTeX it was shown in, so a row can put the
 * task back on screen beside the answer rather than leaving a number on its
 * own — which for a round of ten fractions is a number about nothing.
 */

/** Ordering numbers on a line: the numbers, smallest first. */
export function ArrangeReview({ question, answer }: StageReviewProps<ArrangeQuestion>) {
  const ordered = [...question.items].sort((a, b) => toValue(a) - toValue(b));
  return (
    <>
      <div className="flex flex-wrap items-baseline gap-2 text-gray-800">
        {question.items.map((item, index) => (
          <MathTex key={index} tex={item.latex} />
        ))}
      </div>
      <Given answer={answer} />
      {!answer?.correct && (
        <Solution>
          <span className="flex flex-wrap items-baseline gap-2">
            {ordered.map((item, index) => (
              <span key={index} className="flex items-baseline gap-2">
                {index > 0 && <span className="text-gray-400">&lt;</span>}
                <MathTex tex={item.latex} />
              </span>
            ))}
          </span>
        </Solution>
      )}
    </>
  );
}

export function CalculateReview({ question, answer }: StageReviewProps<CalculateQuestion>) {
  const term = `${question.left.latex} ${operatorLatex(question.operator)} ${question.right.latex}`;
  return (
    <>
      <MathTex tex={term} className="text-lg text-gray-800" />
      <Given answer={answer}>
        {answer ? <MathTex tex={answer.answer} /> : null}
      </Given>
      {!answer?.correct && (
        <Solution>
          <MathTex tex={question.result.latex} />
        </Solution>
      )}
    </>
  );
}

/** Only the sign is asked for, so only the sign is shown. */
export function SignsReview({ question, answer }: StageReviewProps<SignsQuestion>) {
  const sign = question.result > 0 ? "+" : "−";
  return (
    <>
      <MathTex tex={question.termLatex} className="text-lg text-gray-800" />
      <Given answer={answer} />
      {!answer?.correct && <Solution>{sign}</Solution>}
    </>
  );
}

/** A state and the changes applied to it, in the words it was asked in. */
export function ChangeReview({ question, answer }: StageReviewProps<ChangeQuestion>) {
  const { t } = useTranslation();
  const changes = question.changes
    .map((change) => `${change > 0 ? "+" : "−"}${Math.abs(change)}`)
    .join("  ");
  return (
    <>
      <p className="text-sm text-gray-800">
        <span className="mr-1">{question.icon}</span>
        {t(question.contextKey)}
      </p>
      <p className="font-mono text-sm text-gray-600">
        {question.start}
        {question.unit} {changes}
      </p>
      <Given answer={answer} />
      {!answer?.correct && (
        <Solution>
          {question.answer}
          {question.unit}
        </Solution>
      )}
    </>
  );
}
