import type * as Party from "partykit/server";
import type { LobbyState, ClientMessage, ServerMessage } from "../shared/types";
import { getGameSpec, validateGameSpecs } from "../shared/games";
import { defaultGameSettings, resolveGameSettings } from "../shared/framework";
import { gameHandlers } from "./games";

// Fail loudly at startup rather than when a class is already in the lobby.
validateGameSpecs();
for (const id of Object.keys(gameHandlers)) {
  if (!getGameSpec(id)) throw new Error(`Game handler "${id}" has no game spec`);
}

/** Longest player name the server stores. */
const MAX_NAME_LENGTH = 20;

function send(connection: Party.Connection, msg: ServerMessage) {
  connection.send(JSON.stringify(msg));
}

function broadcast(room: Party.Room, msg: ServerMessage, exclude?: string[]) {
  room.broadcast(JSON.stringify(msg), exclude);
}

async function saveLobbyState(room: Party.Room, state: LobbyState) {
  await room.storage.put("lobbyState", state);
}

function broadcastLobbyState(room: Party.Room, state: LobbyState) {
  broadcast(room, { type: "lobby-state", state });
}

async function endRound(room: Party.Room): Promise<boolean> {
  const state = await room.storage.get<LobbyState>("lobbyState");
  if (!state || state.phase !== "playing") return false;

  const handler = gameHandlers[state.gameId];
  const results = handler?.checkRoundFinished?.(state);
  if (!results) return false;

  // Add round scores to each player's cumulative total
  for (const result of results) {
    const player = state.players.find((p) => p.id === result.playerId);
    if (player) player.score += result.score;
  }

  const isLastRound = handler?.isLastRound?.(state) ?? true;

  if (isLastRound) {
    state.phase = "finished";
    await saveLobbyState(room, state);
    const finalResults = state.players
      .filter((p) => !p.isHost)
      .map((p) => ({ playerId: p.id, playerName: p.name, score: p.score }))
      .sort((a, b) => b.score - a.score);
    broadcast(room, { type: "finished", results: finalResults });
    broadcastLobbyState(room, state);
  } else {
    state.phase = "round-finished";
    await saveLobbyState(room, state);
    broadcast(room, { type: "round-finished", results, isLastRound: false });
    broadcastLobbyState(room, state);
  }

  return true;
}

const COUNTDOWN_MS = 3000;

async function enterExplanation(room: Party.Room, isFirstRound: boolean): Promise<void> {
  const state = await room.storage.get<LobbyState>("lobbyState");
  if (!state) return;
  if (isFirstRound && state.phase !== "lobby") return;
  if (!isFirstRound && state.phase !== "round-finished") return;

  const handler = gameHandlers[state.gameId];
  if (isFirstRound) {
    state.gameData = handler?.onStart ? handler.onStart(state) : {};
  } else {
    state.gameData = handler?.onRoundStart
      ? handler.onRoundStart(state)
      : handler?.onStart
        ? handler.onStart(state)
        : {};
  }

  state.phase = "explanation";
  state.countdownEndsAt = null;
  await saveLobbyState(room, state);
  broadcastLobbyState(room, state);
}

async function beginCountdown(room: Party.Room): Promise<void> {
  const state = await room.storage.get<LobbyState>("lobbyState");
  if (!state || state.phase !== "explanation") return;

  state.phase = "countdown";
  const countdownEndsAt = Date.now() + COUNTDOWN_MS;
  state.countdownEndsAt = countdownEndsAt;
  await saveLobbyState(room, state);

  broadcast(room, { type: "countdown", gameData: state.gameData, countdownEndsAt });
  broadcastLobbyState(room, state);

  await room.storage.setAlarm(countdownEndsAt);
}

async function startPlaying(room: Party.Room): Promise<void> {
  const state = await room.storage.get<LobbyState>("lobbyState");
  if (!state || state.phase !== "countdown") return;

  state.phase = "playing";
  state.countdownEndsAt = null;
  await saveLobbyState(room, state);

  broadcast(room, { type: "game-start", gameData: state.gameData });
  broadcastLobbyState(room, state);

  const handler = gameHandlers[state.gameId];
  if (handler?.getDurationMs) {
    await room.storage.setAlarm(Date.now() + handler.getDurationMs(state));
  }
}

