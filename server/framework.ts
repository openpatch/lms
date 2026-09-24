// Server-side runner that turns a set of stage handlers into a GameHandler.
//
// Everything that is the same for every mini game lives here: resolving the
// active stages, running one round per stage, recording answers with their
// timing, streaks and combo bonus, ending a round, and reporting results.
// A stage handler only has to generate questions and grade one answer.

import type { Conn, GameHandler } from "./types";
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
  emptyTally,
  liveScore,
  playerRoundScore,
  resolveGameSettings,
  type LiveTally,
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
  /**
   * The question as a player sees it before answering it: the same shape, with
   * whatever decides the answer blanked out — `answerIndex: -1`, an empty
   * `solution`, a list of blanks as long as the `expected` it stands for, where
   * the stage shows how many lines to write.
   *
   * Required, and not only for stages with something to hide: a stage whose
   * question gives nothing away says so by returning it unchanged, which is a
   * decision someone made rather than one nobody noticed they had to make. Once
   * the player has answered a question, and once the round is over, they get
   * it whole — that is when the stages show what the answer was.
   */
  forPlayer(question: Q): Q;
  /** Extra per-round state for stages that are not question based. */
  createExtra?(ctx: StageContext): Record<string, unknown>;
  /**
   * What a player may see of `extra`. Leave it out when `extra` is the board
   * the whole class plays on — the lights, the targets. A stage that keeps
   * something per player in it, which nobody else should see, returns only
   * that player's part.
   */
  extraForPlayer?(extra: Record<string, unknown>, playerId: string): Record<string, unknown>;
  /**
   * Whether the round is over before the clock says so. Without it a round
   * with questions ends once everyone has answered them all, and one without
   * questions ends on the clock. A stage whose players finish something else —
   * a flow they work through at their own pace — says here when they have.
   */
  isFinished?(data: StageRoundData<Q>, players: Player[]): boolean;
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

  /**
   * True for a stage the player acts in continuously — targets to hit, a light
   * to react to — rather than one they answer question by question.
   *
   * It changes two things. On the wire the room stops broadcasting on every
   * action and sends the round on a tick instead (see server/rooms.ts), so a
   * class tapping four times a second costs what a class tapping once a second
   * costs. And in here, the round no longer ends when everybody has answered:
   * there is nothing to finish answering, so it ends on the clock.
   *
   * A live stage keeps its state per player in `extra.tally` with
   * `recordLiveEvent`, not in `answers`, and scores from there.
   */
  live?: boolean;

  /**
   * Called when the round actually starts being played. The runner has already
   * put `startTime` right; this is for anything else a stage stamped with the
   * clock when the round was built, which was while the host was still talking.
   */
  onBegin?(data: StageRoundData<Q>, now: number, ctx: StageContext): void;

  /**
   * Called on the room's tick while this stage is being played, so a stage can
   * move on by itself. Mutate `data` and return true when something changed.
   */
  onTick?(data: StageRoundData<Q>, now: number, ctx: StageContext): boolean;

  /**
   * How often that tick should fire, in milliseconds. Leave it out for the
   * room's default. Set it high for a stage that only wants the scoreboard to
   * keep up — the timeline of a shooting gallery is sent again on every beat,
   * so beating four times a second means sending it four times a second.
   */
  tickMs?: number;
}

/**
 * Records one thing that happened to a player in a live round.
 *
 * The combo bonus is applied the same way the question path applies it, so a
 * run of ten targets is worth what a run of ten right answers is worth and the
 * two kinds of station stay comparable in the same game.
 */
