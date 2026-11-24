// One command for development: the game server and the Vite client together.
//
//   pnpm dev
//
// Runs `pnpm dev:server` and `pnpm dev:client` as its children — the same
// scripts, so each behaves exactly as it does alone — and prefixes what they
// print, because two servers share the console and a stack trace says nothing
// about which half it came from. Ctrl+C stops both.
//
// Before either starts, the demo teacher is made sure of, so a fresh checkout
// can sign in at /login straight away — no account to create, no credentials
// to remember, just the button the login page grows in dev mode.

import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { ensureDemoTeacher } from "./demo";

// Whatever ran `pnpm dev` knows where pnpm is; a stray `npx tsx scripts/dev.ts`
// falls back to the path.
const pnpm = process.env.npm_execpath ?? "pnpm";

const RESET = "\u001b[0m";
const DIM = "\u001b[2m";

/** A child that prints every line prefixed and coloured, and never outlives its sibling. */
function run(label: string, colour: string, args: string[]): Promise<number> {
  const prefix = `${colour}[${label}]${RESET}${DIM}`;

  return new Promise((resolve) => {
    const child = spawn(pnpm, args, { stdio: ["inherit", "pipe", "pipe"] });
    stopping.push(child);

    for (const stream of [child.stdout, child.stderr]) {
      if (!stream) continue;
      const lines = createInterface({ input: stream });
      lines.on("line", (line) => {
        if (line.trim().length > 0) console.log(`${prefix} ${line}${RESET}`);
      });
    }

    child.on("exit", (code) => {
      console.log(`${prefix} exited${code ? ` with ${code}` : ""}${RESET}`);
      resolve(code ?? 0);
    });
  });
}

/** The children a stop signal is forwarded to, in the order they were started. */
const stopping: ReturnType<typeof spawn>[] = [];

let done = false;
async function stop(code: number): Promise<void> {
  if (done) return;
  done = true;
  for (const child of stopping) child.kill("SIGTERM");
  process.exit(code);
}

process.on("SIGINT", () => void stop(130));
process.on("SIGTERM", () => void stop(143));

async function main(): Promise<void> {
  const createdBy = await ensureDemoTeacher();
  console.log(
    `${RESET}demo teacher ${createdBy === "created" ? "created" : "ready"} — at /login, the “Demo” button signs you in (local only)`,
  );

  const server = run("server", "\u001b[35m", ["run", "dev:server"]);
  const client = run("client", "\u001b[36m", ["run", "dev:client"]);

  // Whichever half ends first ends the other one: a dev setup of one working
  // half is a broken dev setup, and a half that crashed left to spin only
  // hides that behind a client that loads and never connects.
  const exit = await Promise.race([server, client]);
  await stop(exit);
}

main().catch((error) => {
  console.error(error);
  void stop(1);
});
