import {
  rationalSpec,
  readAnswerMode,
  readNotation,
  readOperations,
  readOrderAnswer,
  readPowersParts,
  readWallAnswer,
  wallIndex,
} from "../../shared/games/rational";
import type {
  ArrangeQuestion,
  CalculateQuestion,
  ChangeAsk,
  ChangeQuestion,
  OrderDirection,
  OrderItem,
  OrderQuestion,
  RationalNotation,
  SignsQuestion,
  WallMode,
  WallQuestion,
} from "../../shared/games/rational";
import { closenessPoints, speedPoints } from "../../shared/framework";
import type {
  Fraction,
  RationalDisplay,
  RationalOperator,
  RationalValue,
} from "../../shared/rational-math";
import {
  add,
  applyOperator,
  divide,
  equals,
  isTerminating,
  makeValue,
  multiply,
  operatorLatex,
  parseFraction,
  parseRationalAnswer,
  reduce,
  subtract,
  toLatex,
  toValue,
} from "../../shared/rational-math";
import type { AnswerTiming, AnswerVerdict, StageContext, StageHandler } from "../framework";
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
  { key: "games.rational.contexts.temperature", icon: "thermometer", unit: "°C", min: -20, max: 20 },
  { key: "games.rational.contexts.account", icon: "money", unit: "€", min: -50, max: 50 },
  { key: "games.rational.contexts.altitude", icon: "depth", unit: "m", min: -30, max: 30 },
  { key: "games.rational.contexts.timezone", icon: "clock", unit: "h", min: -11, max: 12 },
];
/** Placements within this many units are perfect … */
const CHANGE_FREE_UNITS = 0.3;
/** … and this far off is worth nothing. */
const CHANGE_ZERO_AT_UNITS = 1.5;
/** A placement counts as correct from this score upwards. */
const CHANGE_PASS_MARK = 60;
/** The largest number the "order" stage deals out, either side of zero. */
const ORDER_MAX = 3;
/** How large a share of the pairs may stand the wrong way round before the
 *  question is worth nothing. Tapping at random gets half of them right, so
 *  that is where the points have to run out. */
const ORDER_ZERO_AT = 0.5;

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
  // Each value is written on its card; placing it is the task.
  forPlayer: (question) => question,

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

// ---------------------------------------------------------------------------
// order — comparing and ordering rational numbers, and the Betrag (EdM 4.1)
// ---------------------------------------------------------------------------

/** A number for the ordering stage: never 0, magnitude at most ORDER_MAX. */
function randomOrderValue(denominators: number[]): Fraction {
  const d = Math.random() < 0.25 ? 1 : pick(denominators);
  const n = randomInt(1, d * ORDER_MAX);
  return reduce({ n: (Math.random() < 0.5 ? -1 : 1) * n, d });
}

/**
 * One number as the player reads it.
 *
 * Inside the bars the number is always negative. |3| is a pair of bars around
 * nothing to do — the item a student has to stop and think about is |-3|, which
 * sorts with the positives however much it looks like it belongs at the far
 * left. So a barred item is worth the magnitude of what is written in it.
 */
function orderItem(f: Fraction, absolute: boolean, display: RationalDisplay): OrderItem {
  if (!absolute) return { ...makeValue(f, display), absolute: false };
  const inside = makeValue(reduce({ n: -Math.abs(f.n), d: f.d }), display);
  return {
    ...reduce({ n: Math.abs(f.n), d: f.d }),
    latex: `\\left|${inside.latex}\\right|`,
    absolute: true,
  };
}

/**
 * A set of numbers worth ordering.
 *
 * Two of them may come out equal — |-3/4| next to 3/4 is the whole point of the
 * Betrag, and the stage marks either order of such a pair correct — but only
 * one such pair, or the row stops reading as a sequence. Something has to be
 * negative as well: if every negative ended up inside bars the round is just
 * comparing positive fractions, which is a year-6 exercise.
 */
