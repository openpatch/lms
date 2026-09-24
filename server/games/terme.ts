import { termeSpec } from "../../shared/games/terme";
import type {
  BinomialQuestion,
  BuildQuestion,
  CollectQuestion,
  EvaluateQuestion,
  ExpandQuestion,
  FactorQuestion,
  FractionQuestion,
  InequalityQuestion,
  RearrangeQuestion,
  ZeroQuestion,
} from "../../shared/games/terme";
import { speedPoints } from "../../shared/framework";
import type { Fraction } from "../../shared/rational-math";
import { reduce, toLatex as fractionLatex } from "../../shared/rational-math";
import type { Monomial, Relation, Term } from "../../shared/term-algebra";
import {
  bracketedLatex,
  evaluateTermExact,
  inequalityMatches,
  parseRational,
  rationalEquals,
  relationLatex,
  gradeFactored,
  gradeSimplified,
  monomialGcd,
  monomialLatex,
  multiplyTerms,
  normalizeTerm,
  parseTerm,
  solutionsMatch,
  termLatex,
  termsEqual,
  writtenTermLatex,
} from "../../shared/term-algebra";
import type { StageHandler } from "../framework";
import { createStageGame } from "../framework";

// Variable names the tasks use — the pairs a textbook uses, so that a term
// never mixes letters that belong to different contexts.
const VARIABLE_PAIRS = [
  ["a", "b"],
  ["x", "y"],
  ["u", "v"],
  ["r", "s"],
];
// Three variables at once, for a product of two brackets like (4x - 3y)(2x + 3z)
const VARIABLE_TRIPLES = [
  ["x", "y", "z"],
  ["a", "b", "c"],
  ["r", "s", "t"],
];
/** Points decay slowly: writing a term out takes longer than naming a number. */
const POINTS_PER_SECOND = 2;

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

/** A non-zero integer in [-max, -min] ∪ [min, max]. */
function signedInt(min: number, max: number): number {
  return randomInt(min, max) * (Math.random() < 0.5 ? -1 : 1);
}

function mono(coefficient: number, vars: Record<string, number> = {}): Monomial {
  return { c: { n: coefficient, d: 1 }, v: vars };
}

/** The variable part of a monomial, in the shapes the book uses: x, y, x², xy, xy². */
function randomShape(first: string, second: string): Record<string, number> {
  const roll = Math.random();
  if (roll < 0.34) return { [first]: 1 };
  if (roll < 0.54) return { [second]: 1 };
  if (roll < 0.7) return { [first]: 2 };
  if (roll < 0.86) return { [first]: 1, [second]: 1 };
  return { [first]: 1, [second]: 2 };
}

/** Identifies the variable part, so two groups of like terms can be kept apart. */
function shapeKey(vars: Record<string, number>): string {
  return Object.keys(vars)
    .sort()
    .map((name) => `${name}^${vars[name]}`)
    .join("");
}

function questions<Q>(settings: Record<string, unknown>, make: (id: number) => Q): Q[] {
  return Array.from({ length: Number(settings.questionsPerRound) }, (_, id) => make(id));
}

/** Points for an answer that was typed into the math field. */
function typedPoints(questionMs: number): number {
  return speedPoints(questionMs / 1000, POINTS_PER_SECOND);
}

// ---------------------------------------------------------------------------
// build — Terme zu Sachsituationen aufstellen (EdM 2.1)
// ---------------------------------------------------------------------------

interface BuildContext {
  key: string;
  variableKey: string;
  icon: string;
  /** The numbers the situation text is interpolated with, plus its terms. */
  make: () => { numbers: Record<string, number>; correct: string; wrong: string[] };
}

const BUILD_CONTEXTS: BuildContext[] = [
  {
    key: "games.terme.contexts.taxi",
    variableKey: "games.terme.variables.taxi",
    icon: "taxi",
    make: () => {
      const a = randomInt(3, 6);
      const b = randomInt(2, 4);
      return {
        numbers: { a, b },
        correct: `${a} + ${b}x`,
        wrong: [`\\left(${a} + ${b}\\right)x`, `${a}x + ${b}`, `${a} \\cdot ${b}x`],
      };
    },
  },
  {
    key: "games.terme.contexts.saving",
    variableKey: "games.terme.variables.saving",
    icon: "piggy",
    make: () => {
      const a = randomInt(15, 40);
      const b = randomInt(3, 8);
      return {
        numbers: { a, b },
        correct: `${a} + ${b}x`,
        wrong: [`${a}x + ${b}`, `${a} - ${b}x`, `${a + b}x`],
      };
    },
  },
  {
    key: "games.terme.contexts.cinema",
    variableKey: "games.terme.variables.cinema",
    icon: "popcorn",
    make: () => {
      const a = randomInt(8, 12);
      const b = randomInt(3, 5);
      return {
        numbers: { a, b },
        correct: `x \\cdot \\left(${a} + ${b}\\right)`,
        wrong: [`${a}x + ${b}`, `${a} + ${b}x`, `${a} \\cdot ${b} \\cdot x`],
      };
    },
  },
  {
    key: "games.terme.contexts.fence",
    variableKey: "games.terme.variables.fence",
    icon: "plant",
    make: () => {
      const a = randomInt(7, 14);
      return {
        numbers: { a },
        correct: `x \\cdot \\left(${a} - x\\right)`,
        wrong: [`${a} \\cdot x`, `\\left(${a} - x\\right)^{2}`, `2x + \\left(${a} - x\\right)`],
      };
    },
  },
  {
    key: "games.terme.contexts.rectangle",
    variableKey: "games.terme.variables.rectangle",
    icon: "ruler",
    make: () => {
      const a = randomInt(2, 6);
      return {
        numbers: { a },
        correct: `4x - 2 \\cdot ${a}`,
        wrong: [`4x - ${a}`, `2x - 2 \\cdot ${a}`, `x \\cdot \\left(x - ${a}\\right)`],
      };
    },
  },
  {
    key: "games.terme.contexts.age",
    variableKey: "games.terme.variables.age",
    icon: "cake",
    make: () => {
      const a = randomInt(3, 9);
      return {
        numbers: { a },
        correct: `2x + ${a}`,
        wrong: [`x + ${a}`, `2x - ${a}`, `2 \\cdot \\left(x + ${a}\\right)`],
      };
    },
  },
  {
    key: "games.terme.contexts.pool",
    variableKey: "games.terme.variables.pool",
    icon: "swim",
    make: () => {
      const a = randomInt(200, 600);
      const b = randomInt(20, 50);
      return {
        numbers: { a, b },
        correct: `${a} - ${b}x`,
        wrong: [`${a} + ${b}x`, `${b}x - ${a}`, `\\left(${a} - ${b}\\right)x`],
      };
    },
  },
  {
    key: "games.terme.contexts.workshop",
    variableKey: "games.terme.variables.workshop",
    icon: "wrench",
    make: () => {
      const a = randomInt(20, 45);
      const b = randomInt(5, 15);
      return {
        numbers: { a, b },
        correct: `${a} + ${b} \\cdot 2x`,
        wrong: [`${a} + ${b}x`, `\\left(${a} + ${b}\\right) \\cdot 2x`, `2 \\cdot \\left(${a} + ${b}\\right)x`],
      };
    },
  },
];

