import { useTranslation } from "react-i18next";
import type { StageRoundData } from "../../shared/framework";
import { playerRoundScore } from "../../shared/framework";
import type { PlayerAnswer } from "../../shared/types";
import { getStage, type GameDefinition } from "../lib/game-registry";

/** One "label: value" line of a review row, for stages to build theirs from. */
export function ReviewLine({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
      <span className="shrink-0 text-gray-400">{label}</span>
      <span className="font-medium text-gray-700">{children}</span>
    </div>
  );
}

/** What every stage can say without knowing the stage: the answer as it was sent. */
function PlainReview({ answer }: { answer: PlayerAnswer | undefined }) {
  const { t } = useTranslation();
  if (!answer) return <p className="text-sm text-gray-400">{t("game.noAnswer")}</p>;
  return <ReviewLine label={t("game.yourAnswer")}>{answer.answer}</ReviewLine>;
}

const BADGE = {
  correct: "bg-green-100 text-green-700",
  wrong: "bg-red-100 text-red-600",
  missing: "bg-gray-100 text-gray-400",
};

const MARK = { correct: "✓", wrong: "✗", missing: "–" };

/**
 * What a player gets to see once the round is over: every question of the round
 * with their own answer and what it scored. A stage that brings a `Review` shows
 * the question and the right answer with it; without one the row still carries
 * the answer and the points.
 */
export default function RoundReview({
  game,
  data,
  playerId,
}: {
  game: GameDefinition;
  data: StageRoundData;
  playerId: string;
}) {
  const { t } = useTranslation();
  const stage = getStage(game, data.stageId);
  // Stages that are not question based (a tap round) have nothing to list
  if (!stage || data.questions.length === 0) return null;

  const answers = data.answers[playerId] ?? {};
  const Review = stage.Review;
  const correct = data.questions.filter((q) => answers[q.id]?.correct).length;
  const score = stage.scorePlayer?.(data, playerId) ?? playerRoundScore(data, playerId);

  return (
    <section className="w-full max-w-md">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 px-1">
        <h3 className="font-bold text-game-ink">{t("game.yourAnswers")}</h3>
        <p className="text-sm text-gray-500">
          {t("game.correctOfTotal", { correct, total: data.questions.length })}
          {" · "}
          <span className="font-bold tabular-nums">{Math.round(score)}</span> {t("game.pts")}
        </p>
      </div>

      <ol className="space-y-2">
        {data.questions.map((question, index) => {
          const answer = answers[question.id];
          const state = answer?.correct ? "correct" : answer ? "wrong" : "missing";
          return (
            <li
              key={question.id}
              className="flex items-start gap-3 rounded-lg border-2 border-gray-200 bg-white px-3 py-2"
              style={{ animation: `fade-in 0.4s ease-out ${index * 0.05}s both` }}
            >
              <span
                className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-sm font-bold ${BADGE[state]}`}
                aria-label={t(`game.answer.${state}`)}
              >
                {MARK[state]}
              </span>
              <div className="min-w-0 flex-1 space-y-1 overflow-x-auto">
                {Review ? (
                  <Review question={question} answer={answer} data={data} playerId={playerId} />
                ) : (
                  <PlainReview answer={answer} />
                )}
              </div>
              <span
                className={`shrink-0 text-sm font-bold tabular-nums ${
                  answer?.points ? "text-game-ink" : "text-gray-300"
                }`}
              >
                {Math.round(answer?.points ?? 0)}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
