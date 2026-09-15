import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { StageRoundData } from "../../shared/framework";
import { playerRoundScore } from "../../shared/framework";
import type { Player } from "../../shared/types";
import { getStage, type GameDefinition } from "../lib/game-registry";

/**
 * Who answered what, one row per student.
 *
 * The debrief beside this one asks the other question — which question the
 * class fell over — and for talking a round through that is the right way
 * round. This is the way round you need when the lesson is over and you are
 * deciding who to sit next to whom: the same round read down the names instead
 * of across the questions, so a student who got the first three and then
 * stopped looks different from one who scattered.
 *
 * Nothing here is stored twice. It is the same round the debrief reads, turned
 * ninety degrees.
 */
export default function AnswerGrid({
  game,
  data,
  players,
}: {
  game: GameDefinition;
  data: StageRoundData;
  players: Player[];
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<string | null>(null);
  const stage = getStage(game, data.stageId);

  const guests = players.filter((p) => !p.isHost);
  if (guests.length === 0 || data.questions.length === 0) return null;

  const label = (questionId: number, answer: string) => {
    const question = data.questions.find((q) => q.id === questionId);
    return (question && stage?.answerLabel?.(question, answer)) ?? answer;
  };

  const rows = guests
    .map((player) => {
      const given = data.answers[player.id] ?? {};
      return {
        player,
        given,
        score: stage?.scorePlayer?.(data, player.id) ?? playerRoundScore(data, player.id),
        correct: data.questions.filter((q) => given[q.id]?.correct).length,
      };
    })
    .sort((a, b) => b.correct - a.correct || a.player.name.localeCompare(b.player.name));

  return (
    <div className="w-full">
      {/* The only thing on the page allowed to scroll sideways: a class of
          thirty against fifteen questions does not fit a phone any other way. */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-gray-400">
              <th className="sticky left-0 bg-white px-2 py-1 text-left font-medium">
                {t("review.student")}
              </th>
              {data.questions.map((question, index) => (
                <th key={question.id} className="px-1 py-1 font-medium tabular-nums">
                  {index + 1}
                </th>
              ))}
              <th className="px-2 py-1 text-right font-medium">{t("game.pts")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.player.id} className="border-t border-gray-100">
                <td className="sticky left-0 bg-white px-2 py-1">
                  <button
                    onClick={() => setOpen(open === row.player.id ? null : row.player.id)}
                    className="max-w-40 truncate font-medium text-gray-700 underline-offset-4 hover:text-game-ink hover:underline"
                  >
                    {row.player.name}
                  </button>
                </td>
                {data.questions.map((question) => {
                  const answer = row.given[question.id];
                  const state = !answer ? "missing" : answer.correct ? "correct" : "wrong";
                  return (
                    <td key={question.id} className="px-1 py-1 text-center">
                      <span
                        title={answer ? label(question.id, answer.answer) : t("game.noAnswer")}
                        className={`inline-block h-5 w-5 rounded ${
                          state === "correct"
                            ? "bg-emerald-400"
                            : state === "wrong"
                              ? "bg-rose-400"
                              : "bg-gray-100"
                        }`}
                      />
                    </td>
                  );
                })}
                <td className="px-2 py-1 text-right font-bold text-game-ink tabular-nums">
                  {row.score}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* One student's round in words, for when a colour is not enough — which
          is whenever you want to know what they actually wrote. */}
      {open && (
        <ol className="mt-3 space-y-1 rounded-xl border-2 border-gray-200 bg-white p-3">
          {data.questions.map((question, index) => {
            const answer = data.answers[open]?.[question.id];
            return (
              <li key={question.id} className="flex items-baseline gap-2 text-sm">
                <span className="w-5 shrink-0 text-right text-gray-400 tabular-nums">
                  {index + 1}
                </span>
                <span
                  className={
                    !answer ? "text-gray-400" : answer.correct ? "text-emerald-600" : "text-rose-600"
                  }
                >
                  {!answer ? "–" : answer.correct ? "✓" : "✗"}
                </span>
                <span className="min-w-0 break-words font-medium text-gray-700">
                  {answer ? label(question.id, answer.answer) : t("game.noAnswer")}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