/** Distractors that really are wrong: anything equivalent to the right term is
 *  dropped, and three options are filled up from a generic pool. */
function buildOptions(correct: string, wrong: string[]): { options: string[]; correct: number } {
  const target = parseTerm(correct);
  const seen: string[] = [];
  for (const candidate of [...wrong, "x", "2x", "x^{2}", "x + 1"]) {
    if (seen.length === 3) break;
    const value = parseTerm(candidate);
    if (!value || (target && termsEqual(value, target))) continue;
    if (seen.some((other) => termsEqual(parseTerm(other)!, value))) continue;
    seen.push(candidate);
  }

  const options = shuffle([correct, ...seen]);
  return { options, correct: options.indexOf(correct) };
}

const buildStage: StageHandler<BuildQuestion> = {
  id: "build",
  forPlayer: (question) => ({ ...question, correct: -1 }),

  createQuestions({ settings }) {
    // Every context at most once per round, so a round is not four taxis
    const pool = shuffle(BUILD_CONTEXTS);
    return questions(settings, (id) => {
      const context = pool[id % pool.length];
      const { numbers, correct, wrong } = context.make();
      const options = buildOptions(correct, wrong);
      return {
        id,
        contextKey: context.key,
        variableKey: context.variableKey,
        icon: context.icon,
        numbers,
        options: options.options,
        correct: options.correct,
      };
    });
  },

  evaluate(question, answer, { questionMs }) {
    const correct = Number(answer) === question.correct;
    // One in four is a lucky guess, so a right choice is worth less than a term
    return { correct, points: correct ? speedPoints(questionMs / 1000, 2, 40, 90) : 0 };
  },
};

// ---------------------------------------------------------------------------
// evaluate — Terme und ihre Berechnung, wertgleiche Terme (EdM 2.1/2.2)
// ---------------------------------------------------------------------------

/** Values that are worth substituting: negatives, and now and then a fraction. */
const FRACTION_VALUES: Fraction[] = [
  { n: -1, d: 2 },
  { n: 1, d: 2 },
  { n: 1, d: 3 },
  { n: 2, d: 3 },
];

/** A term with brackets and powers, so the order of operations is the work. */
function makeValueTerm(): { latex: string; names: string[] } {
  const a = randomInt(2, 6);
  const b = randomInt(2, 9);
  switch (randomInt(1, 7)) {
    case 1:
      return { latex: `${a}x - ${b}`, names: ["x"] };
    case 2:
      // The book's own example: 4 · (x + y²)
      return { latex: `${a} \\cdot \\left(x + y^{2}\\right)`, names: ["x", "y"] };
    case 3:
      return { latex: `x \\cdot \\left(x - ${a}\\right)`, names: ["x"] };
    case 4:
      return { latex: `\\left(x^{2} + x\\right) : ${a}`, names: ["x"] };
    case 5:
      return { latex: `${a}x^{2} - ${b}y`, names: ["x", "y"] };
    case 6:
      return { latex: `\\left(x + y\\right)^{2}`, names: ["x", "y"] };
    default:
      return { latex: `${a}xy - ${b}`, names: ["x", "y"] };
  }
}

interface EquivalencePair {
  left: string;
  right: string;
  equivalent: boolean;
}

/**
 * Two terms, together with whether they are wertgleich. The unequal pairs are
 * not random noise: each is the mistake that particular transformation invites —
 * a sign left unchanged, a factor applied to only one summand, a binomial
 * squared term by term.
 */
function makeEquivalencePair(equivalent: boolean): EquivalencePair | null {
  const [first, second] = pick(VARIABLE_PAIRS);
  const p = randomInt(2, 7);
  const q = randomInt(2, 8);
  const k = randomInt(2, 6);

  let left: string;
  let right: string;
  switch (randomInt(1, 4)) {
    case 1: {
      // Minusklammer: the second sign is the one that gets forgotten
      left = `${p}${first} - \\left(${writtenTermLatex([mono(k, { [first]: 1 }), mono(q)])}\\right)`;
      right = equivalent
        ? writtenTermLatex([mono(p - k, { [first]: 1 }), mono(-q)])
        : writtenTermLatex([mono(p - k, { [first]: 1 }), mono(q)]);
      break;
    }
    case 2: {
      // Distributivgesetz applied to only the first summand
      left = `${k}\\left(${writtenTermLatex([mono(p, { [first]: 1 }), mono(q)])}\\right)`;
      right = equivalent
        ? writtenTermLatex([mono(k * p, { [first]: 1 }), mono(k * q)])
        : writtenTermLatex([mono(k * p, { [first]: 1 }), mono(q)]);
      break;
    }
    case 3: {
      // (a + b)² squared term by term, the middle term missing
      left = `\\left(${writtenTermLatex([mono(p, { [first]: 1 }), mono(q)])}\\right)^{2}`;
      right = equivalent
        ? writtenTermLatex([mono(p * p, { [first]: 2 }), mono(2 * p * q, { [first]: 1 }), mono(q * q)])
        : writtenTermLatex([mono(p * p, { [first]: 2 }), mono(q * q)]);
      break;
    }
    default: {
      // Unlike terms added anyway: 3a + 4b is not 7ab
      left = writtenTermLatex([mono(p, { [first]: 1 }), mono(q, { [second]: 1 })]);
      right = equivalent
        ? writtenTermLatex([mono(q, { [second]: 1 }), mono(p, { [first]: 1 })])
        : monomialLatex(mono(p + q, { [first]: 1, [second]: 1 }));
      break;
    }
  }

  // Never take it on trust: the pair has to really be what it claims to be
  const a = parseTerm(left);
  const b = parseTerm(right);
  if (!a || !b || termsEqual(a, b) !== equivalent) return null;
  return { left, right, equivalent };
}

