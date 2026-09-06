import type * as Party from "partykit/server";
import type { LobbyState, GameResult } from "../shared/types";

/**
 * GameHandler defines the interface that each game's server-side logic must implement.
 * The main server delegates game-specific messages and events to the active handler.
 */
export interface GameHandler {
  /**
   * Called when the host starts the game (round 1).
   * Should return the initial game data that will be broadcast to all clients.
   */
  onStart?: (state: LobbyState) => unknown;

  /**
   * Called when the host starts the next round (round 2+).
   * Should return the per-round game data.
   */
  onRoundStart?: (state: LobbyState) => unknown;

  /**
   * Called when a game-action message is received from a client during the playing phase.
   * Should return the updated game data if state changed, or undefined if no broadcast needed.
   */
  onMessage?: (state: LobbyState, payload: unknown, sender: Party.Connection) => unknown;

  /**
   * Called to determine if the current round is finished.
   * Should return GameResult[] if the round is done, or undefined if still in progress.
   */
  checkRoundFinished?: (state: LobbyState) => GameResult[] | undefined;

  /**
   * Called to determine if the current round is the last round.
   * If true, the server transitions to "finished" instead of "round-finished".
   */
  isLastRound?: (state: LobbyState) => boolean;

  /**
   * Returns the duration of one round in milliseconds.
   * If provided, the server schedules an alarm to end the round automatically.
   */
  getDurationMs?: (state: LobbyState) => number;
}
