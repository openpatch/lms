import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, Link } from "react-router";
import ResultsList from "../components/ResultsList";
import RoundDebrief from "../components/RoundDebrief";
import RoundReview from "../components/RoundReview";
import { standings, withGains } from "../components/results";
import Countdown from "../components/Countdown";
import StageShell from "../components/StageShell";
import Icon from "../components/icons";
import StageRules from "../components/StageRules";
import StageSettingsForm from "../components/StageSettingsForm";
import { useLobbySession } from "../lib/lobby-session";
import { getGame } from "../lib/game-registry";
import { useActiveGame } from "../lib/game-theme";
import { demoPlayerId } from "../../shared/types";
import type { StageRoundData } from "../../shared/framework";

/**
 * The teacher playing the game alone, before the class does.
 *
 * Preparing a lesson with one of these means knowing what the round will
 * actually feel like: how hard the questions come out at this setting, whether
 * sixty seconds is too long, what the stage looks like on the projector. None
 * of that can be read off the settings form, and finding out by opening a
 * lobby and joining it from a second device is enough of a nuisance that it
 * does not get done.
 *
 * So this is a real lobby against the real server — same rounds, same
 * questions, same clock, same scoring — with the class replaced by one seat
 * the teacher sits in themselves. Both seats at once: they see the rules
 * screen they would be reading out and then play the stage a student would
 * play, and the round-finished screen carries both the player's review and the
 * host's debrief, because in a rehearsal there is nobody to hide either from.
 *
 * What it deliberately does not do is count. The join code is never shown,
 * nobody can join, and the server does not write the score down.
 */
export default function Demo() {
  const { t } = useTranslation();
  const { gameId, code } = useParams();
  const navigate = useNavigate();
  const game = gameId ? getGame(gameId) : undefined;
  useActiveGame(game);

  const { conn, gameData, gameStarted, countdownEndsAt, roundResults, finalResults } =
    useLobbySession(code ?? "", "host");

  useEffect(() => {
    if (conn.connected && gameId) {
      conn.sendMessage({ type: "host", gameId });
    }
  }, [conn.connected, conn.sendMessage, gameId]);

  if (!game) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Game not found</p>
        <Link to="/arena" className="text-brand-600 hover:underline">
          {t("common.back")}
        </Link>
      </div>
    );
  }

  if (conn.closed) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">{t("demo.over")}</p>
        <Link to={`/arena/${game.id}`} className="text-brand-600 hover:underline">
          {t("common.back")}
        </Link>
      </div>
    );
  }

  if (conn.error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-2">{conn.error}</p>
        <Link to={`/arena/${game.id}`} className="text-brand-600 hover:underline">
          {t("common.back")}
        </Link>
      </div>
    );
  }

  const lobbyState = conn.lobbyState;
  const phase = lobbyState?.phase ?? "lobby";
  // The one seat the lobby opened with, and the one the teacher's own actions
  // are recorded against — see demoPlayerId.
  const meId = lobbyState ? demoPlayerId(lobbyState.hostId) : "";
  const roundData = (lobbyState?.gameData ?? null) as StageRoundData | null;

  const banner = (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-game-300 bg-game-50 px-5 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <Icon name={game.icon} className="text-2xl" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-game-ink">
            {t("demo.badge")} · {t(game.titleKey)}
          </p>
          <p className="text-sm text-game-ink/70">{t("demo.noClass")}</p>
        </div>
      </div>
      <button
        onClick={() => {
          conn.sendMessage({ type: "close-lobby" });
          void navigate(`/arena/${game.id}`);
        }}
        className="shrink-0 text-sm font-medium text-game-ink/70 transition-colors hover:text-red-600"
      >
        {t("demo.end")}
      </button>
    </div>
  );

  // The rules screen, as the host reads it out.
  if (phase === "explanation" && lobbyState) {
    return (
      <div className="max-w-2xl mx-auto">
        {banner}
        <div className="flex flex-col items-center gap-8">
          <StageRules game={game} gameData={gameData} isHost={true} />
          <button
            onClick={() => conn.sendMessage({ type: "begin-countdown" })}
            className="px-8 py-3 bg-game-solid text-white font-semibold rounded-xl hover:bg-game-solid-hover transition-colors"
          >
            {t("game.letsGo")}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "countdown" && lobbyState && countdownEndsAt) {
    return (
      <div className="max-w-2xl mx-auto">
        <Countdown endsAt={countdownEndsAt}>
          <StageRules game={game} gameData={gameData} isHost={true} />
        </Countdown>
      </div>
    );
  }

  // Playing: the student's screen, because that is the one worth rehearsing.
  // The host's way out of the round rides along beside the stage's own action,
  // so a sixty-second live stage does not have to be sat through twice.
  if (gameStarted && phase === "playing" && lobbyState) {
    return (
      <div className="max-w-5xl mx-auto">
        <StageShell
          game={game}
          state={lobbyState}
          gameData={gameData}
          isHost={false}
          playerId={meId}
          sendMessage={conn.sendGameAction}
          sideAction={
            <button
              onClick={() => conn.sendMessage({ type: "end-round" })}
              className="rounded-xl border-2 border-gray-300 px-6 py-2 font-semibold text-gray-600 transition-colors hover:border-game-solid hover:text-game-ink"
            >
              {t("game.endRound")}
            </button>
          }
        />
      </div>
    );
  }

  // Between rounds and at the end: both screens at once — what the player gets
  // back, and what the host would use to talk the round through.
  if ((phase === "round-finished" || phase === "finished") && lobbyState) {
    const last = phase === "finished";
    return (
      <div className="max-w-2xl mx-auto">
        {banner}
        <div className="flex flex-col items-center gap-6 px-4">
          {!last && (
            <div className="text-sm font-semibold uppercase text-game-ink">
              {t("game.round", {
                current: roundData?.currentRound ?? 0,
                total: roundData?.totalRounds ?? 0,
              })}
            </div>
          )}
          <ResultsList
            results={
              last
                ? withGains(finalResults, roundResults, (roundData?.currentRound ?? 1) > 1)
                : standings(lobbyState.players, roundResults, (roundData?.currentRound ?? 1) > 1)
            }
            title={last ? t("game.finalResults") : t("game.roundResults")}
            honourRounds={last}
          />
          <button
            onClick={() => conn.sendMessage({ type: last ? "restart" : "next-round" })}
            className="px-6 py-3 bg-game-solid text-white font-semibold rounded-xl hover:bg-game-solid-hover transition-colors"
          >
            {last ? t("demo.again") : t("game.nextRound")}
          </button>
          {roundData && <RoundReview game={game} data={roundData} playerId={meId} />}
          {roundData && <RoundDebrief game={game} data={roundData} players={lobbyState.players} />}
        </div>
      </div>
    );
  }

  // Lobby: the settings, and nothing to wait for. No join code, no player list
  // — there is exactly one player and they are reading this.
  return (
    <div className="max-w-2xl mx-auto">
      {banner}

      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">{t("game.settings")}</h2>
        <StageSettingsForm
          game={game}
          settings={lobbyState?.settings}
          onChange={(settings) => conn.sendMessage({ type: "update-settings", settings })}
        />
      </div>

      <button
        onClick={() => conn.sendMessage({ type: "start" })}
        disabled={!lobbyState}
        className="w-full py-3 rounded-xl font-semibold transition-colors bg-game-solid text-white hover:bg-game-solid-hover disabled:bg-gray-100 disabled:text-gray-400"
      >
        {t("demo.start")}
      </button>
    </div>
  );
}