export function recordLiveEvent(
  data: StageRoundData,
  playerId: string,
  event: { correct: boolean; points: number; ms?: number },
): LiveTally {
  const extra = data.extra as { tally?: Record<string, LiveTally> };
  const tallies = (extra.tally ??= {});
  const tally = (tallies[playerId] ??= emptyTally());

  if (event.correct) {
    tally.streak += 1;
    tally.bestStreak = Math.max(tally.bestStreak, tally.streak);
    tally.hits += 1;
    tally.points += Math.round(Math.max(0, event.points) * comboMultiplier(tally.streak));
    if (event.ms != null && isFinite(event.ms)) tally.totalMs += event.ms;
  } else {
    tally.streak = 0;
    tally.misses += 1;
    tally.points += Math.round(Math.max(0, event.points));
  }
  return tally;
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
      extra: {
        ...(handler.createExtra?.(ctx) ?? {}),
        // Everyone starts on the board rather than appearing once they score,
        // so the host's list is the class from the first second.
        ...(handler.live
          ? { tally: Object.fromEntries(ctx.players.map((p) => [p.id, emptyTally()])) }
          : {}),
      },
      // Provisional: the round is being built while the rules are still on
      // screen, and onRoundBegin stamps the real one when play starts.
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
    const fallback = (playerId: string) =>
      handler?.live ? liveScore(data, playerId) : playerRoundScore(data, playerId);
    return nonHostPlayers(state)
      .map((p) => ({
        playerId: p.id,
        playerName: p.name,
        score: handler?.scorePlayer?.(data, p.id) ?? fallback(p.id),
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

    onRoundBegin(state: LobbyState, now: number) {
      const data = state.gameData as StageRoundData | null;
      const stage = spec.stages.find((s) => s.id === data?.stageId);
      if (!data || !stage) return undefined;
      // The round was built when the rules went up. Everything timed — the
      // clock in the header, when the round runs out, how long the first
      // answer took, and the timeline of a live stage — counts from here.
      data.startTime = now;
      handlerFor(data)?.onBegin?.(data, now, contextFor(state, stage, data.currentRound));
      return { ...data };
    },

    onMessage(state: LobbyState, payload: unknown, sender: Conn) {
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

    roundResults(state: LobbyState) {
      return roundResults(state);
    },

    checkRoundFinished(state: LobbyState) {
      const data = state.gameData as StageRoundData | null;
      if (!data) return undefined;

      const players = nonHostPlayers(state);
      if (players.length === 0) return undefined;

      const timeExpired = (Date.now() - data.startTime) / 1000 >= data.duration;
      // A live stage, and a stage without questions, only ever end on the
      // clock: there is nothing there to finish answering.
      const handler = handlerFor(data);
      const allAnswered = handler?.isFinished
        ? handler.isFinished(data, players)
        : !handler?.live &&
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

    isLive(state: LobbyState) {
      return handlerFor(state.gameData as StageRoundData | null)?.live === true;
    },

    liveTickMs(state: LobbyState) {
      return handlerFor(state.gameData as StageRoundData | null)?.tickMs ?? 0;
    },

    forViewer(state: LobbyState, viewerId: string) {
      const data = state.gameData as StageRoundData | null;
      if (!data || !Array.isArray(data.questions)) return data;
      const handler = handlerFor(data);
      const own = data.answers[viewerId];
      const over =
        data.finished || state.phase === "round-finished" || state.phase === "finished";
      return {
        ...data,
        // A player's device needs their own answers — their score, their streak,
        // what they got wrong — and nobody else's.
        answers: own ? { [viewerId]: own } : {},
        extra: handler?.extraForPlayer ? handler.extraForPlayer(data.extra, viewerId) : data.extra,
        questions:
          over || !handler
            ? data.questions
            : data.questions.map((question) =>
                own?.[question.id] ? question : handler.forPlayer(question),
              ),
      };
    },

    onTick(state: LobbyState, now: number) {
      const data = state.gameData as StageRoundData | null;
      const handler = handlerFor(data);
      const stage = spec.stages.find((s) => s.id === data?.stageId);
      if (!data || !handler?.onTick || !stage || data.finished) return undefined;
      const ctx = contextFor(state, stage, data.currentRound);
      return handler.onTick(data, now, ctx) ? { ...data } : undefined;
    },
  };
}
