// pm2 process definition.
//
//   pm2 start deploy/ecosystem.config.cjs
//   pm2 save && pm2 startup       # survive a reboot
//
// IMPORTANT: one process, fork mode. Lobbies live in memory and each one owns
// its own timers, so a second worker would hold a different set of lobbies and
// half the class would get "no lobby with this code" depending on which worker
// nginx handed them to. Never set instances > 1 or exec_mode "cluster".

const fs = require("node:fs");
const path = require("node:path");

const root = "/home/openpatch/projects/lms";

// AUTH_SECRET and BASE_URL live in a file outside the repository; pm2 does not
// read .env on its own, so parse it here.
function readEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const at = line.indexOf("=");
        return [line.slice(0, at).trim(), line.slice(at + 1).trim().replace(/^["']|["']$/g, "")];
      }),
  );
}

module.exports = {
  apps: [
    {
      name: "lms",
      cwd: root,
      script: path.join(root, "node_modules/.bin/tsx"),
      args: "server/index.ts",

      instances: 1,
      exec_mode: "fork",

      env: {
        NODE_ENV: "production",
        PORT: 3000,
        DB_PATH: path.join(root, "data/lms.db"),
        ...readEnvFile(path.join(root, ".env")),
      },

      // The server flushes every live lobby to SQLite on SIGTERM. pm2 kills
      // after 1.6s by default, which is not always enough.
      kill_timeout: 15000,

      autorestart: true,
      max_restarts: 10,
      max_memory_restart: "512M",
      merge_logs: true,
      time: true,
    },
  ],
};
