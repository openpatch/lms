import { useTranslation } from "react-i18next";
import type {
  ColorQuestion,
  DialQuestion,
  LampQuestion,
  PixelQuestion,
  RouteQuestion,
  Rgb,
  SwapAnswer,
  SwapQuestion,
  UntangleAnswer,
  UntangleQuestion,
} from "../../../../shared/games/intuition";
import type { PlayerAnswer } from "../../../../shared/types";
import type { StageReviewProps } from "../../../lib/game-registry";
import { Given, Missing, Solution } from "../../../components/review-parts";
import { countCrossings } from "../../../../shared/intuition-graph";
import { shiftText } from "../../../../shared/intuition-cipher";
import { css } from "../components/color";
import PixelPicture from "../components/PixelPicture";

/**
 * What a player sees once the round is over.
 *
 * A station built on looking has to be reviewed by looking: the colour you
 * mixed next to the one you were after, the picture you could not place at the
 * size it finally reached, the sentence that was hiding in the letters. A row
 * that only said "0 Punkte" would throw away the best part of the round.
 */

function parse<T>(answer: PlayerAnswer | undefined): T | null {
  if (!answer) return null;
  try {
    return JSON.parse(answer.answer) as T;
  } catch {
    return null;
  }
}

/** The two colours, meeting along the same seam they were mixed across. */
export function FarbeReview({ question, answer }: StageReviewProps<ColorQuestion>) {
  const { t } = useTranslation();
  const mixed = parse<Rgb>(answer);
  return (
    <>
      <div className="flex h-10 w-full max-w-xs overflow-hidden rounded-lg border border-gray-200">
        <div className="flex-1" style={{ backgroundColor: css(question.target) }} />
        {mixed && <div className="flex-1" style={{ backgroundColor: css(mixed) }} />}
      </div>
      <p className="text-xs text-gray-400">
        {mixed ? t("games.intuition.color.seam") : <Missing />}
      </p>
    </>
  );
}

export function LampenReview({ question, answer }: StageReviewProps<LampQuestion>) {
  const { t } = useTranslation();
  return (
    <>
      <p className="text-sm text-gray-800">
        {t("games.intuition.lampReview", {
          target: question.target,
          lamps: question.values.join(" · "),
        })}
      </p>
      <Given answer={answer}>
        <span className="font-bold tabular-nums">{answer?.answer}</span>
      </Given>
    </>
  );
}

/** The picture at the size it reached — usually the moment it became obvious. */
export function PixelReview({ question, answer }: StageReviewProps<PixelQuestion>) {
  const { t } = useTranslation();
  const chosen = answer ? question.options[Number(answer.answer)] : undefined;
  return (
    <>
      <div className="flex items-center gap-3">
        <PixelPicture glyph={question.glyph} level={24} className="h-14 w-14" />
        <div className="min-w-0 flex-1 space-y-1">
          <Given answer={answer}>{chosen ? t(chosen) : <Missing />}</Given>
          {!answer?.correct && <Solution>{t(question.options[question.answerIndex])}</Solution>}
        </div>
      </div>
    </>
  );
}

/** The sentence that was in there all along. */
export function DrehenReview({ question, answer }: StageReviewProps<DialQuestion>) {
  const dialled = answer ? Number(answer.answer) : null;
  return (
    <>
      <p className="font-mono text-xs break-words text-gray-400">{question.cipher}</p>
      {dialled != null && !answer?.correct && (
        <Given answer={answer}>
          <span className="font-mono text-xs break-words">
            {shiftText(question.cipher, -dialled)}
          </span>
        </Given>
      )}
      <Solution>
        <span className="font-mono text-sm break-words">
          {shiftText(question.cipher, -question.shift)}
        </span>
      </Solution>
    </>
  );
}

export function KabelReview({ question, answer }: StageReviewProps<UntangleQuestion>) {
  const { t } = useTranslation();
  const sent = parse<UntangleAnswer>(answer);
  const left = sent?.nodes ? countCrossings(sent.nodes, question.edges) : null;
  return (
    <>
      <p className="text-sm text-gray-800">
        {t("games.intuition.untangleReview", { count: question.startCrossings })}
      </p>
      <Given answer={answer}>
        {left === 0
          ? t("games.intuition.untangleClear")
          : t("games.intuition.untangleLeft", { count: left ?? 0 })}
      </Given>
    </>
  );
}

export function WegReview({ question, answer }: StageReviewProps<RouteQuestion>) {
  const { t } = useTranslation();
  const path = parse<number[]>(answer);
  const minutes = path
    ? path.reduce((total, node, index) => {
        if (index === 0) return 0;
        const edge = question.edges.find(
          (candidate) =>
            (candidate.a === path[index - 1] && candidate.b === node) ||
            (candidate.a === node && candidate.b === path[index - 1]),
        );
        return total + (edge?.weight ?? 0);
      }, 0)
    : null;
  return (
    <>
      <Given answer={answer}>
        {minutes != null ? t("games.intuition.routeTook", { minutes }) : <Missing />}
      </Given>
      {!answer?.correct && <Solution>{t("games.intuition.routeBest", { minutes: question.best })}</Solution>}
    </>
  );
}

export function NachbarnReview({ question, answer }: StageReviewProps<SwapQuestion>) {
  const { t } = useTranslation();
  const sent = parse<SwapAnswer>(answer);
  return (
    <>
      <p className="font-mono text-sm text-gray-800">{question.values.join("  ")}</p>
      <Given answer={answer}>
        {t("games.intuition.swapUsed", { count: sent?.swaps?.length ?? 0 })}
      </Given>
      {!answer?.correct && (
        <Solution>{t("games.intuition.swapPar", { count: question.minSwaps })}</Solution>
      )}
    </>
  );
}
