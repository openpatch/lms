// Smoke test for the game server: opens a lobby over HTTP, plays a round over
// WebSockets, and checks that a restart brings the lobby back.
//
//   pnpm check:server
//
// Runs against a throwaway database in a temp directory, on a free port.

import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import WebSocket from "ws";
import type { ClientMessage, ServerMessage } from "../shared/types";

const PORT = 3999;
const BASE = `http://localhost:${PORT}`;
const dir = mkdtempSync(join(tmpdir(), "lms-smoke-"));
const DB_PATH = join(dir, "lms.db");

let failures = 0;

function check(label: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

function start(): Promise<ChildProcess> {
  const child = spawn("npx", ["tsx", "server/index.ts"], {
    env: { ...process.env, PORT: String(PORT), DB_PATH },
    stdio: ["ignore", "pipe", "inherit"],
  });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("server did not start")), 20_000);
    child.stdout!.on("data", (chunk: Buffer) => {
      if (chunk.toString().includes("listening")) {
        clearTimeout(timer);
        resolve(child);
      }
    });
  });
}

async function stop(child: ChildProcess): Promise<void> {
  child.kill("SIGTERM");
  await new Promise((resolve) => child.once("exit", resolve));
}

/** A client that records everything the server says to it. */
class TestClient {
  readonly received: ServerMessage[] = [];
  private readonly socket: WebSocket;

  constructor(code: string, id: string) {
    this.socket = new WebSocket(`ws://localhost:${PORT}/parties/main/${code}?_pk=${id}`);
    this.socket.on("message", (data) => this.received.push(JSON.parse(data.toString())));
  }

  ready(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.once("open", () => resolve());
      this.socket.once("error", reject);
    });
  }

  send(msg: ClientMessage) {
    this.socket.send(JSON.stringify(msg));
  }

  /** Wait until a message of this type shows up, or give up. */
  async waitFor<T extends ServerMessage["type"]>(
    type: T,
    timeoutMs = 6_000,
  ): Promise<Extract<ServerMessage, { type: T }> | undefined> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const hit = this.received.find((m) => m.type === type);
      if (hit) return hit as Extract<ServerMessage, { type: T }>;
      await new Promise((r) => setTimeout(r, 50));
    }
    return undefined;
  }

  /** Wait until some message satisfies the predicate, or give up. */
  async waitUntil<T extends ServerMessage["type"]>(
    type: T,
    predicate: (msg: Extract<ServerMessage, { type: T }>) => boolean,
    timeoutMs = 6_000,
  ): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const hit = this.received.some(
        (m) => m.type === type && predicate(m as Extract<ServerMessage, { type: T }>),
      );
      if (hit) return true;
      await new Promise((r) => setTimeout(r, 50));
    }
    return false;
  }

  close() {
    this.socket.close();
  }
}

async function createLobby(clientId: string, gameId = "example") {
  const response = await fetch(`${BASE}/parties/lobbies`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ gameId, clientId }),
  });
  return { status: response.status, body: (await response.json()) as { code?: string; error?: string } };
}

async function main() {
  let server = await start();
  const hostId = randomUUID();

  try {
    console.log("lobby creation");
    const health = await fetch(`${BASE}/parties/health`);
    check("health endpoint responds", health.ok);

    const created = await createLobby(hostId);
    const code = created.body.code ?? "";
    check("server allocates a code", created.status === 201 && /^[A-Z0-9]{6}$/.test(code), code);

    const second = await createLobby(hostId);
    check(
      "a teacher cannot open a second lobby",
      second.status === 409 && second.body.code === code,
      `got ${second.status}`,
    );

    const other = await createLobby(randomUUID());
    check("a different teacher can", other.status === 201 && other.body.code !== code);

    const unknown = await createLobby(randomUUID(), "nope");
    check("unknown games are rejected", unknown.status === 400);

    console.log("playing a round");
    const host = new TestClient(code, hostId);
    await host.ready();
    host.send({ type: "host", gameId: "example" });
    check(
      "host is recognised as host",
      await host.waitUntil("lobby-state", (m) =>
        m.state.players.some((p) => p.isHost && p.id === hostId),
      ),
    );

    const pretender = new TestClient(code, randomUUID());
    await pretender.ready();
    pretender.send({ type: "host", gameId: "example" });
    const pretenderError = await pretender.waitFor("error");
    check(
      "nobody else can claim the host seat",
      pretenderError?.message === "Not the host of this lobby",
    );

    const player = new TestClient(code, randomUUID());
    await player.ready();
    player.send({ type: "join", name: "Alice" });
    check(
      "player appears in the lobby",
      await player.waitUntil("lobby-state", (m) => m.state.players.some((p) => p.name === "Alice")),
    );

    host.send({ type: "start" });
    await new Promise((r) => setTimeout(r, 200));
    host.send({ type: "begin-countdown" });
    check("countdown is broadcast", !!(await player.waitFor("countdown")));
    check("round starts after the countdown", !!(await player.waitFor("game-start")));

    const stray = new TestClient(code, randomUUID());
    await stray.ready();
    stray.send({ type: "join", name: "Late" });
    const strayError = await stray.waitFor("error");
    check("nobody joins mid-game", strayError?.message === "Game already in progress");

    const impostor = new TestClient(code, randomUUID());
    await impostor.ready();
    impostor.send({ type: "restart" });
    const impostorError = await impostor.waitFor("error");
    check("only the host can restart", impostorError?.message === "Only host can restart");

    console.log("unknown lobbies");
    const ghost = new TestClient("ZZZZZZ", randomUUID());
    await ghost.ready();
    const ghostClosed = await ghost.waitFor("lobby-closed");
    check("unknown code is told to stop reconnecting", ghostClosed?.reason === "not-found");

    for (const client of [host, player, stray, impostor, ghost, pretender]) client.close();

    console.log("restart recovery");
    await stop(server);
    server = await start();
    const afterRestart = await createLobby(hostId);
    check(
      "the lobby survives a restart",
      afterRestart.status === 409 && afterRestart.body.code === code,
      `got ${afterRestart.status}`,
    );

    const rejoin = new TestClient(code, hostId);
    await rejoin.ready();
    const restored = await rejoin.waitFor("lobby-state");
    check("state comes back with it", restored?.state.players.some((p) => p.name === "Alice") === true);
    rejoin.close();
  } finally {
    await stop(server);
    rmSync(dir, { recursive: true, force: true });
  }

  console.log(failures === 0 ? "\nServer looks healthy." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