const evaluateStage: StageHandler<EvaluateQuestion> = {
  id: "evaluate",
  forPlayer: (question) => ({
    ...question,
    value: { n: 0, d: 1 },
    equivalent: false,
    solutionLatex: "",
  }),

  createQuestions({ settings }) {
    const mode = settings.evaluateAsk;
    const withFractions = Boolean(settings.withFractionValues);

    return questions(settings, (id) => {
      const ask: "value" | "equivalent" =
        mode === "value" || mode === "equivalent"
          ? (mode as "value" | "equivalent")
          : Math.random() < 0.6
            ? "value"
            : "equivalent";

      if (ask === "equivalent") {
        const wanted = Math.random() < 0.5;
        let pair = makeEquivalencePair(wanted);
        for (let attempt = 0; attempt < 20 && !pair; attempt++) {
          pair = makeEquivalencePair(wanted);
        }
        const safe = pair ?? { left: "3a + 4b", right: "7ab", equivalent: false };
        return {
          id,
          ask,
          termLatex: safe.left,
          otherLatex: safe.right,
          equivalent: safe.equivalent,
          assignments: [],
          value: { n: 0, d: 1 },
          solutionLatex: safe.equivalent
            ? "games.terme.evaluate.yes"
            : "games.terme.evaluate.no",
        };
      }

      const { latex, names } = makeValueTerm();
      const term = parseTerm(latex);
      // A fraction only where a single variable keeps the arithmetic reasonable
      const useFraction = withFractions && names.length === 1 && Math.random() < 0.4;
      const values: Record<string, Fraction> = {};
      const assignments = names.map((name) => {
        const value =
          useFraction && name === "x" ? pick(FRACTION_VALUES) : { n: signedInt(1, 5), d: 1 };
        values[name] = value;
        return { name, latex: fractionLatex(value) };
      });

      const value = (term && evaluateTermExact(term, values)) ?? { n: 0, d: 1 };
      return {
        id,
        ask,
        termLatex: latex,
        otherLatex: "",
        equivalent: false,
        assignments,
        value,
        solutionLatex: fractionLatex(value),
      };
    });
  },

  evaluate(question, answer, { questionMs }) {
    if (question.ask === "equivalent") {
      const correct = answer === String(question.equivalent);
      // One of two choices, so it is worth less than working a value out
      return { correct, points: correct ? speedPoints(questionMs / 1000, 3, 30, 70) : 0 };
    }
    if (!solutionsMatch(answer, [question.value])) return { correct: false, points: 0 };
    return { correct: true, points: typedPoints(questionMs) };
  },
};

// ---------------------------------------------------------------------------
// collect — Zusammenfassen (EdM 2.2) und Multiplizieren (EdM 2.3)
// ---------------------------------------------------------------------------

/** A sum with something to collect: 3a + 4b - a + 2b, or xy² + 2xy² - xy + 3xy. */
function makeSumTask(): { termLatex: string; solution: Term } {
  const [first, second] = pick(VARIABLE_PAIRS);
  // Two groups of like terms, so there is always something to put together
  const shapes = [randomShape(first, second), randomShape(first, second)];
  if (shapeKey(shapes[0]) === shapeKey(shapes[1])) return makeSumTask();

  const parts: Monomial[] = [];
  for (const shape of shapes) {
    parts.push(mono(signedInt(2, 8), shape), mono(signedInt(1, 6), shape));
  }
  // Sometimes a pair of plain numbers on top
  if (Math.random() < 0.4) parts.push(mono(signedInt(2, 9)), mono(signedInt(2, 9)));

  const written = shuffle(parts);
  // A leading minus is fine, an empty term is not
  const solution = normalizeTerm(written);
  if (solution.length === 0) return makeSumTask();
  return { termLatex: writtenTermLatex(written), solution };
}

/** Products and quotients: 7 · (8x²y), (28x²y) : 4, 2a · 3b, 12a²b : (4ab). */
function makeProductTask(): { termLatex: string; solution: Term } {
  const [first, second] = pick(VARIABLE_PAIRS);
  const roll = Math.random();

  if (roll < 0.25) {
    // A product multiplied by a number: only one factor takes the number
    const factor = signedInt(2, 8);
    const product = mono(randomInt(2, 9), randomShape(first, second));
    return {
      termLatex: `${factor} \\cdot \\left(${monomialLatex(product)}\\right)`,
      solution: multiplyTerms([mono(factor)], [product]),
    };
  }

  if (roll < 0.45) {
    // A product divided by a number, built backwards so it comes out whole
    const divisor = randomInt(2, 6);
    const quotient = mono(signedInt(2, 9), randomShape(first, second));
    const product = normalizeTerm(multiplyTerms([mono(divisor)], [quotient]))[0];
    return {
      termLatex: `\\left(${monomialLatex(product)}\\right) : ${divisor}`,
      solution: [quotient],
    };
  }

  const left = mono(signedInt(2, 6), Math.random() < 0.7 ? { [first]: 1 } : {});
  const right = mono(
    signedInt(2, 6),
    Math.random() < 0.5 ? { [second]: 1 } : { [first]: randomInt(1, 2) },
  );

  if (Math.random() < 0.3) {
    // Build the quotient backwards, so that it always comes out whole
    const product = normalizeTerm(multiplyTerms([left], [right]))[0];
    return {
      termLatex: `${monomialLatex(product)} : ${bracketedLatex([right])}`,
      solution: [left],
    };
  }

  const rightLatex = right.c.n < 0 ? `\\left(${monomialLatex(right)}\\right)` : monomialLatex(right);
  return {
    termLatex: `${monomialLatex(left)} \\cdot ${rightLatex}`,
    solution: multiplyTerms([left], [right]),
  };
}

