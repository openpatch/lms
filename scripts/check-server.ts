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
import { DatabaseSync } from "node:sqlite";

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

async function createLobby(cookie: string | undefined, gameId = "example", demo = false) {
  const response = await fetch(`${BASE}/parties/lobbies`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE, ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({ gameId, demo }),
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
  // The demo checks open and close lobbies of their own, so they get a teacher
  // of their own rather than fighting the one the round above leaves a lobby on.
  await addTeacher("demo@example.org", "Demo Teacher", "smoke-test-password");
  await addTeacher("review@example.org", "Review Teacher", "smoke-test-password");
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

    console.log("reviewing a lesson afterwards");
    // The round above was played and then its lobby was closed. What the class
    // answered has to have outlived both.
    const sessions = await fetch(`${BASE}/parties/sessions`, {
      headers: { cookie: cookie! },
    });
    const sessionList = (await sessions.json()) as { sessions: { code: string; rounds: number }[] };
    const played = sessionList.sessions.find((entry) => entry.code === code);
    check("the lesson is still there once the lobby is gone", !!played, `${sessionList.sessions.length} session(s)`);

    const detail = await fetch(`${BASE}/parties/sessions/${code}`, {
      headers: { cookie: cookie! },
    });
    const lesson = (await detail.json()) as {
      rounds: { stageId: string; players: { name: string }[]; data: { answers: Record<string, Record<string, { answer: string }>> } }[];
    };
    check("with the round it played", detail.status === 200 && lesson.rounds.length === 1);

    // The whole point of the screen is not the score, it is the answer. The
    // example game is questionless — its taps live in extra, not in answers —
    // so the string a student typed is checked against a game that asks
    // questions, end to end: typed into the round, read back out of the table.
    const reviewCookie = await signIn("review@example.org", "smoke-test-password");
    const lesson2 = await createLobby(reviewCookie, "java");
    const lesson2Code = lesson2.body.code!;
    const teacher2 = new TestClient(lesson2Code, randomUUID(), reviewCookie, "host");
    await teacher2.ready();
    teacher2.send({ type: "host", gameId: "java" });
    const pupil = new TestClient(lesson2Code, randomUUID());
    await pupil.ready();
    pupil.send({ type: "join", name: "Bea" });
    await pupil.waitUntil("lobby-state", (m) => m.state.players.some((p) => p.name === "Bea"));

    teacher2.send({ type: "start" });
    teacher2.send({ type: "begin-countdown" });
    const begun = (await pupil.waitFor("game-start")) as
      | { gameData: { questions: { id: number }[] } }
      | undefined;
    const firstQuestion = begun?.gameData.questions[0]?.id;
    // Deliberately wrong: a wrong answer is still an answer, and being able to
    // read back exactly what a student wrote is the thing being checked.
    const typed = "voellig daneben";
    pupil.send({
      type: "game-action",
      payload: { action: "answer", questionId: firstQuestion, answer: typed },
    });
    await new Promise((r) => setTimeout(r, 300));
    teacher2.send({ type: "end-round" });
    await teacher2.waitFor("round-finished");
    teacher2.send({ type: "close-lobby" });
    await teacher2.waitFor("lobby-closed");

    const kept = await fetch(`${BASE}/parties/sessions/${lesson2Code}`, {
      headers: { cookie: reviewCookie! },
    });
    const keptBody = (await kept.json()) as {
      rounds: {
        players: { id: string; name: string }[];
        data: { answers: Record<string, Record<string, { answer: string; correct?: boolean }>> };
      }[];
    };
    const bea = keptBody.rounds[0]?.players.find((p) => p.name === "Bea");
    const beaAnswer = bea ? keptBody.rounds[0].data.answers[bea.id]?.[String(firstQuestion)] : undefined;
    check(
      "with the answer a student typed, word for word",
      beaAnswer?.answer === typed,
      beaAnswer ? `stored "${beaAnswer.answer}"` : "nothing stored",
    );
    check("and whether it was right", beaAnswer?.correct === false);
    for (const client of [teacher2, pupil]) client.close();

    // A code is six characters and guessable. It must not be a key to somebody
    // else's classroom.
    const nosy = await fetch(`${BASE}/parties/sessions/${code}`, {
      headers: { cookie: otherCookie! },
    });
    check("another teacher cannot read it", nosy.status === 404, `got ${nosy.status}`);

    const strangerList = await fetch(`${BASE}/parties/sessions`);
    check("and a stranger cannot list any", strangerList.status === 401, `got ${strangerList.status}`);

    // Deleting is the one thing here that cannot be taken back, so the same
    // scoping is checked the other way round: the wrong teacher must not be
    // able to throw away a lesson they cannot even read.
    const wrongDelete = await fetch(`${BASE}/parties/sessions/${lesson2Code}`, {
      method: "DELETE",
      headers: { cookie: otherCookie! },
    });
    check("another teacher cannot delete it", wrongDelete.status === 404, `got ${wrongDelete.status}`);

    const stillThere = await fetch(`${BASE}/parties/sessions/${lesson2Code}`, {
      headers: { cookie: reviewCookie! },
    });
    check("and it is still there after they try", stillThere.status === 200);

    const removed = await fetch(`${BASE}/parties/sessions/${lesson2Code}`, {
      method: "DELETE",
      headers: { cookie: reviewCookie! },
    });
    check("the teacher whose lesson it is can", removed.status === 200, `got ${removed.status}`);

    const afterDelete = await fetch(`${BASE}/parties/sessions/${lesson2Code}`, {
      headers: { cookie: reviewCookie! },
    });
    check("and then it is gone", afterDelete.status === 404, `got ${afterDelete.status}`);

    // Gone from the table, not merely hidden: names and answers are the whole
    // reason somebody presses this.
    const swept = new DatabaseSync(DB_PATH, { readOnly: true });
    const leftovers = swept
      .prepare(`select
                  (select count(*) from rounds where code = ?)  as rounds,
                  (select count(*) from results where code = ?) as results`)
      .get(lesson2Code, lesson2Code) as { rounds: number; results: number };
    swept.close();
    check(
      "with nothing of it left in the database",
      leftovers.rounds === 0 && leftovers.results === 0,
      `${leftovers.rounds} round(s), ${leftovers.results} result(s)`,
    );

    const goneList = await fetch(`${BASE}/parties/sessions`, { headers: { cookie: reviewCookie! } });
    const goneBody = (await goneList.json()) as { sessions: { code: string }[] };
    check(
      "and off the list",
      !goneBody.sessions.some((entry) => entry.code === lesson2Code),
      `${goneBody.sessions.length} session(s) left`,
    );

    console.log("a demo lobby");
    // A teacher rehearsing alone: one seat, opened with the lobby, that their
    // own host connection plays from. Everything the class version does, with
    // nobody to play it against and nothing written down at the end.
    const demoCookie = await signIn("demo@example.org", "smoke-test-password");
    const demoCreated = await createLobby(demoCookie, "example", true);
    const demoCode = demoCreated.body.code ?? "";
    check("a teacher can open one", demoCreated.status === 201, `got ${demoCreated.status}`);

    const demoHost = new TestClient(demoCode, randomUUID(), demoCookie, "host");
    await demoHost.ready();
    demoHost.send({ type: "host", gameId: "example" });
    const demoLobby = await demoHost.waitFor("lobby-state");
    const demoSeats = demoLobby?.state.players.filter((p) => !p.isHost) ?? [];
    check(
      "it opens with exactly one seat for the teacher to play from",
      demoLobby?.state.demo === true && demoSeats.length === 1,
      `${demoSeats.length} seat(s)`,
    );

    const gatecrasher = new TestClient(demoCode, randomUUID());
    await gatecrasher.ready();
    gatecrasher.send({ type: "join", name: "Curious Student" });
    const gatecrashed = await gatecrasher.waitFor("error");
    check(
      "nobody can join it, even knowing the code",
      gatecrashed?.message === "This lobby is a rehearsal, not a game",
      gatecrashed?.message,
    );

    demoHost.send({ type: "start" });
    demoHost.send({ type: "begin-countdown" });
    check("a round starts with one player in the lobby", !!(await demoHost.waitFor("game-start")));

    // The host screen is the one playing. In a class lobby the framework
    // ignores the host's actions entirely; here they have to land on the seat.
    for (let tap = 0; tap < 4; tap++) {
      demoHost.send({ type: "game-action", payload: { action: "click" } });
    }
    await new Promise((r) => setTimeout(r, 300));
    demoHost.send({ type: "end-round" });
    const demoFinished = await demoHost.waitFor("finished");
    const demoScore = demoFinished?.results[0]?.score ?? 0;
    check(
      "what the teacher does is scored against that seat",
      demoScore > 0,
      `scored ${demoScore}`,
    );

    // Read the throwaway database directly rather than importing the server's
    // store, which would open whichever file DB_PATH names in *this* process.
    const readBack = new DatabaseSync(DB_PATH, { readOnly: true });
    const recorded = readBack
      .prepare(`select count(*) as n from results where code = ?`)
      .get(demoCode) as { n: number };
    readBack.close();
    check("but the rehearsal is not written down", recorded.n === 0, `${recorded.n} row(s)`);

    const demoReview = await fetch(`${BASE}/parties/sessions/${demoCode}`, {
      headers: { cookie: demoCookie! },
    });
    check(
      "and leaves nothing to review either",
      demoReview.status === 404,
      `got ${demoReview.status}`,
    );

    // A demo has nobody in it, so it stands aside for the real thing rather
    // than making the teacher go and close it first.
    const afterDemo = await createLobby(demoCookie);
    check(
      "and it gives way to a lobby for an actual class",
      afterDemo.status === 201,
      `got ${afterDemo.status}`,
    );
    const demoClosed = await demoHost.waitFor("lobby-closed");
    check("the demo screen is told it went", demoClosed?.reason === "host-closed");

    // The other way round it must not: a class in the lobby outranks a click
    // on "try it out".
    const demoOverClass = await createLobby(demoCookie, "example", true);
    check(
      "but a lobby with a class in it gives way to nothing",
      demoOverClass.status === 409 && demoOverClass.body.code === afterDemo.body.code,
      `got ${demoOverClass.status}`,
    );

    const classHost = new TestClient(afterDemo.body.code!, randomUUID(), demoCookie, "host");
    await classHost.ready();
    classHost.send({ type: "close-lobby" });
    await classHost.waitFor("lobby-closed");
    for (const client of [demoHost, gatecrasher, classHost]) client.close();

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
