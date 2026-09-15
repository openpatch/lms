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
import type { ClassAnswer, StageReviewProps } from "../../../lib/game-registry";
import { Given, Missing, Solution } from "../../../components/review-parts";
import MathTex from "../../../components/Math";
import NumberLine, {
  type NumberLineBand,
  type NumberLineMarker,
} from "../../../components/NumberLine";

/**
 * What a player sees once the round is over: the root they were asked for and
 * the one it actually is. Without it the row says they scored nothing and
 * leaves them to work out which of ten roots that was about.
 */

/** √8 is 2.8284271247461903, which is true and unreadable. Three places is
 *  what the stations ask for anyway. */
const readable = (value: number) => Math.round(value * 1000) / 1000;

/** The speed station asks for the value of a root, typed. */
export function RootReview({ question, answer }: StageReviewProps<SpeedQuestion>) {
  return (
    <>
      <MathTex tex={`\\sqrt{${question.value}}`} className="text-lg text-gray-800" />
      <Given answer={answer} />
      {!answer?.correct && <Solution>{readable(question.numericAnswer)}</Solution>}
    </>
  );
}

/**
 * The number line station, reviewed on the line it was played on.
 *
 * The guess and the root are both just numbers, and two numbers three decimals
 * long say nothing about an *estimate* — 2.65 against 2.828 reads as wrong
 * rather than as nearly right. Put back on the line the round was played on,
 * the same pair says it in one look: this is where you put it, this is where it
 * was. The row keeps both numbers underneath for anyone who wants them.
 */
export function NumberLineReview({ question, answer }: StageReviewProps<NumberLineQuestion>) {
  const given = answer ? parseFloat(answer.answer) : NaN;
  return (
    <>
      <MathTex tex={`\\sqrt{${question.value}}`} className="text-lg text-gray-800" />
      <div className="max-w-xs pt-4 pb-1">
        <NumberLine
          min={question.lineMin}
          max={question.lineMax}
          heightClass="h-10"
          markers={[
            ...(isFinite(given)
              ? [{ value: given, tally: true, tone: "mine" } as NumberLineMarker]
              : []),
            { value: question.numericAnswer, tone: "correct" },
          ]}
        />
      </div>
      <Given answer={answer} />
      {/* Shown even when the guess counted: "correct" here means close enough,
          and how close is the whole of what this station teaches. */}
      <Solution>{readable(question.numericAnswer)}</Solution>
    </>
  );
}

/**
 * The class's estimates, for the teacher talking the round through.
 *
 * A column of decimals is the one thing this station's answers must not become:
 * twenty numbers around 2.8 carry no shape at all. On the line they do — where
 * the class sat, how wide the spread ran, and which side of the root it leaned
 * to, with the root itself marked. That is a question to talk about rather than
 * a tally to read out.
 */
export function NumberLineClassAnswers({
  question,
  answers,
}: {
  question: NumberLineQuestion;
  answers: ClassAnswer[];
}) {
  const { t } = useTranslation();
  // One mark per answer given. Two players landing on the same hundredth of a
  // line draw one mark between them, which is what they look like anyway.
  const marks: NumberLineMarker[] = answers.flatMap((given) => {
    const value = parseFloat(given.answer);
    return isFinite(value) ? [{ value, tally: true, tone: "given" as const }] : [];
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <MathTex tex={`\\sqrt{${question.value}}`} display className="text-4xl" />
      <div className="w-full max-w-2xl">
        <div className="mb-2 text-center text-xs text-gray-400">
          {t("game.debrief.whatTheySaid")}
        </div>
        <NumberLine
          min={question.lineMin}
          max={question.lineMax}
          heightClass="h-16"
          markers={[
            ...marks,
            {
              value: question.numericAnswer,
              tone: "correct",
              latex: String(Math.round(question.numericAnswer * 100) / 100),
            },
          ]}
        />
      </div>
    </div>
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

/** The interval one player handed in, or null when nothing usable arrived. */
function reachedInterval(raw: string | undefined): BisectAnswer | null {
  if (raw == null) return null;
  try {
    const parsed = JSON.parse(raw) as BisectAnswer;
    return isFinite(parsed?.min) && isFinite(parsed?.max) && parsed.max > parsed.min
      ? parsed
      : null;
  } catch {
    return null;
  }
}

/**
 * Bisection, reviewed as the thing it is: an interval.
 *
 * "2.75 … 3" is the right numbers in the wrong form — the point of the station
 * is that the interval closes *around* the root, and two decimals side by side
 * show neither the closing nor the around. Shaded on the line it started from,
 * against the root it was chasing, both are one look.
 */
export function BisectReview({ question, answer }: StageReviewProps<BisectQuestion>) {
  const reached = reachedInterval(answer?.answer);
  const root = Math.sqrt(question.value);
  return (
    <>
      <MathTex tex={`\\sqrt{${question.value}}`} className="text-lg text-gray-800" />
      <div className="max-w-xs pt-4 pb-1">
        <NumberLine
          min={question.startMin}
          max={question.startMax}
          majorStep={(question.startMax - question.startMin) / 2}
          heightClass="h-10"
          bands={reached ? [{ min: reached.min, max: reached.max }] : []}
          markers={[{ value: root, tone: "correct" }]}
        />
      </div>
      <Given answer={answer}>
        {reached ? `${reached.min} … ${reached.max}` : null}
      </Given>
      <Solution>{Math.round(root * 1000) / 1000}</Solution>
    </>
  );
}

/**
 * Where the class's intervals ended up.
 *
 * The intervals are shaded over each other, so the line darkens where the
 * class agreed and the one pair of hands that halved the wrong way sits out on
 * its own — which is what the teacher is looking for, and what a column of
 * `{"min":2.75,"max":3,…}` hides completely.
 */
export function BisectClassAnswers({
  question,
  answers,
}: {
  question: BisectQuestion;
  answers: ClassAnswer[];
}) {
  const { t } = useTranslation();
  const bands: NumberLineBand[] = answers.flatMap((given) => {
    const reached = reachedInterval(given.answer);
    // Drawn once per player, so ten identical intervals read as ten.
    return reached
      ? Array.from({ length: given.count }, () => ({
          min: reached.min,
          max: reached.max,
          tone: "given" as const,
        }))
      : [];
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <MathTex tex={`\\sqrt{${question.value}}`} display className="text-4xl" />
      <div className="w-full max-w-2xl">
        <div className="mb-2 text-center text-xs text-gray-400">
          {t("game.debrief.whatTheySaid")}
        </div>
        <NumberLine
          min={question.startMin}
          max={question.startMax}
          majorStep={(question.startMax - question.startMin) / 4}
          heightClass="h-16"
          bands={bands}
          markers={[
            {
              value: Math.sqrt(question.value),
              tone: "correct",
              latex: String(Math.round(Math.sqrt(question.value) * 1000) / 1000),
            },
          ]}
        />
      </div>
    </div>
  );
}
