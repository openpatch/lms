import { rationalSpec, readAnswerMode, readNotation } from "../../shared/games/rational";
import type {
  ArrangeQuestion,
  CalculateQuestion,
  ChangeAsk,
  ChangeQuestion,
  RationalNotation,
  SignsQuestion,
} from "../../shared/games/rational";
import { closenessPoints, speedPoints } from "../../shared/framework";
import type {
  Fraction,
  RationalDisplay,
  RationalOperator,
  RationalValue,
} from "../../shared/rational-math";
import {
  applyOperator,
  equals,
  isTerminating,
  makeValue,
  operatorLatex,
  parseFraction,
  reduce,
  toValue,
} from "../../shared/rational-math";
import type { StageHandler } from "../framework";
import { createStageGame } from "../framework";

// Denominators common in school material
const DENOMINATORS = [2, 3, 4, 5, 6, 8, 10, 12];
// Only 2s and 5s, so every value — and every sum, product or quotient of two of
// them — has a terminating decimal expansion.
const DECIMAL_DENOMINATORS = [2, 4, 5, 8, 10];
// Number line ranges for the arrange stage: [min, max]
const LINE_RANGES: [number, number][] = [
  [0, 1],
  [0, 2],
  [0, 3],
  [-1, 1],
  [-2, 2],
];
const OPERATORS: RationalOperator[] = ["+", "-", "*", "/"];
const ITEMS_PER_LINE = 3;
/** A placement counts as correct from this score upwards. */
const ARRANGE_PASS_MARK = 60;
/** A placement this far off — as a share of the line — is worth no points. */
const ARRANGE_ZERO_AT = 0.2;
// Contexts of the "change" stage: a state that can go below zero, plus its unit
const CHANGE_CONTEXTS = [
  { key: "games.rational.contexts.temperature", icon: "🌡️", unit: "°C", min: -20, max: 20 },
  { key: "games.rational.contexts.account", icon: "💶", unit: "€", min: -50, max: 50 },
  { key: "games.rational.contexts.altitude", icon: "🤿", unit: "m", min: -30, max: 30 },
  { key: "games.rational.contexts.timezone", icon: "🕐", unit: "h", min: -11, max: 12 },
];
/** Placements within this many units are perfect … */
const CHANGE_FREE_UNITS = 0.3;
/** … and this far off is worth nothing. */
const CHANGE_ZERO_AT_UNITS = 1.5;
/** A placement counts as correct from this score upwards. */
const CHANGE_PASS_MARK = 60;

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** The denominators a round may use: decimals-only rounds need values that can
 *  actually be written as a decimal. */
function denominatorsFor(notation: RationalNotation): number[] {
  return notation === "decimal" ? DECIMAL_DENOMINATORS : DENOMINATORS;
}

/** How one value is written. Fractions and mixed numbers stay out of a
 *  decimals-only round, decimals out of a fractions-only one. */
function pickDisplay(notation: RationalNotation): RationalDisplay {
  if (notation === "decimal") return "decimal";
  if (notation === "fraction") return Math.random() < 0.2 ? "mixed" : "fraction";
  // Mix notations so players convert between fractions and decimals
  return Math.random() < 0.3 ? "decimal" : Math.random() < 0.2 ? "mixed" : "fraction";
}

/** A random fraction strictly inside (min, max), never a whole number. */
function randomFractionInRange(min: number, max: number, denominators: number[]): Fraction {
  for (let attempt = 0; attempt < 50; attempt++) {
    const d = pick(denominators);
    const n = randomInt(Math.ceil(min * d), Math.floor(max * d));
    if (n % d === 0) continue; // whole numbers are too easy to place
    const f = reduce({ n, d });
    if (toValue(f) <= min || toValue(f) >= max) continue;
    return f;
  }
  return reduce({ n: 1, d: 2 });
}

/** A random operand: small numerator over a small denominator, sometimes whole. */
function randomOperand(allowNegatives: boolean, denominators: number[]): Fraction {
  const d = Math.random() < 0.15 ? 1 : pick(denominators);
  const n = randomInt(1, d === 1 ? 6 : d * 2);
  const sign = allowNegatives && Math.random() < 0.3 ? -1 : 1;
  return reduce({ n: sign * n, d });
}