function makeOrderItems(
  count: number,
  withAbsolute: boolean,
  notation: RationalNotation,
): OrderItem[] {
  const denominators = denominatorsFor(notation);

  for (let attempt = 0; attempt < 80; attempt++) {
    const sources: Fraction[] = [];
    for (let guard = 0; guard < 200 && sources.length < count; guard++) {
      const f = randomOrderValue(denominators);
      if (!sources.some((s) => equals(s, f))) sources.push(f);
    }
    if (sources.length < count) continue;

    const barred = new Set<number>();
    if (withAbsolute) {
      const wanted = randomInt(1, Math.max(1, Math.floor(count / 2)));
      for (const index of shuffle(sources.map((_, i) => i)).slice(0, wanted)) barred.add(index);
    }
    const items = sources.map((f, index) =>
      orderItem(f, barred.has(index), pickDisplay(notation)),
    );

    let ties = 0;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        if (equals(items[i], items[j])) ties++;
      }
    }
    if (ties <= 1 && items.some((item) => toValue(item) < 0)) return items;
  }

  // A set that keeps every rule above, for the run of luck that does not
  const fallback: [Fraction, boolean][] = [
    [{ n: -5, d: 2 }, false],
    [{ n: 3, d: 4 }, true],
    [{ n: -1, d: 1 }, false],
    [{ n: 2, d: 1 }, false],
    [{ n: 1, d: 2 }, false],
    [{ n: -7, d: 3 }, true],
  ];
  return fallback.slice(0, count).map(([f, absolute]) => orderItem(f, absolute, "fraction"));
}

function readDirection(raw: unknown): OrderDirection {
  if (raw === "asc" || raw === "desc") return raw;
  return Math.random() < 0.5 ? "asc" : "desc";
}

const orderStage: StageHandler<OrderQuestion> = {
  id: "order",
  // Each value is written on its card; ordering them is the task.
  forPlayer: (question) => question,

  createQuestions({ settings }) {
    const withAbsolute = Boolean(settings.withAbsolute);
    const notation = readNotation(settings);
    const count = Number(settings.itemCount);

    return Array.from({ length: Number(settings.questionsPerRound) }, (_, id) => ({
      id,
      items: shuffle(makeOrderItems(count, withAbsolute, notation)),
      direction: readDirection(settings.orderDirection),
    }));
  },

  /**
   * Scored on the pairs that stand the right way round rather than on the
   * sequence as a whole, so a player who had it but for one number does not
   * come out level with one who tapped along the row. Half the pairs is what
   * tapping at random comes to, which is why that is where the points end.
   */
  evaluate(question, answer) {
    const order = readOrderAnswer(answer, question.items.length);
    if (!order || order.length < 2) return { correct: false, points: 0 };

    const sign = question.direction === "asc" ? 1 : -1;
    let pairs = 0;
    let inOrder = 0;
    for (let i = 0; i < order.length; i++) {
      for (let j = i + 1; j < order.length; j++) {
        pairs++;
        const earlier = toValue(question.items[order[i]]);
        const later = toValue(question.items[order[j]]);
        // Equal values — a number beside its own Betrag — go either way round
        if (sign * (later - earlier) >= 0) inOrder++;
      }
    }

    const points = Math.round(closenessPoints(1 - inOrder / pairs, ORDER_ZERO_AT));
    return { correct: inOrder === pairs, points };
  },
};

