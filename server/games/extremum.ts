import { extremumSpec } from "../../shared/games/extremum";
import {
  OPTIMIZE_PARTS,
  OPTIMIZE_TERMS,
  X_CORRECT_AT,
  X_ZERO_AT,
  askedTerms,
  termAnswer,
} from "../../shared/games/extremum";
import type {
  DeriveQuestion,
  OptimizeAnswer,
  OptimizePart,
  OptimizeQuestion,
  OptimizeTerm,
} from "../../shared/games/extremum";
import { closenessPoints, speedPoints } from "../../shared/framework";
import type { Polynomial } from "../../shared/polynomial";
import {
  argMax,
  derive,
  evaluate,
  parsePolynomial,
  polynomialEquals,
  toLatex,
} from "../../shared/polynomial";
import { assignmentPoints, cardsBySlot, parseAssignment } from "../../shared/matching";
import type { StageHandler } from "../framework";
import { createStageGame } from "../framework";

const KEY = "games.extremum";

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

// ---------------------------------------------------------------------------
// derive — hilfsmittelfreies Ableiten ganzrationaler Funktionen
// ---------------------------------------------------------------------------

/** A polynomial of the requested degree with coefficients students can handle. */
function randomPolynomial(degree: number): Polynomial {
  const coefficients: Polynomial = [];
  for (let power = 0; power <= degree; power++) {
    // The leading coefficient may not vanish, the others may
    const value = power === degree ? randomInt(1, 5) * (Math.random() < 0.3 ? -1 : 1) : randomInt(-6, 6);
    coefficients.push(value);
  }
  return coefficients;
}

const deriveStage: StageHandler<DeriveQuestion> = {
  id: "derive",

  createQuestions({ settings }) {
    const degree = Number(settings.degree);
    return Array.from({ length: Number(settings.questionsPerRound) }, (_, id) => {
      const polynomial = randomPolynomial(degree);
      return { id, functionLatex: toLatex(polynomial), polynomial };
    });
  },

  evaluate(question, answer, { questionMs }) {
    const parsed = parsePolynomial(answer);
    if (!parsed || !polynomialEquals(parsed, derive(question.polynomial))) {
      return { correct: false, points: 0 };
    }
    return { correct: true, points: speedPoints(questionMs / 1000, 2, 20) };
  },
};

// ---------------------------------------------------------------------------
// optimize — Extremwertprobleme mit Nebenbedingung (GK-A1)
// ---------------------------------------------------------------------------

/** Share of the points that comes from modelling; the rest from the maximum. */
const MODEL_SHARE = 0.5;
/** How many wrong cards lie in the tray beside the right ones. */
const DECOY_COUNT = 3;

const Q = `${KEY}.quantities`;

/**
 * One situation, with the whole model written out.
 *
 * All of it is built even when a question asks for one step of it: what is not
 * asked is shown to the player already filled in, so a question about the
 * Nebenbedingung is still a question about *this* Nebenbedingung and not about
 * a term in mid-air. The decoys are per term for the same reason — a wrong
 * card has to be a wrong answer to the step it sits under, or picking the
 * right one is a matter of noticing which card has an `A(x)` in front.
 */
interface Context {
  icon: string;
  contextKey: string;
  /** What is to become as large as possible, and what it is offered against. */
  quantityKey: string;
  quantityDecoys: [string, string, string];
  params: Record<string, number>;
  /** Extremalbedingung, Nebenbedingung, Zielfunktion — `OPTIMIZE_TERMS` order. */
  terms: [string, string, string];
  /** Wrong cards for each of those three, at least two each. */
  decoys: [string[], string[], string[]];
  polynomial: Polynomial;
  xMin: number;
  xMax: number;
  /** A step the context asks for — quarters of a euro rather than 0.06 of one. */
  step?: number;
}

/** Rectangle against a river: only three sides are fenced. */
function fenceContext(): Context {
  const length = randomInt(4, 15) * 4;
  return {
    icon: "waves",
    contextKey: `${KEY}.contexts.fence`,
    quantityKey: `${Q}.area`,
    quantityDecoys: [`${Q}.perimeter`, `${Q}.length`, `${Q}.volume`],
    params: { length },
    terms: [`A = x \\cdot y`, `2x + y = ${length}`, `A(x) = x \\cdot (${length} - 2x)`],
    decoys: [
      [`A = 2x + y`, `A = x + y`, `A = 2x \\cdot y`],
      [`2x + 2y = ${length}`, `x + y = ${length}`, `x \\cdot y = ${length}`],
      [`A(x) = x \\cdot (${length} - x)`, `A(x) = 2x \\cdot (${length} - 2x)`],
    ],
    // x(L - 2x) = Lx - 2x²
    polynomial: [0, length, -2],
    xMin: 0,
    xMax: length / 2,
  };
}