const collectStage: StageHandler<CollectQuestion> = {
  id: "collect",
  forPlayer: (question) => ({ ...question, solutionLatex: "" }),

  createQuestions({ settings }) {
    const mode = settings.collectTask;
    return questions(settings, (id) => {
      const product = mode === "product" || (mode === "both" && Math.random() < 0.4);
      const task = product ? makeProductTask() : makeSumTask();
      return { id, termLatex: task.termLatex, solutionLatex: termLatex(task.solution) };
    });
  },

  evaluate(question, answer, { questionMs }) {
    const expected = parseTerm(question.solutionLatex);
    if (!expected || !gradeSimplified(answer, expected)) return { correct: false, points: 0 };
    return { correct: true, points: typedPoints(questionMs) };
  },
};

// ---------------------------------------------------------------------------
// expand — Klammern auflösen (EdM 2.4, 2.5) und Produkt zweier Klammern (2.7)
// ---------------------------------------------------------------------------

/** A binomial px + q, or one with a second variable. */
function randomBinomial(variable: string, other?: string): Term {
  const p = Math.random() < 0.55 ? 1 : randomInt(2, 5);
  const inner = Math.random() < 0.5 ? -1 : 1;
  const tail = other && Math.random() < 0.4 ? mono(inner * randomInt(2, 6), { [other]: 1 }) : mono(inner * randomInt(2, 9));
  return normalizeTerm([mono(p, { [variable]: 1 }), tail]);
}

/** A bracket of two or three terms: (3x - 4y² + 5) is the book's minus bracket. */
function randomBracket(variable: string, other: string): Term {
  const bracket = randomBinomial(variable, other);
  if (Math.random() < 0.3) {
    const extra = mono(signedInt(2, 8), Math.random() < 0.5 ? {} : { [other]: 2 });
    const wider = normalizeTerm([...bracket, extra]);
    if (wider.length === 3) return wider;
  }
  return bracket;
}

function makeSingleBracketTask(withMinus: boolean): { termLatex: string; solution: Term } {
  const [first, second] = pick(VARIABLE_PAIRS);
  const bracket = randomBracket(first, second);
  const roll = Math.random();

  if (withMinus && roll < 0.35) {
    // A + (B) or A - (B): the sign in front of the bracket is the whole point
    const outside = mono(signedInt(2, 9), Math.random() < 0.6 ? { [first]: 1 } : {});
    const minus = Math.random() < 0.7;
    const solution = normalizeTerm([
      outside,
      ...bracket.map((m) => ({ c: { n: (minus ? -1 : 1) * m.c.n, d: m.c.d }, v: m.v })),
    ]);
    return {
      termLatex: `${monomialLatex(outside)} ${minus ? "-" : "+"} \\left(${termLatex(bracket)}\\right)`,
      solution,
    };
  }

  // k(px + q) or kx(px + q) — the distributive law
  const factor = mono(
    roll < 0.6 ? signedInt(2, 7) : signedInt(1, 5),
    roll < 0.6 ? {} : { [first]: 1 },
  );
  const factorLatex =
    factor.c.n === -1 && Object.keys(factor.v).length === 0 ? "-" : monomialLatex(factor);
  return {
    termLatex: `${factorLatex}\\left(${termLatex(bracket)}\\right)`,
    solution: multiplyTerms([factor], bracket),
  };
}

function makeDoubleBracketTask(): { termLatex: string; solution: Term } {
  if (Math.random() < 0.3) {
    // (4x - 3y)(2x + 3z): the two brackets share one variable and bring one each
    const [shared, left, right] = pick(VARIABLE_TRIPLES);
    const leftBracket = normalizeTerm([
      mono(randomInt(2, 5), { [shared]: 1 }),
      mono(signedInt(2, 5), { [left]: 1 }),
    ]);
    const rightBracket = normalizeTerm([
      mono(randomInt(2, 5), { [shared]: 1 }),
      mono(signedInt(2, 5), { [right]: 1 }),
    ]);
    return {
      termLatex: `\\left(${termLatex(leftBracket)}\\right)\\left(${termLatex(rightBracket)}\\right)`,
      solution: multiplyTerms(leftBracket, rightBracket),
    };
  }

  const [first, second] = pick(VARIABLE_PAIRS);
  for (let attempt = 0; attempt < 20; attempt++) {
    const left = randomBinomial(first, second);
    const right = randomBinomial(first, second);
    const solution = multiplyTerms(left, right);
    // A binomial formula belongs in its own stage
    if (solution.length < 3) continue;
    return {
      termLatex: `\\left(${termLatex(left)}\\right)\\left(${termLatex(right)}\\right)`,
      solution,
    };
  }
  const fallbackLeft = normalizeTerm([mono(1, { x: 1 }), mono(3)]);
  const fallbackRight = normalizeTerm([mono(2, { x: 1 }), mono(-5)]);
  return {
    termLatex: `\\left(${termLatex(fallbackLeft)}\\right)\\left(${termLatex(fallbackRight)}\\right)`,
    solution: multiplyTerms(fallbackLeft, fallbackRight),
  };
}