export default class LmsServer implements Party.Server {
  constructor(readonly room: Party.Room) {}

  async onStart() {
    // Initialize lobby state if it doesn't exist
    const state = await this.room.storage.get<LobbyState>("lobbyState");
    if (!state) {
      // Room created but no host yet — wait for host message
    }
  }

  async onConnect(connection: Party.Connection, ctx: Party.ConnectionContext) {
    const state = await this.room.storage.get<LobbyState>("lobbyState");

    if (!state) {
      // No lobby yet — this connection needs to send a "host" message
      send(connection, {
        type: "lobby-state",
        state: {
          code: this.room.id,
          gameId: "",
          hostId: "",
          players: [],
          phase: "lobby",
          gameData: null,
          settings: null,
          countdownEndsAt: null,
        },
      });
      return;
    }

    // Check if this connection is a reconnecting player or host
    const existingPlayer = state.players.find((p) => p.id === connection.id);
    if (existingPlayer) {
      existingPlayer.connected = true;
      await saveLobbyState(this.room, state);
      broadcastLobbyState(this.room, state);

      // If reconnecting during countdown, re-send countdown message
      if (state.phase === "countdown" && state.countdownEndsAt) {
        send(connection, {
          type: "countdown",
          gameData: state.gameData,
          countdownEndsAt: state.countdownEndsAt,
        });
      }

      // If reconnecting during playing, re-send game-start
      if (state.phase === "playing") {
        send(connection, { type: "game-start", gameData: state.gameData });
      }
    } else {
      // New connection — send current state, they must send "join" or "host" message
      send(connection, { type: "lobby-state", state });
    }
  }

