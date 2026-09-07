// Server-side runner that turns a set of stage handlers into a GameHandler.
//
// Everything that is the same for every mini game lives here: resolving the
// active stages, running one round per stage, recording answers with their
// timing, streaks and combo bonus, ending a round, and reporting results.
// A stage handler only has to generate questions and grade one answer.

import type * as Party from "partykit/server";
import type { GameHandler } from "./types";
import type { LobbyState, GameResult, Player } from "../shared/types";
import type {
  GameSpec,
  StageQuestion,
  StageRoundData,
  StageSettings,
  StageSpec,
} from "../shared/framework";
import {
  answeredCount,
  comboMultiplier,
  currentStreak,
  playerRoundScore,
  resolveGameSettings,
} from "../shared/framework";

/** What a stage handler knows about the round it is building or grading. */
export interface StageContext {
  /** Resolved settings of this stage — every key of the stage's schema is set. */
  settings: StageSettings;
  round: number;
  totalRounds: number;
  /** Players in the lobby, excluding the host. */
  players: Player[];
}

/** How a stage grades one answer. */
export interface AnswerVerdict {
  correct: boolean;
  /** Base points before the combo bonus is applied. Usually 0-100. */
  points: number;
}

export interface AnswerTiming {
  /** Milliseconds since this player's previous answer (or the round start). */
  questionMs: number;
  /** Milliseconds since the round started. */
  roundMs: number;
}

export interface StageHandler<Q extends StageQuestion = StageQuestion> {
  /** Must match the id of the stage in the game spec. */
  id: string;
  /** Build the questions for one round of this stage. */
  createQuestions(ctx: StageContext): Q[];
  /** Grade one answer. Only called for questions this stage created. */
  evaluate(question: Q, answer: string, timing: AnswerTiming, ctx: StageContext): AnswerVerdict;
  /** Extra per-round state for stages that are not question based. */
  createExtra?(ctx: StageContext): Record<string, unknown>;
  /** Round length in seconds. Defaults to the stage's `duration` setting. */
  getDurationSeconds?(ctx: StageContext): number;
  /** Handle an action other than "answer". Mutate `data.extra` and return true
   *  when the state changed and should be broadcast. */
  onAction?(
    data: StageRoundData<Q>,
    payload: Record<string, unknown>,
    playerId: string,
    ctx: StageContext,
  ): boolean;
  /** Score of one player in a finished round. Defaults to the sum of answer points. */
  scorePlayer?(data: StageRoundData<Q>, playerId: string): number;
}

/** Longest answer payload the server accepts (drawings are the big ones). */
const MAX_ANSWER_LENGTH = 100_000;

function nonHostPlayers(state: LobbyState): Player[] {
  return state.players.filter((p) => !p.isHost);
}

/**
 * Builds the GameHandler for a mini game from its spec and one handler per stage.
 * Throws when spec and handlers disagree, so a mistake surfaces at startup
 * instead of when a class is waiting in the lobby.
 */
// Stage handlers are stored with their question type erased: the runner only
// hands a question back to the handler that created it.
type AnyStageHandler = StageHandler<StageQuestion>;

