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

export interface StoredLobby {
  code: string;
  teacherId: string;
  expiresAt: number;
  state: LobbyState;
}

export function saveLobby(teacherId: string, state: LobbyState, expiresAt: number): void {
  upsertLobby.run(state.code, teacherId, state.gameId, expiresAt, JSON.stringify(state));
}

export function deleteLobby(code: string): void {
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
  const now = Date.now();
  for (const result of results) {
    insertResult.run(code, teacherId, gameId, result.playerName, result.score, now);
  }
}

export function close(): void {
  db.close();
}
