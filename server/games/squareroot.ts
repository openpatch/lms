import { readTargetPrecision, squarerootSpec } from "../../shared/games/squareroot";
import type {
  BisectAnswer,
  BisectQuestion,
  ClassifyAnswer,
  ClassifyQuestion,
  NumberLineQuestion,
  SimplifyQuestion,
  SpeedQuestion,
} from "../../shared/games/squareroot";
import { speedPoints } from "../../shared/framework";
import { decodeRootAnswer, rootEquals, simplifyRoot } from "../../shared/root-math";
import type { StageHandler } from "../framework";
import { createStageGame } from "../framework";

// Perfect squares — the speed stage keeps every answer a natural number
const PERFECT_SQUARES = [4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225, 256];
// Non-perfect squares 2-24 — irrational roots to estimate on the number line
const NON_PERFECT = [2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 21, 22, 23, 24];
// Roots that are rational but not natural
const RATIONAL_VALUES = [0.25, 0.36, 1.44, 2.25, 0.04, 0.09, 6.25, 12.25, 0.16, 0.49];

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickN<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const speedStage: StageHandler<SpeedQuestion> = {
  id: "speed",

  createQuestions({ settings }) {
    return pickN(PERFECT_SQUARES, Number(settings.questionsPerRound)).map((value, id) => ({
      id,
      value,
      numericAnswer: Math.sqrt(value),
    }));
  },

  evaluate(question, answer, { questionMs }) {
    if (parseInt(answer, 10) !== question.numericAnswer) return { correct: false, points: 0 };
    return { correct: true, points: speedPoints(questionMs / 1000, 2, 10) };
  },
};

const numberLineStage: StageHandler<NumberLineQuestion> = {
  id: "numberline",

  createQuestions({ settings }) {
    return pickN(NON_PERFECT, Number(settings.questionsPerRound)).map((value, id) => ({
      id,
      value,
      numericAnswer: Math.sqrt(value),
      lineMin: 0,
      lineMax: 5,
    }));
  },

  evaluate(question, answer) {
    const value = parseFloat(answer);
    if (isNaN(value)) return { correct: false, points: 0 };
    // Every 0.01 off the real value costs a point
    const points = Math.max(0, Math.round(100 - Math.abs(value - question.numericAnswer) * 100));
    return { correct: points > 0, points };
  },
};

const classifyStage: StageHandler<ClassifyQuestion> = {
  id: "classify",

  createQuestions({ settings }) {
    const count = Number(settings.questionsPerRound);
    const perCategory = Math.ceil(count / 3);
    const naturals = pickN(PERFECT_SQUARES, perCategory).map((value) => ({
      value,
      classifyAnswer: "natural" as ClassifyAnswer,
    }));
    const rationals = pickN(RATIONAL_VALUES, perCategory).map((value) => ({
      value,
      classifyAnswer: "rational" as ClassifyAnswer,
    }));
    const irrationals = pickN(NON_PERFECT, count - naturals.length - rationals.length).map(
      (value) => ({ value, classifyAnswer: "irrational" as ClassifyAnswer }),
    );

    return shuffle([...naturals, ...rationals, ...irrationals])
      .slice(0, count)
      .map((item, id) => ({ id, ...item }));
  },

  evaluate(question, answer) {
    const correct = answer === question.classifyAnswer;
    return { correct, points: correct ? 100 : 0 };
  },
};

// ---------------------------------------------------------------------------
// simplify — the root laws of EdM 1.4-1.6, hilfsmittelfrei
// ---------------------------------------------------------------------------

// Radicands with a square inside, so that pulling it out is worth something
const PARTIAL_RADICANDS = [8, 12, 18, 20, 24, 27, 32, 45, 48, 50, 72, 75, 80, 98, 108, 128, 200];
// Small square-free radicands used to build products and quotients
const SQUARE_FREE = [2, 3, 5, 6, 7, 10];

