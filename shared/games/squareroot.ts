import type { GameSpec, SettingsField, StageQuestion, StageSettings } from "../framework";
import type { RootTerm } from "../root-math";

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
  min: 30,
  max: 120,
  step: 15,
  default: value,
  unit: "s",
});

/** Which kinds of task the "simplify" stage builds. */
export type RootTasks = "partial" | "mixed";

const rootTasks: SettingsField = {
  type: "choice",
  key: "rootTasks",
  labelKey: "settings.rootTasks",
  options: [
    { value: "partial", labelKey: "settings.rootTasksPartial" },
    { value: "mixed", labelKey: "settings.rootTasksMixed" },
  ],
  default: "mixed",
};

/** How narrow the interval of the "bisect" stage has to get. */
const targetPrecision: SettingsField = {
  type: "select",
  key: "targetPrecision",
  labelKey: "settings.targetPrecision",
  // Stored as hundredths so the setting stays a plain number: 50 → 0.5
  options: [50, 25, 10],
  default: 25,
};

export function readTargetPrecision(settings: StageSettings): number {
  return Number(settings.targetPrecision) / 100;
}

export const squarerootSpec: GameSpec = {
  id: "squareroot",
  titleKey: "games.squareroot.title",
  descriptionKey: "games.squareroot.description",
  category: "math",
  grades: ["9"],
  icon: "√",
  status: "live",
  minPlayers: 1,
  maxPlayers: 50,
  stages: [
    {
      id: "speed",
      nameKey: "games.squareroot.stages.speed.name",
      summaryKey: "games.squareroot.stages.speed.summary",
      rulesKey: "games.squareroot.stages.speed.rules",
      settings: [questionsPerRound([5, 10, 15], 10), duration(60)],
    },
    {
      id: "numberline",
      nameKey: "games.squareroot.stages.numberline.name",
      summaryKey: "games.squareroot.stages.numberline.summary",
      rulesKey: "games.squareroot.stages.numberline.rules",
      settings: [questionsPerRound([5, 10, 15], 10), duration(60)],
    },
    {
      id: "classify",
      nameKey: "games.squareroot.stages.classify.name",
      summaryKey: "games.squareroot.stages.classify.summary",
      rulesKey: "games.squareroot.stages.classify.rules",
      settings: [questionsPerRound([5, 10, 15], 10), duration(60)],
    },
    {
      id: "simplify",
      nameKey: "games.squareroot.stages.simplify.name",
      summaryKey: "games.squareroot.stages.simplify.summary",
      rulesKey: "games.squareroot.stages.simplify.rules",
      settings: [questionsPerRound([5, 10, 15], 10), duration(90), rootTasks],
    },
    {
      id: "bisect",
      nameKey: "games.squareroot.stages.bisect.name",
      summaryKey: "games.squareroot.stages.bisect.summary",
      rulesKey: "games.squareroot.stages.bisect.rules",
      settings: [questionsPerRound([3, 5, 8], 5), duration(120), targetPrecision],
    },
  ],
};

// ---------------------------------------------------------------------------
// Question types — created on the server, rendered on the client
// ---------------------------------------------------------------------------


export interface SpeedQuestion extends StageQuestion {
  /** Number under the radical; the answer is its (natural) square root. */
  value: number;
  numericAnswer: number;
}

export interface NumberLineQuestion extends StageQuestion {
  value: number;
  numericAnswer: number;
  lineMin: number;
  lineMax: number;
}

export type ClassifyAnswer = "natural" | "rational" | "irrational";

export interface ClassifyQuestion extends StageQuestion {
  value: number;
  classifyAnswer: ClassifyAnswer;
}

/** What the player has to simplify. The term is rendered from `promptLatex`,
 *  the answer is compared with `answer`. */
export interface SimplifyQuestion extends StageQuestion {
  promptLatex: string;
  answer: RootTerm;
}

export interface BisectQuestion extends StageQuestion {
  /** The root to trap, e.g. 17 for √17. */
  value: number;
  /** The interval the player starts from; it always contains √value. */
  startMin: number;
  startMax: number;
  /** How narrow the interval has to get, in units. */
  target: number;
}

/** What the "bisect" stage submits: the interval reached and how many halvings it took. */
export interface BisectAnswer {
  min: number;
  max: number;
  steps: number;
  /** Halves picked that did not contain the root. */
  mistakes?: number;
}