export function createStageGame(spec: GameSpec, handlers: AnyStageHandler[]): GameHandler {
  if (spec.stages.length === 0) {
    throw new Error(`Game "${spec.id}" needs at least one stage`);
  }

  const byId = new Map<string, AnyStageHandler>();
  for (const handler of handlers) {
    if (byId.has(handler.id)) {
      throw new Error(`Game "${spec.id}" has two handlers for stage "${handler.id}"`);
    }
    byId.set(handler.id, handler);
  }
  for (const stage of spec.stages) {
    if (!byId.has(stage.id)) {
      throw new Error(`Game "${spec.id}" is missing a handler for stage "${stage.id}"`);
    }
  }
  for (const handler of byId.values()) {
    if (!spec.stages.some((s) => s.id === handler.id)) {
      throw new Error(`Game "${spec.id}" has a handler for unknown stage "${handler.id}"`);
    }
  }

  function activeStages(state: LobbyState): StageSpec[] {
    const settings = resolveGameSettings(spec, state.settings);
    return settings.stages
      .map((id) => spec.stages.find((s) => s.id === id))
      .filter((s): s is StageSpec => s != null);
  }

  function contextFor(state: LobbyState, stage: StageSpec, round: number): StageContext {
    const settings = resolveGameSettings(spec, state.settings);
    return {
      settings: settings.stageSettings[stage.id],
      round,
      totalRounds: settings.stages.length,
      players: nonHostPlayers(state),
    };
  }

  function buildRound(state: LobbyState, round: number): StageRoundData {
    const stages = activeStages(state);
    const stage = stages[round - 1] ?? stages[0];
    const handler = byId.get(stage.id)!;
    const ctx = contextFor(state, stage, round);
    const duration =
      handler.getDurationSeconds?.(ctx) ?? Number(ctx.settings.duration ?? 60);

    return {
      stageId: stage.id,
      currentRound: round,
      totalRounds: stages.length,
      questions: handler.createQuestions(ctx),
      answers: {},
      settings: ctx.settings,
      extra: handler.createExtra?.(ctx) ?? {},
      startTime: Date.now(),
      duration,
      finished: false,
    };
  }

  function handlerFor(data: StageRoundData | null): AnyStageHandler | undefined {
    return data ? byId.get(data.stageId) : undefined;
  }

  function roundResults(state: LobbyState): GameResult[] {
    const data = state.gameData as StageRoundData;
    const handler = handlerFor(data);
    return nonHostPlayers(state)
      .map((p) => ({
        playerId: p.id,
        playerName: p.name,
        score: handler?.scorePlayer?.(data, p.id) ?? playerRoundScore(data, p.id),
      }))
      .sort((a, b) => b.score - a.score);
  }

  return {
    onStart(state: LobbyState) {
      return buildRound(state, 1);
    },

    onRoundStart(state: LobbyState) {
      const previous = state.gameData as StageRoundData | null;
      return buildRound(state, (previous?.currentRound ?? 0) + 1);
    },

    onMessage(state: LobbyState, payload: unknown, sender: Party.Connection) {
      const data = state.gameData as StageRoundData | null;
      const handler = handlerFor(data);
      const stage = spec.stages.find((s) => s.id === data?.stageId);
      if (!data || !handler || !stage || data.finished) return undefined;
      // The host watches; only players answer.
      if (sender.id === state.hostId) return undefined;
      if (typeof payload !== "object" || payload == null) return undefined;

      const ctx = contextFor(state, stage, data.currentRound);
      const action = payload as Record<string, unknown>;
      if (action.action !== "answer") {
        const changed = handler.onAction?.(data, action, sender.id, ctx);
        return changed ? { ...data } : undefined;
      }

      const questionId = Number(action.questionId);
      const answer = action.answer;
      if (!Number.isInteger(questionId) || typeof answer !== "string") return undefined;
      if (answer.length > MAX_ANSWER_LENGTH) return undefined;

      const question = data.questions.find((q) => q.id === questionId);
      if (!question) return undefined;
      // One shot per question.
      if (data.answers[sender.id]?.[questionId]) return undefined;

      const streakBefore = currentStreak(data, sender.id);
      const answers = (data.answers[sender.id] ??= {});
      const answeredIds = Object.keys(answers)
        .map(Number)
        .sort((a, b) => a - b);
      const previous = answeredIds.length > 0 ? answers[answeredIds[answeredIds.length - 1]] : undefined;

      const roundMs = Date.now() - data.startTime;
      const timing: AnswerTiming = { roundMs, questionMs: roundMs - (previous?.timeMs ?? 0) };

      const verdict = handler.evaluate(question, answer, timing, ctx);
      const streak = verdict.correct ? streakBefore + 1 : 0;
      const points = verdict.correct
        ? Math.round(Math.max(0, verdict.points) * comboMultiplier(streak))
        : Math.round(Math.max(0, verdict.points));

      answers[questionId] = {
        answer,
        timeMs: roundMs,
        correct: verdict.correct,
        points,
        streak,
      };

      return { ...data };
    },

    checkRoundFinished(state: LobbyState) {
      const data = state.gameData as StageRoundData | null;
      if (!data) return undefined;

      const players = nonHostPlayers(state);
      if (players.length === 0) return undefined;

      const timeExpired = (Date.now() - data.startTime) / 1000 >= data.duration;
      // A stage without questions (a tap round, say) only ends on the clock.
      const allAnswered =
        data.questions.length > 0 &&
        players.every((p) => answeredCount(data, p.id) >= data.questions.length);

      return allAnswered || timeExpired ? roundResults(state) : undefined;
    },

    isLastRound(state: LobbyState) {
      const data = state.gameData as StageRoundData | null;
      return (data?.currentRound ?? 1) >= (data?.totalRounds ?? 1);
    },

    getDurationMs(state: LobbyState) {
      const data = state.gameData as StageRoundData | null;
      return (data?.duration ?? 60) * 1000;
    },
  };
}
