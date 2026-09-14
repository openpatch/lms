# Running the server

One Node process and one SQLite file on one box. nginx serves the built client
and proxies `/parties/*` to the server; pm2 keeps the process alive.

Paths below assume `~/projects/lms` (`/home/openpatch/projects/lms`), which is
where `.github/workflows/deploy.yml` deploys, alongside your other apps.

## Provisioning

A small VPS is plenty — the server holds a few lobbies in memory and writes a
row per answer. Needs Node 24+ (`node:sqlite` is built in, so there is no
native module to compile and no build toolchain on the server).

```sh
mkdir -p ~/projects/lms/data
```

**Port 3100.** `json-store` already holds 3000, so the game server is on 3100.
Check it is actually free before the first start, and keep the pm2 entry and
`deploy/nginx.conf` agreeing:

```sh
ss -tlnp | grep -E '3000|3100'
```

### The secret

`AUTH_SECRET` signs every session, so set it **before the first start** and do
not change it afterwards — replacing it signs every teacher out. `BASE_URL`
must be the public URL, because sign-in requests from another origin are
rejected.

```sh
printf 'AUTH_SECRET=%s\nBASE_URL=https://lms.openpatch.org\n' "$(openssl rand -base64 32)" \
  > ~/projects/lms/.env
chmod 600 ~/projects/lms/.env
```

The pm2 entry below points at that file. It is outside the repository, so the
deploy never overwrites it — but note `.env` is also not created for you: a
fresh box needs this step before the first start.

### pm2

You already run everything from one shared `~/projects/ecosystem.config.js`, so
lms is an entry in that file rather than a config of its own. Add:

```js
{
  name: "lms",
  cwd: "lms",
  script: "./node_modules/.bin/tsx",
  args: "server/index.ts",

  // One process. Lobbies live in memory and own their timers, so a second
  // worker would hold a different set of them and half a class would be told
  // their code does not exist. Never raise instances above 1.
  instances: 1,
  exec_mode: "fork",

  // AUTH_SECRET and BASE_URL, kept out of this file and out of git.
  env_file: "lms/.env",
  env: {
    NODE_ENV: "production",
    PORT: 3100,
    DB_PATH: "data/lms.db",
  },

  // The server flushes live lobbies to SQLite on SIGTERM; pm2 kills after
  // 1.6s by default, which is not always enough.
  kill_timeout: 15000,
  max_memory_restart: "512M",
  time: true,
}
```

Then:

```sh
cd ~/projects
pm2 start ecosystem.config.js --only lms
pm2 save
pm2 install pm2-logrotate      # otherwise logs grow without bound
```

`NODE_ENV` is set in `env` rather than `env_production` on purpose: the deploy
workflow restarts with `--update-env` and no `--env` flag, which reads `env`.
Putting it in `env_production` only would silently drop the app back to
development settings on every deploy.

If `env_file` turns out not to be supported by your pm2, the server refuses to
start with `AUTH_SECRET must be set in production` — loud rather than silent.
Either upgrade pm2 or inline the two values into `env`.

### nginx

```sh
cp deploy/nginx.conf /etc/nginx/sites-available/lms.openpatch.org
ln -s /etc/nginx/sites-available/lms.openpatch.org /etc/nginx/sites-enabled/
certbot --nginx -d lms.openpatch.org
nginx -t && systemctl reload nginx
```

Two things in that config are load-bearing:

- The `map $http_upgrade $connection_upgrade` block has to be in the **http**
  block, not in `server {}`. Without it `$connection_upgrade` is empty and no
  WebSocket ever upgrades. The config file has it commented at the top; if your
  nginx does not already define it, add it to `/etc/nginx/nginx.conf`.
- `proxy_read_timeout` is raised from the 60s default. A lobby can sit quiet
  between rounds, and at 60s nginx would drop every socket in the room.

Point `lms.openpatch.org` at the box with an A record before running certbot.

## Teacher accounts

Only teachers sign in; students join with a code and never have an account.
There is no sign-up page — accounts are made on the server:

```sh
cd ~/projects/lms
set -a; . ./.env; set +a          # the CLI needs the same environment

pnpm teacher add anna@schule.de "Anna Klein"   # prints a password once
pnpm teacher list
pnpm teacher password anna@schule.de           # new password
pnpm teacher remove anna@schule.de
```

Accounts, sessions and password hashes live in the same `lms.db` as everything
else, so they are covered by the same backup.

## Deploying

`.github/workflows/deploy.yml` builds, runs both smoke tests, rsyncs `dist/`
and the server sources, then `pm2 restart lms`. It needs:

| Secret | |
| --- | --- |
| `DEPLOY_SSH_HOST` | the server's hostname |
| `DEPLOY_SSH_USER` | the user that owns the pm2 process |
| `DEPLOY_SSH_KEY` | that user's private key |

| Variable | |
| --- | --- |
| `DEPLOY_HOST` | public hostname, used for the health check |

A restart is safe mid-lesson: the server flushes every live lobby to SQLite on
`SIGTERM` and reloads them on boot, so players reconnect into the round they
were in. `kill_timeout` in the pm2 config gives it 15s to do that — pm2's
default of 1.6s is not always enough.

## Backups

Everything durable is in `data/lms.db` — lobbies, results, teacher accounts.
Hetzner snapshots cover it; for something finer, `sqlite3 lms.db ".backup"` on
a timer works, and WAL mode means it does not need to stop the server.

## Operating

```sh
pm2 status
pm2 logs lms
pm2 restart lms
curl https://lms.openpatch.org/parties/health
```

Lobbies close themselves two hours after they are opened (`LOBBY_TTL_MS` in
`server/rooms.ts`), so a forgotten browser tab cannot keep one alive
indefinitely.
