import type { GameSpec, SettingsField, StageQuestion } from "../framework";
import type { Fraction } from "../rational-math";
import type { Relation } from "../term-algebra";

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
  max: 240,
  step: 15,
  default: 150,
  unit: "s",
};

/** What the "collect" stage draws on: EdM 2.2 (add/subtract) or 2.3 (multiply). */
export type CollectTask = "sum" | "product" | "both";

const collectTask: SettingsField = {
  type: "choice",
  key: "collectTask",
  labelKey: "settings.collectTask",
  options: [
    { value: "both", labelKey: "settings.collectTaskBoth" },
    { value: "sum", labelKey: "settings.collectTaskSum" },
    { value: "product", labelKey: "settings.collectTaskProduct" },
  ],
  default: "both",
};

/** One bracket (EdM 2.4/2.5) or a product of two (EdM 2.7). */
export type BracketMode = "single" | "double" | "both";

const bracketMode: SettingsField = {
  type: "choice",
  key: "bracketMode",
  labelKey: "settings.bracketMode",
  options: [
    { value: "both", labelKey: "settings.bracketModeBoth" },
    { value: "single", labelKey: "settings.bracketModeSingle" },
    { value: "double", labelKey: "settings.bracketModeDouble" },
  ],
  default: "both",
};

const withMinus: SettingsField = {
  type: "toggle",
  key: "withMinus",
  labelKey: "settings.withMinus",
  default: true,
};

const withVariables: SettingsField = {
  type: "toggle",
  key: "withVariables",
  labelKey: "settings.withVariables",
  default: true,
};

/** Which way a binomial formula is used. */
export type BinomialDirection = "expand" | "factor" | "both";

const binomialDirection: SettingsField = {
  type: "choice",
  key: "binomialDirection",
  labelKey: "settings.binomialDirection",
  options: [
    { value: "both", labelKey: "settings.binomialDirectionBoth" },
    { value: "expand", labelKey: "settings.binomialDirectionExpand" },
    { value: "factor", labelKey: "settings.binomialDirectionFactor" },
  ],
  default: "both",
};

const withCoefficients: SettingsField = {
  type: "toggle",
  key: "withCoefficients",
  labelKey: "settings.withCoefficients",
  default: false,
};

/** What a "Terme berechnen" question asks for. */
export type EvaluateAsk = "value" | "equivalent" | "both";

const evaluateAsk: SettingsField = {
  type: "choice",
  key: "evaluateAsk",
  labelKey: "settings.evaluateAsk",
  options: [
    { value: "both", labelKey: "settings.evaluateAskBoth" },
    { value: "value", labelKey: "settings.evaluateAskValue" },
    { value: "equivalent", labelKey: "settings.evaluateAskEquivalent" },
  ],
  default: "both",
};

const withFractionValues: SettingsField = {
  type: "toggle",
  key: "withFractionValues",
  labelKey: "settings.withFractionValues",
  default: false,
};

/** What a Bruchgleichung question asks for. */
export type FractionAsk = "solve" | "domain" | "both";

const fractionAsk: SettingsField = {
  type: "choice",
  key: "fractionAsk",
  labelKey: "settings.fractionAsk",
  options: [
    { value: "both", labelKey: "settings.fractionAskBoth" },
    { value: "solve", labelKey: "settings.fractionAskSolve" },
    { value: "domain", labelKey: "settings.fractionAskDomain" },
  ],
  default: "both",
};

const multiStep: SettingsField = {
  type: "toggle",
  key: "multiStep",
  labelKey: "settings.multiStep",
  default: true,
};

const withSignFlip: SettingsField = {
  type: "toggle",
  key: "withSignFlip",
  labelKey: "settings.withSignFlip",
  default: true,
};

const withBrackets: SettingsField = {
  type: "toggle",
  key: "withBrackets",
  labelKey: "settings.withBrackets",
  default: false,
};

const factorFirst: SettingsField = {
  type: "toggle",
  key: "factorFirst",
  labelKey: "settings.factorFirst",
  default: false,
};

