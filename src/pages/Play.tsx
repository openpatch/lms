import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router";
import { useGameConnection } from "../lib/connection";
import { getGame } from "../lib/game-registry";
import { useActiveGame } from "../lib/game-theme";
import ResultsList from "../components/ResultsList";
import { standings, withGains } from "../components/results";
import RoundReview from "../components/RoundReview";
import Countdown from "../components/Countdown";
import StageShell from "../components/StageShell";
import StageRules from "../components/StageRules";
import type { ServerMessage, GameResult } from "../../shared/types";
import type { StageRoundData } from "../../shared/framework";

export default function Play() {
  const { t } = useTranslation();
  const { code } = useParams();
  const [gameData, setGameData] = useState<unknown>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [countdownEndsAt, setCountdownEndsAt] = useState<number | null>(null);
  const [roundResults, setRoundResults] = useState<GameResult[]>([]);
  const [finalResults, setFinalResults] = useState<GameResult[]>([]);

  const playerName = code ? localStorage.getItem(`lms:player:${code}`) ?? "" : "";

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

  const conn = useGameConnection(code ?? "", onMessage);
  // Which game this lobby is playing only becomes known once the server answers;
  // from then on the shell wears its colour, the same one the host sees.
  const game = conn.lobbyState ? getGame(conn.lobbyState.gameId) : undefined;
  useActiveGame(game);

  // Send "join" message on every connect (handles reconnect)
  useEffect(() => {
    if (conn.connected && playerName) {
      conn.sendMessage({ type: "join", name: playerName });
    }
  }, [conn.connected, conn.sendMessage, playerName]);

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

  if (!playerName) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">{t("join.emptyName")}</p>
        <Link to="/join" className="text-brand-600 hover:underline">
          {t("common.join")}
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
        <Link to="/join" className="text-brand-600 hover:underline">
          {t("common.back")}
        </Link>
      </div>
    );
  }

  if (conn.error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{conn.error}</p>
        <Link to="/join" className="text-brand-600 hover:underline">
          {t("common.back")}
        </Link>
      </div>
    );
  }

  const lobbyState = conn.lobbyState;

  if (!lobbyState) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t("play.connecting")}</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Game not found</p>
      </div>
    );
  }

  const myPlayer = lobbyState.players.find(
    (p) => p.name === playerName && !p.isHost,
  );
  const myPlayerId = myPlayer?.id ?? "";

  // Explanation phase: show rules, waiting for host to start countdown
  if (lobbyState.phase === "explanation") {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-8">
        <StageRules game={game} gameData={gameData} isHost={false} />
        <p className="text-gray-500">{t("game.waitingForHost")}</p>
      </div>
    );
  }

  // Countdown phase: show explanation + countdown
  if (lobbyState.phase === "countdown" && countdownEndsAt) {
    return (
      <div className="max-w-2xl mx-auto">
        <Countdown endsAt={countdownEndsAt}>
          <StageRules game={game} gameData={gameData} isHost={false} />
        </Countdown>
      </div>
    );
  }

  // Game phase — wider than the other phases, because stages with a plot or a
  // number line use the room (the stages themselves cap their text columns).
  if (gameStarted && lobbyState.phase === "playing") {
    return (
      <div className="max-w-5xl mx-auto">
        <StageShell
          game={game}
          state={lobbyState}
          gameData={gameData}
          isHost={false}
          playerId={myPlayerId}
          sendMessage={conn.sendGameAction}
        />
      </div>
    );
  }

  // The round just played, still in the lobby state once it is over
  const roundData = lobbyState.gameData as StageRoundData | null;

  // Round-finished phase
  if (lobbyState.phase === "round-finished") {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-6 px-4">
        <div className="text-sm font-semibold uppercase text-game-ink">
          {t("game.round", {
            current: roundData?.currentRound ?? 0,
            total: roundData?.totalRounds ?? 0,
          })}
        </div>
        <ResultsList
          results={standings(lobbyState.players, roundResults, (roundData?.currentRound ?? 1) > 1)}
          title={t("game.roundResults")}
        />
        {roundData && <RoundReview game={game} data={roundData} playerId={myPlayerId} />}
        <p className="text-gray-500">{t("game.waitingNextRound")}</p>
      </div>
    );
  }

  // Finished phase — the last round gets its review too
  if (lobbyState.phase === "finished") {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-6 px-4">
        <ResultsList
          results={withGains(finalResults, roundResults, (roundData?.currentRound ?? 1) > 1)}
          title={t("game.finalResults")}
        />
        {roundData && <RoundReview game={game} data={roundData} playerId={myPlayerId} />}
        <p className="text-gray-500">{t("play.waitingHost")}</p>
      </div>
    );
  }

  // Lobby phase — waiting for host to start. The colour card is deliberately
  // loud: it is how a player checks they are in the game the class is playing.
  return (
    <div className="max-w-md mx-auto text-center py-8">
      <div className="rounded-3xl border-2 border-game-200 bg-linear-to-br from-game-100 to-game-50 px-6 py-8">
        <span className="inline-grid place-items-center w-24 h-24 rounded-3xl bg-white/80 shadow-sm text-6xl mb-4">
          {game.icon}
        </span>
        <h1 className="text-2xl font-bold text-game-ink mb-2">{t(game.titleKey)}</h1>
        <p className="text-game-ink/70">{t("play.waitingHost")}</p>
      </div>
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3">
          {t("lobby.players")} ({lobbyState.players.filter((p) => !p.isHost).length})
        </h2>
        <div className="space-y-2 text-left">
          {lobbyState.players.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-lg bg-white border border-gray-200 px-4 py-3"
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${p.connected ? "bg-green-400" : "bg-gray-300"}`}
              />
              <span className="font-medium text-gray-700">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
