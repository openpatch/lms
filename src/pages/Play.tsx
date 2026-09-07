import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router";
import { usePartyConnection } from "../lib/partykit";
import { getGame } from "../lib/game-registry";
import ResultsList from "../components/ResultsList";
import Countdown from "../components/Countdown";
import StageShell from "../components/StageShell";
import StageRules from "../components/StageRules";
import type { ServerMessage, GameResult } from "../../shared/types";

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
    }
  };

  const conn = usePartyConnection(code ?? "", onMessage);

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

  const game = getGame(lobbyState.gameId);

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

  // Round-finished phase
  if (lobbyState.phase === "round-finished") {
    const data = lobbyState.gameData as { currentRound?: number; totalRounds?: number } | null;
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-6">
        <div className="text-sm font-semibold uppercase text-brand-500">
          {t("game.round", { current: data?.currentRound ?? 0, total: data?.totalRounds ?? 0 })}
        </div>
        <ResultsList results={roundResults} title={t("game.roundResults")} />
        <p className="text-gray-500">{t("game.waitingNextRound")}</p>
      </div>
    );
  }

  // Finished phase
  if (lobbyState.phase === "finished") {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-6">
        <ResultsList results={finalResults} title={t("game.finalResults")} />
        <p className="text-gray-500">{t("play.waitingHost")}</p>
      </div>
    );
  }

  // Lobby phase — waiting for host to start
  return (
    <div className="max-w-md mx-auto text-center py-12">
      <span className="text-5xl mb-4 block">{game.icon}</span>
      <h1 className="text-2xl font-bold mb-2">{t(game.titleKey)}</h1>
      <p className="text-gray-500">{t("play.waitingHost")}</p>
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
