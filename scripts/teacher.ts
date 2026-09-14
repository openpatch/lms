// Manage teacher accounts. There is no sign-up page: this is how accounts exist.
//
//   pnpm teacher add <email> <name> [password]
//   pnpm teacher list
//   pnpm teacher password <email> [password]
//   pnpm teacher remove <email>
//
// On the server, run it from /srv/lms so it picks up the same DB_PATH.

import { randomBytes } from "node:crypto";
import { betterAuth } from "better-auth";
import { authOptions } from "../server/auth";
import { db } from "../server/store";

// Sign-up is disabled on the running server; this instance is the way in.
const admin = betterAuth({ ...authOptions, emailAndPassword: { ...authOptions.emailAndPassword, disableSignUp: false } });

function suggestPassword(): string {
  return randomBytes(12).toString("base64url");
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function add(email?: string, name?: string, password?: string) {
  if (!email || !name) fail("usage: pnpm teacher add <email> <name> [password]");
  const chosen = password ?? suggestPassword();
  try {
    await admin.api.signUpEmail({ body: { email, name, password: chosen } });
  } catch (error) {
    fail(`could not create ${email}: ${error instanceof Error ? error.message : String(error)}`);
  }
  console.log(`created ${email}`);
  if (!password) console.log(`password: ${chosen}  (shown once — give it to them directly)`);
}

function list() {
  const rows = db.prepare(`select email, name, "createdAt" from user order by "createdAt"`).all();
  if (rows.length === 0) {
    console.log("no teachers yet — pnpm teacher add <email> <name>");
    return;
  }
  for (const row of rows) console.log(`${String(row.email).padEnd(32)} ${String(row.name)}`);
  console.log(`\n${rows.length} teacher(s)`);
}

async function setPassword(email?: string, password?: string) {
  if (!email) fail("usage: pnpm teacher password <email> [password]");
  const user = db.prepare(`select id from user where email = ?`).get(email);
  if (!user) fail(`no teacher with email ${email}`);

  const chosen = password ?? suggestPassword();
  const ctx = await admin.$context;
  const hash = await ctx.password.hash(chosen);
  await ctx.internalAdapter.updatePassword(String(user.id), hash);

  console.log(`password updated for ${email}`);
  if (!password) console.log(`password: ${chosen}  (shown once)`);
}

function remove(email?: string) {
  if (!email) fail("usage: pnpm teacher remove <email>");
  const user = db.prepare(`select id from user where email = ?`).get(email);
  if (!user) fail(`no teacher with email ${email}`);

  const id = String(user.id);
  // Take their sessions and credentials with them; lobbies expire on their own.
  db.prepare(`delete from session where "userId" = ?`).run(id);
  db.prepare(`delete from account where "userId" = ?`).run(id);
  db.prepare(`delete from user where id = ?`).run(id);
  console.log(`removed ${email}`);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case "add":
      await add(args[0], args[1], args[2]);
      break;
    case "list":
      list();
      break;
    case "password":
      await setPassword(args[0], args[1]);
      break;
    case "remove":
      remove(args[0]);
      break;
    default:
      fail("usage: pnpm teacher <add|list|password|remove> …");
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
