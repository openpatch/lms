import type { LobbyState, GameResult } from "../shared/types";

/**
 * The bit of a client connection a game handler is allowed to see.
 * Games only ever need the id, so this is all the transport leaks into them.
 */
export interface Conn {
  id: string;
}

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
  onMessage?: (state: LobbyState, payload: unknown, sender: Conn) => unknown;

  /**
   * What one player may see of the game data, when it is not the host.
   *
   * The round is built with its answer key in it — the server grades against
   * it — and every player's answers go into it as they arrive. Sent to every
   * device as it stands, both would be one devtools tab away from the whole
   * class. This is the view a player's own device gets instead; the host gets
   * the round as it stands. Leave it out only for a game whose data holds
   * nothing a player should not see.
   */
  forViewer?: (state: LobbyState, viewerId: string) => unknown;

  /**
   * Called the moment the round actually starts being played — after the rules
   * screen and after the countdown.
   *
   * The round itself is built much earlier, when the rules go up, because that
   * is when the client needs the questions to show them. Anything in it that
   * is a reading of the clock is therefore wrong by however long the host
   * spent explaining, and a host can spend as long as they like. This is where
   * that is put right. Should return the updated game data.
   */
  onRoundBegin?: (state: LobbyState, now: number) => unknown;

  /**
   * Called to determine if the current round is finished.
   * Should return GameResult[] if the round is done, or undefined if still in progress.
   */
  checkRoundFinished?: (state: LobbyState) => GameResult[] | undefined;

  /**
   * What the round stands at, asked rather than waited for: the host has cut
   * it short. Whatever has been answered counts, and whatever has not is worth
   * what it would have been worth had the clock run out.
   */
  roundResults?: (state: LobbyState) => GameResult[];

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

  /**
   * Is the round now being played a live one — a stage the player acts in
   * continuously rather than answering question by question?
   *
   * The room treats those differently on the wire: instead of saving and
   * broadcasting on every action, it runs a tick while the round lasts and
   * sends the round from there. Thirty players tapping four times a second is
   * not thirty players answering ten questions, and the difference is the
   * difference between a lesson and a stalled server.
   */
  isLive?: (state: LobbyState) => boolean;

  /**
   * How often that tick should fire for the round now being played.
   *
   * It is a cost as much as a cadence: every beat is one serialised copy of
   * the round per socket, and a round that carries a long timeline pays for
   * that timeline again on each one. A stage that only needs the scoreboard to
   * feel live wants a slow beat; a stage whose own state has to reach thirty
   * screens together wants a quick one.
   */
  liveTickMs?: (state: LobbyState) => number;

  /**
   * Called on that tick, so a live stage can move on by itself rather than
   * only in response to a player — a light that decides when to turn green.
   * Returns the updated game data when something changed, undefined otherwise.
   */
  onTick?: (state: LobbyState, now: number) => unknown;
}
