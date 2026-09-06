import type * as Party from "partykit/server";
import type { GameHandler } from "../types";
import type {
  LobbyState,
  GameResult,
  AnalysisSettings,
  AnalysisGameData,
  AnalysisQuestion,
  AnalysisRoundType,
} from "../../shared/types";
import { defaultAnalysisSettings } from "../../shared/types";
import {
  ANALYSIS_FUNCTIONS,
  DRAWABLE_FUNCTION_IDS,
  evaluateFunction,
  evaluateDerivative,
} from "../../shared/analysis-functions";

function getSettings(state: LobbyState): AnalysisSettings {
  return {
    ...defaultAnalysisSettings,
    ...((state.settings ?? {}) as Partial<AnalysisSettings>),
  };
}

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

// Round 1: Multiple choice — pick a function, show f(x), 4 options for f'(x)
function generateMCQuestions(count: number): AnalysisQuestion[] {
  const indices = pickN(
    Array.from({ length: ANALYSIS_FUNCTIONS.length }, (_, i) => i),
    count,
  );
  return indices.map((fnId, id) => {
    const fn = ANALYSIS_FUNCTIONS[fnId];
    const options = shuffle([fn.derivativeLatex, ...fn.distractors]);
    const correctOptionIndex = options.indexOf(fn.derivativeLatex);
    return {
      id,
      functionId: fnId,
      functionLatex: fn.latex,
      options,
      correctOptionIndex,
    };
  });
}

// Round 2: Draw the graph of f(x) — show formula, student draws
function generateDrawGraphQuestions(count: number): AnalysisQuestion[] {
  const ids = pickN(DRAWABLE_FUNCTION_IDS, count);
  return ids.map((fnId, id) => {
    const fn = ANALYSIS_FUNCTIONS[fnId];
    return {
      id,
      functionId: fnId,
      functionLatex: fn.latex,
      xMin: fn.xMin,
      xMax: fn.xMax,
      yMin: fn.yMin,
      yMax: fn.yMax,
    };
  });
}

// Round 3: Draw f'(x) — show the graph of f(x) as reference, student draws f'(x)
function generateDrawDerivativeQuestions(count: number): AnalysisQuestion[] {
  const ids = pickN(DRAWABLE_FUNCTION_IDS, count);
  return ids.map((fnId, id) => {
    const fn = ANALYSIS_FUNCTIONS[fnId];
    return {
      id,
      functionId: fnId,
      functionLatex: fn.latex,
      xMin: fn.xMin,
      xMax: fn.xMax,
      yMin: fn.yMin,
      yMax: fn.yMax,
    };
  });
}

function generateQuestions(
  roundType: AnalysisRoundType,
  count: number,
): AnalysisQuestion[] {
  switch (roundType) {
    case "multiple-choice":
      return generateMCQuestions(count);
    case "draw-graph":
      return generateDrawGraphQuestions(count);
    case "draw-derivative":
      return generateDrawDerivativeQuestions(count);
  }
}

const ROUND_TYPES: AnalysisRoundType[] = [
  "multiple-choice",
  "draw-graph",
  "draw-derivative",
];

function buildRoundData(state: LobbyState, round: number): AnalysisGameData {
  const settings = getSettings(state);
  const roundType = ROUND_TYPES[round - 1] ?? "multiple-choice";
  return {
    currentRound: round,
    totalRounds: 3,
    roundType,
    questions: generateQuestions(roundType, settings.questionsPerRound),
    answers: {},
    startTime: Date.now(),
    duration: settings.duration,
    finished: false,
  };
}

