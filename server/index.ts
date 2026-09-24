// The game server: one Node process, one box.
//
// Caddy serves the built client and proxies everything under /parties to here.
// HTTP is used once, to open a lobby; the rest of a session is one WebSocket
// per player, spoken in the ClientMessage/ServerMessage vocabulary.

import { createServer, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocketServer, type WebSocket } from "ws";
import { toNodeHandler } from "better-auth/node";
import type { ClientMessage, ServerMessage } from "../shared/types";
import { demoPlayerId } from "../shared/types";
import { getGameSpec, validateGameSpecs } from "../shared/games";
import { resolveGameSettings } from "../shared/framework";
import { gameHandlers } from "./games";
import { createRoom, getRoom, rehydrate, flushAll, type Room } from "./rooms";
import { AUTH_BASE_PATH, auth, teacherFrom } from "./auth";
import * as store from "./store";

// Fail loudly at startup rather than when a class is already in the lobby.
validateGameSpecs();
for (const id of Object.keys(gameHandlers)) {
  if (!getGameSpec(id)) throw new Error(`Game handler "${id}" has no game spec`);
}

const PORT = Number(process.env.PORT ?? 3000);

/** Longest player name the server stores. */
const MAX_NAME_LENGTH = 20;

function send(socket: WebSocket, msg: ServerMessage) {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(msg));
}

// --- HTTP ------------------------------------------------------------------

const authHandler = toNodeHandler(auth);

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

const httpServer = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");

  // Sign in, sign out, session — better-auth owns everything under here.
  if (url.pathname.startsWith(AUTH_BASE_PATH)) {
    void authHandler(req, res);
    return;
  }

  if (req.method === "GET" && url.pathname === "/parties/health") {
    json(res, 200, { ok: true });
    return;
  }

  // Open a lobby. The server picks the code so two teachers can never collide.
  if (req.method === "POST" && url.pathname === "/parties/lobbies") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 4096) req.destroy();
    });
    req.on("end", () => {
      void (async () => {
        let payload: { gameId?: string; demo?: boolean; replace?: boolean };
        try {
          payload = JSON.parse(body || "{}") as typeof payload;
        } catch {
          json(res, 400, { error: "Invalid body" });
          return;
        }

        // The one gate: no teacher account, no lobby.
        const teacher = await teacherFrom(req.headers);
        if (!teacher) {
          json(res, 401, { error: "Not authorised" });
          return;
        }

        if (!payload.gameId || !getGameSpec(payload.gameId) || !gameHandlers[payload.gameId]) {
          json(res, 400, { error: "Unknown game" });
          return;
        }

        const result = createRoom(
          teacher.id,
          payload.gameId,
          teacher.name,
          payload.demo === true,
          // Closing a lobby the class is in is the teacher's call and nobody
          // else's, so it takes an explicit yes on a refusal that has already
          // said what would be lost.
          payload.replace === true,
        );
        if (!result.ok) {
          json(res, 409, {
            error: "active-lobby",
            code: result.code,
            gameId: result.gameId,
            players: result.players,
          });
          return;
        }

        json(res, 201, { code: result.room.state.code });
      })();
    });
    return;
  }

  // What the class answered, after the lobby is gone. Both of these are the
  // teacher's own and nobody else's: the queries are scoped by teacher id, so
  // a guessed code from another teacher's lesson reads as empty rather than as
  // somebody else's class.
  if (req.method === "GET" && url.pathname === "/parties/sessions") {
    void (async () => {
      const teacher = await teacherFrom(req.headers);
      if (!teacher) {
        json(res, 401, { error: "Not authorised" });
        return;
      }
      json(res, 200, { sessions: store.listSessions(teacher.id) });
    })();
    return;
  }

  // A session id is the lobby's code, and for each "nochmal" played in that
  // same lobby the code with a run number after it.
  const session = url.pathname.match(/^\/parties\/sessions\/([A-Z0-9]{4,12}(?:-\d{1,3})?)$/);
  if (req.method === "GET" && session) {
    void (async () => {
      const teacher = await teacherFrom(req.headers);
      if (!teacher) {
        json(res, 401, { error: "Not authorised" });
        return;
      }
      const found = store.loadSession(teacher.id, session[1]);
      if (found.rounds.length === 0) {
        json(res, 404, { error: "No such session" });
        return;
      }
      const code = found.rounds[0].code;
      json(res, 200, {
        sessionId: session[1],
        // The room it was played in, which several sessions can share
        code,
        run: store.runOf(session[1], code),
        ...found,
      });
    })();
    return;
  }

  // Throw one away. Scoped by teacher like the reads are, so this can only
  // ever delete the caller's own lesson; a code belonging to somebody else
  // deletes nothing and reads as 404 rather than as success.
  if (req.method === "DELETE" && session) {
    void (async () => {
      const teacher = await teacherFrom(req.headers);
      if (!teacher) {
        json(res, 401, { error: "Not authorised" });
        return;
      }
      const gone = store.deleteSession(teacher.id, session[1]);
      if (gone === 0) {
        json(res, 404, { error: "No such session" });
        return;
      }
      json(res, 200, { deleted: gone });
    })();
    return;
  }

  res.writeHead(404);
  res.end();
});