const arrangeStage: StageHandler<ArrangeQuestion> = {
  id: "arrange",

  createQuestions({ settings }) {
    const allowNegatives = Boolean(settings.allowNegatives);
    const notation = readNotation(settings);
    const denominators = denominatorsFor(notation);
    const ranges = allowNegatives ? LINE_RANGES : LINE_RANGES.filter(([min]) => min >= 0);

    return Array.from({ length: Number(settings.questionsPerRound) }, (_, id) => {
      const [lineMin, lineMax] = pick(ranges);
      const span = lineMax - lineMin;
      // Keep items far enough apart that placing them stays unambiguous
      const minGap = span / (ITEMS_PER_LINE * 3);
      const items: RationalValue[] = [];

      for (let attempt = 0; attempt < 200 && items.length < ITEMS_PER_LINE; attempt++) {
        const f = randomFractionInRange(lineMin, lineMax, denominators);
        const value = toValue(f);
        if (items.some((item) => Math.abs(toValue(item) - value) < minGap)) continue;
        items.push(makeValue(f, pickDisplay(notation)));
      }

      return { id, items: shuffle(items), lineMin, lineMax };
    });
  },

  evaluate(question, answer) {
    const span = question.lineMax - question.lineMin;
    if (question.items.length === 0 || span <= 0) return { correct: false, points: 0 };

    let placements: unknown;
    try {
      placements = JSON.parse(answer);
    } catch {
      return { correct: false, points: 0 };
    }
    if (!Array.isArray(placements) || placements.length !== question.items.length) {
      return { correct: false, points: 0 };
    }

    let total = 0;
    for (let i = 0; i < question.items.length; i++) {
      const placed = Number(placements[i]);
      if (!isFinite(placed)) continue;
      // Perfect placement is 100; an error of 20% of the line is worth nothing
      total += closenessPoints(Math.abs(placed - toValue(question.items[i])) / span, ARRANGE_ZERO_AT);
    }

    const points = Math.round(total / question.items.length);
    return { correct: points >= ARRANGE_PASS_MARK, points };
  },
};

const calculateStage: StageHandler<CalculateQuestion> = {
  id: "calculate",

  createQuestions({ settings }) {
    const allowNegatives = Boolean(settings.allowNegatives);
    const notation = readNotation(settings);
    const denominators = denominatorsFor(notation);
    // Operands may be written either way, the result is what the player types
    const resultDisplay: RationalDisplay = notation === "decimal" ? "decimal" : "fraction";
    // A result students can write down — and one they can actually type as a
    // decimal when that is the only notation of the round. Dividing by 5/7 turns
    // terminating operands into 7ths, so the result has to be checked as well.
    const usable = (result: Fraction) =>
      result.n !== 0 &&
      Math.abs(result.n) <= 100 &&
      result.d <= 60 &&
      (notation !== "decimal" || isTerminating(result));

    return Array.from({ length: Number(settings.questionsPerRound) }, (_, id) => {
      let left = randomOperand(allowNegatives, denominators);
      let right = randomOperand(allowNegatives, denominators);
      let operator = pick(OPERATORS);
      let result = applyOperator(left, operator, right);

      for (let attempt = 0; attempt < 50; attempt++) {
        if (usable(result)) break;
        left = randomOperand(allowNegatives, denominators);
        right = randomOperand(allowNegatives, denominators);
        operator = pick(OPERATORS);
        result = applyOperator(left, operator, right);
      }

      return {
        id,
        left: makeValue(left, pickDisplay(notation)),
        operator,
        right: makeValue(right, pickDisplay(notation)),
        result: makeValue(result, resultDisplay),
      };
    });
  },

  evaluate(question, answer, { questionMs }) {
    const parsed = parseFraction(answer);
    if (!parsed || !equals(parsed, question.result)) return { correct: false, points: 0 };
    return { correct: true, points: speedPoints(questionMs / 1000) };
  },
};

// ---------------------------------------------------------------------------
// signs — the sign rules of EdM 4.3-4.6, hilfsmittelfrei
// ---------------------------------------------------------------------------

/** Wraps a signed operand the way the textbook writes it: (-3), (+4), 5. */
function operandLatex(value: number, leading = false): string {
  if (leading) return String(value);
  return value < 0 ? `\\left(${value}\\right)` : String(value);
}

/** A signed operand: negative often enough that the sign rules are the work. */
function signedOperand(min: number, max: number): number {
  return randomInt(min, max) * (Math.random() < 0.55 ? -1 : 1);
}

/** One term of two or three signed integers, together with its value.
 *  Every term carries at least one negative number and never evaluates to 0. */
function makeSignsTerm(withBrackets: boolean): { termLatex: string; result: number } {
  for (let attempt = 0; attempt < 50; attempt++) {
    const term = buildSignsTerm(withBrackets);
    if (term && term.result !== 0 && term.operands.some((value) => value < 0)) {
      return { termLatex: term.termLatex, result: term.result };
    }
  }
  // Fallback that satisfies both rules
  return { termLatex: `-6 ${operatorLatex("*")} ${operandLatex(-3)}`, result: 18 };
}

interface SignsTerm {
  termLatex: string;
  result: number;
  /** The numbers the player reads, so the generator can insist on a negative one. */
  operands: number[];
}

