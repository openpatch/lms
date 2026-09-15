// One lobby, in memory, with its own timers.
//
// On a single box there is no need to ask anyone else who owns a room: the Map
// below is the authority. State is mirrored to SQLite on every change so a
// restart does not drop a class, and every room carries a hard expiry so a
// forgotten browser tab cannot keep one alive forever.

import type { WebSocket } from "ws";
import type {
  GameResult,
  LobbyClosedReason,
  LobbyPhase,
  LobbyState,
  ServerMessage,
} from "../shared/types";
import { demoPlayerId } from "../shared/types";
import { getGameSpec } from "../shared/games";
import { defaultGameSettings } from "../shared/framework";
import { gameHandlers } from "./games";
import * as store from "./store";

/** How long before the countdown hands over to the round itself. */
const COUNTDOWN_MS = 3_000;

/**
 * How often a live round is sent out.
 *
 * A live stage is one the class acts in continuously, so its actions arrive
 * far faster than a question game's do and every one of them would otherwise
 * cost a SQLite write and one serialised copy of the round per socket. Instead
 * the round goes out on this tick, which puts a ceiling on the cost no matter
 * how hard thirty people are tapping: the tick is also where a stage that
 * drives itself gets to move.
 *
 * Twice a second keeps a scoreboard feeling live; a stage that has to get its
 * own state onto thirty screens together asks for something quicker with
 * `tickMs`, and one carrying a long timeline asks for something slower.
 */
const LIVE_TICK_MS = 500;

/** A live round is mirrored to SQLite this often, rather than on every tick. */
const LIVE_SAVE_MS = 2_000;

