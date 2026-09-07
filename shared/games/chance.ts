import type { GameSpec, SettingsField, StageQuestion, StageSettings } from "../framework";
import type { RationalValue } from "../rational-math";
import type { TreeEvent } from "../chance-model";

const questionsPerRound: SettingsField = {
  type: "select",
  key: "questionsPerRound",
  labelKey: "settings.questionsPerRound",
  options: [4, 6, 8, 10],
  default: 6,
};

const duration = (value: number): SettingsField => ({
  type: "range",
  key: "duration",
  labelKey: "settings.duration",
  min: 60,
  max: 240,
  step: 15,
  default: value,
  unit: "s",
});

/** How a probability is written down. */
export type ChanceNotation = "fraction" | "decimal" | "percent";

const notation: SettingsField = {
  type: "choice",
  key: "notation",
  labelKey: "settings.notation",
  options: [
    { value: "fraction", labelKey: "settings.notationFraction" },
    { value: "decimal", labelKey: "settings.notationDecimal" },
    { value: "percent", labelKey: "settings.notationPercent" },
  ],
  default: "fraction",
};

export function readChanceNotation(settings: StageSettings): ChanceNotation {
  const value = settings.notation;
  return value === "decimal" || value === "percent" ? value : "fraction";
}

/** Whether the second draw happens with the first ball put back. */
export type ReplacementMode = "with" | "without" | "mixed";

const replacement: SettingsField = {
  type: "choice",
  key: "replacement",
  labelKey: "settings.replacement",
  options: [
    { value: "mixed", labelKey: "settings.replacementMixed" },
    { value: "with", labelKey: "settings.replacementWith" },
    { value: "without", labelKey: "settings.replacementWithout" },
  ],
  default: "mixed",
};

export function readReplacement(settings: StageSettings): ReplacementMode {
  const value = settings.replacement;
  return value === "with" || value === "without" ? value : "mixed";
}

export const chanceSpec: GameSpec = {
  id: "chance",
  titleKey: "games.chance.title",
  descriptionKey: "games.chance.description",
  category: "math",
  // The SILP puts this vorhaben in year 7 or, alternatively, in year 8
  grades: ["7", "8"],
  icon: "🎲",
  status: "live",
  minPlayers: 1,
  maxPlayers: 50,
  stages: [
    {
      id: "laplace",
      nameKey: "games.chance.stages.laplace.name",
      summaryKey: "games.chance.stages.laplace.summary",
      rulesKey: "games.chance.stages.laplace.rules",
      settings: [questionsPerRound, duration(90), notation],
    },
    {
      id: "tree",
      nameKey: "games.chance.stages.tree.name",
      summaryKey: "games.chance.stages.tree.summary",
      rulesKey: "games.chance.stages.tree.rules",
      settings: [
        { ...questionsPerRound, options: [3, 4, 6], default: 4 },
        duration(180),
        replacement,
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Question types — created on the server, rendered on the client
// ---------------------------------------------------------------------------

export interface LaplaceQuestion extends StageQuestion {
  icon: string;
  /** i18n key of the setup sentence, interpolated with `params`. */
  setupKey: string;
  /** i18n key of the event, interpolated with `params`. */
  eventKey: string;
  params: Record<string, number>;
  /** Outcomes that belong to the event, and how many there are in total. */
  favourable: number;
  outcomes: number;
}

export interface TreeQuestion extends StageQuestion {
  icon: string;
  setupKey: string;
  params: Record<string, number>;
  /** i18n keys of the two outcomes, e.g. a red and a blue ball. */
  outcomeKeys: [string, string];
  /** The first stage is given … */
  first: [RationalValue, RationalValue];
  /** … the four second-stage probabilities are what the player places,
   *  in slot order: 0/0, 0/1, 1/0, 1/1. */
  slotAnswers: RationalValue[];
  /** The cards on offer: the four right ones plus distractors, shuffled. */
  cards: RationalValue[];
  event: TreeEvent;
  eventKey: string;
  /** The probability of the event, reduced. */
  eventAnswer: RationalValue;
}

/** What the tree stage submits. */
export interface TreeAnswer {
  /** Slot index per card, as the MatchBoard produces it. */
  assignment: (number | null)[];
  /** The typed probability of the event. */
  event: string;
}