// Evaluate a drawn curve against a target function.
// `drawnPoints` is an array of {x, y} in math coordinates.
// `targetFn` is the function to compare against.
// Returns a score 0-100 based on mean absolute error normalized by the y range.
function evaluateDrawing(
  drawnPoints: { x: number; y: number }[],
  targetFn: (x: number) => number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
): number {
  if (drawnPoints.length < 2) return 0;

  // Sort drawn points by x
  const sorted = [...drawnPoints].sort((a, b) => a.x - b.x);

  // Sample at ~30 evenly spaced x values
  const SAMPLES = 30;
  const yRange = yMax - yMin;
  let totalError = 0;
  let validSamples = 0;

  for (let i = 0; i <= SAMPLES; i++) {
    const x = xMin + ((xMax - xMin) * i) / SAMPLES;
    const targetY = targetFn(x);

    // Skip if target is NaN (e.g., 1/x at x=0)
    if (isNaN(targetY)) continue;

    // Find the student's y at this x via linear interpolation
    let drawnY: number | null = null;

    // Clamp x to the drawn range
    if (x < sorted[0].x) {
      drawnY = sorted[0].y;
    } else if (x > sorted[sorted.length - 1].x) {
      drawnY = sorted[sorted.length - 1].y;
    } else {
      // Binary search for the surrounding points
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

    if (drawnY == null) continue;

    const error = Math.abs(drawnY - targetY);
    totalError += error;
    validSamples++;
  }

  if (validSamples === 0) return 0;

  const avgError = totalError / validSamples;
  // Normalize: an average error equal to the full y range gives 0 points.
  // An average error of 0 gives 100 points.
  const normalizedError = avgError / yRange;
  const score = Math.max(0, Math.min(100, Math.round(100 * (1 - normalizedError))));

  return score;
}

function getRoundResults(state: LobbyState): GameResult[] {
  const data = state.gameData as AnalysisGameData;
  const players = state.players.filter((p) => !p.isHost);

  return players
    .map((p) => ({
      playerId: p.id,
      playerName: p.name,
      score: calculatePlayerScore(data, p.id),
    }))
    .sort((a, b) => b.score - a.score);
}

function evaluateAnswer(
  data: AnalysisGameData,
  question: AnalysisQuestion,
  answer: string,
  timeMs: number,
  currentStreak: number,
): { correct: boolean; points: number; streak: number } {
  let correct = false;
  let basePoints = 0;

  switch (data.roundType) {
    case "multiple-choice": {
      const selected = parseInt(answer, 10);
      if (!isNaN(selected) && selected === question.correctOptionIndex) {
        correct = true;
        const seconds = timeMs / 1000;
        basePoints = Math.max(20, 100 - Math.floor(seconds) * 3);
      }
      break;
    }
    case "draw-graph": {
      let drawnPoints: { x: number; y: number }[] = [];
      try {
        drawnPoints = JSON.parse(answer);
      } catch {
        break;
      }
      const score = evaluateDrawing(
        drawnPoints,
        (x) => evaluateFunction(question.functionId, x),
        question.xMin!,
        question.xMax!,
        question.yMin!,
        question.yMax!,
      );
      basePoints = score;
      // For drawing, "correct" means score >= 60
      correct = score >= 60;
      break;
    }
    case "draw-derivative": {
      let drawnPoints: { x: number; y: number }[] = [];
      try {
        drawnPoints = JSON.parse(answer);
      } catch {
        break;
      }
      const score = evaluateDrawing(
        drawnPoints,
        (x) => evaluateDerivative(question.functionId, x),
        question.xMin!,
        question.xMax!,
        question.yMin!,
        question.yMax!,
      );
      basePoints = score;
      correct = score >= 60;
      break;
    }
  }

  const streak = correct ? currentStreak + 1 : 0;
  const comboMultiplier = correct ? 1 + Math.min(0.5, (streak - 1) * 0.1) : 1;
  const points = Math.round(basePoints * comboMultiplier);

  return { correct, points, streak };
}

function calculatePlayerScore(data: AnalysisGameData, playerId: string): number {
  const playerAnswers = data.answers[playerId] ?? {};
  let total = 0;
  for (const q of data.questions) {
    const ans = playerAnswers[q.id];
    if (ans?.points != null) {
      total += ans.points;
    }
  }
  return total;
}

const analysisHandler: GameHandler = {
  onStart(state: LobbyState): AnalysisGameData {
    return buildRoundData(state, 1);
  },

  onRoundStart(state: LobbyState): AnalysisGameData {
    const prev = state.gameData as AnalysisGameData;
    return buildRoundData(state, (prev?.currentRound ?? 0) + 1);
  },

  onMessage(
    state: LobbyState,
    payload: unknown,
    sender: Party.Connection,
  ): AnalysisGameData | undefined {
    const data = state.gameData as AnalysisGameData;
    if (!data || data.finished) return undefined;

    const action = payload as { action: string; questionId?: number; answer?: string };
    if (action?.action !== "answer" || action.questionId == null || action.answer == null) {
      return undefined;
    }

    // Don't allow re-answering
    if (data.answers[sender.id]?.[action.questionId]) return undefined;

    const question = data.questions.find((q) => q.id === action.questionId);
    if (!question) return undefined;

    if (!data.answers[sender.id]) {
      data.answers[sender.id] = {};
    }

    // Calculate current streak
    const playerAnswers = data.answers[sender.id];
    let currentStreak = 0;
    const sortedAnswered = Object.keys(playerAnswers)
      .map(Number)
      .sort((a, b) => a - b);
    if (sortedAnswered.length > 0) {
      const lastAnswer = playerAnswers[sortedAnswered[sortedAnswered.length - 1]];
      currentStreak = lastAnswer?.streak ?? 0;
    }

    const timeMs = Date.now() - data.startTime;
    const result = evaluateAnswer(data, question, action.answer, timeMs, currentStreak);

    data.answers[sender.id][action.questionId] = {
      answer: action.answer,
      timeMs,
      correct: result.correct,
      points: result.points,
      streak: result.streak,
    };

    return { ...data };
  },

  checkRoundFinished(state: LobbyState): GameResult[] | undefined {
    const data = state.gameData as AnalysisGameData;
    if (!data) return undefined;

    const elapsed = (Date.now() - data.startTime) / 1000;
    const timeExpired = elapsed >= data.duration;

    const players = state.players.filter((p) => !p.isHost);
    if (players.length === 0) return undefined;

    const allAnswered = players.every((p) => {
      const count = Object.keys(data.answers[p.id] ?? {}).length;
      return count >= data.questions.length;
    });

    if (allAnswered || timeExpired) {
      return getRoundResults(state);
    }

    return undefined;
  },

  isLastRound(state: LobbyState): boolean {
    const data = state.gameData as AnalysisGameData;
    return (data?.currentRound ?? 1) >= (data?.totalRounds ?? 3);
  },

  getDurationMs(state: LobbyState): number {
    const data = state.gameData as AnalysisGameData;
    return (data?.duration ?? defaultAnalysisSettings.duration) * 1000;
  },
};

export default analysisHandler;
