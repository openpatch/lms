import type { GameSpec, SettingsField, StageQuestion, StageSettings } from "../framework";

const questionsPerRound: SettingsField = {
  type: "select",
  key: "questionsPerRound",
  labelKey: "settings.questionsPerRound",
  options: [3, 5, 8],
  default: 5,
};

const duration = (value: number): SettingsField => ({
  type: "range",
  key: "duration",
  labelKey: "settings.duration",
  min: 60,
  max: 240,
  step: 30,
  default: value,
  unit: "s",
});

/** How a graph is drawn: freehand, or by placing points a spline runs through
 *  (Komoda, "Automatic Grading of Online Graph Plotting Problems", ACA 2025). */
export type DrawInputMode = "points" | "freehand";

const inputMode: SettingsField = {
  type: "choice",
  key: "inputMode",
  labelKey: "settings.inputMode",
  options: [
    { value: "points", labelKey: "settings.inputModePoints" },
    { value: "freehand", labelKey: "settings.inputModeFreehand" },
  ],
  default: "points",
};

export function readInputMode(settings: StageSettings): DrawInputMode {
  return settings.inputMode === "freehand" ? "freehand" : "points";
}

/** How many points a player may add on top of the ones the question offers.
 *  Capped, so that "place the key points" cannot turn into tracing the curve
 *  with a dense chain of points. */
export const EXTRA_POINTS_MAX = 3;

const extraPoints: SettingsField = {
  type: "toggle",
  key: "extraPoints",
  labelKey: "settings.extraPoints",
  default: false,
};

export function readExtraPoints(settings: StageSettings): number {
  return settings.extraPoints === true ? EXTRA_POINTS_MAX : 0;
}

export const analysisSpec: GameSpec = {
  id: "analysis",
  titleKey: "games.analysis.title",
  descriptionKey: "games.analysis.description",
  category: "math",
  grades: ["EF", "Q1"],
  icon: "∫",
  status: "live",
  minPlayers: 1,
  maxPlayers: 50,
  stages: [
    {
      id: "multiple-choice",
      nameKey: "games.analysis.stages.multiple-choice.name",
      summaryKey: "games.analysis.stages.multiple-choice.summary",
      rulesKey: "games.analysis.stages.multiple-choice.rules",
      settings: [questionsPerRound, duration(90)],
    },
    {
      id: "draw-graph",
      nameKey: "games.analysis.stages.draw-graph.name",
      summaryKey: "games.analysis.stages.draw-graph.summary",
      rulesKey: "games.analysis.stages.draw-graph.rules",
      settings: [questionsPerRound, duration(120), inputMode, extraPoints],
    },
    {
      id: "draw-derivative",
      nameKey: "games.analysis.stages.draw-derivative.name",
      summaryKey: "games.analysis.stages.draw-derivative.summary",
      rulesKey: "games.analysis.stages.draw-derivative.rules",
      settings: [questionsPerRound, duration(150), inputMode, extraPoints],
    },
  ],
};

// ---------------------------------------------------------------------------
// Question types — created on the server, rendered on the client
// ---------------------------------------------------------------------------

export interface MultipleChoiceQuestion extends StageQuestion {
  /** Index into ANALYSIS_FUNCTIONS. */
  functionId: number;
  functionLatex: string;
  /** Four LaTeX candidates for f'(x). */
  options: string[];
  correctOptionIndex: number;
}

export interface DrawQuestion extends StageQuestion {
  functionId: number;
  functionLatex: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  /** How many points the "points" mode offers: one per turning point of the
   *  curve, plus the ends and the y-axis. */
  handleCount: number;
}

/** A drawn curve, in math coordinates. */
export interface DrawnPoint {
  x: number;
  y: number;
}