const expandStage: StageHandler<ExpandQuestion> = {
  id: "expand",
  forPlayer: (question) => ({ ...question, solutionLatex: "" }),

  createQuestions({ settings }) {
    const mode = settings.bracketMode;
    const withMinus = Boolean(settings.withMinus);
    return questions(settings, (id) => {
      const double = mode === "double" || (mode === "both" && Math.random() < 0.4);
      const task = double ? makeDoubleBracketTask() : makeSingleBracketTask(withMinus);
      return { id, termLatex: task.termLatex, solutionLatex: termLatex(task.solution) };
    });
  },

  evaluate(question, answer, { questionMs }) {
    const expected = parseTerm(question.solutionLatex);
    if (!expected || !gradeSimplified(answer, expected)) return { correct: false, points: 0 };
    return { correct: true, points: typedPoints(questionMs) };
  },
};

// ---------------------------------------------------------------------------
// factor — Ausklammern, das Distributivgesetz rückwärts (EdM 2.6)
// ---------------------------------------------------------------------------

/** A sum with nothing left to pull out, so the common factor is unambiguous. */
function makeCoprimeSum(variables: string[], parts: number): Term {
  for (let attempt = 0; attempt < 40; attempt++) {
    const monomials: Monomial[] = [];
    for (let i = 0; i < parts; i++) {
      const variable = variables[i % variables.length];
      const power = Math.random() < 0.3 ? randomInt(1, 2) : i === 0 ? 1 : 0;
      monomials.push(mono(signedInt(1, 7), power > 0 ? { [variable]: power } : {}));
    }
    const term = normalizeTerm(monomials);
    if (term.length !== parts) continue;
    const common = monomialGcd(term);
    if (common.c.n === 1 && common.c.d === 1 && Object.keys(common.v).length === 0) return term;
  }
  return normalizeTerm([mono(2, { x: 1 }), mono(3)]);
}

const factorStage: StageHandler<FactorQuestion> = {
  id: "factor",
  forPlayer: (question) => ({ ...question, solutionLatex: "", commonLatex: "" }),

  createQuestions({ settings }) {
    const withVariables = Boolean(settings.withVariables);
    return questions(settings, (id) => {
      const [first, second] = pick(VARIABLE_PAIRS);
      const useVariables = withVariables && Math.random() < 0.6;
      // 2xy is a common factor the book pulls out, not just 2x
      const shape = pick([
        { [first]: 1 },
        { [first]: 2 },
        { [first]: 1, [second]: 1 },
      ]);
      const common: Monomial = mono(randomInt(2, 9), useVariables ? shape : {});
      let rest = makeCoprimeSum([first, second], Math.random() < 0.25 ? 3 : 2);
      const term = multiplyTerms([common], rest);

      // A term that starts negative is factored with a negative factor in front:
      // -6x² + 18 becomes -6(x² - 3), not 6(-x² + 3). Both are accepted, but the
      // model solution is the one the textbook writes.
      let front = common;
      if (normalizeTerm(term)[0]?.c.n < 0) {
        front = { c: { n: -common.c.n, d: common.c.d }, v: common.v };
        rest = rest.map((m) => ({ c: { n: -m.c.n, d: m.c.d }, v: m.v }));
      }

      return {
        id,
        termLatex: termLatex(term),
        solutionLatex: `${monomialLatex(front)}\\left(${termLatex(rest)}\\right)`,
        commonLatex: monomialLatex(front),
      };
    });
  },

  evaluate(question, answer, { questionMs }) {
    const expected = parseTerm(question.termLatex);
    if (!expected) return { correct: false, points: 0 };
    // Not just any product: the whole common factor has to come out in front
    if (!gradeFactored(answer, expected, monomialGcd(expected))) return { correct: false, points: 0 };
    return { correct: true, points: typedPoints(questionMs) };
  },
};

// ---------------------------------------------------------------------------
// binomial — die binomischen Formeln in beide Richtungen (EdM 2.8)
// ---------------------------------------------------------------------------

/** The two halves a binomial formula is built from: ax and b (or by). */
function binomialParts(withCoefficients: boolean): { left: Monomial; right: Monomial; vars: string[] } {
  const [first, second] = pick(VARIABLE_PAIRS);
  const a = withCoefficients && Math.random() < 0.7 ? randomInt(2, 5) : 1;
  const left = mono(a, { [first]: 1 });
  const useSecond = withCoefficients && Math.random() < 0.4;
  const right = useSecond
    ? mono(randomInt(2, 4), { [second]: 1 })
    : mono(randomInt(2, 9));
  return { left, right, vars: [first, second] };
}

/** One of the three formulas, as the product and as the sum it equals. */
function makeBinomial(withCoefficients: boolean): { product: string; expanded: Term } {
  const { left, right } = binomialParts(withCoefficients);
  const formula = randomInt(1, 3);

  if (formula === 3) {
    // (a + b)(a - b) = a² - b²
    const plus = normalizeTerm([left, right]);
    const minus = normalizeTerm([left, { c: { n: -right.c.n, d: right.c.d }, v: right.v }]);
    return {
      product: `\\left(${termLatex(plus)}\\right)\\left(${termLatex(minus)}\\right)`,
      expanded: multiplyTerms(plus, minus),
    };
  }

  const signed: Monomial =
    formula === 1 ? right : { c: { n: -right.c.n, d: right.c.d }, v: right.v };
  const base = normalizeTerm([left, signed]);
  return {
    product: `\\left(${termLatex(base)}\\right)^{2}`,
    expanded: multiplyTerms(base, base),
  };
}

