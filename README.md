# Lernen mit Spaß

Mini games for maths and computer science lessons. One teacher hosts, the class
joins with a six-digit code on their own devices, and everyone plays the same
game at the same time.

Teachers need an account; students do not.

## Getting started

Needs Node 24 or newer — the server uses the built-in `node:sqlite`, so there is
no native module to compile — and pnpm.

```sh
pnpm install
pnpm dev:server     # game server on :3000
pnpm dev            # client, proxying /parties to the game server
```

`pnpm dev` on its own is enough to look at a single stage: `/preview` lists
every one of them and plays it in the tab, with no server and no account. It is
served only by the dev build.

Then create an account for yourself and sign in at `/login`:

```sh
pnpm teacher add you@example.com "Your Name"
```

## Checks

```sh
pnpm check:games    # builds a round of every stage of every game
pnpm check:server   # signs in, opens a lobby, plays a round, restarts the server
pnpm lint
pnpm build
```

## How it fits together

A React single-page app, a Node process holding the lobbies, and one SQLite
file.

A lobby lives in memory for as long as it is being played, and is mirrored to
SQLite on every change, so restarting the server mid-lesson puts players back
into the round they were in. Results are written when a game ends. Lobbies close
themselves two hours after they are opened, so a forgotten browser tab cannot
keep one alive.

Everything about the games themselves — the stage model, settings, scoring, and
how to add a game — is in [documentation.md](documentation.md).

## Deploying

The client is static files; the server is one long-running Node process. A
reverse proxy serves the first and forwards `/parties/*` to the second, so both
are on the same origin.

```sh
pnpm install --frozen-lockfile
pnpm build                              # writes dist/
node --import tsx server/index.ts       # serves /parties on $PORT
```

### Environment

| | |
| --- | --- |
| `AUTH_SECRET` | **required.** Signs every session. Generate with `openssl rand -base64 32`, set it before the first start, and never change it — replacing it signs every teacher out. |
| `BASE_URL` | **required.** The public URL, e.g. `https://lms.example.com`. Sign-in requests from another origin are rejected, and it is what decides that session cookies are marked `Secure`. |
| `PORT` | Port the game server listens on. Defaults to 3000. |
| `DB_PATH` | SQLite file. Defaults to `./data/lms.db`. |

Keep the secret in a file the process manager reads, not in the repository.

### Running the process

**One process.** Lobbies live in memory and each owns its own timers, so a
second worker would hold a different set of lobbies — half a class would be told
their code does not exist, depending on which worker the proxy handed them to.
Whatever runs it, do not cluster it.

Give it at least 15 seconds between `SIGTERM` and `SIGKILL`. The server flushes
live lobbies to SQLite on `SIGTERM`, and some process managers kill much sooner
than that by default.

Raise the open-file limit if more than a few hundred students will be connected
at once. Every player holds a socket, and the usual default of 1024 descriptors
is reached long before the machine runs out of anything: new connections then
fail with `EMFILE` while memory and CPU still look idle. Most process managers
can set it per app, or raise it for the user that runs the server.

Point the process manager at `node --import tsx server/index.ts` directly, not
at `pnpm start` or the `tsx` binary. Both run the server in a child process, so
the manager ends up supervising a wrapper: memory limits watch the wrong
process, and anything in between that does not forward signals swallows the
shutdown.

### Reverse proxy

Gameplay is a WebSocket, which needs two things beyond a plain `proxy_pass`.
[`deploy/nginx.conf`](deploy/nginx.conf) is a complete example; the parts that
matter:

- **Forward the upgrade.** On nginx that means `proxy_http_version 1.1` plus
  `Upgrade`/`Connection` headers, where `$connection_upgrade` comes from a
  `map $http_upgrade` block in the **http** block. Without the map the variable
  is empty, no socket ever upgrades, and the site looks fine while no game
  works.
- **Raise the idle timeout.** A lobby sits quiet between rounds and while the
  teacher explains something. nginx closes an idle proxied connection after 60
  seconds by default, which drops every socket in the room.

Serve `dist/` as the document root with a single-page fallback, so unknown paths
reach the router instead of returning 404.

The web server's own user has to be able to reach that directory. Deploying into
a home directory usually means it cannot: those are created without access for
other users on most current distributions, and the failure is confusing — the
fallback file cannot be read either, so instead of a permission error you get a
redirection cycle and a 500. `namei -l path/to/dist/index.html` shows which
directory in the chain refuses, and traverse permission (`chmod o+x`) on that
directory is enough; the alternative is to keep the built client somewhere the
web server already serves.

### Continuous deployment

`.github/workflows/deploy.yml` builds, runs both checks, copies the result over
ssh and restarts the process. Nothing about the target lives in the repository;
it reads:

| Secret | |
| --- | --- |
| `DEPLOY_SSH_HOST` | hostname of the server |
| `DEPLOY_SSH_USER` | user that owns the app directory and the process |
| `DEPLOY_SSH_KEY` | a **private** key with no passphrase, whole. Generate one just for deploys: `ssh-keygen -t ed25519 -N '' -f lms_deploy` |

| Variable | |
| --- | --- |
| `DEPLOY_PATH` | absolute path to deploy into |
| `DEPLOY_HOST` | public hostname, for the post-deploy health check |

The workflow refuses to start if any of these is missing, since `rsync --delete`
against an empty path would empty the wrong directory.

### Teacher accounts

There is no sign-up page. Accounts exist because someone made one on the server:

```sh
pnpm teacher add anna@example.com "Anna Klein"   # prints a password once
pnpm teacher list
pnpm teacher password anna@example.com           # new password
pnpm teacher remove anna@example.com
```

The CLI reads the same environment as the server, so make sure `DB_PATH` points
at the right file.

### Backups

Everything durable is the one SQLite file: lobbies, results, teacher accounts
and sessions. It is in WAL mode, so `sqlite3 lms.db ".backup ..."` can copy it
without stopping the server.

## Licence

MIT — see [LICENSE](LICENSE).
