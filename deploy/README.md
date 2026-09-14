# Running the server

One Node process and one SQLite file on one box. Caddy serves the built client
and proxies `/parties/*` to the server.

## Provisioning

A small VPS is plenty — the server holds a few lobbies in memory and writes a
row per answer. Tested against Node 24+ (`node:sqlite` is built in, so there is
no native module to compile and no build toolchain needed on the server).

```sh
# as root
adduser --system --group --home /srv/lms lms
mkdir -p /srv/lms/data /srv/lms/dist
chown -R lms:lms /srv/lms

corepack enable                      # pnpm
apt install caddy

cp deploy/Caddyfile /etc/caddy/Caddyfile
cp deploy/lms.service /etc/systemd/system/lms.service
systemctl enable --now caddy lms
```

Point `lms.openpatch.org` at the box with an A record. Caddy obtains the
certificate on first request.

> If the DNS record is proxied through another CDN, traffic leaves the box's
> jurisdiction again. Serve it directly if where the data lives is the reason
> for self-hosting in the first place.

## Deploying

`.github/workflows/deploy.yml` builds, runs both smoke tests, rsyncs `dist/`
and the server sources, and restarts the unit. It needs:

| Secret | |
| --- | --- |
| `DEPLOY_SSH_HOST` | the server's hostname |
| `DEPLOY_SSH_USER` | a user that may `sudo systemctl restart lms` |
| `DEPLOY_SSH_KEY` | that user's private key |

| Variable | |
| --- | --- |
| `DEPLOY_HOST` | public hostname, used for the health check |

A restart is safe mid-lesson: the server flushes every live lobby to SQLite on
`SIGTERM` and reloads them on boot, so players reconnect into the round they
were in.

## Backups

Everything durable is in `/srv/lms/data/lms.db`. Hetzner snapshots cover it; for
something finer, `sqlite3 lms.db ".backup"` on a timer works — WAL mode means it
does not need to stop the server.

## Operating

```sh
systemctl status lms
journalctl -u lms -f
curl https://lms.openpatch.org/parties/health
```

Lobbies close themselves two hours after they are opened
(`LOBBY_TTL_MS` in `server/rooms.ts`), so a forgotten browser tab cannot keep
one alive indefinitely.

## Teacher accounts

Only teachers sign in; students join with a code and never have an account.
There is no sign-up page — accounts are made on the server:

```sh
cd /srv/lms
sudo -u lms pnpm teacher add anna@schule.de "Anna Klein"   # prints a password once
sudo -u lms pnpm teacher list
sudo -u lms pnpm teacher password anna@schule.de           # new password
sudo -u lms pnpm teacher remove anna@schule.de
```

`AUTH_SECRET` must be set before the first start, and must not change
afterwards — every session is signed with it, so replacing it signs everyone
out. `BASE_URL` must be the public URL, because sign-in requests from another
origin are rejected.

Accounts, sessions and password hashes live in the same `lms.db` as everything
else, so they are covered by the same backup.