const binomialStage: StageHandler<BinomialQuestion> = {
  id: "binomial",
  forPlayer: (question) => ({ ...question, solutionLatex: "" }),

  createQuestions({ settings }) {
    const mode = settings.binomialDirection;
    const withCoefficients = Boolean(settings.withCoefficients);
    return questions(settings, (id) => {
      const direction: "expand" | "factor" =
        mode === "expand" || mode === "factor"
          ? mode
          : Math.random() < 0.5
            ? "expand"
            : "factor";
      const { product, expanded } = makeBinomial(withCoefficients);

      return direction === "expand"
        ? { id, direction, termLatex: product, solutionLatex: termLatex(expanded) }
        : { id, direction, termLatex: termLatex(expanded), solutionLatex: product };
    });
  },

  evaluate(question, answer, { questionMs }) {
    if (question.direction === "expand") {
      const expected = parseTerm(question.solutionLatex);
      if (!expected || !gradeSimplified(answer, expected)) return { correct: false, points: 0 };
      return { correct: true, points: typedPoints(questionMs) };
    }

    const expected = parseTerm(question.termLatex);
    // Two brackets, or one squared — anything that is really a product
    if (!expected || !gradeFactored(answer, expected)) return { correct: false, points: 0 };
    return { correct: true, points: typedPoints(questionMs) };
  },
};

// ---------------------------------------------------------------------------
// zero — Satz vom Nullprodukt (EdM 2.9)
// ---------------------------------------------------------------------------

/** A linear factor px - p·root, written so that its root is the given one. */
function linearFactor(variable: string, root: number, coefficient: number): Term {
  return normalizeTerm([mono(coefficient, { [variable]: 1 }), mono(-coefficient * root)]);
}

const zeroStage: StageHandler<ZeroQuestion> = {
  id: "zero",
  forPlayer: (question) => ({
    ...question,
    // As many blanks as there are zeros: the stage offers that many fields.
    solutions: question.solutions.map(() => ({ n: 0, d: 1 })),
    solutionLatex: "",
  }),

  createQuestions({ settings }) {
    const factorFirst = Boolean(settings.factorFirst);
    return questions(settings, (id) => {
      const variable = pick(["x", "z", "t"]);
      const needsFactoring = factorFirst && Math.random() < 0.5;

      // Two different roots, one of them 0 often enough that x(...) shows up
      const firstRoot = Math.random() < 0.3 ? 0 : signedInt(1, 9);
      let secondRoot = signedInt(1, 9);
      for (let attempt = 0; attempt < 20 && secondRoot === firstRoot; attempt++) {
        secondRoot = signedInt(1, 9);
      }

      const leftCoefficient = Math.random() < 0.3 ? randomInt(2, 3) : 1;
      const left = linearFactor(variable, firstRoot, leftCoefficient);
      const right = linearFactor(variable, secondRoot, 1);
      const solutions: Fraction[] = [
        { n: firstRoot, d: 1 },
        { n: secondRoot, d: 1 },
      ];

      if (needsFactoring) {
        // Multiplied out, so the product has to be rebuilt before the rule bites
        const expanded = multiplyTerms(left, right);
        return {
          id,
          termLatex: termLatex(expanded),
          variable,
          needsFactoring: true,
          solutions,
          solutionLatex: `${variable}_1 = ${firstRoot};\\; ${variable}_2 = ${secondRoot}`,
        };
      }

      return {
        id,
        termLatex: `${bracketedLatex(left)} \\cdot ${bracketedLatex(right)}`,
        variable,
        needsFactoring: false,
        solutions,
        solutionLatex: `${variable}_1 = ${firstRoot};\\; ${variable}_2 = ${secondRoot}`,
      };
    });
  },

  evaluate(question, answer, { questionMs }) {
    if (!solutionsMatch(answer, question.solutions)) return { correct: false, points: 0 };
    return { correct: true, points: typedPoints(questionMs) };
  },
};

// ---------------------------------------------------------------------------
// fraction — Verhältnis- und Bruchgleichungen, ohne Doppelbrüche (EdM 2.10)
// ---------------------------------------------------------------------------

interface FractionTask {
  latex: string;
  solution: Fraction;
  /** The value the variable may not take, when it sits in a denominator. */
  excluded: Fraction | null;
}

/** The sign goes in front of the fraction, the way it is written by hand:
 *  -27/6, never (-27)/6. */
function signedNumeratorLatex(numerator: number, denominator: string): string {
  const sign = numerator < 0 ? "-" : "";
  return `${sign}\\frac{${Math.abs(numerator)}}{${denominator}}`;
}

/** x/b = (s·k)/(b·k) — a Verhältnisgleichung whose solution is s. */
function makeRatioTask(variable: string, solution: number): FractionTask {
  const b = randomInt(2, 9);
  const k = randomInt(2, 4);
  return {
    latex: `\\frac{${variable}}{${b}} = ${signedNumeratorLatex(solution * k, String(b * k))}`,
    solution: { n: solution, d: 1 },
    excluded: null,
  };
}

/** (a·x + b)/c = d — one bracket to clear, then a linear equation. */
function makeLinearTask(variable: string, solution: number): FractionTask {
  const a = randomInt(2, 6);
  const c = randomInt(2, 6);
  const d = randomInt(1, 8);
  const b = c * d - a * solution;
  const inner = writtenTermLatex([mono(a, { [variable]: 1 }), mono(b)]);
  return {
    latex: `\\frac{${inner}}{${c}} = ${d}`,
    solution: { n: solution, d: 1 },
    excluded: null,
  };
}

/** a/x = c — the variable is in the denominator, so 0 drops out of the domain. */
function makeReciprocalTask(variable: string, solution: number): FractionTask {
  const c = randomInt(2, 8);
  return {
    latex: `${signedNumeratorLatex(c * solution, variable)} = ${c}`,
    solution: { n: solution, d: 1 },
    excluded: { n: 0, d: 1 },
  };
}

/** a/(x + b) = c — the excluded value is -b, which has to be worked out. */
function makeShiftedTask(variable: string, solution: number): FractionTask {
  const b = signedInt(1, 7);
  const c = randomInt(2, 6);
  if (solution + b === 0) return makeReciprocalTask(variable, solution);
  const inner = writtenTermLatex([mono(1, { [variable]: 1 }), mono(b)]);
  return {
    latex: `${signedNumeratorLatex(c * (solution + b), inner)} = ${c}`,
    solution: { n: solution, d: 1 },
    excluded: { n: -b, d: 1 },
  };
}