function buildSignsTerm(withBrackets: boolean): SignsTerm | null {
  const a = signedOperand(2, 9);
  const b = signedOperand(2, 9);

  if (withBrackets && Math.random() < 0.5) {
    // (a + b) * c — the bracket has to be evaluated first
    const c = signedOperand(2, 6);
    const inner = a + b;
    if (inner === 0) return null;
    return {
      termLatex: `\\left(${a} ${b < 0 ? "-" : "+"} ${Math.abs(b)}\\right) \\cdot ${operandLatex(c)}`,
      result: inner * c,
      operands: [a, b, c],
    };
  }

  if (withBrackets && Math.random() < 0.4) {
    // a * b * c — three signs in a row
    const c = signedOperand(2, 4);
    return {
      termLatex: `${operandLatex(a, true)} \\cdot ${operandLatex(b)} \\cdot ${operandLatex(c)}`,
      result: a * b * c,
      operands: [a, b, c],
    };
  }

  const operator = pick(OPERATORS);
  if (operator === "/") {
    // Keep the quotient a whole number
    const factor = signedOperand(2, 9);
    const product = a * factor;
    return {
      termLatex: `${operandLatex(product, true)} ${operatorLatex("/")} ${operandLatex(a)}`,
      result: factor,
      operands: [product, a],
    };
  }

  return {
    termLatex: `${operandLatex(a, true)} ${operatorLatex(operator)} ${operandLatex(b)}`,
    result: operator === "+" ? a + b : operator === "-" ? a - b : a * b,
    operands: [a, b],
  };
}

const signsStage: StageHandler<SignsQuestion> = {
  id: "signs",

  createQuestions({ settings }) {
    const withBrackets = Boolean(settings.withBrackets);
    return Array.from({ length: Number(settings.questionsPerRound) }, (_, id) => ({
      id,
      ...makeSignsTerm(withBrackets),
    }));
  },

  evaluate(question, answer, { questionMs }, { settings }) {
    if (readAnswerMode(settings) === "sign") {
      const correct = answer === (question.result < 0 ? "-" : "+");
      // A coin flip is worth less than working the value out
      return { correct, points: correct ? speedPoints(questionMs / 1000, 4, 20, 60) : 0 };
    }
    const parsed = parseFraction(answer);
    if (!parsed || !equals(parsed, { n: question.result, d: 1 })) {
      return { correct: false, points: 0 };
    }
    return { correct: true, points: speedPoints(questionMs / 1000) };
  },
};

// ---------------------------------------------------------------------------
// change — describing changes on the number line (EdM 4.2, 4.4)
// ---------------------------------------------------------------------------

function readAsk(raw: unknown): ChangeAsk {
  if (raw === "result" || raw === "change") return raw;
  return Math.random() < 0.5 ? "result" : "change";
}

const changeStage: StageHandler<ChangeQuestion> = {
  id: "change",

  createQuestions({ settings }) {
    const twoChanges = Boolean(settings.twoChanges);

    return Array.from({ length: Number(settings.questionsPerRound) }, (_, id) => {
      const context = pick(CHANGE_CONTEXTS);
      const ask = readAsk(settings.askMode);
      // A second change only makes sense when the end state is what is asked for
      const steps = ask === "result" && twoChanges && Math.random() < 0.6 ? 2 : 1;

      let start = 0;
      let changes: number[] = [];
      let end = 0;
      for (let attempt = 0; attempt < 50; attempt++) {
        start = randomInt(context.min + 2, context.max - 2);
        changes = Array.from({ length: steps }, () => {
          const size = randomInt(2, Math.floor((context.max - context.min) / 3));
          return Math.random() < 0.5 ? -size : size;
        });
        end = changes.reduce((sum, change) => sum + change, start);
        // Both ends have to fit on the line, a change of 0 teaches nothing, and
        // one of the two states has to be negative — that is the whole exercise
        if (
          end >= context.min &&
          end <= context.max &&
          changes.every((c) => c !== 0) &&
          Math.min(start, end) < 0
        ) {
          break;
        }
      }

      // Zero always stays visible: crossing it is the point of the exercise
      const lineMin = Math.min(start, end, 0) - 2;
      const lineMax = Math.max(start, end, 0) + 2;

      return {
        id,
        contextKey: context.key,
        icon: context.icon,
        unit: context.unit,
        start,
        changes,
        ask,
        answer: ask === "result" ? end : changes[0],
        lineMin: Math.round(lineMin),
        lineMax: Math.round(lineMax),
      };
    });
  },

  evaluate(question, answer, { questionMs }) {
    if (question.ask === "change") {
      const parsed = parseFraction(answer);
      if (!parsed || !equals(parsed, { n: question.answer, d: 1 })) {
        return { correct: false, points: 0 };
      }
      return { correct: true, points: speedPoints(questionMs / 1000) };
    }

    const placed = Number(answer);
    if (!isFinite(placed)) return { correct: false, points: 0 };
    const error = Math.abs(placed - question.answer);
    const points = Math.round(
      closenessPoints(Math.max(0, error - CHANGE_FREE_UNITS), CHANGE_ZERO_AT_UNITS),
    );
    return { correct: points >= CHANGE_PASS_MARK, points };
  },
};

export default createStageGame(rationalSpec, [arrangeStage, calculateStage, signsStage, changeStage]);