/** A lobby is closed this long after it was created, whoever is still in it. */
export const LOBBY_TTL_MS = 2 * 60 * 60 * 1000;

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export class Room {
  state: LobbyState;
  /** The teacher account that opened this lobby. */
  readonly teacherId: string;
  readonly expiresAt: number;

  private readonly sockets = new Map<string, WebSocket>();
  private readonly onClosed: (room: Room) => void;
  private closed = false;
  private countdownTimer: NodeJS.Timeout | undefined;
  private roundTimer: NodeJS.Timeout | undefined;
  private liveTimer: NodeJS.Timeout | undefined;
  /** Set when a live round changed and the next tick should send it. */
  private liveDirty = false;
  private liveSavedAt = 0;
  private ttlTimer: NodeJS.Timeout;

  constructor(
    state: LobbyState,
    teacherId: string,
    expiresAt: number,
    onClosed: (room: Room) => void,
  ) {
    this.state = state;
    this.teacherId = teacherId;
    this.expiresAt = expiresAt;
    this.onClosed = onClosed;
    this.ttlTimer = setTimeout(() => this.close("expired"), Math.max(0, expiresAt - Date.now()));
  }

  // --- transport -----------------------------------------------------------

  send(connectionId: string, msg: ServerMessage): void {
    const socket = this.sockets.get(connectionId);
    if (socket && socket.readyState === socket.OPEN) socket.send(JSON.stringify(msg));
  }

  broadcast(msg: ServerMessage, exclude: string[] = []): void {
    const json = JSON.stringify(msg);
    for (const [id, socket] of this.sockets) {
      if (!exclude.includes(id) && socket.readyState === socket.OPEN) socket.send(json);
    }
  }

  broadcastLobbyState(): void {
    this.broadcast({ type: "lobby-state", state: this.state, serverNow: Date.now() });
  }

  attach(connectionId: string, socket: WebSocket): void {
    this.sockets.set(connectionId, socket);
  }

  detach(connectionId: string): void {
    this.sockets.delete(connectionId);
  }

  save(): void {
    // Closing hangs up every socket, and those close handlers still want to
    // record that a player went away. Writing then would put the lobby back.
    if (this.closed) return;
    store.saveLobby(this.teacherId, this.state, this.expiresAt);
  }

  // --- phases --------------------------------------------------------------

  private setPhase(phase: LobbyPhase): void {
    this.state.phase = phase;
  }

  /**
   * Show the stage rules and build the round behind them. The countdown does not
   * start until the host says so.
   */
  enterExplanation(isFirstRound: boolean): void {
    if (isFirstRound && this.state.phase !== "lobby") return;
    if (!isFirstRound && this.state.phase !== "round-finished") return;

    const handler = gameHandlers[this.state.gameId];
    if (isFirstRound) {
      this.state.gameData = handler?.onStart ? handler.onStart(this.state) : {};
    } else {
      this.state.gameData = handler?.onRoundStart
        ? handler.onRoundStart(this.state)
        : handler?.onStart
          ? handler.onStart(this.state)
          : {};
    }

    this.setPhase("explanation");
    this.state.countdownEndsAt = null;
    this.save();
    this.broadcastLobbyState();
  }

  beginCountdown(): void {
    if (this.state.phase !== "explanation") return;

    this.setPhase("countdown");
    const countdownEndsAt = Date.now() + COUNTDOWN_MS;
    this.state.countdownEndsAt = countdownEndsAt;
    this.save();

    this.broadcast({
      type: "countdown",
      gameData: this.state.gameData,
      countdownEndsAt,
      serverNow: Date.now(),
    });
    this.broadcastLobbyState();

    clearTimeout(this.countdownTimer);
    this.countdownTimer = setTimeout(() => this.startPlaying(), COUNTDOWN_MS);
  }

  startPlaying(): void {
    if (this.state.phase !== "countdown") return;

    this.setPhase("playing");
    this.state.countdownEndsAt = null;

    const handler = gameHandlers[this.state.gameId];
    // The round has been sitting built behind the rules screen for as long as
    // the host wanted; its clock starts now, before anyone is told to play.
    const begun = handler?.onRoundBegin?.(this.state, Date.now());
    if (begun) this.state.gameData = begun;
    this.save();

    this.broadcast({ type: "game-start", gameData: this.state.gameData, serverNow: Date.now() });
    this.broadcastLobbyState();

    clearTimeout(this.roundTimer);
    if (handler?.getDurationMs) {
      this.roundTimer = setTimeout(() => this.endRound(), handler.getDurationMs(this.state));
    }
    if (handler?.isLive?.(this.state)) this.startLiveTicking();
  }

  /**
   * A live round changed because a player did something. Nothing goes out now;
   * the next tick sends it. Callers that are not a live round must not use
   * this — they save and broadcast as they always did.
   */
  markLive(): void {
    this.liveDirty = true;
  }

  private startLiveTicking(): void {
    clearInterval(this.liveTimer);
    this.liveDirty = true;
    this.liveSavedAt = 0;
    const asked = gameHandlers[this.state.gameId]?.liveTickMs?.(this.state) ?? 0;
    // Clamped: a stage asking for a beat every few milliseconds would be
    // asking the room to spend the lesson serialising rounds.
    const every = asked > 0 ? Math.min(2_000, Math.max(100, asked)) : LIVE_TICK_MS;
    this.liveTimer = setInterval(() => this.liveTick(), every);
  }

  private stopLiveTicking(): void {
    clearInterval(this.liveTimer);
    this.liveTimer = undefined;
    this.liveDirty = false;
  }

  /**
   * One beat of a live round: let the stage move itself on, then send the
   * round out if anything has changed since the last beat.
   */
  private liveTick(): void {
    if (this.state.phase !== "playing") {
      this.stopLiveTicking();
      return;
    }

    const handler = gameHandlers[this.state.gameId];
    const moved = handler?.onTick?.(this.state, Date.now());
    if (moved) {
      this.state.gameData = moved;
      this.liveDirty = true;
    }

    if (this.liveDirty) {
      this.liveDirty = false;
      this.broadcast({ type: "game-state", gameData: this.state.gameData });
      // Mirrored far less often than it is sent: what a restart has to put
      // back is the round, not the last quarter of a second of it.
      const now = Date.now();
      if (now - this.liveSavedAt >= LIVE_SAVE_MS) {
        this.liveSavedAt = now;
        this.save();
      }
    }

    this.endRound();
  }

  /**
   * End the round if the game says it is over — either every answer is in, or the
   * round timer ran out. Returns whether the round actually ended.
   *
   * With `force`, the game is not consulted: the host has decided the round is
   * over, which is a thing a lesson needs — a class that has all finished, a
   * bell about to go, a station that turned out to be too hard. Whatever has
   * been answered counts, and the rest counts for what it would have counted
   * for had the clock run out on it.
   */
  endRound(force = false): boolean {
    if (this.state.phase !== "playing") return false;

    const handler = gameHandlers[this.state.gameId];
    const results = force
      ? handler?.roundResults?.(this.state)
      : handler?.checkRoundFinished?.(this.state);
    if (!results) return false;

    clearTimeout(this.roundTimer);
    this.roundTimer = undefined;
    this.stopLiveTicking();

    // Add round scores to each player's cumulative total, and crown whoever
    // took the round. A tie is won by everybody in it — picking one of them by
    // some tiebreak nobody can see would be worse than sharing it — and a
    // round where nobody scored is a round nobody won.
    const best = Math.max(0, ...results.map((r) => r.score));
    for (const result of results) {
      const player = this.state.players.find((p) => p.id === result.playerId);
      if (!player) continue;
      player.score += result.score;
      result.wonRound = best > 0 && result.score === best;
      if (result.wonRound) player.crowns = (player.crowns ?? 0) + 1;
      result.crowns = player.crowns ?? 0;
    }

    // Keep the round for review, now rather than when the game ends: a lesson
    // that stops at the bell and a lobby closed on the way out of the room are
    // both normal, and either would otherwise take the round with it. A demo
    // is not a lesson and leaves nothing behind.
    if (!this.state.demo) {
      const round = this.state.gameData as
        | { stageId?: string; currentRound?: number; answers?: Record<string, never> }
        | null;
      if (round?.stageId) {
        store.saveRound(
          this.state.code,
          this.teacherId,
          this.state.gameId,
          round as Parameters<typeof store.saveRound>[3],
          this.state.players.filter((p) => !p.isHost),
        );
      }
    }

    const isLastRound = handler?.isLastRound?.(this.state) ?? true;

    if (isLastRound) {
      this.setPhase("finished");
      this.save();
      const finalResults = this.finalResults();
      // A rehearsal is not a lesson: what the teacher scored playing against
      // themselves has no business in the record of what classes scored.
      if (!this.state.demo) {
        store.saveResults(this.state.code, this.teacherId, this.state.gameId, finalResults);
      }
      this.broadcast({ type: "finished", results: finalResults, roundResults: results });
    } else {
      this.setPhase("round-finished");
      this.save();
      this.broadcast({ type: "round-finished", results, isLastRound: false });
    }
    this.broadcastLobbyState();

    return true;
  }

  private finalResults(): GameResult[] {
    return this.state.players
      .filter((p) => !p.isHost)
      .map((p) => ({
        playerId: p.id,
        playerName: p.name,
        score: p.score,
        crowns: p.crowns ?? 0,
      }))
      .sort((a, b) => b.score - a.score);
  }

  restart(): void {
    clearTimeout(this.countdownTimer);
    clearTimeout(this.roundTimer);
    this.countdownTimer = undefined;
    this.roundTimer = undefined;
    this.stopLiveTicking();

    this.setPhase("lobby");
    this.state.gameData = null;
    this.state.countdownEndsAt = null;
    this.state.players.forEach((p) => {
      p.score = 0;
      p.crowns = 0;
    });
    this.save();
    this.broadcastLobbyState();
  }

  /** Tell everyone the lobby is gone, hang up, and forget it. */
  close(reason: LobbyClosedReason): void {
    if (this.closed) return;
    this.closed = true;

    clearTimeout(this.ttlTimer);
    clearTimeout(this.countdownTimer);
    clearTimeout(this.roundTimer);
    this.stopLiveTicking();

    this.broadcast({ type: "lobby-closed", reason });
    for (const socket of this.sockets.values()) socket.close(1000, reason);
    this.sockets.clear();

    store.deleteLobby(this.state.code);
    this.onClosed(this);
  }
}

