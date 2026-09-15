import type { StageRoundData } from "../../../shared/framework";

/** Clicks per player, kept in the round's `extra` state by the server. What
 *  the stage shows; what it *scores* is tapScore, beside the spec. */
export function clicksOf(data: StageRoundData, playerId: string): number {
  const clicks = data.extra.clicks as Record<string, number> | undefined;
  return clicks?.[playerId] ?? 0;
}