/** The same rectangle with a fence all the way round — one step easier. */
function gardenContext(): Context {
  const fence = randomInt(5, 15) * 4;
  const half = fence / 2;
  return {
    icon: "plant",
    contextKey: `${KEY}.contexts.garden`,
    quantityKey: `${Q}.area`,
    quantityDecoys: [`${Q}.perimeter`, `${Q}.cost`, `${Q}.length`],
    params: { fence },
    terms: [`A = x \\cdot y`, `2x + 2y = ${fence}`, `A(x) = x \\cdot (${half} - x)`],
    decoys: [
      [`A = 2x + 2y`, `A = x + y`],
      [`2x + y = ${fence}`, `x + y = ${fence}`, `x \\cdot y = ${fence}`],
      [`A(x) = x \\cdot (${fence} - x)`, `A(x) = x \\cdot (${half} - 2x)`],
    ],
    polynomial: [0, half, -1],
    xMin: 0,
    xMax: half,
  };
}

/** An open box folded from a square sheet with corners cut off. */
function boxContext(): Context {
  const side = randomInt(3, 12) * 2;
  return {
    icon: "box",
    contextKey: `${KEY}.contexts.box`,
    quantityKey: `${Q}.volume`,
    quantityDecoys: [`${Q}.surface`, `${Q}.area`, `${Q}.length`],
    params: { side },
    terms: [`V = a^2 \\cdot x`, `a = ${side} - 2x`, `V(x) = x \\cdot (${side} - 2x)^2`],
    decoys: [
      [`V = a \\cdot x`, `V = a^2 \\cdot x^2`],
      [`a = ${side} - x`, `a = ${side} - 4x`],
      [`V(x) = x \\cdot (${side} - 2x)`, `V(x) = x^2 \\cdot (${side} - 2x)`],
    ],
    // x(a - 2x)² = a²x - 4a x² + 4x³
    polynomial: [0, side * side, -4 * side, 4],
    xMin: 0,
    xMax: side / 2,
  };
}

/** The same fold from a sheet that is not square, so two sides have to be cut. */
function cuboidContext(): Context {
  const width = randomInt(4, 9) * 2;
  const length = width + randomInt(1, 4) * 2;
  return {
    icon: "cuboid",
    contextKey: `${KEY}.contexts.cuboid`,
    quantityKey: `${Q}.volume`,
    quantityDecoys: [`${Q}.surface`, `${Q}.area`, `${Q}.length`],
    params: { width, length },
    terms: [
      `V = l \\cdot b \\cdot x`,
      `l = ${length} - 2x,\\; b = ${width} - 2x`,
      `V(x) = x \\cdot (${length} - 2x)(${width} - 2x)`,
    ],
    decoys: [
      [`V = l \\cdot b`, `V = l \\cdot b \\cdot x^2`],
      [`l = ${length} - x,\\; b = ${width} - x`, `l = ${length} - 2x,\\; b = ${width} - x`],
      [
        `V(x) = x \\cdot (${length} - x)(${width} - x)`,
        `V(x) = x^2 \\cdot (${length} - 2x)(${width} - 2x)`,
      ],
    ],
    // x(l - 2x)(b - 2x) = lb·x - 2(l + b)x² + 4x³
    polynomial: [0, length * width, -2 * (length + width), 4],
    xMin: 0,
    xMax: width / 2,
  };
}

/** The largest rectangle under a parabola. */
function parabolaContext(): Context {
  const height = randomInt(2, 9);
  return {
    icon: "ruler",
    contextKey: `${KEY}.contexts.parabola`,
    quantityKey: `${Q}.area`,
    quantityDecoys: [`${Q}.perimeter`, `${Q}.length`, `${Q}.volume`],
    params: { height },
    terms: [`A = 2x \\cdot y`, `y = ${height} - x^2`, `A(x) = 2x \\cdot (${height} - x^2)`],
    decoys: [
      [`A = x \\cdot y`, `A = 2x + 2y`],
      [`y = ${height} + x^2`, `y = x^2 - ${height}`],
      [`A(x) = x \\cdot (${height} - x^2)`, `A(x) = 2x \\cdot (${height} + x^2)`],
    ],
    // 2x(h - x²) = 2hx - 2x³
    polynomial: [0, 2 * height, 0, -2],
    xMin: 0,
    xMax: Math.sqrt(height),
  };
}

