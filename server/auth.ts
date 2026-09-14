// Teacher accounts.
//
// Only teachers open lobbies; students join with a code and never sign in. There
// is deliberately no public sign-up: accounts are made on the server with
// `pnpm teacher add`, so "who may host a game" is a list you control rather than
// anyone who finds the page.

import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { fromNodeHeaders } from "better-auth/node";
import type { IncomingHttpHeaders } from "node:http";
import { db } from "./store";

/** Everything the auth routes live under, so one Caddy rule covers them. */
export const AUTH_BASE_PATH = "/parties/auth";

const secret = process.env.AUTH_SECRET;
if (!secret && process.env.NODE_ENV === "production") {
  throw new Error("AUTH_SECRET must be set in production");
}

export const authOptions = {
  // The same node:sqlite handle the rest of the server uses.
  database: db,
  basePath: AUTH_BASE_PATH,
  baseURL: process.env.BASE_URL ?? "http://localhost:3000",
  secret: secret ?? "development-secret-not-for-production",
  emailAndPassword: {
    enabled: true,
    // Accounts come from `pnpm teacher add`, never from the web.
    disableSignUp: true,
    minPasswordLength: 10,
  },
  // In development the page is served by Vite on another port, so its origin is
  // not the server's. In production both are the same host behind Caddy and
  // baseURL is the only origin accepted.
  trustedOrigins: (request?: Request) => {
    if (process.env.NODE_ENV === "production") return [];
    const origin = request?.headers.get("origin");
    return origin && /^http:\/\/localhost:\d+$/.test(origin) ? [origin] : [];
  },
  session: {
    // A teacher signs in at the start of a lesson and should still be signed in
    // next week.
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
} as const;

// Create better-auth's tables before the instance looks for them, so a fresh
// database just works instead of warning about missing tables.
const { runMigrations } = await getMigrations(authOptions);
await runMigrations();

export const auth = betterAuth(authOptions);

export interface Teacher {
  id: string;
  email: string;
  name: string;
}

/** The signed-in teacher for a request, or null. */
export async function teacherFrom(headers: IncomingHttpHeaders): Promise<Teacher | null> {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(headers) });
  if (!session?.user) return null;
  return { id: session.user.id, email: session.user.email, name: session.user.name };
}
