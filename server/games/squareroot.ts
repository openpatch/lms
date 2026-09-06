import type * as Party from "partykit/server";
import type { GameHandler } from "../types";
import type {
  LobbyState,
  GameResult,
  SquarerootSettings,
  SquarerootGameData,
  SquarerootQuestion,
  SquarerootRoundType,
  ClassifyAnswer,
} from "../../shared/types";
import { defaultSquarerootSettings } from "../../shared/types";

function getSettings(state: LobbyState): SquarerootSettings {
  return {
    ...defaultSquarerootSettings,
    ...((state.settings ?? {}) as Partial<SquarerootSettings>),
  };
}

// Perfect squares for round 1 (natural number results)
const PERFECT_SQUARES = [4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225, 256];

// Non-perfect-square integers 2-24 for round 2 (irrational results)
const NON_PERFECT = [2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 21, 22, 23, 24];

// For round 3: rational non-natural numbers (square roots are rational but not integers)
const RATIONAL_VALUES = [0.25, 0.36, 1.44, 2.25, 0.04, 0.09, 6.25, 12.25, 0.16, 0.49];

// Irrational values for round 3
const IRRATIONAL_VALUES = [2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20];

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

function generateSpeedQuestions(count: number): SquarerootQuestion[] {
  const values = pickN(PERFECT_SQUARES, count);
  return values.map((value, id) => ({
    id,
    value,
    numericAnswer: Math.sqrt(value),
  }));
}

function generateNumberLineQuestions(count: number): SquarerootQuestion[] {
  const values = pickN(NON_PERFECT, count);
  return values.map((value, id) => ({
    id,
    value,
    numericAnswer: Math.sqrt(value),
    lineMin: 0,
    lineMax: 5,
  }));
}

function generateClassifyQuestions(count: number): SquarerootQuestion[] {
  const perCategory = Math.ceil(count / 3);
  const naturals = pickN(PERFECT_SQUARES, perCategory).map((v) => ({
    value: v,
    classify: "natural" as ClassifyAnswer,
  }));
  const rationals = pickN(RATIONAL_VALUES, perCategory).map((v) => ({
    value: v,
    classify: "rational" as ClassifyAnswer,
  }));
  const irrationals = pickN(IRRATIONAL_VALUES, count - naturals.length - rationals.length).map(
    (v) => ({
      value: v,
      classify: "irrational" as ClassifyAnswer,
    }),
  );

  const all = shuffle([...naturals, ...rationals, ...irrationals]);
  return all.slice(0, count).map((item, id) => ({
    id,
    value: item.value,
    numericAnswer: Math.sqrt(item.value),
    classifyAnswer: item.classify,
  }));
}

function generateQuestions(roundType: SquarerootRoundType, count: number): SquarerootQuestion[] {
  switch (roundType) {
    case "speed":
      return generateSpeedQuestions(count);
    case "numberline":
      return generateNumberLineQuestions(count);
    case "classify":
      return generateClassifyQuestions(count);
  }
}

const ROUND_TYPES: SquarerootRoundType[] = ["speed", "numberline", "classify"];

function buildRoundData(
  state: LobbyState,
  round: number,
): SquarerootGameData {
  const settings = getSettings(state);
  const roundType = ROUND_TYPES[round - 1] ?? "speed";
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

function getRoundResults(state: LobbyState): GameResult[] {
  const data = state.gameData as SquarerootGameData;
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
  data: SquarerootGameData,
  question: SquarerootQuestion,
  answer: string,
  timeMs: number,
  currentStreak: number,
): { correct: boolean; points: number; streak: number } {
  let correct = false;
  let basePoints = 0;

  switch (data.roundType) {
    case "speed": {
      if (parseInt(answer, 10) === question.numericAnswer) {
        correct = true;
        const seconds = timeMs / 1000;
        basePoints = Math.max(10, 100 - Math.floor(seconds) * 2);
      }
      break;
    }
    case "numberline": {
      const playerValue = parseFloat(answer);
      if (!isNaN(playerValue)) {
        const distance = Math.abs(playerValue - question.numericAnswer);
        basePoints = Math.max(0, Math.round(100 - distance * 100));
        correct = basePoints > 0;
      }
      break;
    }
    case "classify": {
      if (answer === question.classifyAnswer) {
        correct = true;
        basePoints = 100;
      }
      break;
    }
  }

  const streak = correct ? currentStreak + 1 : 0;
  // Combo bonus: +10% per streak step, capped at 50%
  const comboMultiplier = correct ? 1 + Math.min(0.5, (streak - 1) * 0.1) : 1;
  const points = Math.round(basePoints * comboMultiplier);

  return { correct, points, streak };
}

function calculatePlayerScore(data: SquarerootGameData, playerId: string): number {
  const playerAnswers = data.answers[playerId] ?? {};
  let total = 0;

  // Sum points stored per-answer (includes combo bonus already)
  for (const q of data.questions) {
    const ans = playerAnswers[q.id];
    if (ans?.points != null) {
      total += ans.points;
    }
  }

  return total;
}

const squarerootHandler: GameHandler = {
  onStart(state: LobbyState): SquarerootGameData {
    return buildRoundData(state, 1);
  },

  onRoundStart(state: LobbyState): SquarerootGameData {
    const prev = state.gameData as SquarerootGameData;
    return buildRoundData(state, (prev?.currentRound ?? 0) + 1);
  },

  onMessage(
    state: LobbyState,
    payload: unknown,
    sender: Party.Connection,
  ): SquarerootGameData | undefined {
    const data = state.gameData as SquarerootGameData;
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

    // Calculate current streak from previous answers
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
    const data = state.gameData as SquarerootGameData;
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
    const data = state.gameData as SquarerootGameData;
    return (data?.currentRound ?? 1) >= (data?.totalRounds ?? 3);
  },

  getDurationMs(state: LobbyState): number {
    const data = state.gameData as SquarerootGameData;
    return (data?.duration ?? defaultSquarerootSettings.duration) * 1000;
  },
};

export default squarerootHandler;