/**
 * (x + a)/(x + b) = (x + c)/(x + d) — the book's worked example. Multiplying by
 * the Hauptnenner kills the x² on both sides and leaves a linear equation.
 * Two values drop out of the domain here, so this shape is only ever asked to
 * be solved, never for a single excluded value.
 */
function makeCrossTask(variable: string): FractionTask | null {
  for (let attempt = 0; attempt < 80; attempt++) {
    const a = signedInt(1, 9);
    const b = signedInt(1, 9);
    const c = signedInt(1, 9);
    const d = signedInt(1, 9);
    // (a + d - b - c)·x = bc - ad
    const slope = a + d - b - c;
    if (slope === 0) continue;
    const offset = b * c - a * d;
    if (offset % slope !== 0) continue;
    const x = offset / slope;
    // A solution that empties a denominator is no solution
    if (x + b === 0 || x + d === 0) continue;
    // Both sides equal to 1 is not an equation worth solving
    if (a === b || c === d) continue;

    const side = (top: number, bottom: number) =>
      `\\frac{${writtenTermLatex([mono(1, { [variable]: 1 }), mono(top)])}}{${writtenTermLatex([mono(1, { [variable]: 1 }), mono(bottom)])}}`;
    return {
      latex: `${side(a, b)} = ${side(c, d)}`,
      solution: { n: x, d: 1 },
      excluded: null,
    };
  }
  return null;
}

const fractionStage: StageHandler<FractionQuestion> = {
  id: "fraction",
  forPlayer: (question) => ({ ...question, answer: { n: 0, d: 1 }, solutionLatex: "" }),

  createQuestions({ settings }) {
    const mode = settings.fractionAsk;
    return questions(settings, (id) => {
      const variable = pick(["x", "z", "t"]);
      // A "which value is excluded" question needs the variable in a denominator
      const ask: "solve" | "domain" =
        mode === "solve" || mode === "domain"
          ? (mode as "solve" | "domain")
          : Math.random() < 0.3
            ? "domain"
            : "solve";
      const solution = signedInt(1, 9);
      const task =
        ask === "domain"
          ? Math.random() < 0.6
            ? makeShiftedTask(variable, solution)
            : makeReciprocalTask(variable, solution)
          : (Math.random() < 0.25 ? makeCrossTask(variable) : null) ??
            pick([makeRatioTask, makeLinearTask, makeReciprocalTask, makeShiftedTask])(
              variable,
              solution,
            );

      const answer = ask === "domain" ? (task.excluded ?? { n: 0, d: 1 }) : task.solution;
      return {
        id,
        termLatex: task.latex,
        variable,
        ask,
        answer,
        solutionLatex: `${variable} ${ask === "domain" ? "\\ne" : "="} ${fractionLatex(answer)}`,
      };
    });
  },

  evaluate(question, answer, { questionMs }) {
    if (!solutionsMatch(answer, [question.answer])) return { correct: false, points: 0 };
    return { correct: true, points: typedPoints(questionMs) };
  },
};

// ---------------------------------------------------------------------------
// rearrange — Umformen von Formeln (EdM 2.11)
// ---------------------------------------------------------------------------

interface FormulaSpec {
  key: string;
  icon: string;
  formula: string;
  /** Which variable can be asked for, and the answer for each. */
  solve: Record<string, string>;
  /** One step ("divide by b") or several. */
  steps: 1 | 2;
}

const FORMULAS: FormulaSpec[] = [
  {
    key: "games.terme.formulas.rectangleArea",
    icon: "rect",
    formula: "A = a \\cdot b",
    solve: { a: "\\frac{A}{b}", b: "\\frac{A}{a}" },
    steps: 1,
  },
  {
    key: "games.terme.formulas.speed",
    icon: "car",
    formula: "s = v \\cdot t",
    solve: { v: "\\frac{s}{t}", t: "\\frac{s}{v}" },
    steps: 1,
  },
  {
    key: "games.terme.formulas.cuboid",
    icon: "cuboid",
    formula: "V = a \\cdot b \\cdot c",
    solve: { c: "\\frac{V}{a \\cdot b}", a: "\\frac{V}{b \\cdot c}" },
    steps: 1,
  },
  {
    key: "games.terme.formulas.power",
    icon: "bolt",
    formula: "P = \\frac{W}{t}",
    solve: { W: "P \\cdot t", t: "\\frac{W}{P}" },
    steps: 1,
  },
  {
    key: "games.terme.formulas.percentage",
    icon: "percent",
    formula: "W = G \\cdot p",
    solve: { G: "\\frac{W}{p}", p: "\\frac{W}{G}" },
    steps: 1,
  },
  {
    key: "games.terme.formulas.density",
    icon: "scale",
    formula: "d = \\frac{m}{V}",
    solve: { m: "d \\cdot V", V: "\\frac{m}{d}" },
    steps: 1,
  },
  {
    key: "games.terme.formulas.rectanglePerimeter",
    icon: "square",
    formula: "U = 2 \\cdot \\left(a + b\\right)",
    solve: { a: "\\frac{U}{2} - b", b: "\\frac{U}{2} - a" },
    steps: 2,
  },
  {
    key: "games.terme.formulas.triangleArea",
    icon: "triangle",
    formula: "A = \\frac{g \\cdot h}{2}",
    solve: { g: "\\frac{2A}{h}", h: "\\frac{2A}{g}" },
    steps: 2,
  },
  {
    key: "games.terme.formulas.trapezoid",
    icon: "trapezoid",
    formula: "A = \\frac{a + c}{2} \\cdot h",
    solve: { h: "\\frac{2A}{a + c}" },
    steps: 2,
  },
  {
    key: "games.terme.formulas.mean",
    icon: "chartBar",
    formula: "m = \\frac{a + b}{2}",
    solve: { a: "2m - b", b: "2m - a" },
    steps: 2,
  },
  {
    key: "games.terme.formulas.linear",
    icon: "chartLine",
    formula: "y = m \\cdot x + b",
    solve: { b: "y - m \\cdot x", x: "\\frac{y - b}{m}", m: "\\frac{y - b}{x}" },
    steps: 2,
  },
  {
    key: "games.terme.formulas.fahrenheit",
    icon: "thermometer",
    formula: "C = \\frac{5}{9} \\cdot \\left(F - 32\\right)",
    solve: { F: "\\frac{9}{5} \\cdot C + 32" },
    steps: 2,
  },
];

