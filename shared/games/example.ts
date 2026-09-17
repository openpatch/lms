import type { GameSpec, StageRoundData } from "../framework";
import { ROUND_POINTS } from "../framework";

/**
 * The smallest possible mini game: one stage, no questions, just a tap counter.
 * Use it as the template when adding a game — see documentation.md.
 */
export const exampleSpec: GameSpec = {
  id: "example",
  titleKey: "games.example.title",
  descriptionKey: "games.example.description",
  category: "math",
  grades: [],
  icon: "target",
  color: "teal",
  status: "live",
  // The template, not something a class plays: kept out of the arena but still
  // registered, still checked, and still reachable at its own URL.
  hidden: true,
  minPlayers: 1,
  maxPlayers: 50,
  stages: [
    {
      id: "tap",
      nameKey: "games.example.stages.tap.name",
      summaryKey: "games.example.stages.tap.summary",
      rulesKey: "games.example.stages.tap.rules",
      settings: [
        { type: "range", key: "duration", labelKey: "settings.duration", min: 5, max: 30, step: 5, default: 10, unit: "s" },
        { type: "select", key: "targetScore", labelKey: "settings.targetScore", options: [10, 25, 50, 100], default: 50 },
      ],
    },
  ],
};

/**
 * What a tap round is worth: how far the player got towards the target, out of
 * the hundred points a round of any stage is worth.
 *
 * Counting the taps themselves would make this one stage worth whatever a
 * quick pair of thumbs can manage, which is the thing every other stage was
 * just normalized to stop doing — and this is the game the others are copied
 * from. Both sides score from here so they cannot drift apart.
 */
export function tapScore(data: StageRoundData, playerId: string): number {
  const clicks = (data.extra.clicks as Record<string, number> | undefined)?.[playerId] ?? 0;
  const target = Math.max(1, Number(data.settings.targetScore ?? 50));
  return Math.round(Math.min(1, clicks / target) * ROUND_POINTS);
}
