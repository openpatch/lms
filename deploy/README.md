# Running the server

One Node process and one SQLite file on one box. nginx serves the built client
and proxies `/parties/*` to the server; pm2 keeps the process alive.

Paths below assume `/home/openpatch/projects/lms`, which is what
`.github/workflows/deploy.yml` deploys to.

## Provisioning

A small VPS is plenty — the server holds a few lobbies in memory and writes a
row per answer. Needs Node 24+ (`node:sqlite` is built in, so there is no
native module to compile and no build toolchain on the server).

```sh
mkdir -p /home/openpatch/projects/lms/data
cd /home/openpatch/projects/lms

corepack enable                 # pnpm
npm install -g pm2
```

### The secret

`AUTH_SECRET` signs every session, so set it **before the first start** and do
not change it afterwards — replacing it signs every teacher out. `BASE_URL`
must be the public URL, because sign-in requests from another origin are
rejected.

```sh
printf 'AUTH_SECRET=%s\nBASE_URL=https://lms.openpatch.org\n' "$(openssl rand -base64 32)" \
  > /home/openpatch/projects/lms/.env
chmod 600 /home/openpatch/projects/lms/.env
```

`deploy/ecosystem.config.cjs` reads that file — pm2 does not pick up `.env` on
its own. It is outside the repository and never deployed.

### pm2

```sh
pm2 start deploy/ecosystem.config.cjs
pm2 save && pm2 startup          # come back after a reboot
pm2 install pm2-logrotate        # otherwise logs grow without bound
```

> **One process, fork mode.** Lobbies live in memory and each owns its timers.
> In cluster mode a second worker would hold a different set of lobbies, and
> half a class would get "no lobby with this code" depending on which worker
> nginx handed them to. Never raise `instances` above 1.

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
cd /home/openpatch/projects/lms
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
