import type { GameSpec } from "../framework";

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
  icon: "🎯",
  status: "live",
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
