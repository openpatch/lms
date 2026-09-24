import type { GameSpec } from "../framework";

/**
 * A bitflow flow, worked through by a whole class at once.
 *
 * Not a game in the sense the others are. A flow is something the teacher
 * brings — an assessment built in Bitflow Studio and published at a web
 * address — and each player works through it at their own pace on their own
 * device. The lobby is what it lends the flow: a join code, a teacher's screen
 * showing where everybody is, and the lesson kept for review afterwards.
 *
 * It is unranked. A flow is marked in the player's browser, which is the right
 * place for a learner to find out how they did and the wrong place to decide
 * who beats whom; and progress through an assessment is not something to put
 * on a projector as a league table. The teacher sees each player's progress
 * and result on their own screen; the class sees nothing about each other.
 */
export const bitflowSpec: GameSpec = {
  id: "bitflow",
  titleKey: "games.bitflow.title",
  descriptionKey: "games.bitflow.description",
  category: "cs",
  grades: [],
  icon: "flag",
  color: "blue",
  status: "live",
  unranked: true,
  minPlayers: 1,
  maxPlayers: 50,
  stages: [
    {
      id: "flow",
      nameKey: "games.bitflow.stages.flow.name",
      summaryKey: "games.bitflow.stages.flow.summary",
      rulesKey: "games.bitflow.stages.flow.rules",
      settings: [
        {
          type: "url",
          key: "flowUrl",
          labelKey: "settings.flowUrl",
          hintKey: "settings.flowUrlHint",
          default: "",
        },
        { type: "range", key: "minutes", labelKey: "settings.minutes", min: 5, max: 90, step: 5, default: 30, unit: " min" },
      ],
    },
  ],
};