// --- WebSocket -------------------------------------------------------------

const wss = new WebSocketServer({ noServer: true });

httpServer.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  // partysocket dials /parties/:party/:room — keep that shape so the client
  // keeps its reconnect-with-backoff for free.
  const match = url.pathname.match(/^\/parties\/main\/([A-Z0-9]{4,12})$/);
  if (!match) {
    socket.destroy();
    return;
  }

  const code = match[1];
  const room = getRoom(code);
  if (!room) {
    wss.handleUpgrade(req, socket, head, (ws) => {
      send(ws, { type: "lobby-closed", reason: "not-found" });
      ws.close(1000, "not-found");
    });
    return;
  }

  void (async () => {
    // The host seat goes to a signed-in teacher on the host screen, whatever id
    // the client sends. Everyone else — including that same teacher opening the
    // play page for their own lobby — keeps their own per-lobby id.
    const teacher =
      url.searchParams.get("role") === "host" ? await teacherFrom(req.headers) : null;
    const connectionId =
      teacher && teacher.id === room.state.hostId
        ? teacher.id
        : (url.searchParams.get("_pk") ?? randomUUID());

    wss.handleUpgrade(req, socket, head, (ws) => onConnect(room, connectionId, ws));
  })();
});

function onConnect(room: Room, connectionId: string, ws: WebSocket) {
  room.attach(connectionId, ws);

  const existing = room.state.players.find((p) => p.id === connectionId);
  if (existing) {
    existing.connected = true;
    room.save();
    room.broadcastLobbyState();
    resendPhase(room, connectionId);
  } else {
    // New connection — it must still send "host" or "join".
    send(ws, { type: "lobby-state", state: room.stateFor(connectionId), serverNow: Date.now() });
  }

  ws.on("message", (data) => onMessage(room, connectionId, ws, data.toString()));
  ws.on("close", () => {
    room.detach(connectionId);
    const player = room.state.players.find((p) => p.id === connectionId);
    if (player) {
      player.connected = false;
      room.save();
      room.broadcastLobbyState();
    }
  });
  ws.on("error", (error) => console.error(`Connection ${connectionId} error:`, error));
}

/** Catch a reconnecting client up on a round that is already under way. */
function resendPhase(room: Room, connectionId: string) {
  if (room.state.phase === "countdown" && room.state.countdownEndsAt) {
    room.send(connectionId, {
      type: "countdown",
      gameData: room.gameDataFor(connectionId),
      countdownEndsAt: room.state.countdownEndsAt,
      serverNow: Date.now(),
    });
  }
  if (room.state.phase === "playing") {
    room.send(connectionId, {
      type: "game-start",
      gameData: room.gameDataFor(connectionId),
      serverNow: Date.now(),
    });
  }
}