/** The largest rectangle in a right triangle, with one corner on the slope. */
function triangleContext(): Context {
  const width = randomInt(3, 8) * 2;
  const slope = randomInt(1, 3);
  const height = slope * width;
  // "12 - 1x" is not how anybody writes it
  const factor = slope === 1 ? "" : String(slope);
  return {
    icon: "triangle",
    contextKey: `${KEY}.contexts.triangle`,
    quantityKey: `${Q}.area`,
    quantityDecoys: [`${Q}.perimeter`, `${Q}.length`, `${Q}.volume`],
    params: { width, height },
    terms: [
      `A = x \\cdot y`,
      `y = ${height} - ${factor}x`,
      `A(x) = x \\cdot (${height} - ${factor}x)`,
    ],
    decoys: [
      [`A = \\tfrac{1}{2} x \\cdot y`, `A = x + y`],
      [`y = ${height} + ${factor}x`, `y = ${factor}x - ${height}`],
      [
        `A(x) = \\tfrac{1}{2} x \\cdot (${height} - ${factor}x)`,
        `A(x) = x \\cdot (${height} + ${factor}x)`,
      ],
    ],
    polynomial: [0, height, -slope],
    xMin: 0,
    xMax: width,
  };
}

/** Two numbers with a given sum — the model with no picture at all. */
function numbersContext(): Context {
  const sum = randomInt(5, 20) * 2;
  return {
    icon: "calculator",
    contextKey: `${KEY}.contexts.numbers`,
    quantityKey: `${Q}.product`,
    quantityDecoys: [`${Q}.sum`, `${Q}.difference`, `${Q}.quotient`],
    params: { sum },
    terms: [`P = x \\cdot y`, `x + y = ${sum}`, `P(x) = x \\cdot (${sum} - x)`],
    decoys: [
      [`P = x + y`, `P = x - y`],
      [`x \\cdot y = ${sum}`, `x - y = ${sum}`],
      [`P(x) = x + (${sum} - x)`, `P(x) = x \\cdot (${sum} + x)`],
    ],
    polynomial: [0, sum, -1],
    xMin: 0,
    xMax: sum,
  };
}

/** Cheaper tickets, more visitors: the one that is not about a shape. */
function ticketContext(): Context {
  const price = pick([10, 12, 15, 20]);
  const perEuro = pick([20, 25, 40]);
  // Two fifths to three fifths of what selling out at the full price would be,
  // which puts the best discount between a fifth and a third of the price
  const visitors = Math.round((price * perEuro * pick([4, 5, 6])) / 10);
  return {
    icon: "money",
    contextKey: `${KEY}.contexts.ticket`,
    quantityKey: `${Q}.revenue`,
    quantityDecoys: [`${Q}.price`, `${Q}.cost`, `${Q}.visitors`],
    params: { price, perEuro, visitors },
    terms: [
      `E = p \\cdot n`,
      `p = ${price} - x,\\; n = ${visitors} + ${perEuro}x`,
      `E(x) = (${price} - x)(${visitors} + ${perEuro}x)`,
    ],
    decoys: [
      [`E = p + n`, `E = \\frac{n}{p}`],
      [
        `p = ${price} + x,\\; n = ${visitors} + ${perEuro}x`,
        `p = ${price} - x,\\; n = ${visitors} - ${perEuro}x`,
      ],
      [
        `E(x) = (${price} - x)(${visitors} - ${perEuro}x)`,
        `E(x) = (${price} + x)(${visitors} + ${perEuro}x)`,
      ],
    ],
    // (P - x)(N + kx) = PN + (Pk - N)x - kx²
    polynomial: [price * visitors, price * perEuro - visitors, -perEuro],
    xMin: 0,
    xMax: price,
    step: 0.25,
  };
}

const CONTEXTS = [
  fenceContext,
  gardenContext,
  boxContext,
  cuboidContext,
  parabolaContext,
  triangleContext,
  numbersContext,
  ticketContext,
];

/**
 * How much of the model question `index` of `total` asks for.
 *
 * `mixed` walks up: the first question of a round is one step with the rest of
 * the way shown, the last one is the whole way. Which steps those are is the
 * draw's business, so a round does not ask about the Nebenbedingung five times.
 */
function partsFor(index: number, total: number, mode: string): OptimizePart[] {
  const count =
    mode === "one"
      ? 1
      : mode === "all"
        ? OPTIMIZE_PARTS.length
        : Math.min(
            OPTIMIZE_PARTS.length,
            1 + Math.floor((index * OPTIMIZE_PARTS.length) / Math.max(total, 1)),
          );
  const picked = shuffle([...OPTIMIZE_PARTS]).slice(0, count);
  return OPTIMIZE_PARTS.filter((part) => picked.includes(part));
}

