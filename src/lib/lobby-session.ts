import { useEffect, useState } from "react";
import { useGameConnection, type ConnectionRole, type GameConnection } from "./connection";
import type { GameResult, ServerMessage } from "../../shared/types";

/**
 * One lobby, as a screen needs it.
 *
 * Three screens watch the same lobby — the host's, a player's, and a teacher's
 * demo — and they differ only in what they draw. Which round is on, whether it
 * has started, what the countdown ends at and what the last round came to is
 * the same bookkeeping for all three, and it has to survive a reload in the
 * middle of a round, so it is derived from the lobby state as well as from the
 * messages. That is enough moving parts to be worth having once.
 */
export interface LobbySession {
  conn: GameConnection;
  /** The current round — a StageRoundData once a round has been built. */
  gameData: unknown;
  /** Whether that round is being played, as opposed to explained or counted in. */
  gameStarted: boolean;
  countdownEndsAt: number | null;
  /** What the round just finished came to; cleared when the next one starts. */
  roundResults: GameResult[];
  /** The totals, once the game is over. */
  finalResults: GameResult[];
}

export function useLobbySession(code: string, role: ConnectionRole = "player"): LobbySession {
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

  const conn = useGameConnection(code, onMessage, role);

  // A reload mid-round gets no "game-start" — the lobby state is all there is,
  // so the same picture is derived from it.
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

  return { conn, gameData, gameStarted, countdownEndsAt, roundResults, finalResults };
}
