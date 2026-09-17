import { useTranslation } from "react-i18next";
import Icon from "../../../components/icons";
import {
  OPTIMIZE_TERMS,
  X_CORRECT_AT,
  askedTerms,
  termAnswer,
} from "../../../../shared/games/extremum";
import type {
  DeriveQuestion,
  OptimizeAnswer,
  OptimizeQuestion,
  OptimizeTerm,
} from "../../../../shared/games/extremum";
import { argMax, derive, evaluate, toLatex } from "../../../../shared/polynomial";
import { cardsBySlot, parseAssignment } from "../../../../shared/matching";
import type { ClassAnswer, StageReviewProps } from "../../../lib/game-registry";
import { Given, SlotLine, Solution } from "../../../components/review-parts";
import MathTex from "../../../components/Math";
import NumberLine, { type NumberLineMarker } from "../../../components/NumberLine";
import PlotCanvas from "../../../components/PlotCanvas";

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

/** What one player modelled and where they put the maximum. */
function optimizeAnswer(raw: string | undefined): OptimizeAnswer | null {
  if (raw == null) return null;
  try {
    const parsed = JSON.parse(raw) as OptimizeAnswer;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/** The cards that ended up in the asked slots, in the order they were asked. */
function modelled(question: OptimizeQuestion, sent: OptimizeAnswer | null): (string | null)[] {
  const terms = askedTerms(question);
  const assignment = sent
    ? parseAssignment(JSON.stringify(sent.assignment ?? []), question.cards.length, terms.length)
    : null;
  if (!assignment) return terms.map(() => null);
  return cardsBySlot(assignment, terms.length).map((card) =>
    card == null ? null : question.cards[card],
  );
}

/** Two decimals: an x read off a slider is not worth more than that. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** A step that was handed over rather than asked about — the chain, greyed. */
function GivenStep({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 text-sm text-gray-400">
      <span className="shrink-0">{label}</span>
      {children}
    </div>
  );
}

/**
 * The modelling and the maximum, both shown as what they were.
 *
 * This station asks two things — which steps of the model these terms are, and
 * where the maximum of what comes out lies — and the row used to answer
 * neither: a tick or a cross, then the right terms with no hint of which of
 * them the player had put where. Now each slot carries the card that was
 * dropped in it, the steps that were handed over stand with it so the chain
 * reads in full, and the chosen x goes back on the interval it came from.
 */
export function OptimizeReview({ question, answer }: StageReviewProps<OptimizeQuestion>) {
  const { t } = useTranslation();
  const sent = optimizeAnswer(answer?.answer);
  const terms = askedTerms(question);
  const placed = modelled(question, sent);
  const chosen = sent && isFinite(Number(sent.x)) ? Number(sent.x) : null;
  const best = argMax(question.target, question.xMin, question.xMax);
  const options = question.quantityOptions;
  const pickedQuantity =
    options && sent && options[Number(sent.quantity)] ? options[Number(sent.quantity)] : null;

  return (
    <>
      <p className="text-sm text-gray-800">
        <Icon name={question.icon} className="mr-1" />
        {t(question.contextKey, question.params)}
      </p>

      {answer == null ? (
        <Given answer={answer} />
      ) : (
        <>
          {options == null ? (
            <GivenStep label={t("games.extremum.slots.quantity")}>
              {t(question.quantityKey)}
            </GivenStep>
          ) : (
            <SlotLine
              label={t("games.extremum.slots.quantity")}
              given={pickedQuantity ? t(pickedQuantity) : undefined}
              truth={t(question.quantityKey)}
              correct={pickedQuantity === question.quantityKey}
            />
          )}

          {OPTIMIZE_TERMS.map((term: OptimizeTerm) => {
            const label = t(`games.extremum.slots.${term}`);
            const truth = termAnswer(question, term);
            const slot = terms.indexOf(term);
            if (slot === -1) {
              return (
                <GivenStep key={term} label={label}>
                  <MathTex tex={truth} />
                </GivenStep>
              );
            }
            return (
              <SlotLine
                key={term}
                label={label}
                given={placed[slot] ? <MathTex tex={placed[slot] as string} /> : undefined}
                truth={<MathTex tex={truth} />}
                correct={placed[slot] === truth}
              />
            );
          })}

          {/* The hill itself, which is what the slider was being moved along.
              A number line said where the two values were and nothing about
              why one of them was hard to find; on the curve the player can see
              that the top is flat, how far the ring around it reaches, and
              which side of it they came down on. */}
          <div className="w-full max-w-md pt-3">
            <PlotCanvas
              xMin={question.xMin}
              xMax={question.xMax}
              yMin={question.yMin}
              yMax={question.yMax}
              curves={[{ fn: (x) => evaluate(question.target, x), style: "solution" }]}
              markers={[
                {
                  x: best,
                  y: evaluate(question.target, best),
                  tone: "correct",
                  ring: X_CORRECT_AT * (question.xMax - question.xMin),
                  label: `x = ${round(best)}`,
                },
                ...(chosen == null
                  ? []
                  : [
                      {
                        x: chosen,
                        y: evaluate(question.target, chosen),
                        tone: "mine" as const,
                        label: String(round(chosen)),
                      },
                    ]),
              ]}
              // A row of a review, not a stage with the screen to itself.
              reserveRem={46}
              minHeightRem={12}
            />
          </div>
          <SlotLine
            label="x"
            given={chosen == null ? undefined : chosen}
            truth={round(best)}
            // The station scores x on closeness, so the row calls it right when
            // the whole answer was — anything else contradicts the tick above it.
            correct={answer.correct === true}
          />
        </>
      )}
    </>
  );
}

/**
 * Where the class put the maximum.
 *
 * The modelling half of this station is a handful of cards and reads fine as a
 * list; the other half is a point on an interval, and twenty of those are a
 * shape, not a column. The whole model goes above the line — including the
 * steps this question handed over — since a class that mismodelled was looking
 * for the maximum of the wrong thing.
 */
export function OptimizeClassAnswers({
  question,
  answers,
}: {
  question: OptimizeQuestion;
  answers: ClassAnswer[];
}) {
  const { t } = useTranslation();
  const best = argMax(question.target, question.xMin, question.xMax);
  const asked = askedTerms(question);
  const marks: NumberLineMarker[] = answers.flatMap((given) => {
    const sent = optimizeAnswer(given.answer);
    const x = sent && isFinite(Number(sent.x)) ? Number(sent.x) : null;
    return x == null
      ? []
      : Array.from({ length: given.count }, () => ({
          value: x,
          tally: true,
          tone: "given" as const,
        }));
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="max-w-xl text-center text-gray-700">
        <Icon name={question.icon} className="mr-1" />
        {t(question.contextKey, question.params)}
      </p>
      <div className="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1 text-sm">
        <span className="text-right text-gray-400">{t("games.extremum.slots.quantity")}</span>
        <span className={question.quantityOptions ? "text-gray-800" : "text-gray-400"}>
          {t(question.quantityKey)}
        </span>
        {OPTIMIZE_TERMS.map((term: OptimizeTerm) => (
          <span key={term} className="contents">
            <span className="text-right text-gray-400">
              {t(`games.extremum.slots.${term}`)}
            </span>
            <MathTex
              tex={termAnswer(question, term)}
              className={asked.includes(term) ? "text-gray-800" : "text-gray-400"}
            />
          </span>
        ))}
      </div>
      <div className="w-full max-w-2xl">
        <div className="mb-2 text-center text-xs text-gray-400">
          {t("game.debrief.whatTheySaid")}
        </div>
        <NumberLine
          min={question.xMin}
          max={question.xMax}
          heightClass="h-16"
          // The same tolerance the player's own review draws as a ring: how
          // much of the cloud was near enough to count.
          bands={[
            {
              min: best - X_CORRECT_AT * (question.xMax - question.xMin),
              max: best + X_CORRECT_AT * (question.xMax - question.xMin),
              tone: "correct",
            },
          ]}
          markers={[...marks, { value: best, tone: "correct", latex: `x = ${round(best)}` }]}
        />
      </div>
    </div>
  );
}