/** The right card for every asked term, plus decoys drawn from those terms. */
function cardsFor(context: Context, terms: OptimizeTerm[]): string[] {
  if (terms.length === 0) return [];
  const right = terms.map((term) => context.terms[OPTIMIZE_TERMS.indexOf(term)]);
  const decoys: string[] = [];
  const poolsFor = (of: readonly OptimizeTerm[]) =>
    of.map((term) => shuffle(context.decoys[OPTIMIZE_TERMS.indexOf(term)]));
  const take = (pools: string[][]) => {
    for (let round = 0; round < 3; round++) {
      for (const pool of pools) {
        if (decoys.length >= DECOY_COUNT) return;
        const card = pool[round];
        if (card && !decoys.includes(card) && !right.includes(card)) decoys.push(card);
      }
    }
  };

  // A wrong card should be a wrong answer to a step that is on the board, so
  // the asked terms' own decoys go first; the other steps only fill up a tray
  // that would otherwise be one card short.
  take(poolsFor(terms));
  take(poolsFor(OPTIMIZE_TERMS.filter((term) => !terms.includes(term))));
  return shuffle([...right, ...decoys]);
}

function makeOptimizeQuestion(
  id: number,
  context: Context,
  parts: OptimizePart[],
): OptimizeQuestion {
  // A plot window that shows the whole hill
  let top = 0;
  for (let i = 0; i <= 100; i++) {
    const x = context.xMin + ((context.xMax - context.xMin) * i) / 100;
    top = Math.max(top, evaluate(context.polynomial, x));
  }

  const span = context.xMax - context.xMin;
  const terms = OPTIMIZE_TERMS.filter((term) => parts.includes(term));
  return {
    id,
    icon: context.icon,
    contextKey: context.contextKey,
    quantityKey: context.quantityKey,
    params: context.params,
    terms: context.terms,
    asked: parts,
    cards: cardsFor(context, terms),
    quantityOptions: parts.includes("quantity")
      ? shuffle([context.quantityKey, ...context.quantityDecoys])
      : null,
    target: context.polynomial,
    xMin: context.xMin,
    xMax: context.xMax,
    yMin: 0,
    yMax: Math.ceil(top * 1.15),
    // About two hundred slider positions, rounded to something readable
    step: context.step ?? Math.max(0.01, Math.round((span / 200) * 100) / 100),
  };
}

const optimizeStage: StageHandler<OptimizeQuestion> = {
  id: "optimize",

  createQuestions({ settings }) {
    const total = Number(settings.questionsPerRound);
    const mode = String(settings.modelParts);
    // Drawn from a bag rather than picked each time, so a round of four is four
    // different situations and not the fence three times.
    let bag: (() => Context)[] = [];
    return Array.from({ length: total }, (_, id) => {
      if (bag.length === 0) bag = shuffle(CONTEXTS);
      return makeOptimizeQuestion(id, bag.pop()!(), partsFor(id, total, mode));
    });
  },

  evaluate(question, answer) {
    let parsed: OptimizeAnswer;
    try {
      parsed = JSON.parse(answer) as OptimizeAnswer;
    } catch {
      return { correct: false, points: 0 };
    }

    const terms = askedTerms(question);
    const assignment = parseAssignment(
      JSON.stringify(parsed.assignment ?? []),
      question.cards.length,
      terms.length,
    );
    if (!assignment) return { correct: false, points: 0 };

    const bySlot = cardsBySlot(assignment, terms.length);
    const matches = terms.map(
      (term, slot) =>
        bySlot[slot] != null && question.cards[bySlot[slot]!] === termAnswer(question, term),
    );
    if (question.quantityOptions) {
      matches.push(question.quantityOptions[Number(parsed.quantity)] === question.quantityKey);
    }

    const x = Number(parsed.x);
    if (!isFinite(x)) return { correct: false, points: 0 };
    // Recomputed here, so the answer never travels to the client
    const answerX = argMax(question.target, question.xMin, question.xMax);
    const relativeError = Math.abs(x - answerX) / (question.xMax - question.xMin);

    const modelPoints = assignmentPoints(matches) * MODEL_SHARE;
    const maximumPoints = closenessPoints(relativeError, X_ZERO_AT) * (1 - MODEL_SHARE);
    return {
      correct: matches.every(Boolean) && relativeError <= X_CORRECT_AT,
      points: Math.round(modelPoints + maximumPoints),
    };
  },
};

export default createStageGame(extremumSpec, [deriveStage, optimizeStage]);
