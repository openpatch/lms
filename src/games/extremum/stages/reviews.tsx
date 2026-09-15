import { useTranslation } from "react-i18next";
import type {
  DeriveQuestion,
  OptimizeAnswer,
  OptimizeQuestion,
} from "../../../../shared/games/extremum";
import { argMax, derive, toLatex } from "../../../../shared/polynomial";
import { cardsBySlot, parseAssignment } from "../../../../shared/matching";
import type { ClassAnswer, StageReviewProps } from "../../../lib/game-registry";
import { Given, SlotLine, Solution } from "../../../components/review-parts";
import MathTex from "../../../components/Math";
import NumberLine, { type NumberLineMarker } from "../../../components/NumberLine";

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

/** The cards that ended up in the two slots, in slot order. */
function modelled(question: OptimizeQuestion, sent: OptimizeAnswer | null): (string | null)[] {
  const assignment = sent
    ? parseAssignment(
        JSON.stringify(sent.assignment ?? []),
        question.cards.length,
        question.slotAnswers.length,
      )
    : null;
  if (!assignment) return question.slotAnswers.map(() => null);
  return cardsBySlot(assignment, question.slotAnswers.length).map((card) =>
    card == null ? null : question.cards[card],
  );
}

/**
 * The modelling and the maximum, both shown as what they were.
 *
 * This station asks two things — which term is the constraint and which is
 * being maximised, then where that maximum lies — and the row used to answer
 * neither: a tick or a cross, then the two right terms with no hint of which
 * of them the player had put where. Now each slot carries the card that was
 * dropped in it, and the chosen x goes back on the interval it was chosen from.
 */
export function OptimizeReview({ question, answer }: StageReviewProps<OptimizeQuestion>) {
  const { t } = useTranslation();
  const sent = optimizeAnswer(answer?.answer);
  const placed = modelled(question, sent);
  const chosen = sent && isFinite(Number(sent.x)) ? Number(sent.x) : null;
  const best = argMax(question.target, question.xMin, question.xMax);

  return (
    <>
      <p className="text-sm text-gray-800">
        <span className="mr-1">{question.icon}</span>
        {t(question.contextKey, question.params)}
      </p>

      {answer == null ? (
        <Given answer={answer} />
      ) : (
        <>
          {(["constraint", "target"] as const).map((slot, index) => (
            <SlotLine
              key={slot}
              label={t(`games.extremum.slots.${slot}`)}
              given={placed[index] ? <MathTex tex={placed[index] as string} /> : undefined}
              truth={<MathTex tex={question.slotAnswers[index]} />}
              correct={placed[index] === question.slotAnswers[index]}
            />
          ))}

          <div className="max-w-xs pt-4 pb-1">
            <NumberLine
              min={question.xMin}
              max={question.xMax}
              heightClass="h-10"
              markers={[
                ...(chosen == null
                  ? []
                  : [{ value: chosen, tally: true, tone: "mine" } as NumberLineMarker]),
                { value: best, tone: "correct" },
              ]}
            />
          </div>
          <SlotLine
            label="x"
            given={chosen == null ? undefined : chosen}
            truth={Math.round(best * 100) / 100}
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
 * The modelling half of this station is two cards and reads fine as a list;
 * the other half is a point on an interval, and twenty of those are a shape,
 * not a column. The terms that belonged in the slots go above the line, since
 * a class that mismodelled was looking for the maximum of the wrong thing.
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
        <span className="mr-1">{question.icon}</span>
        {t(question.contextKey, question.params)}
      </p>
      <div className="flex flex-wrap justify-center gap-6">
        {(["constraint", "target"] as const).map((slot, index) => (
          <span key={slot} className="flex items-baseline gap-2 text-sm">
            <span className="text-gray-400">{t(`games.extremum.slots.${slot}`)}</span>
            <MathTex tex={question.slotAnswers[index]} className="text-gray-800" />
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
          markers={[
            ...marks,
            { value: best, tone: "correct", latex: `x = ${Math.round(best * 100) / 100}` },
          ]}
        />
      </div>
    </div>
  );
}
