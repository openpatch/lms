// Smoke test for the game server: opens a lobby over HTTP, plays a round over
// WebSockets, and checks that a restart brings the lobby back.
//
//   pnpm check:server
//
// Runs against a throwaway database in a temp directory, on a free port.

import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
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
  // node --import tsx, not the tsx CLI: the tsx binary runs the script in a
  // *child* process, so SIGTERM would reach the wrapper while the server kept
  // the port. This way the process we spawn is the server.
  const child = spawn(process.execPath, ["--import", "tsx", "server/index.ts"], {
    env: { ...process.env, PORT: String(PORT), DB_PATH, BASE_URL: BASE },
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

/** Resolves once nothing holds the port, so the next start cannot race it. */
function waitForPortFree(port: number, timeoutMs = 10_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const probe = createServer();
      probe.once("error", () => {
        if (Date.now() > deadline) reject(new Error(`port ${port} never freed`));
        else setTimeout(attempt, 100);
      });
      probe.once("listening", () => probe.close(() => resolve()));
      probe.listen(port);
    };
    attempt();
  });
}

async function stop(child: ChildProcess): Promise<void> {
  child.kill("SIGTERM");
  await new Promise((resolve) => child.once("exit", resolve));
  await waitForPortFree(PORT);
}

/** A client that records everything the server says to it. */
class TestClient {
  readonly received: ServerMessage[] = [];
  private readonly socket: WebSocket;

  constructor(code: string, id: string, cookie?: string, role: "host" | "player" = "player") {
    this.socket = new WebSocket(
      `ws://localhost:${PORT}/parties/main/${code}?_pk=${id}&role=${role}`,
      { headers: cookie ? { cookie } : {} },
    );
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

async function createLobby(cookie: string | undefined, gameId = "example") {
  const response = await fetch(`${BASE}/parties/lobbies`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE, ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({ gameId }),
  });
  return { status: response.status, body: (await response.json()) as { code?: string; error?: string } };
}

/** Make a teacher account the way an administrator would, then sign in as them. */
async function addTeacher(email: string, name: string, password: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("npx", ["tsx", "scripts/teacher.ts", "add", email, name, password], {
      env: { ...process.env, DB_PATH },
      stdio: ["ignore", "ignore", "inherit"],
    });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error("teacher add failed"))));
  });
}

