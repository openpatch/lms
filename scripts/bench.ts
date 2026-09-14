// Load test: how many players can one box actually hold?
//
//   node --import tsx bench.ts <lobbies> <playersPerLobby> <mode>
//
// mode "idle"   — everyone connected, nobody acting (a class waiting to start)
// mode "active" — everyone playing the tap game flat out (the heaviest path:
//                 every tap is an action, a room-wide broadcast and a state write)

import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import WebSocket from "ws";
import { betterAuth } from "better-auth";

const LOBBIES = Number(process.argv[2] ?? 10);
const PER_LOBBY = Number(process.argv[3] ?? 30);
const MODE = process.argv[4] ?? "active";

const PORT = 3990;
const BASE = `http://localhost:${PORT}`;
const dir = mkdtempSync(join(tmpdir(), "lms-bench-"));
const DB_PATH = join(dir, "lms.db");
process.env.DB_PATH = DB_PATH;

function rss(pid: number): number {
  const status = readFileSync(`/proc/${pid}/status`, "utf8");
  return Number(/VmRSS:\s+(\d+)/.exec(status)![1]) / 1024; // MiB
}

function cpuSeconds(pid: number): number {
  const parts = readFileSync(`/proc/${pid}/stat`, "utf8").split(" ");
  return (Number(parts[13]) + Number(parts[14])) / 100;
}

async function makeTeachers(n: number) {
  const { authOptions } = await import("../server/auth");
  const admin = betterAuth({
    ...authOptions,
    emailAndPassword: { ...authOptions.emailAndPassword, disableSignUp: false },
  });
  for (let i = 0; i < n; i++) {
    await admin.api.signUpEmail({
      body: { email: `t${i}@example.org`, name: `Teacher ${i}`, password: "bench-password-123" },
    });
  }
}

function start(): Promise<ChildProcess> {
  const child = spawn(process.execPath, ["--import", "tsx", "server/index.ts"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(PORT), DB_PATH, BASE_URL: BASE },
    stdio: ["ignore", "pipe", "inherit"],
  });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("no start")), 30_000);
    child.stdout!.on("data", (c: Buffer) => {
      if (c.toString().includes("listening")) {
        clearTimeout(timer);
        resolve(child);
      }
    });
  });
}

async function signIn(i: number): Promise<string> {
  const r = await fetch(`${BASE}/parties/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE },
    body: JSON.stringify({ email: `t${i}@example.org`, password: "bench-password-123" }),
  });
  return (r.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
}

function open(code: string, id: string, cookie?: string, role = "player") {
  return new WebSocket(`ws://localhost:${PORT}/parties/main/${code}?_pk=${id}&role=${role}`, {
    headers: cookie ? { cookie } : {},
  });
}

const ready = (ws: WebSocket) =>
  new Promise<void>((res, rej) => {
    ws.once("open", () => res());
    ws.once("error", rej);
  });

async function main() {
  await makeTeachers(LOBBIES);
  const server = await start();
  const pid = server.pid!;
  const baseline = rss(pid);
  const sockets: WebSocket[] = [];
  let received = 0;
  let bytes = 0;
  const latencies: number[] = [];

  try {
    const codes: string[] = [];
    const hosts: WebSocket[] = [];

    for (let i = 0; i < LOBBIES; i++) {
      const cookie = await signIn(i);
      const r = await fetch(`${BASE}/parties/lobbies`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: BASE, cookie },
        body: JSON.stringify({ gameId: "example" }),
      });
      const { code } = (await r.json()) as { code: string };
      codes.push(code);
      const host = open(code, randomUUID(), cookie, "host");
      await ready(host);
      host.send(JSON.stringify({ type: "host", gameId: "example" }));
      hosts.push(host);
      sockets.push(host);
    }

    // Everyone joins.
    const t0 = Date.now();
    for (const code of codes) {
      await Promise.all(
        Array.from({ length: PER_LOBBY }, async (_, p) => {
          const ws = open(code, randomUUID());
          sockets.push(ws);
          await ready(ws);
          ws.on("message", (d: Buffer) => { received++; bytes += d.length; });
          ws.send(JSON.stringify({ type: "join", name: `P${p}` }));
        }),
      );
    }
    const connectMs = Date.now() - t0;
    await new Promise((r) => setTimeout(r, 2000));

    const players = LOBBIES * PER_LOBBY;
    const idleRss = rss(pid);
    console.log(`\nlobbies ${LOBBIES} x ${PER_LOBBY} players = ${players} connections`);
    console.log(`  connect time        ${connectMs} ms`);
    console.log(`  rss baseline        ${baseline.toFixed(0)} MiB`);
    console.log(`  rss with players    ${idleRss.toFixed(0)} MiB`);
    console.log(`  per connection      ${(((idleRss - baseline) * 1024) / players).toFixed(0)} KiB`);

    if (MODE === "idle") {
      await new Promise((r) => setTimeout(r, 5000));
      console.log(`  rss after idle 5s   ${rss(pid).toFixed(0)} MiB`);
      return;
    }

    // Start every game, then tap as fast as the round allows.
    for (const host of hosts) host.send(JSON.stringify({ type: "start" }));
    await new Promise((r) => setTimeout(r, 500));
    for (const host of hosts) host.send(JSON.stringify({ type: "begin-countdown" }));
    await new Promise((r) => setTimeout(r, 4000));

    const cpu0 = cpuSeconds(pid);
    received = 0;
    bytes = 0;
    const playing = sockets.filter((ws) => !hosts.includes(ws));
    const stop = Date.now() + 10_000;
    let sent = 0;

    await Promise.all(
      playing.map(async (ws) => {
        while (Date.now() < stop) {
          const at = Date.now();
          ws.send(JSON.stringify({ type: "game-action", payload: { action: "click" } }));
          sent++;
          await new Promise((r) => setTimeout(r, 200)); // 5 taps/second/player
          latencies.push(Date.now() - at - 200);
        }
      }),
    );

    const cpu = cpuSeconds(pid) - cpu0;
    latencies.sort((a, b) => a - b);
    const pct = (q: number) => latencies[Math.floor(latencies.length * q)] ?? 0;

    console.log(`\n  10s of ${players} players tapping 5x/second`);
    console.log(`  actions sent        ${sent} (${(sent / 10).toFixed(0)}/s)`);
    console.log(`  messages received   ${received} (${(received / 10).toFixed(0)}/s)`);
    console.log(`  bytes to clients    ${(bytes / 1e6).toFixed(1)} MB in 10s = ${(bytes / 10 / 1e6).toFixed(2)} MB/s`);
    console.log(`  mean message size   ${(bytes / Math.max(received, 1)).toFixed(0)} bytes`);
    console.log(`  server cpu          ${cpu.toFixed(1)}s of 10s wall = ${((cpu / 10) * 100).toFixed(0)}% of one core`);
    console.log(`  added latency p50   ${pct(0.5).toFixed(0)} ms`);
    console.log(`  added latency p95   ${pct(0.95).toFixed(0)} ms`);
    console.log(`  added latency max   ${(latencies.at(-1) ?? 0).toFixed(0)} ms`);
    console.log(`  rss under load      ${rss(pid).toFixed(0)} MiB`);
  } finally {
    for (const ws of sockets) ws.close();
    server.kill("SIGTERM");
    await new Promise((r) => server.once("exit", r));
    rmSync(dir, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