function onMessage(room: Room, connectionId: string, ws: WebSocket, raw: string) {
  let msg: ClientMessage;
  try {
    msg = JSON.parse(raw) as ClientMessage;
  } catch {
    send(ws, { type: "error", message: "Invalid message format" });
    return;
  }

  const state = room.state;
  const isHost = connectionId === state.hostId;

  switch (msg.type) {
    case "host": {
      // The lobby already exists — this only claims or re-claims the host seat.
      if (!isHost) {
        send(ws, { type: "error", message: "Not the host of this lobby" });
        return;
      }
      const host = state.players.find((p) => p.id === connectionId);
      if (host) host.connected = true;
      room.save();
      room.broadcastLobbyState();
      break;
    }

    case "join": {
      if (isHost) {
        send(ws, { type: "error", message: "The host cannot join as a player" });
        return;
      }
      // A demo is the teacher rehearsing alone. Its code is never shown, but a
      // guessed one must not put a student into a lobby with no lesson in it.
      if (state.demo) {
        send(ws, { type: "error", message: "This lobby is a rehearsal, not a game" });
        return;
      }
      const name = typeof msg.name === "string" ? msg.name.trim().slice(0, MAX_NAME_LENGTH) : "";
      if (!name) {
        send(ws, { type: "error", message: "A name is required" });
        return;
      }

      const existing = state.players.find((p) => p.id === connectionId);
      if (existing) {
        existing.name = name;
        existing.connected = true;
        room.save();
        room.broadcastLobbyState();
        resendPhase(room, connectionId);
        break;
      }

      // New player — can only join during lobby
      if (state.phase !== "lobby") {
        send(ws, { type: "error", message: "Game already in progress" });
        return;
      }

      const spec = getGameSpec(state.gameId);
      const playerCount = state.players.filter((p) => !p.isHost).length;
      if (spec && playerCount >= spec.maxPlayers) {
        send(ws, { type: "error", message: "Lobby is full" });
        return;
      }

      state.players.push({
        id: connectionId,
        name,
        isHost: false,
        crowns: 0,
        score: 0,
        connected: true,
      });
      room.save();
      room.broadcastLobbyState();
      break;
    }

    case "start": {
      if (!isHost) {
        send(ws, { type: "error", message: "Only host can start" });
        return;
      }
      const spec = getGameSpec(state.gameId);
      const playerCount = state.players.filter((p) => !p.isHost).length;
      if (spec && playerCount < spec.minPlayers) {
        send(ws, { type: "error", message: "Not enough players" });
        return;
      }
      room.enterExplanation(true);
      break;
    }

    case "begin-countdown": {
      if (!isHost) {
        send(ws, { type: "error", message: "Only host can start the countdown" });
        return;
      }
      room.beginCountdown();
      break;
    }

    case "next-round": {
      if (!isHost) {
        send(ws, { type: "error", message: "Only host can start next round" });
        return;
      }
      room.enterExplanation(false);
      break;
    }

    case "end-round": {
      if (!isHost) {
        send(ws, { type: "error", message: "Only host can end the round" });
        return;
      }
      room.endRound(true);
      break;
    }

    case "restart": {
      if (!isHost) {
        send(ws, { type: "error", message: "Only host can restart" });
        return;
      }
      room.restart();
      break;
    }

    case "close-lobby": {
      if (!isHost) {
        send(ws, { type: "error", message: "Only host can close the lobby" });
        return;
      }
      room.close("host-closed");
      break;
    }

    case "kick": {
      if (!isHost) {
        send(ws, { type: "error", message: "Only host can kick" });
        return;
      }
      state.players = state.players.filter((p) => p.id !== msg.playerId);
      room.save();
      room.broadcastLobbyState();
      break;
    }

    case "update-settings": {
      if (!isHost) {
        send(ws, { type: "error", message: "Only host can change settings" });
        return;
      }
      if (state.phase !== "lobby") return;

      const spec = getGameSpec(state.gameId);
      if (!spec) return;
      // Never trust the client: clamp to what the stage schemas allow.
      state.settings = resolveGameSettings(spec, msg.settings);
      room.save();
      room.broadcastLobbyState();
      break;
    }

    case "game-action": {
      if (state.phase !== "playing") return;

      // In a demo the teacher is the class: the host screen is the one playing,
      // and the framework scores players, not hosts — so what the host does
      // there is recorded against the seat the lobby opened with.
      const actorId = state.demo && isHost ? demoPlayerId(state.hostId) : connectionId;

      const handler = gameHandlers[state.gameId];
      if (handler?.onMessage) {
        const result = handler.onMessage(state, msg.payload, { id: actorId });
        if (result) {
          state.gameData = result;
          if (handler.isLive?.(state)) {
            // A live round goes out on the room's tick instead. Saving and
            // broadcasting here would mean doing both several times a second
            // per player, which is the one thing a tap stage must not cost.
            room.markLive();
          } else {
            room.save();
            room.broadcastViews((gameData) => ({ type: "game-state", gameData }));
          }
        }
      }

      // Check if the round should end after this action
      room.endRound();
      break;
    }
  }
}

// --- lifecycle -------------------------------------------------------------

async function startup() {
  const restored = rehydrate();
  httpServer.listen(PORT, () => {
    console.log(
      `lms server listening on :${PORT}` + (restored ? ` (${restored} lobbies restored)` : ""),
    );
  });
}

void startup();

function shutdown() {
  flushAll();
  store.close();
  httpServer.close(() => process.exit(0));
  // Don't let a hung socket hold the restart open.
  setTimeout(() => process.exit(0), 5_000).unref();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
