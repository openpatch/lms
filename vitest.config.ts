import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// The unit tests, kept apart from the app's vite.config.ts: that one stamps
// the build and proxies to the game server, neither of which a test wants.
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify({ sha: "", date: "" }),
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