export const termeSpec: GameSpec = {
  id: "terme",
  titleKey: "games.terme.title",
  descriptionKey: "games.terme.description",
  category: "math",
  grades: ["8"],
  icon: "x²",
  color: "orange",
  status: "live",
  minPlayers: 1,
  maxPlayers: 50,
  stages: [
    {
      id: "build",
      nameKey: "games.terme.stages.build.name",
      summaryKey: "games.terme.stages.build.summary",
      rulesKey: "games.terme.stages.build.rules",
      settings: [questionsPerRound, duration],
    },
    {
      id: "evaluate",
      nameKey: "games.terme.stages.evaluate.name",
      summaryKey: "games.terme.stages.evaluate.summary",
      rulesKey: "games.terme.stages.evaluate.rules",
      settings: [questionsPerRound, duration, evaluateAsk, withFractionValues],
    },
    {
      id: "collect",
      nameKey: "games.terme.stages.collect.name",
      summaryKey: "games.terme.stages.collect.summary",
      rulesKey: "games.terme.stages.collect.rules",
      settings: [questionsPerRound, duration, collectTask],
    },
    {
      id: "expand",
      nameKey: "games.terme.stages.expand.name",
      summaryKey: "games.terme.stages.expand.summary",
      rulesKey: "games.terme.stages.expand.rules",
      settings: [questionsPerRound, duration, bracketMode, withMinus],
    },
    {
      id: "factor",
      nameKey: "games.terme.stages.factor.name",
      summaryKey: "games.terme.stages.factor.summary",
      rulesKey: "games.terme.stages.factor.rules",
      settings: [questionsPerRound, duration, withVariables],
    },
    {
      id: "binomial",
      nameKey: "games.terme.stages.binomial.name",
      summaryKey: "games.terme.stages.binomial.summary",
      rulesKey: "games.terme.stages.binomial.rules",
      settings: [questionsPerRound, duration, binomialDirection, withCoefficients],
    },
    {
      id: "zero",
      nameKey: "games.terme.stages.zero.name",
      summaryKey: "games.terme.stages.zero.summary",
      rulesKey: "games.terme.stages.zero.rules",
      settings: [questionsPerRound, duration, factorFirst],
    },
    {
      id: "fraction",
      nameKey: "games.terme.stages.fraction.name",
      summaryKey: "games.terme.stages.fraction.summary",
      rulesKey: "games.terme.stages.fraction.rules",
      settings: [questionsPerRound, duration, fractionAsk],
    },
    {
      id: "rearrange",
      nameKey: "games.terme.stages.rearrange.name",
      summaryKey: "games.terme.stages.rearrange.summary",
      rulesKey: "games.terme.stages.rearrange.rules",
      settings: [questionsPerRound, duration, multiStep],
    },
    {
      id: "inequality",
      nameKey: "games.terme.stages.inequality.name",
      summaryKey: "games.terme.stages.inequality.summary",
      rulesKey: "games.terme.stages.inequality.rules",
      settings: [questionsPerRound, duration, withSignFlip, withBrackets],
    },
  ],
};

// ---------------------------------------------------------------------------
// Question types — created on the server, rendered on the client
// ---------------------------------------------------------------------------

/** Every stage but "build" shows a term and takes one back. */
export interface TermTask extends StageQuestion {
  /** The term the player reads, as LaTeX. */
  termLatex: string;
  /** The expected answer, as LaTeX. Also what the server grades against. */
  solutionLatex: string;
}

export interface BuildQuestion extends StageQuestion {
  /** i18n key of the situation, interpolated with `numbers`. */
  contextKey: string;
  /** i18n key of what the variable stands for ("x = gefahrene Kilometer"). */
  variableKey: string;
  icon: string;
  numbers: Record<string, number>;
  /** Four terms as LaTeX, shuffled. */
  options: string[];
  correct: number;
}

export type CollectQuestion = TermTask;
export type ExpandQuestion = TermTask;

export interface FactorQuestion extends TermTask {
  /** The monomial that has to come out in front, for the rules and the results. */
  commonLatex: string;
}

export interface BinomialQuestion extends TermTask {
  /** "expand": multiply the binomial out. "factor": write it as a product. */
  direction: "expand" | "factor";
}

/**
 * Terme und ihre Berechnung, wertgleiche Terme (EdM 2.1/2.2, "Das Wichtigste auf
 * einen Blick" S. 92): put numbers in and work the term out, or decide whether
 * two terms give the same value for every substitution.
 */
export interface EvaluateQuestion extends TermTask {
  ask: "value" | "equivalent";
  /** The substitutions to make, as "x" and the LaTeX of its value. */
  assignments: { name: string; latex: string }[];
  /** The value of the term under those substitutions. */
  value: Fraction;
  /** The term to compare with, when the question asks about wertgleich. */
  otherLatex: string;
  equivalent: boolean;
}

/** Bruchgleichungen (EdM 2.10) — solve it, or name the value the domain excludes. */
export interface FractionQuestion extends TermTask {
  variable: string;
  /** "solve": give the solution. "domain": name the value that is not allowed. */
  ask: "solve" | "domain";
  /** The answer as a number, whichever of the two was asked for. */
  answer: Fraction;
}

/** Umformen von Formeln (EdM 2.11) — solve a formula for one of its variables. */
export interface RearrangeQuestion extends TermTask {
  /** i18n key of what the formula describes. */
  contextKey: string;
  icon: string;
  /** The variable the formula has to be solved for. */
  target: string;
}

/** Ungleichungen (EdM 2.12). */
export interface InequalityQuestion extends TermTask {
  variable: string;
  relation: Relation;
  /** The bound the variable is compared with, as an exact fraction. */
  bound: Fraction;
}

export interface ZeroQuestion extends StageQuestion {
  /** The equation, as LaTeX, without the "= 0". */
  termLatex: string;
  /** The unknown the equation is in, so the answer fields can be named after it. */
  variable: string;
  /** Whether the term still has to be factored before the rule applies. */
  needsFactoring: boolean;
  solutions: Fraction[];
  solutionLatex: string;
}
