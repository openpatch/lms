import type { GameResult, Player } from "../../shared/types";

/** One line of the table: where a player stands, and what the round added. */
export interface ResultRow extends GameResult {
  /** Points from the round just played. Left out when there is nothing behind
   *  it — after the first round of a game, the total *is* the round. */
  gained?: number;
}

/**
 * Puts what a round added next to what everyone now has.
 *
 * Both halves are already on the client — the totals, and the round's points
 * that came with the round — so this is putting two things it has side by side
 * rather than asking the server for a third.
 *
 * `withGain` is false for the first round of a game, where the total *is* the
 * round and "142 +142" says the same thing twice.
 */
export function withGains(
  totals: GameResult[],
  roundResults: GameResult[],
  withGain: boolean,
): ResultRow[] {
  return totals.map((total) => ({
    ...total,
    gained: withGain
      ? (roundResults.find((result) => result.playerId === total.playerId)?.score ?? 0)
      : undefined,
  }));
}

/** Where everyone stands mid-game, which only the lobby state knows. */
export function standings(players: Player[], roundResults: GameResult[], withGain: boolean) {
  const totals = players
    .filter((player) => !player.isHost)
    .map((player) => ({ playerId: player.id, playerName: player.name, score: player.score }))
    .sort((a, b) => b.score - a.score);
  return withGains(totals, roundResults, withGain);
}
