import { useTranslation } from "react-i18next";
import type {
  BisectAnswer,
  BisectQuestion,
  ClassifyQuestion,
  NumberLineQuestion,
  SimplifyQuestion,
  SpeedQuestion,
} from "../../../../shared/games/squareroot";
import { rootLatex } from "../../../../shared/root-math";
import type { StageReviewProps } from "../../../lib/game-registry";
import { Given, Missing, Solution } from "../../../components/review-parts";
import MathTex from "../../../components/Math";

/**
 * What a player sees once the round is over: the root they were asked for and
 * the one it actually is. Without it the row says they scored nothing and
 * leaves them to work out which of ten roots that was about.
 */

/** Two stations ask for the value of a root — typed, or placed on a line. */
export function RootReview({
  question,
  answer,
}: StageReviewProps<SpeedQuestion | NumberLineQuestion>) {
  return (
    <>
      <MathTex tex={`\\sqrt{${question.value}}`} className="text-lg text-gray-800" />
      <Given answer={answer} />
      {/* √8 is 2.8284271247461903, which is true and unreadable. Three places
          is what the station asked to be placed on a line anyway. */}
      {!answer?.correct && (
        <Solution>{Math.round(question.numericAnswer * 1000) / 1000}</Solution>
      )}
    </>
  );
}

/** Which set does this number live in? */
export function ClassifyReview({ question, answer }: StageReviewProps<ClassifyQuestion>) {
  const { t } = useTranslation();
  // Only the three the stage offers: a client that sent something else must
  // not turn into a translation key on screen.
  const name = (key: string | undefined) =>
    key === "natural" || key === "rational" || key === "irrational"
      ? t(`games.squareroot.${key}`)
      : null;
  return (
    <>
      <MathTex tex={`\\sqrt{${question.value}}`} className="text-lg text-gray-800" />
      <Given answer={answer}>{name(answer?.answer) ?? <Missing />}</Given>
      {!answer?.correct && <Solution>{name(question.classifyAnswer)}</Solution>}
    </>
  );
}

export function SimplifyReview({ question, answer }: StageReviewProps<SimplifyQuestion>) {
  return (
    <>
      <MathTex tex={question.promptLatex} className="text-lg text-gray-800" />
      <Given answer={answer}>
        {answer ? <MathTex tex={answer.answer} /> : null}
      </Given>
      {!answer?.correct && (
        <Solution>
          <MathTex tex={rootLatex(question.answer)} />
        </Solution>
      )}
    </>
  );
}

/** Bisection: where the interval ended up, and where the root really is. */
export function BisectReview({ question, answer }: StageReviewProps<BisectQuestion>) {
  let reached: BisectAnswer | null = null;
  try {
    reached = answer ? (JSON.parse(answer.answer) as BisectAnswer) : null;
  } catch {
    reached = null;
  }
  return (
    <>
      <MathTex tex={`\\sqrt{${question.value}}`} className="text-lg text-gray-800" />
      <Given answer={answer}>
        {reached ? `${reached.min} … ${reached.max}` : null}
      </Given>
      <Solution>{Math.round(Math.sqrt(question.value) * 1000) / 1000}</Solution>
    </>
  );
}