async function signIn(email: string, password: string): Promise<string | undefined> {
  const response = await fetch(`${BASE}/parties/auth/sign-in/email`, {
    method: "POST",
    // better-auth rejects state-changing requests without an Origin; browsers
    // always send one.
    headers: { "content-type": "application/json", origin: BASE },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    if (process.env.DEBUG_AUTH) console.log("  sign-in failed:", response.status, await response.text());
    return undefined;
  }
  const setCookie = response.headers.getSetCookie?.() ?? [];
  return setCookie.map((c) => c.split(";")[0]).join("; ") || undefined;
}

async function main() {
  await addTeacher("teacher@example.org", "Test Teacher", "smoke-test-password");
  await addTeacher("other@example.org", "Other Teacher", "smoke-test-password");
  let server = await start();

  try {
    console.log("authentication");
    const health = await fetch(`${BASE}/parties/health`);
    check("health endpoint responds", health.ok);

    const anonymous = await createLobby(undefined);
    check("a stranger cannot open a lobby", anonymous.status === 401, `got ${anonymous.status}`);

    const wrongPassword = await signIn("teacher@example.org", "not-the-password");
    check("a wrong password gets no session", wrongPassword === undefined);

    const cookie = await signIn("teacher@example.org", "smoke-test-password");
    check("a teacher can sign in", !!cookie);

    console.log("lobby creation");
    const created = await createLobby(cookie);
    const code = created.body.code ?? "";
    check("server allocates a code", created.status === 201 && /^[A-Z0-9]{6}$/.test(code), code);

    const second = await createLobby(cookie);
    check(
      "a teacher cannot open a second lobby",
      second.status === 409 && second.body.code === code,
      `got ${second.status}`,
    );

    const otherCookie = await signIn("other@example.org", "smoke-test-password");
    const other = await createLobby(otherCookie);
    check("a different teacher can", other.status === 201 && other.body.code !== code);

    const unknown = await createLobby(cookie, "nope");
    check("unknown games are rejected", unknown.status === 400);

    console.log("playing a round");
    const host = new TestClient(code, randomUUID(), cookie, "host");
    await host.ready();
    host.send({ type: "host", gameId: "example" });
    check(
      "the session identifies the host, whatever id the client sends",
      await host.waitUntil("lobby-state", (m) =>
        m.state.players.some((p) => p.isHost && p.connected && p.name === "Test Teacher"),
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

    // A teacher opening the play page for their own lobby carries the same
    // cookie; they must become an ordinary player, not the host.
    const teacherAsPlayer = new TestClient(code, randomUUID(), cookie, "player");
    await teacherAsPlayer.ready();
    teacherAsPlayer.send({ type: "join", name: "Teacher Testing" });
    check(
      "the teacher's own play page joins as a player",
      await host.waitUntil(
        "lobby-state",
        (m) =>
          m.state.players.some((p) => p.isHost && p.name === "Test Teacher") &&
          m.state.players.some((p) => !p.isHost && p.name === "Teacher Testing"),
      ),
    );

    host.send({ type: "start" });
    // A host explains for as long as they like before starting the countdown,
    // and the round is built the moment the rules go up. Long enough here that
    // a round which started counting behind them would show it.
    await new Promise((r) => setTimeout(r, 1_500));
    host.send({ type: "begin-countdown" });
    check("countdown is broadcast", !!(await player.waitFor("countdown")));
    const started = (await player.waitFor("game-start")) as
      | { serverNow: number; gameData: { startTime: number; duration: number } }
      | undefined;
    check("round starts after the countdown", !!started);
    const alreadyGone = started ? started.serverNow - started.gameData.startTime : -1;
    check(
      "the round's clock starts when play does, not when the rules went up",
      alreadyGone >= 0 && alreadyGone < 500,
      `${alreadyGone}ms of the round was already spent`,
    );

    const stray = new TestClient(code, randomUUID());
    await stray.ready();
    stray.send({ type: "join", name: "Late" });
    const strayError = await stray.waitFor("error");
    check("nobody joins mid-game", strayError?.message === "Game already in progress");

    // Cutting a round short is the host's alone, and it has to work while the
    // clock still has seconds left on it — that is the whole point of it.
    const meddler = new TestClient(code, randomUUID());
    await meddler.ready();
    meddler.send({ type: "end-round" });
    const meddlerError = await meddler.waitFor("error");
    check(
      "only the host can end the round early",
      meddlerError?.message === "Only host can end the round",
      meddlerError?.message,
    );

    // Alice scores something so that the round has a winner to crown; the
    // teacher's play page sits on its hands.
    for (let tap = 0; tap < 5; tap++) {
      player.send({ type: "game-action", payload: { action: "click" } });
    }
    await new Promise((r) => setTimeout(r, 300));

    host.send({ type: "end-round" });
    // The example game has one stage, so its round ending is the game ending.
    const cutShort = await player.waitFor("finished");
    check("the host can end a round before the clock does", !!cutShort);
    check(
      "and everyone is still scored for it",
      !!cutShort && cutShort.results.length > 0,
      `${cutShort?.results.length ?? 0} result(s)`,
    );

    const alice = cutShort?.roundResults.find((r) => r.playerName === "Alice");
    const idle = cutShort?.roundResults.find((r) => r.playerName === "Teacher Testing");
    check("whoever took the round is crowned for it", alice?.wonRound === true && alice?.crowns === 1);
    check("and whoever did not is not", idle?.wonRound !== true && (idle?.crowns ?? 0) === 0);

    const impostor = new TestClient(code, randomUUID());
    await impostor.ready();
    impostor.send({ type: "restart" });
    const impostorError = await impostor.waitFor("error");
    check("only the host can restart", impostorError?.message === "Only host can restart");

    console.log("closing a lobby");
    host.send({ type: "close-lobby" });
    const hostClosed = await host.waitFor("lobby-closed");
    check("the host is told the lobby closed", hostClosed?.reason === "host-closed");
    const playerClosed = await player.waitFor("lobby-closed");
    check("so is everyone still in it", playerClosed?.reason === "host-closed");

    const reopened = await createLobby(cookie);
    check(
      "closing frees the teacher to open another",
      reopened.status === 201 && reopened.body.code !== code,
      `got ${reopened.status}`,
    );

    console.log("unknown lobbies");
    const ghost = new TestClient("ZZZZZZ", randomUUID());
    await ghost.ready();
    const ghostClosed = await ghost.waitFor("lobby-closed");
    check("unknown code is told to stop reconnecting", ghostClosed?.reason === "not-found");

    for (const client of [host, player, stray, impostor, ghost, pretender, teacherAsPlayer])
      client.close();

    console.log("restart recovery");
    await stop(server);
    server = await start();
    const afterRestart = await createLobby(cookie);
    check(
      "the lobby survives a restart",
      afterRestart.status === 409 && afterRestart.body.code === reopened.body.code,
      `got ${afterRestart.status}`,
    );

    const rejoin = new TestClient(reopened.body.code!, randomUUID(), cookie, "host");
    await rejoin.ready();
    const restored = await rejoin.waitFor("lobby-state");
    check(
      "the teacher is still its host after the restart",
      restored?.state.players.some((p) => p.isHost && p.name === "Test Teacher") === true,
    );
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
