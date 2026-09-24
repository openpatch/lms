import type { GameSpec, SettingsField, StageQuestion } from "../framework";

const questionsPerRound: SettingsField = {
  type: "select",
  key: "questionsPerRound",
  labelKey: "settings.questionsPerRound",
  options: [4, 6, 8],
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

export const spreadsheetSpec: GameSpec = {
  id: "spreadsheet",
  titleKey: "games.spreadsheet.title",
  descriptionKey: "games.spreadsheet.description",
  category: "cs",
  // SILP Informatik Sek I: UV-INF-SEK1-09-02 „Der Blick in die Glaskugel“.
  grades: ["9"],
  icon: "chartLine",
  color: "green",
  status: "live",
  minPlayers: 1,
  maxPlayers: 50,
  stages: [
    {
      id: "references",
      nameKey: "games.spreadsheet.stages.references.name",
      summaryKey: "games.spreadsheet.stages.references.summary",
      rulesKey: "games.spreadsheet.stages.references.rules",
      settings: [questionsPerRound, duration(120)],
    },
    {
      id: "growth",
      nameKey: "games.spreadsheet.stages.growth.name",
      summaryKey: "games.spreadsheet.stages.growth.summary",
      rulesKey: "games.spreadsheet.stages.growth.rules",
      settings: [questionsPerRound, duration(150)],
    },
    {
      id: "charts",
      nameKey: "games.spreadsheet.stages.charts.name",
      summaryKey: "games.spreadsheet.stages.charts.summary",
      rulesKey: "games.spreadsheet.stages.charts.rules",
      settings: [{ ...questionsPerRound, options: [3, 4, 6], default: 4 }, duration(120)],
    },
    {
      id: "functions",
      nameKey: "games.spreadsheet.stages.functions.name",
      summaryKey: "games.spreadsheet.stages.functions.summary",
      rulesKey: "games.spreadsheet.stages.functions.rules",
      settings: [questionsPerRound, duration(120)],
    },
    {
      id: "conditions",
      nameKey: "games.spreadsheet.stages.conditions.name",
      summaryKey: "games.spreadsheet.stages.conditions.summary",
      rulesKey: "games.spreadsheet.stages.conditions.rules",
      settings: [questionsPerRound, duration(150)],
    },
    {
      id: "check",
      nameKey: "games.spreadsheet.stages.check.name",
      summaryKey: "games.spreadsheet.stages.check.summary",
      rulesKey: "games.spreadsheet.stages.check.rules",
      settings: [questionsPerRound, duration(150)],
    },
  ],
};

export interface SheetRow {
  cells: (string | number)[];
}

export interface SpreadsheetChoiceQuestion extends StageQuestion {
  kind: "reference" | "growth" | "chart" | "function" | "condition" | "check";
  promptKey: string;
  promptParams: Record<string, string | number>;
  headers: string[];
  rows: SheetRow[];
  options: string[];
  answerIndex: number;
  /** A fixed input cell shown beside the table, when the task uses one. */
  parameterAddress?: string;
  parameterValue?: string;
  /**
   * Where the options' labels live, when options are ids rather than formulas
   * or values: an option `o` reads as `${optionKeyPrefix}.${o}`.
   */
  optionKeyPrefix?: string;
  /** A formula shown in the formula bar, when the task is about that formula. */
  formula?: { address: string; text: string };
}

export interface ReferenceQuestion extends SpreadsheetChoiceQuestion {
  kind: "reference";
}

export type GrowthModel = "linearUp" | "linearDown" | "expUp" | "expDown" | "quadratic";

export interface GrowthQuestion extends SpreadsheetChoiceQuestion {
  kind: "growth";
  model: GrowthModel;
}

export type ChartKind = "line" | "bar" | "pie" | "scatter";

export interface ChartQuestion extends SpreadsheetChoiceQuestion {
  kind: "chart";
  options: ChartKind[];
}

export interface FunctionQuestion extends SpreadsheetChoiceQuestion {
  kind: "function";
}

export interface ConditionQuestion extends SpreadsheetChoiceQuestion {
  kind: "condition";
}

/** What can be wrong with a formula — or that nothing is. */
export type FormulaVerdict = "correct" | "range" | "function" | "reference";

export const FORMULA_VERDICTS: FormulaVerdict[] = ["correct", "range", "function", "reference"];

export interface CheckQuestion extends SpreadsheetChoiceQuestion {
  kind: "check";
  options: FormulaVerdict[];
}
