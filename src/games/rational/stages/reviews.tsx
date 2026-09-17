import { useTranslation } from "react-i18next";
import Icon from "../../../components/icons";
import type {
  ArrangeQuestion,
  CalculateQuestion,
  ChangeQuestion,
  OrderQuestion,
  SignsQuestion,
} from "../../../../shared/games/rational";
import { orderSolution, readOrderAnswer } from "../../../../shared/games/rational";
import { operatorLatex, toValue } from "../../../../shared/rational-math";
import type { ClassAnswer, StageReviewProps } from "../../../lib/game-registry";
import { Given, Solution } from "../../../components/review-parts";
import MathTex from "../../../components/Math";
import NumberLine, { type NumberLineMarker } from "../../../components/NumberLine";

/**
 * What a player sees once the round is over.
 *
 * Every question here carries the LaTeX it was shown in, so a row can put the
 * task back on screen beside the answer rather than leaving a number on its
 * own — which for a round of ten fractions is a number about nothing.
 */

/** What one player sent: one value per item, in the order the items were
 *  shown, and null for an item left lying. */
function placements(raw: string | undefined, count: number): (number | null)[] | null {
  if (raw == null) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== count) return null;
    return parsed.map((value) => (typeof value === "number" && isFinite(value) ? value : null));
  } catch {
    return null;
  }
}

/** A placement this far off the mark — as a share of the line — is worth
 *  calling out. The station scores on closeness, and this is about a fifth of
 *  the way to scoring nothing at all. */
const ARRANGE_TOLERANCE = 0.04;

/**
 * Placing numbers on a line, reviewed on the line they were placed on.
 *
 * The row used to list the numbers in the right order, which is the answer to
 * a question this station never asks: it asks *where*, and the ordering falls
 * out of that. So the marks go back where they were put, the right spots are
 * marked beside them, and the numbers underneath say which mark was whose.
 */
export function ArrangeReview({ question, answer }: StageReviewProps<ArrangeQuestion>) {
  const span = question.lineMax - question.lineMin;
  const placed = placements(answer?.answer, question.items.length);

  const marks: NumberLineMarker[] = question.items.flatMap((item, index) => {
    const value = placed?.[index];
    const truth: NumberLineMarker = { value: toValue(item), tone: "correct" };
    return value == null ? [truth] : [{ value, tally: true, tone: "mine" }, truth];
  });

  return (
    <>
      <div className="max-w-xs pt-4 pb-1">
        <NumberLine
          min={question.lineMin}
          max={question.lineMax}
          heightClass="h-10"
          markers={marks}
        />
      </div>
      {placed == null ? (
        <Given answer={answer} />
      ) : (
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
          {question.items.map((item, index) => {
            const value = placed[index];
            const truth = toValue(item);
            const off = value == null || Math.abs(value - truth) > ARRANGE_TOLERANCE * span;
            return (
              <span key={index} className="flex items-baseline gap-1">
                <MathTex tex={item.latex} className="text-gray-800" />
                <span className={off ? "text-rose-500" : "text-gray-500"}>{value ?? "–"}</span>
                {off && (
                  <>
                    <span className="text-gray-300">&rarr;</span>
                    <span className="font-medium text-emerald-600">
                      {Math.round(truth * 100) / 100}
                    </span>
                  </>
                )}
              </span>
            );
          })}
        </div>
      )}
    </>
  );
}

/**
 * Where the class put them.
 *
 * Every placement of every number as a tally, with the spots they belonged on
 * marked and labelled. A cluster sitting well away from its label is the thing
 * to talk about — usually a negative fraction put on the wrong side of −1 —
 * and it is invisible in a list of the arrays the class sent.
 */