const rearrangeStage: StageHandler<RearrangeQuestion> = {
  id: "rearrange",
  forPlayer: (question) => ({ ...question, solutionLatex: "" }),

  createQuestions({ settings }) {
    const multiStep = Boolean(settings.multiStep);
    const usable = FORMULAS.filter((formula) => multiStep || formula.steps === 1);
    // Every formula at most once per round
    const pool = shuffle(usable);

    return questions(settings, (id) => {
      const formula = pool[id % pool.length];
      const target = pick(Object.keys(formula.solve));
      return {
        id,
        termLatex: formula.formula,
        contextKey: formula.key,
        icon: formula.icon,
        target,
        solutionLatex: `${target} = ${formula.solve[target]}`,
      };
    });
  },

  evaluate(question, answer, { questionMs }) {
    // The model solution reads "h = 2A/g"; only the right-hand side is graded
    const expected = parseRational(question.solutionLatex.split("=").slice(1).join("="));
    // A player may write "h = …" or just the term
    const written = answer.includes("=") ? answer.split("=").slice(1).join("=") : answer;
    const given = parseRational(written);
    if (!expected || !given || !rationalEquals(given, expected)) {
      return { correct: false, points: 0 };
    }
    return { correct: true, points: typedPoints(questionMs) };
  },
};

// ---------------------------------------------------------------------------
// inequality — Ungleichungen (EdM 2.12)
// ---------------------------------------------------------------------------

const RELATIONS: Relation[] = ["<", "<=", ">", ">="];

/** Turning the relation round is what multiplying by a negative number does. */
function flipRelation(relation: Relation): Relation {
  switch (relation) {
    case "<":
      return ">";
    case "<=":
      return ">=";
    case ">":
      return "<";
    case ">=":
      return "<=";
  }
}

interface InequalityTask {
  latex: string;
  relation: Relation;
  bound: number;
}

/**
 * Builds an inequality whose solution is `variable R bound`. The left-hand
 * coefficient decides whether the relation survives the last division or turns
 * round — the whole point of the chapter.
 */
function makeInequalityTask(
  variable: string,
  withSignFlip: boolean,
  withBrackets: boolean,
): InequalityTask {
  const shown = pick(RELATIONS);
  const bound = signedInt(1, 9);
  // A negative coefficient is what turns the relation round on the last step
  const negative = withSignFlip && Math.random() < 0.5;

  if (withBrackets && Math.random() < 0.4) {
    // k(x + b) R c
    const k = (negative ? -1 : 1) * randomInt(2, 5);
    const b = signedInt(1, 8);
    const c = k * (bound + b);
    const inner = writtenTermLatex([mono(1, { [variable]: 1 }), mono(b)]);
    const factor = k === -1 ? "-" : String(k);
    return {
      latex: `${factor}\\left(${inner}\\right) ${relationLatex(shown)} ${c}`,
      relation: negative ? flipRelation(shown) : shown,
      bound,
    };
  }

  if (withBrackets && Math.random() < 0.5) {
    // a·x + b R d·x + e, with the variable on both sides
    const d = signedInt(1, 5);
    const a = d + (negative ? -randomInt(1, 5) : randomInt(1, 5));
    const b = signedInt(1, 9);
    const e = (a - d) * bound + b;
    const left = writtenTermLatex([mono(a, { [variable]: 1 }), mono(b)]);
    const right = writtenTermLatex([mono(d, { [variable]: 1 }), mono(e)]);
    return {
      latex: `${left} ${relationLatex(shown)} ${right}`,
      relation: a - d < 0 ? flipRelation(shown) : shown,
      bound,
    };
  }

  // a·x + b R c
  const a = (negative ? -1 : 1) * randomInt(2, 8);
  const b = signedInt(1, 9);
  const c = a * bound + b;
  const left = writtenTermLatex([mono(a, { [variable]: 1 }), mono(b)]);
  return {
    latex: `${left} ${relationLatex(shown)} ${c}`,
    relation: negative ? flipRelation(shown) : shown,
    bound,
  };
}

const inequalityStage: StageHandler<InequalityQuestion> = {
  id: "inequality",
  forPlayer: (question) => ({ ...question, bound: { n: 0, d: 1 }, relation: "<", solutionLatex: "" }),

  createQuestions({ settings }) {
    const withSignFlip = Boolean(settings.withSignFlip);
    const withBrackets = Boolean(settings.withBrackets);

    return questions(settings, (id) => {
      const variable = pick(["x", "z", "t"]);
      const task = makeInequalityTask(variable, withSignFlip, withBrackets);
      const bound = reduce({ n: task.bound, d: 1 });
      return {
        id,
        termLatex: task.latex,
        variable,
        relation: task.relation,
        bound,
        solutionLatex: `${variable} ${relationLatex(task.relation)} ${fractionLatex(bound)}`,
      };
    });
  },

  evaluate(question, answer, { questionMs }) {
    const expected = {
      variable: question.variable,
      relation: question.relation,
      bound: question.bound,
    };
    if (!inequalityMatches(answer, expected)) return { correct: false, points: 0 };
    return { correct: true, points: typedPoints(questionMs) };
  },
};

export default createStageGame(termeSpec, [
  buildStage,
  evaluateStage,
  collectStage,
  expandStage,
  factorStage,
  binomialStage,
  zeroStage,
  fractionStage,
  rearrangeStage,
  inequalityStage,
]);
