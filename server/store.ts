// Durable side of the server: what has to survive a restart.
//
// Live lobbies are kept in memory (see rooms.ts) and mirrored here on every
// change, so a deploy in the middle of a lesson does not drop a class. Results
// are written once, when a game finishes.

import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { LobbyState, GameResult } from "../shared/types";

const DB_PATH = process.env.DB_PATH ?? "./data/lms.db";

mkdirSync(dirname(DB_PATH), { recursive: true });

/** The one connection. better-auth keeps its tables in the same file. */
export const db = new DatabaseSync(DB_PATH);

db.exec(`
  pragma journal_mode = WAL;

  create table if not exists lobbies (
    code       text primary key,
    teacher_id text not null unique,
    game_id    text not null,
    expires_at integer not null,
    state      text not null
  );

  create table if not exists results (
    id          integer primary key autoincrement,
    code        text not null,
    teacher_id  text not null,
    game_id     text not null,
    player_name text not null,
    score       integer not null,
    finished_at integer not null
  );

  create index if not exists results_teacher on results (teacher_id, finished_at);

  -- One row per round played, written the moment the round ends rather than
  -- when the game does: a lesson that stops at the bell, or a lobby closed on
  -- the way out of the room, must not take the round with it.
  --
  -- The data column is the round itself — questions, every player's answer,
  -- the settings it was played at — which is what lets the review screen put
  -- the question back on the wall exactly as the class saw it, drawn by the
  -- stage's own component. The players column rides along because names are
  -- not in the round.
  create table if not exists rounds (
    id           integer primary key autoincrement,
    code         text not null,
    teacher_id   text not null,
    game_id      text not null,
    stage_id     text not null,
    round_number integer not null,
    finished_at  integer not null,
    players      text not null,
    data         text not null
  );

  create index if not exists rounds_teacher on rounds (teacher_id, finished_at);
  create index if not exists rounds_code on rounds (code, round_number);
`);

const upsertLobby = db.prepare(`
  insert into lobbies (code, teacher_id, game_id, expires_at, state)
  values (?, ?, ?, ?, ?)
  on conflict (code) do update set
    game_id = excluded.game_id,
    expires_at = excluded.expires_at,
    state = excluded.state
`);

const removeLobby = db.prepare(`delete from lobbies where code = ?`);
const liveLobbies = db.prepare(`select * from lobbies where expires_at > ?`);
const expiredLobbies = db.prepare(`delete from lobbies where expires_at <= ?`);

const insertResult = db.prepare(`
  insert into results (code, teacher_id, game_id, player_name, score, finished_at)
  values (?, ?, ?, ?, ?, ?)
`);

const insertRound = db.prepare(`
  insert into rounds
    (code, teacher_id, game_id, stage_id, round_number, finished_at, players, data)
  values (?, ?, ?, ?, ?, ?, ?, ?)
`);

/**
 * The sessions this teacher has played, newest first, with enough on each row
 * to choose one: which game, when, how many rounds, how many players.
 */
const teacherSessions = db.prepare(`
  select code,
         game_id,
         max(finished_at) as finished_at,
         count(*)         as rounds
    from rounds
   where teacher_id = ?
   group by code, game_id
   order by finished_at desc
   limit ?
`);

const sessionRounds = db.prepare(`
  select id, game_id, stage_id, round_number, finished_at, players, data
    from rounds
   where teacher_id = ? and code = ?
   order by round_number
`);

const dropSessionRounds = db.prepare(`delete from rounds where teacher_id = ? and code = ?`);
const dropSessionResults = db.prepare(`delete from results where teacher_id = ? and code = ?`);

const sessionScores = db.prepare(`
  select player_name, score
    from results
   where teacher_id = ? and code = ?
   order by score desc
`);

export interface StoredLobby {
  code: string;
  teacherId: string;
  expiresAt: number;
  state: LobbyState;
}

/**
 * Set once the database is closed. Sockets hang up during shutdown and their
 * close handlers still try to record that a player left, which would run a
 * finalized statement and take the process down with it.
 */
let closed = false;

export function saveLobby(teacherId: string, state: LobbyState, expiresAt: number): void {
  if (closed) return;
  upsertLobby.run(state.code, teacherId, state.gameId, expiresAt, JSON.stringify(state));
}

export function deleteLobby(code: string): void {
  if (closed) return;
  removeLobby.run(code);
}

