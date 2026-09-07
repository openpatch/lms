import type { GameSpec, SettingsField, StageQuestion } from "../framework";
import type { Polynomial } from "../polynomial";

const questionsPerRound = (options: number[], value: number): SettingsField => ({
  type: "select",
  key: "questionsPerRound",
  labelKey: "settings.questionsPerRound",
  options,
  default: value,
});

const duration = (value: number): SettingsField => ({
  type: "range",
  key: "duration",
  labelKey: "settings.duration",
  min: 60,
  max: 300,
  step: 30,
  default: value,
  unit: "s",
});

const degree: SettingsField = {
  type: "select",
  key: "degree",
  labelKey: "settings.degree",
  options: [2, 3, 4],
  default: 3,
};

const showTargetGraph: SettingsField = {
  type: "toggle",
  key: "showTargetGraph",
  labelKey: "settings.showTargetGraph",
  default: true,
};

export const extremumSpec: GameSpec = {
  id: "extremum",
  titleKey: "games.extremum.title",
  descriptionKey: "games.extremum.description",
  category: "math",
  grades: ["Q1"],
  icon: "⛰️",
  status: "live",
  minPlayers: 1,
  maxPlayers: 50,
  stages: [
    {
      id: "derive",
      nameKey: "games.extremum.stages.derive.name",
      summaryKey: "games.extremum.stages.derive.summary",
      rulesKey: "games.extremum.stages.derive.rules",
      settings: [questionsPerRound([5, 8, 10], 8), duration(120), degree],
    },
    {
      id: "optimize",
      nameKey: "games.extremum.stages.optimize.name",
      summaryKey: "games.extremum.stages.optimize.summary",
      rulesKey: "games.extremum.stages.optimize.rules",
      settings: [questionsPerRound([3, 4, 6], 4), duration(240), showTargetGraph],
    },
  ],
};

// ---------------------------------------------------------------------------
// Question types — created on the server, rendered on the client
// ---------------------------------------------------------------------------

export interface DeriveQuestion extends StageQuestion {
  /** f(x) as LaTeX; the answer is its derivative. */
  functionLatex: string;
  /** The same function as coefficients — it is the question, not the answer. */
  polynomial: Polynomial;
}

/** The two cards a player has to pick: what limits the problem, and what is
 *  being maximised once the constraint has been substituted. */
export const OPTIMIZE_SLOTS = ["constraint", "target"] as const;

export interface OptimizeQuestion extends StageQuestion {
  icon: string;
  /** i18n key of the situation, interpolated with `params`. */
  contextKey: string;
  params: Record<string, number>;
  /** i18n key of what is being maximised (an area, a volume). */
  quantityKey: string;
  /** The cards on offer, as LaTeX — the two right ones plus distractors. */
  cards: string[];
  /** The LaTeX expected in slot 0 (constraint) and slot 1 (target function). */
  slotAnswers: [string, string];
  /** The target function, so both sides can plot and score it. */
  target: Polynomial;
  /** The interval x may be chosen from. */
  xMin: number;
  xMax: number;
  /** Plot window for the target function. */
  yMin: number;
  yMax: number;
  /** Slider step. */
  step: number;
}

/** What the optimize stage submits. */
export interface OptimizeAnswer {
  assignment: (number | null)[];
  x: number;
}
