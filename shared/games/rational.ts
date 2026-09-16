import type { GameSpec, SettingsField, StageQuestion, StageSettings } from "../framework";
import type { RationalOperator, RationalValue } from "../rational-math";
import { toValue } from "../rational-math";

const ALL_OPERATORS: RationalOperator[] = ["+", "-", "*", "/"];

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

/** Which of the four operations the "calculate" stage draws from. */
const operations: SettingsField = {
  type: "multi",
  key: "operations",
  labelKey: "settings.operations",
  options: [
    { value: "+", labelKey: "settings.operationAdd" },
    { value: "-", labelKey: "settings.operationSubtract" },
    { value: "*", labelKey: "settings.operationMultiply" },
    { value: "/", labelKey: "settings.operationDivide" },
  ],
  default: ["+", "-", "*", "/"],
};

/** Which way a round of the "order" stage runs. */
export type OrderDirection = "asc" | "desc";

const orderDirection: SettingsField = {
  type: "choice",
  key: "orderDirection",
  labelKey: "settings.orderDirection",
  options: [
    { value: "both", labelKey: "settings.orderDirectionBoth" },
    { value: "asc", labelKey: "settings.orderDirectionAsc" },
    { value: "desc", labelKey: "settings.orderDirectionDesc" },
  ],
  default: "both",
};

const withAbsolute: SettingsField = {
  type: "toggle",
  key: "withAbsolute",
  labelKey: "settings.withAbsolute",
  default: true,
};

const itemCount: SettingsField = {
  type: "select",
  key: "itemCount",
  labelKey: "settings.itemCount",
  options: [4, 5, 6],
  default: 5,
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

/** Reads the operations a "calculate" round may use. Never empty. */
export function readOperations(settings: StageSettings): RationalOperator[] {
  const raw = settings.operations;
  const picked = Array.isArray(raw) ? raw.filter(isOperator) : [];
  return picked.length > 0 ? picked : ALL_OPERATORS;
}

function isOperator(value: unknown): value is RationalOperator {
  return value === "+" || value === "-" || value === "*" || value === "/";
}

/**
 * What one player sent for the "order" stage: every item's index, in the order
 * they tapped them. Anything that is not a full permutation of the items is not
 * an ordering at all, so it is graded as one that got nothing in order.
 */
export function readOrderAnswer(raw: string | undefined, count: number): number[] | null {
  if (raw == null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length !== count) return null;
  // Numbers, not things that coerce to one: a nested array reads as its only
  // element, so [[0],1,2] would come back a valid ordering of three items.
  const order: number[] = parsed.map((index) => (typeof index === "number" ? index : NaN));
  if (order.some((index) => !Number.isInteger(index) || index < 0 || index >= count)) return null;
  return new Set(order).size === count ? order : null;
}

/** The items' indices in the order the question asks for. Two items of equal
 *  value — a number beside its own absolute value — keep the order they were
 *  shown in, which is one of the orders the stage marks correct. */
export function orderSolution(question: OrderQuestion): number[] {
  const sign = question.direction === "asc" ? 1 : -1;
  return question.items
    .map((_, index) => index)
    .sort((a, b) => sign * (toValue(question.items[a]) - toValue(question.items[b])));
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
  color: "sky",
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
      id: "order",
      nameKey: "games.rational.stages.order.name",
      summaryKey: "games.rational.stages.order.summary",
      rulesKey: "games.rational.stages.order.rules",
      settings: [questionsPerRound, duration, itemCount, orderDirection, withAbsolute, notation],
    },
    {
      id: "calculate",
      nameKey: "games.rational.stages.calculate.name",
      summaryKey: "games.rational.stages.calculate.summary",
      rulesKey: "games.rational.stages.calculate.rules",
      settings: [questionsPerRound, duration, operations, notation, allowNegatives],
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

/** One number as the player reads it. A barred item is written |x| with a
 *  negative x, so what it is worth is the magnitude — n/d is that value, not
 *  the number between the bars. */
export interface OrderItem extends RationalValue {
  absolute: boolean;
}

export interface OrderQuestion extends StageQuestion {
  /** The numbers to order, in the order they are shown. */
  items: OrderItem[];
  /** "asc": smallest first. "desc": largest first. */
  direction: OrderDirection;
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