  async onMessage(message: string | ArrayBuffer, sender: Party.Connection) {
    if (typeof message !== "string") return;

    let msg: ClientMessage;
    try {
      msg = JSON.parse(message) as ClientMessage;
    } catch {
      send(sender, { type: "error", message: "Invalid message format" });
      return;
    }

    let state = await this.room.storage.get<LobbyState>("lobbyState");

    switch (msg.type) {
      case "host": {
        const spec = getGameSpec(msg.gameId);
        if (!spec || !gameHandlers[msg.gameId]) {
          send(sender, { type: "error", message: "Unknown game" });
          return;
        }

        // First connection creates the lobby, or host reconnects
        if (state && state.hostId && state.hostId !== sender.id) {
          send(sender, { type: "error", message: "Lobby already exists" });
          return;
        }

        if (state && state.hostId === sender.id) {
          // Host reconnecting — just mark as connected
          const host = state.players.find((p) => p.id === sender.id);
          if (host) host.connected = true;
          await saveLobbyState(this.room, state);
          broadcastLobbyState(this.room, state);
          break;
        }

        state = {
          code: this.room.id,
          gameId: msg.gameId,
          hostId: sender.id,
          players: [
            {
              id: sender.id,
              name: "Host",
              isHost: true,
              score: 0,
              connected: true,
            },
          ],
          phase: "lobby",
          gameData: null,
          settings: defaultGameSettings(spec),
          countdownEndsAt: null,
        };
        await saveLobbyState(this.room, state);
        broadcastLobbyState(this.room, state);
        break;
      }

      case "join": {
        if (!state) {
          send(sender, { type: "error", message: "Lobby does not exist" });
          return;
        }

        const name = typeof msg.name === "string" ? msg.name.trim().slice(0, MAX_NAME_LENGTH) : "";
        if (!name) {
          send(sender, { type: "error", message: "A name is required" });
          return;
        }

        // Check if already in the player list (reconnect)
        const existing = state.players.find((p) => p.id === sender.id);
        if (existing) {
          existing.name = name;
          existing.connected = true;
          await saveLobbyState(this.room, state);
          broadcastLobbyState(this.room, state);

          // If reconnecting during countdown, re-send countdown message
          if (state.phase === "countdown" && state.countdownEndsAt) {
            send(sender, {
              type: "countdown",
              gameData: state.gameData,
              countdownEndsAt: state.countdownEndsAt,
            });
          }

          // If reconnecting during playing, re-send game-start
          if (state.phase === "playing") {
            send(sender, { type: "game-start", gameData: state.gameData });
          }
          break;
        }

        // New player — can only join during lobby
        if (state.phase !== "lobby") {
          send(sender, { type: "error", message: "Game already in progress" });
          return;
        }

        const spec = getGameSpec(state.gameId);
        const playerCount = state.players.filter((p) => !p.isHost).length;
        if (spec && playerCount >= spec.maxPlayers) {
          send(sender, { type: "error", message: "Lobby is full" });
          return;
        }

        state.players.push({
          id: sender.id,
          name,
          isHost: false,
          score: 0,
          connected: true,
        });

        await saveLobbyState(this.room, state);
        broadcastLobbyState(this.room, state);
        break;
      }

      case "start": {
        if (!state) return;
        if (sender.id !== state.hostId) {
          send(sender, { type: "error", message: "Only host can start" });
          return;
        }
        const spec = getGameSpec(state.gameId);
        const playerCount = state.players.filter((p) => !p.isHost).length;
        if (spec && playerCount < spec.minPlayers) {
          send(sender, { type: "error", message: "Not enough players" });
          return;
        }
        await enterExplanation(this.room, true);
        break;
      }

      case "begin-countdown": {
        if (!state) return;
        if (sender.id !== state.hostId) {
          send(sender, { type: "error", message: "Only host can start the countdown" });
          return;
        }
        await beginCountdown(this.room);
        break;
      }

      case "restart": {
        if (!state) return;
        if (sender.id !== state.hostId) {
          send(sender, { type: "error", message: "Only host can restart" });
          return;
        }

        state.phase = "lobby";
        state.gameData = null;
        state.players.forEach((p) => (p.score = 0));
        await saveLobbyState(this.room, state);
        broadcastLobbyState(this.room, state);

        // Cancel any pending alarm
        await this.room.storage.deleteAlarm();
        break;
      }

      case "kick": {
        if (!state) return;
        if (sender.id !== state.hostId) {
          send(sender, { type: "error", message: "Only host can kick" });
          return;
        }

        state.players = state.players.filter((p) => p.id !== msg.playerId);
        await saveLobbyState(this.room, state);
        broadcastLobbyState(this.room, state);
        break;
      }

      case "game-action": {
        if (!state || state.phase !== "playing") return;

        const handler = gameHandlers[state.gameId];
        if (handler?.onMessage) {
          const result = handler.onMessage(state, msg.payload, sender);
          if (result) {
            state.gameData = result;
            await saveLobbyState(this.room, state);
            broadcast(this.room, { type: "game-state", gameData: state.gameData });
          }
        }

        // Check if the round should end after this action
        await endRound(this.room);
        break;
      }

      case "update-settings": {
        if (!state) return;
        if (sender.id !== state.hostId) {
          send(sender, { type: "error", message: "Only host can change settings" });
          return;
        }
        if (state.phase !== "lobby") return;

        const spec = getGameSpec(state.gameId);
        if (!spec) return;
        // Never trust the client: clamp to what the stage schemas allow.
        state.settings = resolveGameSettings(spec, msg.settings);
        await saveLobbyState(this.room, state);
        broadcastLobbyState(this.room, state);
        break;
      }

      case "next-round": {
        if (!state) return;
        if (sender.id !== state.hostId) {
          send(sender, { type: "error", message: "Only host can start next round" });
          return;
        }
        if (state.phase !== "round-finished") return;

        await enterExplanation(this.room, false);
        break;
      }
    }
  }

  async onClose(connection: Party.Connection) {
    const state = await this.room.storage.get<LobbyState>("lobbyState");
    if (!state) return;

    const player = state.players.find((p) => p.id === connection.id);
    if (player) {
      player.connected = false;
      await saveLobbyState(this.room, state);
      broadcastLobbyState(this.room, state);
    }
  }

  async onError(connection: Party.Connection, error: Error) {
    console.error(`Connection ${connection.id} error:`, error);
  }

  async onAlarm() {
    const state = await this.room.storage.get<LobbyState>("lobbyState");
    if (!state) return;

    if (state.phase === "countdown") {
      // Countdown finished — start the actual round
      await startPlaying(this.room);
    } else if (state.phase === "playing") {
      // Round timer expired — end the round
      await endRound(this.room);
    }
  }
}
