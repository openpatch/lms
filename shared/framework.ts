// Mini-game framework: the shared contract between client and server.
//
// A mini game is a collection of stages (at least one). Every stage carries its own
// rules text and its own settings, and the host picks which stages a session plays.
// One active stage is played per round, in the order the stages are declared.
//
// See documentation.md for a walkthrough of how to add a mini game.

import type { GameMeta, PlayerAnswer } from "./types";

// ---------------------------------------------------------------------------
// Settings schema
// ---------------------------------------------------------------------------

/** A single value a host can configure for a stage. */
export type SettingsValue = number | boolean | string | string[];

/** Declarative description of one setting. The same schema renders the host UI
 *  and validates what the server accepts, so a client cannot smuggle in junk. */
export type SettingsField =
  | {
      type: "select";
      key: string;
      labelKey: string;
      options: number[];
      default: number;
    }
  | {
      type: "range";
      key: string;
      labelKey: string;
      min: number;
      max: number;
      step: number;
      default: number;
      /** Suffix shown next to the value in the host UI, e.g. "s". */
      unit?: string;
    }
  | {
      type: "toggle";
      key: string;
      labelKey: string;
      default: boolean;
    }
  | {
      type: "choice";
      key: string;
      labelKey: string;
      /** Each option carries the stored value and the i18n key of its label. */
      options: { value: string; labelKey: string }[];
      default: string;
    }
  | {
      type: "multi";
      key: string;
      labelKey: string;
      /** Each option carries the stored value and the i18n key of its label. */
      options: { value: string; labelKey: string }[];
      /** Never empty — an empty selection falls back to it. */
      default: string[];
    };

export type StageSettings = Record<string, SettingsValue>;

// ---------------------------------------------------------------------------
// Stage and game specs
// ---------------------------------------------------------------------------

/** Everything about a stage that both client and server need to know. */
export interface StageSpec {
  id: string;
  /** i18n key for the stage name, e.g. "games.squareroot.stages.speed.name". */
  nameKey: string;
  /** i18n key for the one-line summary shown in the host's stage picker. */
  summaryKey: string;
  /** i18n key for the rules shown before the round. Interpolated with the
   *  stage's resolved settings, so "{{questionsPerRound}}" and "{{duration}}"
   *  can be used in the text. */
  rulesKey: string;
  settings: SettingsField[];
}

/** Everything about a mini game that both client and server need to know. */
export interface GameSpec extends GameMeta {
  /** At least one stage. The declaration order is the play order. */
  stages: StageSpec[];
}

// ---------------------------------------------------------------------------
// Lobby settings
// ---------------------------------------------------------------------------

/** What the host configures in the lobby and what the server stores. */
export interface GameSettings {
  /** Ids of the active stages, always in spec order and never empty. */
  stages: string[];
  /** Per-stage values, keyed by stage id. */
  stageSettings: Record<string, StageSettings>;
}

export function defaultStageSettings(stage: StageSpec): StageSettings {
  const values: StageSettings = {};
  for (const field of stage.settings) {
    values[field.key] = Array.isArray(field.default) ? [...field.default] : field.default;
  }
  return values;
}

/** Coerces one value to something the field allows, falling back to its default. */
function resolveField(field: SettingsField, raw: unknown): SettingsValue {
  switch (field.type) {
    case "toggle":
      return typeof raw === "boolean" ? raw : field.default;
    case "choice":
      return field.options.some((option) => option.value === raw) ? (raw as string) : field.default;
    case "multi": {
      const requested = Array.isArray(raw) ? raw : [];
      // Spec order, no unknown values, no duplicates — and never empty, because
      // a stage with nothing selected has nothing to ask.
      const picked = field.options
        .map((option) => option.value)
        .filter((value) => requested.includes(value));
      return picked.length > 0 ? picked : [...field.default];
    }
    case "select": {
      const value = Number(raw);
      return field.options.includes(value) ? value : field.default;
    }
    case "range": {
      const value = Number(raw);
      if (!isFinite(value)) return field.default;
      const clamped = Math.min(field.max, Math.max(field.min, value));
      const steps = Math.round((clamped - field.min) / field.step);
      return Math.min(field.max, field.min + steps * field.step);
    }
  }
}