/** Builds one task: what the player sees, and the value it simplifies to. */
function makeSimplifyTask(mixed: boolean): { promptLatex: string; radicand: number; factor: number } {
  const kind = mixed ? randomInt(0, 3) : 0;

  if (kind === 1) {
    // √a · √b — the product rule
    const a = pick(SQUARE_FREE);
    const b = pick([2, 3, 5, 6, 8, 12, 18]);
    return { promptLatex: `\\sqrt{${a}} \\cdot \\sqrt{${b}}`, radicand: a * b, factor: 1 };
  }

  if (kind === 2) {
    // √(a·b) : √a — the quotient rule, always a whole number underneath
    const b = pick([2, 3, 4, 5, 9, 16, 25]);
    const a = pick([2, 3, 5, 6, 7]);
    return { promptLatex: `\\sqrt{${a * b}} : \\sqrt{${a}}`, radicand: b, factor: 1 };
  }

  if (kind === 3) {
    // n/√d — rationalising the denominator; n is a multiple of d, so the factor stays whole
    const d = pick(SQUARE_FREE);
    const n = d * randomInt(1, 4);
    return { promptLatex: `\\frac{${n}}{\\sqrt{${d}}}`, radicand: d, factor: n / d };
  }

  // Partial root extraction: √72 = 6√2
  const radicand = pick(PARTIAL_RADICANDS);
  return { promptLatex: `\\sqrt{${radicand}}`, radicand, factor: 1 };
}

const simplifyStage: StageHandler<SimplifyQuestion> = {
  id: "simplify",

  createQuestions({ settings }) {
    const mixed = settings.rootTasks !== "partial";
    return Array.from({ length: Number(settings.questionsPerRound) }, (_, id) => {
      const task = makeSimplifyTask(mixed);
      return {
        id,
        promptLatex: task.promptLatex,
        answer: simplifyRoot(task.radicand, task.factor),
      };
    });
  },

  evaluate(question, answer, { questionMs }) {
    const parsed = decodeRootAnswer(answer);
    // The answer has to be the same number — and written without a square left inside
    if (!parsed || !rootEquals(parsed, question.answer)) return { correct: false, points: 0 };
    if (parsed.radicand !== question.answer.radicand) return { correct: false, points: 0 };
    return { correct: true, points: speedPoints(questionMs / 1000, 2, 20) };
  },
};

// ---------------------------------------------------------------------------
// bisect — the Intervallhalbierungsverfahren of EdM 1.3
// ---------------------------------------------------------------------------

/** Points lost per halving beyond the shortest possible way … */
const BISECT_STEP_PENALTY = 15;
/** … and per half picked that did not contain the root. */
const BISECT_MISTAKE_PENALTY = 10;

/** How many halvings it takes to get from `width` down to `target`. */
function optimalSteps(width: number, target: number): number {
  return Math.ceil(Math.log2(width / target) - 1e-9);
}

const bisectStage: StageHandler<BisectQuestion> = {
  id: "bisect",

  createQuestions({ settings }) {
    const target = readTargetPrecision(settings);
    return pickN(NON_PERFECT, Number(settings.questionsPerRound)).map((value, id) => {
      const root = Math.sqrt(value);
      return {
        id,
        value,
        // The whole numbers around the root — where a student would start
        startMin: Math.floor(root),
        startMax: Math.floor(root) + 1,
        target,
      };
    });
  },

  evaluate(question, answer) {
    let parsed: BisectAnswer;
    try {
      parsed = JSON.parse(answer) as BisectAnswer;
    } catch {
      return { correct: false, points: 0 };
    }

    const { min, max, steps } = parsed;
    const mistakes = Math.max(0, Number(parsed.mistakes ?? 0));
    if (![min, max, steps, mistakes].every((v) => typeof v === "number" && isFinite(v))) {
      return { correct: false, points: 0 };
    }

    const root = Math.sqrt(question.value);
    const width = max - min;
    const startWidth = question.startMax - question.startMin;
    // Every halving has to have kept the root inside, so the final interval
    // both contains it and is exactly the start width halved `steps` times
    const expectedWidth = startWidth / 2 ** steps;
    if (min > root || max < root) return { correct: false, points: 0 };
    if (Math.abs(width - expectedWidth) > 1e-6) return { correct: false, points: 0 };
    if (width > question.target + 1e-9) return { correct: false, points: 0 };

    const extra = Math.max(0, steps - optimalSteps(startWidth, question.target));
    const points = 100 - extra * BISECT_STEP_PENALTY - mistakes * BISECT_MISTAKE_PENALTY;
    return { correct: true, points: Math.max(20, points) };
  },
};

export default createStageGame(squarerootSpec, [
  speedStage,
  numberLineStage,
  classifyStage,
  simplifyStage,
  bisectStage,
]);
