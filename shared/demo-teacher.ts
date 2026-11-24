// The demo teacher: what `pnpm dev` signs on before anything starts, so a
// fresh checkout can try a game out without `pnpm teacher add` first.
//
// The credentials are not a secret to keep — they sit in this file, which is
// the point: they belong to a local dev database, and the production server
// keeps its own, where this account is never created. The login page turns
// them into a button in dev mode, so nobody has to remember them either.

export const DEMO_EMAIL = "demo@lms.local";
export const DEMO_NAME = "Demo-Lehrkraft";
export const DEMO_PASSWORD = "demo-demo-demo";