/** Fills in defaults and drops anything the schema does not describe. */
export function resolveStageSettings(stage: StageSpec, raw: unknown): StageSettings {
  const input = (raw ?? {}) as Record<string, unknown>;
  const values: StageSettings = {};
  for (const field of stage.settings) {
    values[field.key] = resolveField(field, input[field.key]);
  }
  return values;
}

/** Keeps only known stage ids, in spec order. Falls back to every stage when the
 *  selection is empty, so a session always has at least one round to play. */
export function resolveActiveStages(spec: GameSpec, raw: unknown): string[] {
  const requested = Array.isArray(raw) ? raw : [];
  const active = spec.stages.filter((s) => requested.includes(s.id)).map((s) => s.id);
  return active.length > 0 ? active : spec.stages.map((s) => s.id);
}

/** Normalizes whatever the client sent into settings the server can trust. */
export function resolveGameSettings(spec: GameSpec, raw: unknown): GameSettings {
  const input = (raw ?? {}) as Partial<GameSettings>;
  const stageSettings: Record<string, StageSettings> = {};
  for (const stage of spec.stages) {
    stageSettings[stage.id] = resolveStageSettings(stage, input.stageSettings?.[stage.id]);
  }
  return { stages: resolveActiveStages(spec, input.stages), stageSettings };
}

export function defaultGameSettings(spec: GameSpec): GameSettings {
  return resolveGameSettings(spec, undefined);
}

export function getStageSpec(spec: GameSpec, stageId: string): StageSpec | undefined {
  return spec.stages.find((s) => s.id === stageId);
}

// ---------------------------------------------------------------------------
// Round data — what the server broadcasts while a stage is being played
// ---------------------------------------------------------------------------

/** A question is whatever the stage needs; `id` is all the framework requires. */
export interface StageQuestion {
  id: number;
}

