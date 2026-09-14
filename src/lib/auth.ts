import { createAuthClient } from "better-auth/react";

// Same origin as the app: Caddy proxies /parties to the server in production,
// the Vite dev server does the same locally.
export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: "/parties/auth",
});

export const { signIn, signOut, useSession } = authClient;