// --- the registry ----------------------------------------------------------

const rooms = new Map<string, Room>();
const byTeacher = new Map<string, string>();

function forget(room: Room): void {
  rooms.delete(room.state.code);
  if (byTeacher.get(room.teacherId) === room.state.code) byTeacher.delete(room.teacherId);
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code);
}

/** The lobby this teacher already has open, if any. */
export function roomOfTeacher(teacherId: string): Room | undefined {
  const code = byTeacher.get(teacherId);
  return code ? rooms.get(code) : undefined;
}

export type CreateResult = { ok: true; room: Room } | { ok: false; reason: "active-lobby"; code: string };

/**
 * Open a lobby for a teacher. One at a time: a teacher who already has one gets
 * told which, rather than silently losing the class that is still in it.
 */
export function createRoom(
  teacherId: string,
  gameId: string,
  hostName: string,
  demo = false,
): CreateResult {
  const existing = roomOfTeacher(teacherId);
  if (existing) {
    // One lobby per teacher, still — but a demo has nobody in it, so it gives
    // way to whatever is asked for next. A lobby with a class in it gives way
    // to nothing, a demo included: losing the class to a stray click on
    // "try it out" would be the worst thing this button could do.
    if (existing.state.demo) existing.close("host-closed");
    else return { ok: false, reason: "active-lobby", code: existing.state.code };
  }

  let code = generateCode();
  while (rooms.has(code)) code = generateCode();

  const spec = getGameSpec(gameId);
  const state: LobbyState = {
    code,
    gameId,
    hostId: teacherId,
    // The host seat belongs to the teacher who opened the lobby; they fill it
    // when they connect. A demo gets a second seat with it, the one the
    // teacher actually plays from — the host is never scored.
    players: [
      { id: teacherId, name: hostName, isHost: true, score: 0, crowns: 0, connected: false },
      ...(demo
        ? [
            {
              id: demoPlayerId(teacherId),
              name: hostName,
              isHost: false,
              score: 0,
              crowns: 0,
              // Nothing ever connects to this seat: the host's own socket
              // speaks for it, and it is present for as long as the lobby is.
              connected: true,
            },
          ]
        : []),
    ],
    phase: "lobby",
    gameData: null,
    settings: spec ? defaultGameSettings(spec) : null,
    countdownEndsAt: null,
    ...(demo ? { demo: true } : {}),
  };

  const room = new Room(state, teacherId, Date.now() + LOBBY_TTL_MS, forget);
  rooms.set(code, room);
  byTeacher.set(teacherId, code);
  room.save();
  return { ok: true, room };
}

/** Bring back the lobbies that were live when the process stopped. */
export function rehydrate(): number {
  for (const stored of store.loadLiveLobbies()) {
    // Nobody is connected yet, so everyone starts as disconnected.
    stored.state.players.forEach((p) => (p.connected = false));
    const room = new Room(stored.state, stored.teacherId, stored.expiresAt, forget);
    rooms.set(stored.code, room);
    byTeacher.set(stored.teacherId, stored.code);
  }
  return rooms.size;
}

/** Flush every live lobby to disk — called on shutdown. */
export function flushAll(): void {
  for (const room of rooms.values()) room.save();
}
