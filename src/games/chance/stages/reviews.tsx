import { useTranslation } from "react-i18next";
import Icon from "../../../components/icons";
import type { LaplaceQuestion, TreeAnswer, TreeQuestion } from "../../../../shared/games/chance";
import { cardsBySlot, parseAssignment } from "../../../../shared/matching";
import { equals, parseFraction } from "../../../../shared/rational-math";
import type { StageReviewProps } from "../../../lib/game-registry";
import { Given, SlotLine, Solution } from "../../../components/review-parts";
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
        <Icon name={question.icon} className="mr-1" />
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

/**
 * The two-stage tree: every branch as it was filled in.
 *
 * The row used to say "✗" and then list the four right probabilities, which
 * tells a player they were wrong and leaves them to work out *which* branch —
 * with four slots that is three quarters of the information missing. Now each
 * branch stands on its own line, named the way the tree named it, with the
 * card that was dropped in it beside the one that belonged there.
 */
export function TreeReview({ question, answer }: StageReviewProps<TreeQuestion>) {
  const { t } = useTranslation();

  let sent: TreeAnswer | null = null;
  try {
    sent = answer ? (JSON.parse(answer.answer) as TreeAnswer) : null;
  } catch {
    sent = null;
  }
  const assignment = sent
    ? parseAssignment(
        JSON.stringify(sent.assignment ?? []),
        question.cards.length,
        question.slotAnswers.length,
      )
    : null;
  const bySlot = assignment ? cardsBySlot(assignment, question.slotAnswers.length) : null;

  const typed = sent?.event ? parseFraction(sent.event) : null;
  const eventCorrect = typed != null && equals(typed, question.eventAnswer);

  return (
    <>
      <p className="text-sm text-gray-800">
        <Icon name={question.icon} className="mr-1" />
        {t(question.setupKey, question.params)}
      </p>

      {question.slotAnswers.map((truth, slot) => {
        // Slots run 0/0, 0/1, 1/0, 1/1 — first outcome, then second.
        const card = bySlot?.[slot] ?? null;
        const placed = card == null ? null : question.cards[card];
        return (
          <SlotLine
            key={slot}
            label={`${t(question.outcomeKeys[Math.floor(slot / 2)])} → ${t(
              question.outcomeKeys[slot % 2],
            )}`}
            given={placed ? <MathTex tex={placed.latex} /> : undefined}
            truth={<MathTex tex={truth.latex} />}
            correct={placed != null && equals(placed, truth)}
          />
        );
      })}

      <SlotLine
        // The event is worded with the outcomes in it ("beide Male rot"), so
        // it needs the same interpolation the station itself does — without it
        // the row reads "beide Male {{first}}".
        label={t(question.eventKey, {
          ...question.params,
          first: t(question.outcomeKeys[0]),
          second: t(question.outcomeKeys[1]),
        })}
        // What they typed, as they typed it: "3/6" and "1/2" are both right
        // here, and rewriting one into the other hides which they wrote.
        given={sent?.event ? <span className="font-mono">{sent.event}</span> : undefined}
        truth={<MathTex tex={question.eventAnswer.latex} />}
        correct={eventCorrect}
      />
    </>
  );
}
