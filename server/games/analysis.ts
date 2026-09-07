import { analysisSpec, readExtraPoints, readInputMode } from "../../shared/games/analysis";
import type {
  DrawnPoint,
  DrawQuestion,
  MultipleChoiceQuestion,
} from "../../shared/games/analysis";
import { closenessPoints, speedPoints } from "../../shared/framework";
import {
  ANALYSIS_FUNCTIONS,
  DRAWABLE_FUNCTION_IDS,
  evaluateFunction,
  evaluateDerivative,
} from "../../shared/analysis-functions";
import { asFunctionPoints, oshimaCurve } from "../../shared/spline";
import type { StageHandler } from "../framework";
import { createStageGame } from "../framework";

/** A drawing counts as correct from this score upwards. */
const DRAWING_PASS_MARK = 60;
/** An average error of a quarter of the y range is worth no points — with a
 *  full range as the yardstick even a flat line along the x-axis scored well. */
const DRAWING_ZERO_AT = 0.25;

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

/** Points to place in "points" mode: one per turning point of the curve, plus
 *  the two ends and the y-axis — the features a student works out first. */
const MIN_HANDLES = 4;
const MAX_HANDLES = 7;

function handleCountFor(target: (x: number) => number, xMin: number, xMax: number): number {
  // Turning points show up as sign changes of the slope
  const samples = 200;
  let turningPoints = 0;
  let previous = 0;
  for (let i = 0; i <= samples; i++) {
    const x = xMin + ((xMax - xMin) * i) / samples;
    const step = (xMax - xMin) / samples;
    const slope = target(x + step / 2) - target(x - step / 2);
    if (!isFinite(slope) || slope === 0) continue;
    const sign = Math.sign(slope);
    if (previous !== 0 && sign !== previous) turningPoints++;
    previous = sign;
  }
  return Math.min(MAX_HANDLES, Math.max(MIN_HANDLES, turningPoints + 4));
}

function drawQuestions(count: number, target: (id: number, x: number) => number): DrawQuestion[] {
  return pickN(DRAWABLE_FUNCTION_IDS, count).map((functionId, id) => {
    const fn = ANALYSIS_FUNCTIONS[functionId];
    return {
      id,
      functionId,
      functionLatex: fn.latex,
      xMin: fn.xMin,
      xMax: fn.xMax,
      yMin: fn.yMin,
      yMax: fn.yMax,
      handleCount: handleCountFor((x) => target(functionId, x), fn.xMin, fn.xMax),
    };
  });
}

function parsePoints(answer: string): DrawnPoint[] {
  try {
    const parsed = JSON.parse(answer);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is DrawnPoint =>
        typeof p?.x === "number" && typeof p?.y === "number" && isFinite(p.x) && isFinite(p.y),
    );
  } catch {
    return [];
  }
}

/**
 * Compares a drawn curve with the target function: samples the target at 30
 * x values, interpolates the drawing at the same x, and turns the mean error
 * into a 0-100 score (an average error of a full y range scores 0).
 */
function scoreDrawing(points: DrawnPoint[], question: DrawQuestion, target: (x: number) => number): number {
  if (points.length < 2) return 0;

  const sorted = [...points].sort((a, b) => a.x - b.x);
  const SAMPLES = 30;
  const yRange = question.yMax - question.yMin;
  let totalError = 0;
  let validSamples = 0;

  for (let i = 0; i <= SAMPLES; i++) {
    const x = question.xMin + ((question.xMax - question.xMin) * i) / SAMPLES;
    const targetY = target(x);
    if (isNaN(targetY)) continue; // e.g. 1/x at x = 0

    let drawnY: number;
    if (x <= sorted[0].x) {
      drawnY = sorted[0].y;
    } else if (x >= sorted[sorted.length - 1].x) {
      drawnY = sorted[sorted.length - 1].y;
    } else {
      let lo = 0;
      let hi = sorted.length - 1;
      while (lo < hi - 1) {
        const mid = Math.floor((lo + hi) / 2);
        if (sorted[mid].x <= x) lo = mid;
        else hi = mid;
      }
      const p0 = sorted[lo];
      const p1 = sorted[hi];
      const t = p1.x === p0.x ? 0 : (x - p0.x) / (p1.x - p0.x);
      drawnY = p0.y + t * (p1.y - p0.y);
    }

    totalError += Math.abs(drawnY - targetY);
    validSamples++;
  }

  if (validSamples === 0) return 0;
  return Math.round(closenessPoints(totalError / validSamples / yRange, DRAWING_ZERO_AT));
}

const multipleChoiceStage: StageHandler<MultipleChoiceQuestion> = {
  id: "multiple-choice",

  createQuestions({ settings }) {
    const ids = pickN(
      Array.from({ length: ANALYSIS_FUNCTIONS.length }, (_, i) => i),
      Number(settings.questionsPerRound),
    );
    return ids.map((functionId, id) => {
      const fn = ANALYSIS_FUNCTIONS[functionId];
      const options = shuffle([fn.derivativeLatex, ...fn.distractors]);
      return {
        id,
        functionId,
        functionLatex: fn.latex,
        options,
        correctOptionIndex: options.indexOf(fn.derivativeLatex),
      };
    });
  },

  evaluate(question, answer, { questionMs }) {
    const selected = parseInt(answer, 10);
    if (isNaN(selected) || selected !== question.correctOptionIndex) {
      return { correct: false, points: 0 };
    }
    return { correct: true, points: speedPoints(questionMs / 1000, 3, 20) };
  },
};

/** The curve the player handed in: their strokes, or the spline through the
 *  points they placed. Both end up as a polyline that the same scorer reads. */
function submittedCurve(
  answer: string,
  question: DrawQuestion,
  mode: "points" | "freehand",
  extra: number,
) {
  const points = parsePoints(answer);
  if (mode === "freehand") return points;
  // In points mode the answer is the handles; the curve is rebuilt here instead
  // of being taken from the client. The count has to be one the question allows.
  if (points.length < question.handleCount) return [];
  if (points.length > question.handleCount + extra) return [];
  return oshimaCurve(asFunctionPoints(points));
}

/** One drawing stage: reproduce `target` freehand or by placing points. */
function makeDrawStage(
  id: string,
  target: (functionId: number, x: number) => number,
): StageHandler<DrawQuestion> {
  return {
    id,

    createQuestions({ settings }) {
      return drawQuestions(Number(settings.questionsPerRound), target);
    },

    evaluate(question, answer, _timing, { settings }) {
      const curve = submittedCurve(
        answer,
        question,
        readInputMode(settings),
        readExtraPoints(settings),
      );
      const points = scoreDrawing(curve, question, (x) => target(question.functionId, x));
      return { correct: points >= DRAWING_PASS_MARK, points };
    },
  };
}

const drawGraphStage = makeDrawStage("draw-graph", evaluateFunction);
const drawDerivativeStage = makeDrawStage("draw-derivative", evaluateDerivative);

export default createStageGame(analysisSpec, [
  multipleChoiceStage,
  drawGraphStage,
  drawDerivativeStage,
]);
