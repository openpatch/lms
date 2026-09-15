import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router";
import JoinCode from "../components/JoinCode";
import PlayerList from "../components/PlayerList";
import ResultsList from "../components/ResultsList";
import { standings, withGains } from "../components/results";
import Countdown from "../components/Countdown";
import StageShell from "../components/StageShell";
import StageRules from "../components/StageRules";
import StageSettingsForm from "../components/StageSettingsForm";
import { useGameConnection } from "../lib/connection";
import { getGame } from "../lib/game-registry";
import { useActiveGame } from "../lib/game-theme";
import type { ServerMessage, GameResult } from "../../shared/types";

export default function HostLobby() {
  const { t } = useTranslation();
  const { gameId, code } = useParams();
  const game = gameId ? getGame(gameId) : undefined;
  useActiveGame(game);
  const [gameData, setGameData] = useState<unknown>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [countdownEndsAt, setCountdownEndsAt] = useState<number | null>(null);
  const [roundResults, setRoundResults] = useState<GameResult[]>([]);
  const [finalResults, setFinalResults] = useState<GameResult[]>([]);

  const onMessage = (msg: ServerMessage) => {
    if (msg.type === "countdown") {
      setGameData(msg.gameData);
      setCountdownEndsAt(msg.countdownEndsAt);
      setGameStarted(false);
    } else if (msg.type === "game-start") {
      setGameData(msg.gameData);
      setGameStarted(true);
      setCountdownEndsAt(null);
      setRoundResults([]);
    } else if (msg.type === "game-state") {
      setGameData(msg.gameData);
    } else if (msg.type === "round-finished") {
      setRoundResults(msg.results);
    } else if (msg.type === "finished") {
      setFinalResults(msg.results);
      setRoundResults(msg.roundResults);
    }
  };

  const conn = useGameConnection(code ?? "", onMessage, "host");

  // Send "host" message on every connect (handles reconnect)
  useEffect(() => {
    if (conn.connected && gameId) {
      conn.sendMessage({ type: "host", gameId });
    }
  }, [conn.connected, conn.sendMessage, gameId]);

  // Derive game state from lobby state on reconnect
  useEffect(() => {
    if (!conn.lobbyState) return;
    if (conn.lobbyState.phase === "explanation" && conn.lobbyState.gameData) {
      setGameData(conn.lobbyState.gameData);
      setGameStarted(false);
      setCountdownEndsAt(null);
    } else if (conn.lobbyState.phase === "playing" && conn.lobbyState.gameData) {
      setGameData(conn.lobbyState.gameData);
      setGameStarted(true);
      setCountdownEndsAt(null);
    } else if (conn.lobbyState.phase === "countdown" && conn.lobbyState.countdownEndsAt) {
      setGameData(conn.lobbyState.gameData);
      setCountdownEndsAt(conn.lobbyState.countdownEndsAt);
      setGameStarted(false);
    } else if (conn.lobbyState.phase === "lobby") {
      setGameStarted(false);
      setCountdownEndsAt(null);
      setRoundResults([]);
      setFinalResults([]);
    }
  }, [conn.lobbyState?.phase, conn.lobbyState?.gameData, conn.lobbyState?.countdownEndsAt]);

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
    const key =
      conn.closed === "expired"
        ? "game.lobbyExpired"
        : conn.closed === "not-found"
          ? "game.lobbyNotFound"
          : "game.lobbyClosed";
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">{t(key)}</p>
        <Link to="/arena" className="text-brand-600 hover:underline">
          {t("common.back")}
        </Link>
      </div>
    );
  }

  if (conn.error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-2">{conn.error}</p>
        <Link to="/arena" className="text-brand-600 hover:underline">
          {t("common.back")}
        </Link>
      </div>
    );
  }

  const lobbyState = conn.lobbyState;
  const players = lobbyState?.players ?? [];
  const phase = lobbyState?.phase ?? "lobby";
  const hostId = lobbyState?.hostId ?? "";
  // Explanation phase: show rules, host clicks "Let's go" to start countdown
  if (phase === "explanation" && lobbyState) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-8">
        <StageRules game={game} gameData={gameData} isHost={true} />
        <button
          onClick={() => conn.sendMessage({ type: "begin-countdown" })}
          className="px-8 py-3 bg-game-solid text-white font-semibold rounded-xl hover:bg-game-solid-hover transition-colors"
        >
          {t("game.letsGo")}
        </button>
      </div>
    );
  }

  // Countdown phase: show explanation + countdown
  if (phase === "countdown" && lobbyState && countdownEndsAt) {
    return (
      <div className="max-w-2xl mx-auto">
        <Countdown endsAt={countdownEndsAt}>
          <StageRules game={game} gameData={gameData} isHost={true} />
        </Countdown>
      </div>
    );
  }

  // Game phase: render the game component
  if (gameStarted && phase === "playing" && lobbyState) {
    return (
      <div className="max-w-2xl mx-auto">
        <StageShell
          game={game}
          state={lobbyState}
          gameData={gameData}
          isHost={true}
          playerId={hostId}
          sendMessage={conn.sendGameAction}
        />
      </div>
    );
  }

  // Round-finished phase
  if (phase === "round-finished" && lobbyState) {
    const data = lobbyState.gameData as { currentRound?: number; totalRounds?: number } | null;
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-6">
        <div className="text-sm font-semibold uppercase text-game-ink">
          {t("game.round", { current: data?.currentRound ?? 0, total: data?.totalRounds ?? 0 })}
        </div>
        <ResultsList
          results={standings(lobbyState.players, roundResults, (data?.currentRound ?? 1) > 1)}
          title={t("game.roundResults")}
        />
        <button
          onClick={() => conn.sendMessage({ type: "next-round" })}
          className="px-6 py-3 bg-game-solid text-white font-semibold rounded-xl hover:bg-game-solid-hover transition-colors"
        >
          {t("game.nextRound")}
        </button>
      </div>
    );
  }

  // Finished phase
  if (phase === "finished" && lobbyState) {
    const data = lobbyState.gameData as { currentRound?: number } | null;
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-6">
        <ResultsList
          results={withGains(finalResults, roundResults, (data?.currentRound ?? 1) > 1)}
          title={t("game.finalResults")}
        />
        <button
          onClick={() => conn.sendMessage({ type: "restart" })}
          className="px-6 py-3 bg-game-solid text-white font-semibold rounded-xl hover:bg-game-solid-hover transition-colors"
        >
          {t("play.backToLobby")}
        </button>
      </div>
    );
  }

  // Lobby phase
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-6 rounded-2xl border-2 border-game-200 bg-linear-to-br from-game-100 to-game-50 px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="grid place-items-center w-12 h-12 rounded-xl bg-white/80 shadow-sm text-3xl">
            {game.icon}
          </span>
          <h1 className="text-xl font-bold text-game-ink truncate">{t(game.titleKey)}</h1>
        </div>
        <div className="shrink-0 flex items-center gap-3">
          <button
            onClick={() => conn.sendMessage({ type: "close-lobby" })}
            className="text-sm font-medium text-game-ink/70 hover:text-red-600 transition-colors"
          >
            {t("game.closeLobby")}
          </button>
          <Link to="/arena" className="text-sm font-medium text-game-ink/70 hover:text-game-ink">
            {t("common.back")}
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl border-2 border-game-200 p-8 mb-6">
        <JoinCode code={code ?? ""} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">{t("game.settings")}</h2>
        <StageSettingsForm
          game={game}
          settings={lobbyState?.settings}
          onChange={(settings) => conn.sendMessage({ type: "update-settings", settings })}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {t("lobby.players")} ({players.filter((p) => !p.isHost).length})
          </h2>
        </div>
        <PlayerList
          players={players}
          onKick={(pid) => conn.sendMessage({ type: "kick", playerId: pid })}
        />
      </div>

      <button
        onClick={() => conn.sendMessage({ type: "start" })}
        disabled={players.filter((p) => !p.isHost).length < game.minPlayers}
        className={`w-full mt-6 py-3 rounded-xl font-semibold transition-colors ${
          players.filter((p) => !p.isHost).length >= game.minPlayers
            ? "bg-game-solid text-white hover:bg-game-solid-hover"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
      >
        {players.filter((p) => !p.isHost).length >= game.minPlayers
          ? t("lobby.start")
          : t("lobby.needMorePlayers", { count: game.minPlayers })}
      </button>
    </div>
  );
}
