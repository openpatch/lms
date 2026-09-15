import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import AnswerGrid from "../components/AnswerGrid";
import RoundDebrief from "../components/RoundDebrief";
import { serverUrl } from "../lib/connection";
import { getGame, getStage } from "../lib/game-registry";
import { useActiveGame } from "../lib/game-theme";
import type { StageRoundData } from "../../shared/framework";
import type { Player } from "../../shared/types";

interface StoredRound {
  id: number;
  gameId: string;
  stageId: string;
  roundNumber: number;
  finishedAt: number;
  players: Player[];
  data: StageRoundData;
}

interface Session {
  code: string;
  rounds: StoredRound[];
  scores: { playerName: string; score: number }[];
}

/**
 * One lesson, after the fact.
 *
 * Every round it played, each one both ways round: the debrief, which ranks
 * the questions by how badly they went, and the grid, which ranks the students
 * by the same round. The first says what to teach again; the second says who
 * to teach it to. Both are read off the round itself, which is stored whole,
 * so the question can still be drawn by the stage's own component — a
 * Struktogramm is still a Struktogramm here, not a row of stored strings.
 */
export default function ReviewSession() {
  const { t } = useTranslation();
  const { code } = useParams();
  const [session, setSession] = useState<Session | null>(null);
  const [failed, setFailed] = useState<"missing" | "error" | null>(null);

  const game = session?.rounds[0] ? getGame(session.rounds[0].gameId) : undefined;
  useActiveGame(game);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(serverUrl(`/parties/sessions/${code}`));
        if (response.status === 404) {
          if (!cancelled) setFailed("missing");
          return;
        }
        if (!response.ok) throw new Error(String(response.status));
        const body = (await response.json()) as Session;
        if (!cancelled) setSession(body);
      } catch {
        if (!cancelled) setFailed("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (failed) {
    return (
      <div className="py-12 text-center">
        <p className="mb-4 text-gray-500">
          {t(failed === "missing" ? "review.notFound" : "game.serverUnreachable")}
        </p>
        <Link to="/review" className="text-brand-600 hover:underline">
          {t("common.back")}
        </Link>
      </div>
    );
  }

  if (!session || !game) {
    return <div className="py-12 text-center text-gray-500">{t("common.loading")}</div>;
  }

  const played = new Date(session.rounds[0].finishedAt);

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/review" className="mb-4 inline-block text-sm text-gray-500 hover:text-game-ink">
        {t("common.back")}
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-game-200 bg-linear-to-br from-game-100 to-game-50 px-5 py-4">
        <span className="shrink-0 text-3xl">{game.icon}</span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-game-ink">{t(game.titleKey)}</h1>
          <p className="text-sm text-game-ink/70">
            {played.toLocaleDateString(undefined, {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {session.scores.length > 0 && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 font-semibold text-gray-700">{t("game.finalResults")}</h2>
          <ol className="space-y-1">
            {session.scores.map((score, rank) => (
              <li key={score.playerName} className="flex items-baseline gap-3 text-sm">
                <span className="w-5 shrink-0 text-right text-gray-400 tabular-nums">
                  {rank + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium text-gray-700">
                  {score.playerName}
                </span>
                <span className="shrink-0 font-bold text-game-ink tabular-nums">{score.score}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="space-y-8">
        {session.rounds.map((round) => {
          const stage = getStage(game, round.stageId);
          return (
            <section key={round.id}>
              <h2 className="mb-3 text-sm font-semibold uppercase text-game-ink">
                {t("game.round", {
                  current: round.roundNumber,
                  total: round.data.totalRounds ?? session.rounds.length,
                })}
                {stage ? ` · ${t(stage.nameKey)}` : ""}
              </h2>
              <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4">
                <AnswerGrid game={game} data={round.data} players={round.players} />
                <div className="flex justify-center border-t border-gray-100 pt-4">
                  <RoundDebrief game={game} data={round.data} players={round.players} />
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