export function ArrangeClassAnswers({
  question,
  answers,
}: {
  question: ArrangeQuestion;
  answers: ClassAnswer[];
}) {
  const { t } = useTranslation();
  const marks: NumberLineMarker[] = answers.flatMap((given) => {
    const placed = placements(given.answer, question.items.length);
    return (placed ?? []).flatMap((value) =>
      value == null ? [] : [{ value, tally: true, tone: "given" as const }],
    );
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap justify-center gap-3 text-2xl text-gray-800">
        {question.items.map((item, index) => (
          <MathTex key={index} tex={item.latex} />
        ))}
      </div>
      <div className="w-full max-w-2xl">
        <div className="mb-2 text-center text-xs text-gray-400">
          {t("game.debrief.whatTheySaid")}
        </div>
        <NumberLine
          min={question.lineMin}
          max={question.lineMax}
          minorStep={0.25}
          heightClass="h-16"
          markers={[
            ...marks,
            ...question.items.map((item) => ({
              value: toValue(item),
              tone: "correct" as const,
              latex: item.latex,
            })),
          ]}
        />
      </div>
    </div>
  );
}

/** The numbers of one ordering, written out as the line the exercise asks for.
 *  `broken` marks the links where the sequence turns back on itself. */
function OrderChain({
  question,
  order,
  mark,
}: {
  question: OrderQuestion;
  order: number[];
  /** Whether a step that goes the wrong way is called out. Off for the
   *  solution, which by definition has no such step. */
  mark: boolean;
}) {
  const relation = question.direction === "asc" ? "<" : ">";
  const sign = question.direction === "asc" ? 1 : -1;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {order.map((index, slot) => {
        const value = toValue(question.items[index]);
        const previous = slot > 0 ? toValue(question.items[order[slot - 1]]) : null;
        const broken = mark && previous != null && sign * (value - previous) < 0;
        return (
          <span key={slot} className="flex items-center gap-2">
            {slot > 0 && (
              <span className={broken ? "font-bold text-rose-500" : "text-gray-300"}>
                {relation}
              </span>
            )}
            <MathTex
              tex={question.items[index].latex}
              className={broken ? "text-rose-500" : "text-gray-800"}
            />
          </span>
        );
      })}
    </div>
  );
}

/**
 * An ordering, reviewed as the line it was meant to be.
 *
 * The station scores the pairs that stand the right way round, so "wrong" here
 * is almost never the whole line — it is one number in the wrong place, and a
 * row that said nothing but a cross would hide exactly the thing worth seeing.
 * So the player's own line goes back on screen with the steps that turn back on
 * themselves marked, which points at the number that was misread rather than at
 * the answer. Usually that is a Betrag sorted where its minus sign said, or two
 * negative fractions put the way round they would go if they were positive.
 */
export function OrderReview({ question, answer }: StageReviewProps<OrderQuestion>) {
  const order = readOrderAnswer(answer?.answer, question.items.length);

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-500">
        {question.items.map((item, index) => (
          <MathTex key={index} tex={item.latex} />
        ))}
      </div>
      {order == null ? (
        <Given answer={answer} />
      ) : (
        <Given answer={answer}>
          <OrderChain question={question} order={order} mark />
        </Given>
      )}
      {!answer?.correct && (
        <Solution>
          <OrderChain question={question} order={orderSolution(question)} mark={false} />
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

/** The typed answer as a number. A minus sign is a minus sign, whichever of
 *  the two the keyboard produced. */
function asNumber(raw: string | undefined): number | null {
  if (raw == null) return null;
  const value = Number(raw.replace("−", "-").replace(",", ".").trim());
  return isFinite(value) ? value : null;
}

/**
 * A state and the changes applied to it, on the line they were followed on.
 *
 * Both ways of asking come down to a place on the line: name the end state and
 * you have said where you land, name the change and the line says it for you.
 * So the row shows where the player landed against where they should have —
 * which for a round about crossing zero is the difference between "−3 is
 * wrong" and seeing that they went the wrong way.
 */
export function ChangeReview({ question, answer }: StageReviewProps<ChangeQuestion>) {
  const { t } = useTranslation();
  const changes = question.changes
    .map((change) => `${change > 0 ? "+" : "−"}${Math.abs(change)}`)
    .join("  ");

  const given = asNumber(answer?.answer);
  // Naming the change puts the player somewhere too: start, plus what they said.
  const landed = given == null ? null : question.ask === "change" ? question.start + given : given;
  const truth = question.ask === "change" ? question.start + question.answer : question.answer;

  return (
    <>
      <p className="text-sm text-gray-800">
        <Icon name={question.icon} className="mr-1" />
        {t(question.contextKey)}
      </p>
      <p className="font-mono text-sm text-gray-600">
        {question.start}
        {question.unit} {changes}
      </p>
      <div className="max-w-xs pt-4 pb-1">
        <NumberLine
          min={question.lineMin}
          max={question.lineMax}
          heightClass="h-10"
          markers={[
            { value: question.start, tally: true, tone: "given" },
            // Drawn even when it lands on the right answer. Suppressing it
            // there left the start state as the only tally on the line, and a
            // player who had got it right read that pale mark as their own —
            // "I said −9 and the review marks −7".
            ...(landed == null ? [] : [{ value: landed, tally: true, tone: "mine" } as const]),
            { value: truth, tone: "correct" },
          ]}
        />
      </div>
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
