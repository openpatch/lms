// Makes sure the demo teacher (shared/demo-teacher.ts) is there to sign in as.
// `pnpm dev` calls this before anything starts, and `pnpm teacher demo` by hand.
//
// Local development only — the credentials sit in the checkout, so they are no
// secret to anyone who has it, which is what makes them fine: on production
// the server keeps its own database, where this account is never created.

import { betterAuth } from "better-auth";
import { DEMO_EMAIL, DEMO_NAME, DEMO_PASSWORD } from "../shared/demo-teacher";
import { authOptions } from "../server/auth";
import { db } from "../server/store";

// A private instance with sign-up enabled, the same one `teacher add` uses:
// the running server keeps sign-up closed.
const admin = betterAuth({
  ...authOptions,
  emailAndPassword: { ...authOptions.emailAndPassword, disableSignUp: false },
});

/** Whether the demo teacher exists. */
export function demoTeacherExists(): boolean {
  return db.prepare("select id from user where email = ?").get(DEMO_EMAIL) != null;
}

/**
 * Makes sure the demo teacher is there and signs in with `DEMO_PASSWORD`.
 * Whoever had it before gets the password again, so the account is "demo"
 * after every run and not "demo, until the password was changed".
 *
 * Returns what it did, so the caller can print one honest line.
 */
export async function ensureDemoTeacher(): Promise<"created" | "reset" | "exists"> {
  if (!demoTeacherExists()) {
    try {
      await admin.api.signUpEmail({
        body: { email: DEMO_EMAIL, name: DEMO_NAME, password: DEMO_PASSWORD },
      });
      return "created";
    } catch (error) {
      // Created in the meantime — the watch of another dev process, say.
      if (error instanceof Error && error.message.includes("already exists")) {
        return "exists";
      }
      throw error;
    }
  }

  const user = db.prepare("select id from user where email = ?").get(DEMO_EMAIL) as
    | { id: string }
    | undefined;
  const context = await admin.$context;
  const hash = await context.password.hash(DEMO_PASSWORD);
  await context.internalAdapter.updatePassword(String(user!.id), hash);
  return "reset";
}
