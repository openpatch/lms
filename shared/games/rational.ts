import type { GameSpec, SettingsField, StageQuestion, StageSettings } from "../framework";
import type { RationalOperator, RationalValue } from "../rational-math";

const questionsPerRound: SettingsField = {
  type: "select",
  key: "questionsPerRound",
  labelKey: "settings.questionsPerRound",
  options: [4, 6, 8, 10],
  default: 6,
};

const duration: SettingsField = {
  type: "range",
  key: "duration",
  labelKey: "settings.duration",
  min: 60,
  max: 180,
  step: 15,
  default: 120,
  unit: "s",
};

const allowNegatives: SettingsField = {
  type: "toggle",
  key: "allowNegatives",
  labelKey: "settings.allowNegatives",
  default: true,
};

/** Which way the numbers of a round are written. */
export type RationalNotation = "fraction" | "decimal" | "both";

const notation: SettingsField = {
  type: "choice",
  key: "notation",
  labelKey: "settings.notation",
  options: [
    { value: "fraction", labelKey: "settings.notationFraction" },
    { value: "decimal", labelKey: "settings.notationDecimal" },
    { value: "both", labelKey: "settings.notationBoth" },
  ],
  default: "both",
};

/** How the "signs" stage wants the answer: the value, or only its sign. */
export type SignsAnswerMode = "value" | "sign";

const answerMode: SettingsField = {
  type: "choice",
  key: "answerMode",
  labelKey: "settings.answerMode",
  options: [
    { value: "value", labelKey: "settings.answerModeValue" },
    { value: "sign", labelKey: "settings.answerModeSign" },
  ],
  default: "value",
};

const withBrackets: SettingsField = {
  type: "toggle",
  key: "withBrackets",
  labelKey: "settings.withBrackets",
  default: false,
};

/** What the "change" stage asks for. */
export type ChangeAsk = "result" | "change";

const askMode: SettingsField = {
  type: "choice",
  key: "askMode",
  labelKey: "settings.askMode",
  options: [
    { value: "both", labelKey: "settings.askModeBoth" },
    { value: "result", labelKey: "settings.askModeResult" },
    { value: "change", labelKey: "settings.askModeChange" },
  ],
  default: "both",
};

const twoChanges: SettingsField = {
  type: "toggle",
  key: "twoChanges",
  labelKey: "settings.twoChanges",
  default: false,
};

/** Reads the notation of a stage's resolved settings. */
export function readNotation(settings: StageSettings): RationalNotation {
  const value = settings.notation;
  return value === "fraction" || value === "decimal" ? value : "both";
}

/** Reads the answer mode of the "signs" stage. */
export function readAnswerMode(settings: StageSettings): SignsAnswerMode {
  return settings.answerMode === "sign" ? "sign" : "value";
}

export const rationalSpec: GameSpec = {
  id: "rational",
  titleKey: "games.rational.title",
  descriptionKey: "games.rational.description",
  category: "math",
  grades: ["7"],
  icon: "½",
  status: "live",
  minPlayers: 1,
  maxPlayers: 50,
  stages: [
    {
      id: "arrange",
      nameKey: "games.rational.stages.arrange.name",
      summaryKey: "games.rational.stages.arrange.summary",
      rulesKey: "games.rational.stages.arrange.rules",
      settings: [questionsPerRound, duration, notation, allowNegatives],
    },
    {
      id: "calculate",
      nameKey: "games.rational.stages.calculate.name",
      summaryKey: "games.rational.stages.calculate.summary",
      rulesKey: "games.rational.stages.calculate.rules",
      settings: [questionsPerRound, duration, notation, allowNegatives],
    },
    {
      id: "signs",
      nameKey: "games.rational.stages.signs.name",
      summaryKey: "games.rational.stages.signs.summary",
      rulesKey: "games.rational.stages.signs.rules",
      settings: [questionsPerRound, duration, answerMode, withBrackets],
    },
    {
      id: "change",
      nameKey: "games.rational.stages.change.name",
      summaryKey: "games.rational.stages.change.summary",
      rulesKey: "games.rational.stages.change.rules",
      settings: [questionsPerRound, duration, askMode, twoChanges],
    },
  ],
};

// ---------------------------------------------------------------------------
// Question types — created on the server, rendered on the client
// ---------------------------------------------------------------------------

export interface ArrangeQuestion extends StageQuestion {
  /** The numbers to place, in the order they are shown. */
  items: RationalValue[];
  lineMin: number;
  lineMax: number;
}

export interface CalculateQuestion extends StageQuestion {
  left: RationalValue;
  operator: RationalOperator;
  right: RationalValue;
  /** The reduced result; equivalent fractions are accepted too. */
  result: RationalValue;
}

export interface SignsQuestion extends StageQuestion {
  /** The whole term as LaTeX, e.g. "(-3)\cdot(+4)". */
  termLatex: string;
  /** The value of the term; never 0, so its sign is always well defined. */
  result: number;
}

export interface ChangeQuestion extends StageQuestion {
  /** i18n key of the context label, e.g. "games.rational.contexts.temperature". */
  contextKey: string;
  /** Emoji shown with the context. */
  icon: string;
  /** Unit suffix of every value, e.g. "°C". */
  unit: string;
  start: number;
  /** The changes applied to `start`, in order. */
  changes: number[];
  /** "result": place start + changes on the line. "change": name the change. */
  ask: ChangeAsk;
  /** The end state, or the single change the player has to name. */
  answer: number;
  lineMin: number;
  lineMax: number;
}