export interface StageRoundData<Q extends StageQuestion = StageQuestion> {
  stageId: string;
  /** 1-based index into the active stages. */
  currentRound: number;
  totalRounds: number;
  questions: Q[];
  /** playerId -> questionId -> answer */
  answers: Record<string, Record<number, PlayerAnswer>>;
  /** Resolved settings of this stage, so the client can render them. */
  settings: StageSettings;
  /** Free-form per-round state for stages that are not question based. */
  extra: Record<string, unknown>;
  startTime: number;
  /** Round length in seconds. */
  duration: number;
  finished: boolean;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/** Combo bonus: +10% per streak step, capped at +50%. */
export const MAX_COMBO_BONUS = 0.5;
export const COMBO_BONUS_PER_STEP = 0.1;

export function comboMultiplier(streak: number): number {
  if (streak < 2) return 1;
  return 1 + Math.min(MAX_COMBO_BONUS, (streak - 1) * COMBO_BONUS_PER_STEP);
}

/** How many points a "get close" answer earns: 100 at no error at all, nothing
 *  from `zeroAt` upwards. `relativeError` is measured in the same unit as
 *  `zeroAt` — usually a fraction of the range the player was aiming in. */
export function closenessPoints(relativeError: number, zeroAt = 1): number {
  if (!isFinite(relativeError) || relativeError < 0 || zeroAt <= 0) return 0;
  return Math.max(0, Math.min(100, 100 * (1 - relativeError / zeroAt)));
}

/** Points for an answer that was correct after `seconds`, never below `floor`. */
export function speedPoints(seconds: number, perSecond = 3, floor = 30, max = 100): number {
  return Math.max(floor, max - Math.floor(Math.max(0, seconds)) * perSecond);
}

// ---------------------------------------------------------------------------
// Live stages
// ---------------------------------------------------------------------------

/**
 * What a live stage keeps for one player while the round runs.
 *
 * A live stage is one the player acts *in* rather than answers: targets to hit,
 * a light to react to. There is no question to be on, so there is nothing to
 * put in `answers` — thirty players resolving thirty targets each would put
 * nine hundred answer objects into a round that is rebroadcast on a tick.
 * Instead every player has one of these in `extra.tally`, which is thirty small
 * objects however long the round runs.
 */
export interface LiveTally {
  /** Points so far, combo bonus included. */
  points: number;
  /** Events that went well, and events that did not. */
  hits: number;
  misses: number;
  /** Consecutive hits right now, and the best run of the round. */
  streak: number;
  bestStreak: number;
  /** Total reaction time over the hits, so the round can report an average. */
  totalMs: number;
}

/**
 * How many events a live round has put on the table so far, kept in `extra`
 * beside the tallies.
 *
 * It is what a live round is averaged over, and it has to come from the round
 * rather than from the player: counting only the events a player got round to
 * would score somebody who hit three targets and then put the tablet down a
 * perfect hundred.
 */
export function liveOffered(data: StageRoundData): number {
  const extra = data.extra as { offered?: number };
  return Math.max(0, Number(extra.offered ?? 0));
}

export function emptyTally(): LiveTally {
  return { points: 0, hits: 0, misses: 0, streak: 0, bestStreak: 0, totalMs: 0 };
}

/** Where a live stage keeps its per-player state inside a round. */
export function liveTallies(data: StageRoundData): Record<string, LiveTally> {
  const extra = data.extra as { tally?: Record<string, LiveTally> };
  return extra.tally ?? {};
}

export function liveTally(data: StageRoundData, playerId: string): LiveTally {
  return liveTallies(data)[playerId] ?? emptyTally();
}

/**
 * Score of one player in a live round — averaged over what the round offered,
 * so a minute of tapping is worth what a round of ten questions is worth.
 */
export function liveScore(data: StageRoundData, playerId: string): number {
  const offered = liveOffered(data);
  if (offered === 0) return 0;
  return Math.round((liveTally(data, playerId).points / offered) * (ROUND_POINTS / 100));
}

/** Mean reaction over the hits, or null when there were none. */
export function liveAverageMs(tally: LiveTally): number | null {
  return tally.hits > 0 ? Math.round(tally.totalMs / tally.hits) : null;
}

/**
 * What one round of any stage is worth, before the combo bonus.
 *
 * Every stage is worth the same, because the host picks which ones a session
 * plays and they are not the same size: fifteen quick true-or-false questions
 * against three untangling puzzles used to be a five-to-one advantage before
 * anybody had answered anything, and the station with the most questions
 * decided the game.
 */
export const ROUND_POINTS = 100;

/**
 * Score of one player in the current round: their average over the questions
 * the round put in front of them.
 *
 * The average, not the sum — that is what makes every stage worth `ROUND_POINTS`
 * however many questions it asks. A question nobody reached counts as a zero,
 * which is the same thing it cost before.
 *
 * The number each answer carries stays what it always was, nought to a hundred
 * for that one question, so the round review still reads as "how did I do on
 * this one" and the round total reads as "how did I do", like a percentage.
 */
export function playerRoundScore(data: StageRoundData, playerId: string): number {
  if (data.questions.length === 0) return 0;
  const answers = data.answers[playerId] ?? {};
  let total = 0;
  for (const question of data.questions) {
    const answer = answers[question.id];
    if (answer?.points != null) total += answer.points;
  }
  return Math.round((total / data.questions.length) * (ROUND_POINTS / 100));
}

/** How many questions a player has answered in the current round. */
export function answeredCount(data: StageRoundData, playerId: string): number {
  return Object.keys(data.answers[playerId] ?? {}).length;
}

/** The player's streak, taken from their most recently answered question. */
export function currentStreak(data: StageRoundData, playerId: string): number {
  const answers = data.answers[playerId] ?? {};
  const ids = Object.keys(answers)
    .map(Number)
    .sort((a, b) => a - b);
  if (ids.length === 0) return 0;
  return answers[ids[ids.length - 1]]?.streak ?? 0;
}
