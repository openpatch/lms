import { extremumSpec } from "../../shared/games/extremum";
import type {
  DeriveQuestion,
  OptimizeAnswer,
  OptimizeQuestion,
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
/** A chosen x this far off — as a share of the interval — is worth nothing … */
const X_ZERO_AT = 0.08;
/** … and this close counts as correct. */
const X_CORRECT_AT = 0.03;

interface Context {
  icon: string;
  contextKey: string;
  quantityKey: string;
  params: Record<string, number>;
  constraint: string;
  target: string;
  distractors: string[];
  polynomial: Polynomial;
  xMin: number;
  xMax: number;
}

/** Rectangle against a river: only three sides are fenced. */
function fenceContext(): Context {
  const length = randomInt(4, 15) * 4;
  return {
    icon: "🌊",
    contextKey: `${KEY}.contexts.fence`,
    quantityKey: `${KEY}.quantities.area`,
    params: { length },
    constraint: `2x + y = ${length}`,
    target: `A(x) = x \\cdot (${length} - 2x)`,
    distractors: [
      `2x + 2y = ${length}`,
      `A(x) = x \\cdot (${length} - x)`,
      `A(x) = x \\cdot y`,
    ],
    // x(L - 2x) = Lx - 2x²
    polynomial: [0, length, -2],
    xMin: 0,
    xMax: length / 2,
  };
}

/** An open box folded from a square sheet with corners cut off. */
function boxContext(): Context {
  const side = randomInt(3, 12) * 2;
  return {
    icon: "📦",
    contextKey: `${KEY}.contexts.box`,
    quantityKey: `${KEY}.quantities.volume`,
    params: { side },
    constraint: `a = ${side} - 2x`,
    target: `V(x) = x \\cdot (${side} - 2x)^2`,
    distractors: [`a = ${side} - x`, `V(x) = x \\cdot (${side} - 2x)`, `V(x) = x^2 \\cdot (${side} - 2x)`],
    // x(a - 2x)² = a²x - 4a x² + 4x³
    polynomial: [0, side * side, -4 * side, 4],
    xMin: 0,
    xMax: side / 2,
  };
}

/** The largest rectangle under a parabola. */
function parabolaContext(): Context {
  const height = randomInt(2, 9);
  return {
    icon: "📐",
    contextKey: `${KEY}.contexts.parabola`,
    quantityKey: `${KEY}.quantities.area`,
    params: { height },
    constraint: `y = ${height} - x^2`,
    target: `A(x) = 2x \\cdot (${height} - x^2)`,
    distractors: [`y = ${height} + x^2`, `A(x) = x \\cdot (${height} - x^2)`, `A(x) = 2x \\cdot y`],
    // 2x(h - x²) = 2hx - 2x³
    polynomial: [0, 2 * height, 0, -2],
    xMin: 0,
    xMax: Math.sqrt(height),
  };
}

const CONTEXTS = [fenceContext, boxContext, parabolaContext];

function makeOptimizeQuestion(id: number): OptimizeQuestion {
  const context = pick(CONTEXTS)();

  // A plot window that shows the whole hill
  let top = 0;
  for (let i = 0; i <= 100; i++) {
    const x = context.xMin + ((context.xMax - context.xMin) * i) / 100;
    top = Math.max(top, evaluate(context.polynomial, x));
  }

  const span = context.xMax - context.xMin;
  return {
    id,
    icon: context.icon,
    contextKey: context.contextKey,
    quantityKey: context.quantityKey,
    params: context.params,
    cards: shuffle([context.constraint, context.target, ...context.distractors]),
    slotAnswers: [context.constraint, context.target],
    target: context.polynomial,
    xMin: context.xMin,
    xMax: context.xMax,
    yMin: 0,
    yMax: Math.ceil(top * 1.15),
    // About two hundred slider positions, rounded to something readable
    step: Math.max(0.01, Math.round((span / 200) * 100) / 100),
  };
}

const optimizeStage: StageHandler<OptimizeQuestion> = {
  id: "optimize",

  createQuestions({ settings }) {
    return Array.from({ length: Number(settings.questionsPerRound) }, (_, id) =>
      makeOptimizeQuestion(id),
    );
  },

  evaluate(question, answer) {
    let parsed: OptimizeAnswer;
    try {
      parsed = JSON.parse(answer) as OptimizeAnswer;
    } catch {
      return { correct: false, points: 0 };
    }

    const assignment = parseAssignment(
      JSON.stringify(parsed.assignment ?? []),
      question.cards.length,
      question.slotAnswers.length,
    );
    if (!assignment) return { correct: false, points: 0 };

    const bySlot = cardsBySlot(assignment, question.slotAnswers.length);
    const matches = bySlot.map(
      (card, slot) => card != null && question.cards[card] === question.slotAnswers[slot],
    );

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
