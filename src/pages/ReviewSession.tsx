import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Icon from "../components/icons";
import { Link, useNavigate, useParams } from "react-router";
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
  /** One game. A lobby played twice yields two of these. */
  sessionId: string;
  /** The lobby it was played in, which other sessions may share. */
  code: string;
  /** Which game of that lobby this was, counting from 1. */
  run: number;
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
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [failed, setFailed] = useState<"missing" | "error" | null>(null);
  // Asked twice, because there is no undo and nothing keeps a copy — and the
  // second question is put somewhere the first click cannot reach. Arming it
  // turns the trigger into "cancel" and puts the destructive button on its own
  // row underneath, so a double click, or a second click at the same spot by
  // somebody who did not notice the first landed, cancels rather than deletes.
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const remove = async () => {
    setDeleting(true);
    try {
      const response = await fetch(serverUrl(`/parties/sessions/${sessionId}`), { method: "DELETE" });
      if (!response.ok) throw new Error(String(response.status));
      void navigate("/review", { replace: true });
    } catch {
      setDeleting(false);
      setConfirming(false);
      setFailed("error");
    }
  };

  const game = session?.rounds[0] ? getGame(session.rounds[0].gameId) : undefined;
  useActiveGame(game);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(serverUrl(`/parties/sessions/${sessionId}`));
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
  }, [sessionId]);

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
        <Icon name={game.icon} className="text-3xl" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-game-ink">{t(game.titleKey)}</h1>
          <p className="text-sm text-game-ink/70">
            {played.toLocaleDateString(undefined, {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
            {/* Two games out of one lobby are two of these pages, and without
                this they would differ only by the time of day. */}
            {session.run > 1 && <> · {t("review.run", { count: session.run })}</>}
          </p>
        </div>
        {/* The same slot either way: the trigger, or the way out of it. */}
        <button
          onClick={() => setConfirming(!confirming)}
          disabled={deleting}
          className="shrink-0 text-sm font-medium text-game-ink/70 transition-colors hover:text-red-600 disabled:text-gray-400"
        >
          {confirming ? t("common.cancel") : t("review.delete")}
        </button>
      </div>

      {confirming && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-red-200 bg-red-50 px-5 py-4">
          <p className="min-w-0 text-sm font-medium text-red-800">{t("review.deleteSure")}</p>
          <button
            onClick={() => void remove()}
            disabled={deleting}
            className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:bg-gray-300"
          >
            {deleting ? t("review.deleting") : t("review.deleteYes")}
          </button>
        </div>
      )}

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
                {stage?.ClassSummary ? (
                  <stage.ClassSummary data={round.data} players={round.players} />
                ) : (
                  <>
                    <AnswerGrid game={game} data={round.data} players={round.players} />
                    <div className="flex justify-center border-t border-gray-100 pt-4">
                      <RoundDebrief game={game} data={round.data} players={round.players} />
                    </div>
                  </>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