/** Lobbies that were still live when the process stopped, for rehydration on boot. */
export function loadLiveLobbies(): StoredLobby[] {
  const now = Date.now();
  expiredLobbies.run(now);
  return liveLobbies.all(now).map((row) => ({
    code: row.code as string,
    teacherId: row.teacher_id as string,
    expiresAt: row.expires_at as number,
    state: JSON.parse(row.state as string) as LobbyState,
  }));
}

export function saveResults(
  code: string,
  teacherId: string,
  gameId: string,
  results: GameResult[],
): void {
  if (closed) return;
  const now = Date.now();
  for (const result of results) {
    insertResult.run(code, teacherId, gameId, result.playerName, result.score, now);
  }
}

/**
 * Longest single answer kept for review.
 *
 * The server accepts answers up to MAX_ANSWER_LENGTH because a drawing can be
 * long. Thirty of those on every question of every round is a different
 * proposition when it is kept forever, and no review screen shows more than a
 * line of one anyway, so a pathological answer is cut here rather than allowed
 * to set the size of the table. A real answer is nowhere near this.
 */
const MAX_STORED_ANSWER = 2_000;

export interface StoredRound {
  id: number;
  gameId: string;
  stageId: string;
  roundNumber: number;
  finishedAt: number;
  /** The players of that round, so the review can put a name to an answer. */
  players: unknown;
  /** The round itself — a StageRoundData. */
  data: unknown;
}

export interface SessionSummary {
  code: string;
  gameId: string;
  finishedAt: number;
  rounds: number;
}

/** Keep a round for review. Called as the round ends, not as the game does. */
export function saveRound(
  code: string,
  teacherId: string,
  gameId: string,
  round: { stageId: string; currentRound: number; answers: Record<string, Record<number, { answer: string }>> },
  players: unknown,
): void {
  if (closed) return;
  // Trim in a copy: the round in memory is still being played from.
  const answers: Record<string, unknown> = {};
  for (const [playerId, given] of Object.entries(round.answers ?? {})) {
    const trimmed: Record<number, unknown> = {};
    for (const [questionId, answer] of Object.entries(given)) {
      trimmed[Number(questionId)] =
        answer.answer.length > MAX_STORED_ANSWER
          ? { ...answer, answer: answer.answer.slice(0, MAX_STORED_ANSWER) }
          : answer;
    }
    answers[playerId] = trimmed;
  }

  insertRound.run(
    code,
    teacherId,
    gameId,
    round.stageId,
    round.currentRound,
    Date.now(),
    JSON.stringify(players),
    JSON.stringify({ ...round, answers }),
  );
}

export function listSessions(teacherId: string, limit = 50): SessionSummary[] {
  return teacherSessions.all(teacherId, limit).map((row) => ({
    code: row.code as string,
    gameId: row.game_id as string,
    finishedAt: row.finished_at as number,
    rounds: row.rounds as number,
  }));
}

export function loadSession(
  teacherId: string,
  code: string,
): { rounds: StoredRound[]; scores: { playerName: string; score: number }[] } {
  const rounds = sessionRounds.all(teacherId, code).map((row) => ({
    id: row.id as number,
    gameId: row.game_id as string,
    stageId: row.stage_id as string,
    roundNumber: row.round_number as number,
    finishedAt: row.finished_at as number,
    players: JSON.parse(row.players as string) as unknown,
    data: JSON.parse(row.data as string) as unknown,
  }));
  const scores = sessionScores.all(teacherId, code).map((row) => ({
    playerName: row.player_name as string,
    score: row.score as number,
  }));
  return { rounds, scores };
}

/**
 * Forget one lesson: its rounds and its scores, both.
 *
 * Scoped by teacher the same way reading is, so this can only ever throw away
 * the caller's own. Returns how many rounds went, which is how the endpoint
 * tells "deleted" from "there was nothing there" without reading first.
 *
 * There is no undo and nothing keeps a copy. That is the point of the button —
 * a teacher who wants a class's answers gone wants them gone — so the screen
 * asks twice before it calls this.
 */
export function deleteSession(teacherId: string, code: string): number {
  if (closed) return 0;
  const gone = dropSessionRounds.run(teacherId, code);
  dropSessionResults.run(teacherId, code);
  return Number(gone.changes ?? 0);
}

export function close(): void {
  if (closed) return;
  closed = true;
  db.close();
}