const calculateStage: StageHandler<CalculateQuestion> = {
  id: "calculate",
  forPlayer: (question) => ({ ...question, result: { n: 0, d: 1, latex: "" } }),

  createQuestions({ settings }) {
    const allowNegatives = Boolean(settings.allowNegatives);
    const notation = readNotation(settings);
    const denominators = denominatorsFor(notation);
    const operators = readOperations(settings);
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
      let operator = pick(operators);
      let result = applyOperator(left, operator, right);

      for (let attempt = 0; attempt < 50; attempt++) {
        if (usable(result)) break;
        left = randomOperand(allowNegatives, denominators);
        right = randomOperand(allowNegatives, denominators);
        operator = pick(operators);
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
    // Typed in a math field, so the answer is LaTeX
    const parsed = parseRationalAnswer(answer);
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
  forPlayer: (question) => ({ ...question, result: 0 }),

  createQuestions({ settings }) {
    const withBrackets = Boolean(settings.withBrackets);
    return Array.from({ length: Number(settings.questionsPerRound) }, (_, id) => ({
      id,
      ...makeSignsTerm(withBrackets),
    }));
  },

  evaluate: gradeTermValue,
};

/** Grades a term's value — or, in sign mode, only its sign. Shared by the
 *  stages that are played like this one. */
function gradeTermValue(
  question: SignsQuestion,
  answer: string,
  { questionMs }: AnswerTiming,
  { settings }: StageContext,
): AnswerVerdict {
  if (readAnswerMode(settings) === "sign") {
    const correct = answer === (question.result < 0 ? "-" : "+");
    // A coin flip is worth less than working the value out
    return { correct, points: correct ? speedPoints(questionMs / 1000, 4, 20, 60) : 0 };
  }
  const parsed = parseFraction(answer);
  // "terms" with decimals has results such as -0.9, which String() writes out
  // exactly and parseFraction turns back into -9/10
  const expected = parseFraction(String(question.result));
  if (!parsed || !expected || !equals(parsed, expected)) {
    return { correct: false, points: 0 };
  }
  return { correct: true, points: speedPoints(questionMs / 1000) };
}

// ---------------------------------------------------------------------------
// change — describing changes on the number line (EdM 4.2, 4.4)
// ---------------------------------------------------------------------------

function readAsk(raw: unknown): ChangeAsk {
  if (raw === "result" || raw === "change") return raw;
  return Math.random() < 0.5 ? "result" : "change";
}

const changeStage: StageHandler<ChangeQuestion> = {
  id: "change",
  forPlayer: (question) => ({ ...question, answer: 0 }),

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

// ---------------------------------------------------------------------------
// powers — many factors, powers and the opposite number (Minuszeichen zählen)
// ---------------------------------------------------------------------------

/** A signed whole number between min and max, negative about half the time. */
function signedInt(min: number, max: number): number {
  return randomInt(min, max) * (Math.random() < 0.5 ? -1 : 1);
}

/** A product of three to five signed factors, with an odd number of minus
 *  signs about as often as an even one — counting them is the work. */
function makeProduct(): SignsQuestion | null {
  const count = randomInt(3, 5);
  const factors = Array.from({ length: count }, () =>
    // Ones and twos keep five factors small enough to multiply in the head
    signedInt(1, count === 3 ? 6 : count === 4 ? 4 : 3),
  );
  if (!factors.some((f) => f < 0) || factors.every((f) => Math.abs(f) === 1)) return null;
  const result = factors.reduce((product, f) => product * f, 1);
  if (Math.abs(result) > 200) return null;
  return {
    id: 0,
    termLatex: factors.map((f) => operandLatex(f)).join(" \\cdot "),
    result,
  };
}

/** The largest exponent worth working out for a base of this size. */
const MAX_EXPONENT_FOR: Record<number, number> = { 1: 12, 2: 6, 3: 4, 4: 3, 5: 3 };

/** (−a)ⁿ, and its look-alike −aⁿ, where the exponent belongs to a alone. */
function makePower(): SignsQuestion {
  const base = randomInt(1, 5);
  const exponent = randomInt(2, MAX_EXPONENT_FOR[base]);
  const power = base ** exponent;
  const roll = Math.random();
  if (roll < 0.3) {
    // No bracket: −3² = −(3 · 3)
    return { id: 0, termLatex: `-${base}^{${exponent}}`, result: -power };
  }
  const value = exponent % 2 === 0 ? power : -power;
  if (roll < 0.45) {
    // A minus in front of the bracket turns the whole power round once more
    return { id: 0, termLatex: `-\\left(-${base}\\right)^{${exponent}}`, result: -value };
  }
  return { id: 0, termLatex: `\\left(-${base}\\right)^{${exponent}}`, result: value };
}

/** −(−7), −(−(−7)): a minus in front of a bracket gives the opposite number. */
function makeOpposite(): SignsQuestion {
  const depth = randomInt(1, 3);
  const inner = signedInt(2, 20);
  let tex = inner < 0 ? `${inner}` : `+${inner}`;
  for (let level = 0; level < depth; level++) tex = `-\\left(${tex}\\right)`;
  return { id: 0, termLatex: tex, result: depth % 2 === 0 ? inner : -inner };
}

const powersStage: StageHandler<SignsQuestion> = {
  id: "powers",
  forPlayer: (question) => ({ ...question, result: 0 }),

  createQuestions({ settings }) {
    const parts = readPowersParts(settings);
    return Array.from({ length: Number(settings.questionsPerRound) }, (_, id) => {
      const part = pick(parts);
      let question: SignsQuestion | null = null;
      for (let attempt = 0; attempt < 50 && !question; attempt++) {
        question =
          part === "products" ? makeProduct() : part === "powers" ? makePower() : makeOpposite();
      }
      // Fallback with a sign worth counting
      question ??= { id: 0, termLatex: "(-2) \\cdot 3 \\cdot (-5)", result: 30 };
      return { ...question, id };
    });
  },

  evaluate: gradeTermValue,
};

// ---------------------------------------------------------------------------
// terms — the order of operations with signed numbers (Punkt vor Strich)
// ---------------------------------------------------------------------------

/** A number as it stands in a term: bracketed when negative, unless it leads. */
function numberLatex(value: Fraction, leading = false): string {
  const tex = toLatex(value, "decimal");
  return value.n < 0 && !leading ? `\\left(${tex}\\right)` : tex;
}

const int = (value: number): Fraction => ({ n: value, d: 1 });

/** A factor for a product: a whole number, or with decimals now and then a
 *  half such as −1.5 — the book's −3 + 4 · (−1.5). */
function termFactor(withDecimals: boolean): Fraction {
  if (withDecimals && Math.random() < 0.4) {
    return reduce({ n: pick([1, 3, 5]) * (Math.random() < 0.5 ? -1 : 1), d: 2 });
  }
  return int(signedInt(2, 9));
}

interface BuiltTerm {
  tex: string;
  value: Fraction;
}

type TermTemplate = (withDecimals: boolean) => BuiltTerm | null;

const PLAIN_TEMPLATES: TermTemplate[] = [
  // a + b · c — multiply first
  (dec) => {
    const a = int(signedInt(1, 20));
    const b = termFactor(dec);
    const c = termFactor(dec);
    return {
      tex: `${numberLatex(a, true)} + ${numberLatex(b)} \\cdot ${numberLatex(c)}`,
      value: add(a, multiply(b, c)),
    };
  },
  // a − b · c
  (dec) => {
    const a = int(signedInt(1, 20));
    const b = int(randomInt(2, 9));
    const c = termFactor(dec);
    return {
      tex: `${numberLatex(a, true)} - ${numberLatex(b)} \\cdot ${numberLatex(c)}`,
      value: subtract(a, multiply(b, c)),
    };
  },
  // a + b : c — divide first, and the quotient comes out whole
  (dec) => {
    const a = int(signedInt(1, 20));
    const c = termFactor(dec);
    const b = multiply(c, int(signedInt(2, 9)));
    return {
      tex: `${numberLatex(a, true)} + ${numberLatex(b)} : ${numberLatex(c)}`,
      value: add(a, divide(b, c)),
    };
  },
  // (a + b) · c — the bracket goes first
  (dec) => {
    const a = int(signedInt(1, 12));
    const b = int(signedInt(1, 12));
    const c = termFactor(dec);
    const inner = add(a, b);
    if (inner.n === 0) return null;
    return {
      tex: `\\left(${numberLatex(a, true)} + ${numberLatex(b)}\\right) \\cdot ${numberLatex(c)}`,
      value: multiply(inner, c),
    };
  },
  // a : (b − c)
  () => {
    const b = int(signedInt(1, 12));
    const c = int(signedInt(1, 12));
    const inner = subtract(b, c);
    if (inner.n === 0) return null;
    const a = multiply(inner, int(signedInt(2, 6)));
    return {
      tex: `${numberLatex(a, true)} : \\left(${numberLatex(b, true)} - ${numberLatex(c)}\\right)`,
      value: divide(a, inner),
    };
  },
  // a · b + c · d — two products, then the sum
  (dec) => {
    const a = termFactor(dec);
    const b = int(signedInt(2, 9));
    const c = int(signedInt(2, 9));
    const d = int(signedInt(2, 9));
    return {
      tex: `${numberLatex(a, true)} \\cdot ${numberLatex(b)} + ${numberLatex(c)} \\cdot ${numberLatex(d)}`,
      value: add(multiply(a, b), multiply(c, d)),
    };
  },
];

/** A signed base and a small exponent whose power stays easy: (−2)³, (−3)². */
function smallPower(): { base: number; exponent: number } {
  const base = -randomInt(2, 3);
  return { base, exponent: base === -2 ? randomInt(2, 4) : 2 };
}

const POWER_TEMPLATES: TermTemplate[] = [
  // a − b · (c)ⁿ — the book's 14 − 4 · (−2)³
  () => {
    const a = int(signedInt(1, 20));
    const b = int(randomInt(2, 5));
    const { base, exponent } = smallPower();
    const power = int(base ** exponent);
    return {
      tex: `${numberLatex(a, true)} - ${numberLatex(b)} \\cdot \\left(${base}\\right)^{${exponent}}`,
      value: subtract(a, multiply(b, power)),
    };
  },
  // (c)ⁿ − a
  () => {
    const a = int(randomInt(2, 30));
    const { base, exponent } = smallPower();
    return {
      tex: `\\left(${base}\\right)^{${exponent}} - ${numberLatex(a)}`,
      value: subtract(int(base ** exponent), a),
    };
  },
  // −cⁿ + a — without a bracket only c is raised
  () => {
    const a = int(signedInt(1, 20));
    const c = randomInt(2, 4);
    return {
      tex: `-${c}^{2} + ${numberLatex(a)}`,
      value: add(int(-(c * c)), a),
    };
  },
];

function makeTermsQuestion(withPowers: boolean, withDecimals: boolean): BuiltTerm {
  const templates = withPowers ? [...PLAIN_TEMPLATES, ...POWER_TEMPLATES] : PLAIN_TEMPLATES;
  for (let attempt = 0; attempt < 50; attempt++) {
    const term = pick(templates)(withDecimals);
    if (!term) continue;
    const { value } = term;
    // A result to type without a calculator: not 0, not huge, at most two
    // decimals — a half times a half is a quarter, and that is as far as it goes
    if (value.n === 0 || Math.abs(toValue(value)) > 200 || ![1, 2, 4].includes(value.d)) continue;
    return term;
  }
  return { tex: "12 + 8 : \\left(-2\\right)", value: int(8) };
}

const termsStage: StageHandler<SignsQuestion> = {
  id: "terms",
  forPlayer: (question) => ({ ...question, result: 0 }),

  createQuestions({ settings }) {
    const withPowers = Boolean(settings.withPowers);
    const withDecimals = Boolean(settings.withDecimals);
    return Array.from({ length: Number(settings.questionsPerRound) }, (_, id) => {
      const term = makeTermsQuestion(withPowers, withDecimals);
      return { id, termLatex: term.tex, result: toValue(term.value) };
    });
  },

  evaluate: gradeTermValue,
};

// ---------------------------------------------------------------------------
// wall — multiplication walls (Mal-Mauern)
// ---------------------------------------------------------------------------

/** The bricks of a whole wall, built up from its bottom row. */
function buildWall(bottom: Fraction[]): Fraction[] {
  const size = bottom.length;
  const bricks = [...bottom];
  for (let row = 1; row < size; row++) {
    for (let col = 0; col < size - row; col++) {
      bricks.push(
        multiply(
          bricks[wallIndex(size, row - 1, col)],
          bricks[wallIndex(size, row - 1, col + 1)],
        ),
      );
    }
  }
  return bricks;
}

/** Whether the given bricks pin the whole wall down, one product or one
 *  quotient at a time — the way a student fills it in. No brick is ever 0, so
 *  every division along the way is allowed. */
function wallSolvable(size: number, given: Set<number>): boolean {
  const known = new Set(given);
  let progress = true;
  while (progress) {
    progress = false;
    for (let row = 0; row < size - 1; row++) {
      for (let col = 0; col < size - row - 1; col++) {
        const trio = [
          wallIndex(size, row + 1, col),
          wallIndex(size, row, col),
          wallIndex(size, row, col + 1),
        ];
        const missing = trio.filter((index) => !known.has(index));
        if (missing.length === 1) {
          known.add(missing[0]);
          progress = true;
        }
      }
    }
  }
  return known.size === (size * (size + 1)) / 2;
}

/** The bricks that stay visible: the bottom row, or — for "mixed" — as many
 *  bricks as the bottom has, scattered so that some have to be divided out. */
function givenBricks(size: number, mode: WallMode): Set<number> {
  const bottom = new Set(Array.from({ length: size }, (_, col) => col));
  if (mode === "up") return bottom;
  const all = Array.from({ length: (size * (size + 1)) / 2 }, (_, index) => index);
  for (let attempt = 0; attempt < 200; attempt++) {
    const given = new Set(shuffle(all).slice(0, size));
    const hidesBottom = [...bottom].some((index) => !given.has(index));
    if (hidesBottom && wallSolvable(size, given)) return given;
  }
  return bottom;
}

function readWallMode(raw: unknown): WallMode {
  if (raw === "up" || raw === "mixed") return raw;
  return Math.random() < 0.5 ? "up" : "mixed";
}

/** A bottom row whose wall stays small, with at least two minus signs in it. */
function wallBottom(size: number, withDecimals: boolean): Fraction[] {
  const magnitudes: Fraction[] = [int(1), int(2), int(2), int(3)];
  if (withDecimals) magnitudes.push({ n: 1, d: 2 }, { n: 1, d: 2 }, int(4));
  for (let attempt = 0; attempt < 200; attempt++) {
    const bottom = Array.from({ length: size }, () => {
      const m = pick(magnitudes);
      return Math.random() < 0.5 ? { n: -m.n, d: m.d } : m;
    });
    if (bottom.filter((f) => f.n < 0).length < 2) continue;
    const bricks = buildWall(bottom);
    const top = bricks[bricks.length - 1];
    // Big enough to be worth working out, small enough to do in the head, and
    // never finer than quarters
    if (Math.abs(toValue(top)) > 300 || Math.abs(toValue(top)) < 2) continue;
    if (bricks.some((f) => f.d > 4)) continue;
    return bottom;
  }
  return size === 3 ? [int(-2), int(3), int(-1)] : [int(-2), int(3), int(-1), int(-2)];
}

const wallStage: StageHandler<WallQuestion> = {
  id: "wall",
  forPlayer: (question) => ({
    ...question,
    bricks: question.bricks.map((brick, index) =>
      question.hidden.includes(index) ? { n: 0, d: 1, latex: "" } : brick,
    ),
  }),

  createQuestions({ settings }) {
    const size = Number(settings.wallSize) === 4 ? 4 : 3;
    const withDecimals = Boolean(settings.withDecimals);
    return Array.from({ length: Number(settings.questionsPerRound) }, (_, id) => {
      const bricks = buildWall(wallBottom(size, withDecimals));
      const given = givenBricks(size, readWallMode(settings.wallMode));
      return {
        id,
        size,
        bricks: bricks.map((brick) => makeValue(brick, "decimal")),
        hidden: bricks.map((_, index) => index).filter((index) => !given.has(index)),
      };
    });
  },

  evaluate(question, answer, { questionMs }) {
    const entries = readWallAnswer(answer, question.hidden.length);
    if (!entries) return { correct: false, points: 0 };
    const right = question.hidden.filter((brick, slot) => {
      const parsed = parseRationalAnswer(entries[slot]);
      return parsed != null && equals(parsed, question.bricks[brick]);
    }).length;
    // A wall takes half a minute or more, so the clock runs slower than for a
    // single term — and every brick counts for its share
    const share = right / question.hidden.length;
    return {
      correct: right === question.hidden.length,
      points: Math.round(speedPoints(questionMs / 1000, 1) * share),
    };
  },
};

export default createStageGame(rationalSpec, [
  arrangeStage,
  orderStage,
  calculateStage,
  signsStage,
  changeStage,
  powersStage,
  termsStage,
  wallStage,
]);

