# infrastructure/docker

Local development databases, one isolated set per client. Each client gets its own Postgres and Redis containers, volumes, ports and passwords, managed by one script: [`scripts/dev`](scripts/dev).

This is a development stack. Production automations use hosted Postgres and Redis (see [Local versus production](#local-versus-production)).

## Requirements

- Docker with Compose v2 (`docker compose`)
- bash (the script runs on the bash 3.2 that ships with macOS)
- VS Code's `code` command, only for `dev open`

## Running the script

The script finds its files relative to its own location, so call it by path or through an alias. A symlink will not work.

```bash
alias dev="$HOME/projects/agent-skills/infrastructure/docker/scripts/dev"
```

The rest of this page assumes that alias.

## Commands

| Command | What it does |
|---|---|
| `dev new <client>` | Create the client's Docker config and workspace |
| `dev up <client>` | Start Postgres and Redis, print the connection strings |
| `dev down <client>` | Stop the containers. Data is kept. |
| `dev status` | Show every client's containers and whether they are running |
| `dev ports` | List the ports assigned to each client |
| `dev logs <client>` | Follow the containers' logs |
| `dev db <client>` | Open `psql` in the client's Postgres container |
| `dev redis <client>` | Open `redis-cli` in the client's Redis container |
| `dev nuke <client>` | Delete the containers and their volumes. Asks you to type the client name. |
| `dev open <client>` | Open the client's workspace in VS Code |

Client names are lowercase letters, digits and hyphens.

## What `dev new` creates

In this repo, under `infrastructure/docker/clients/<client>/`:

| File | Contents |
|---|---|
| `docker-compose.yml` | A copy of `clients/template/docker-compose.yml` |
| `.env` | Ports, database name and generated local passwords. Gitignored. |
| `.env.example` | The same variables with `changeme` placeholders |

In the client's workspace, `~/clients/<client>/`:

| File | Contents |
|---|---|
| `.env.local` | `DATABASE_URL` and `REDIS_URL` for the local stack, plus blank `TRIGGER_SECRET_KEY` and `ANTHROPIC_API_KEY` |
| `CLAUDE.md` | A starter project file for a TypeScript and Trigger.dev v3 project |
| `.gitignore` | Ignores `.env`, `.env.local`, `node_modules/`, build output |

It does not overwrite a workspace that already exists. If `.env.local` is there and already has a `DATABASE_URL`, the script leaves it alone and says so. If `CLAUDE.md` or `.gitignore` exist, they are kept.

To change where workspaces go, edit `PROJECTS_ROOT` at the top of the script.

## Ports and names

`dev new` assigns ports by counting the client folders that already exist:

| Service | First client | Second | Third |
|---|---|---|---|
| Postgres | 5433 | 5443 | 5453 |
| Redis | 6380 | 6390 | 6400 |

The defaults 5432 and 6379 are skipped so a locally installed Postgres or Redis does not collide.

Containers are named `<client>-postgres` and `<client>-redis`. Volumes are `<client>-postgres-data` and `<client>-redis-data`. The database is `<client>_dev` with hyphens turned into underscores, and the user is `dev`.

## Images and health

`postgres:16-alpine` and `redis:7-alpine`. Both containers restart unless stopped and have health checks (`pg_isready`, `redis-cli ping`). Redis runs with a password and append-only persistence.

## Local versus production

| | Local | Production |
|---|---|---|
| Postgres and Redis | These containers | A hosted provider |
| Trigger.dev tasks | `npx trigger.dev@latest dev`, running on your machine | `npx trigger.dev@latest deploy`, running in Trigger.dev's cloud |
| Connection strings | `localhost` in `.env.local` | Set as environment variables in the Trigger.dev dashboard |

A deployed task cannot reach `localhost` on your machine. Before go-live, point `DATABASE_URL` and `REDIS_URL` at hosted services.

## Known limitations

- **Port assignment is a count, not a check.** If you delete a client's folder, the next `dev new` can hand out a port another client is using. Run `dev ports` before and after.
- **`dev nuke` leaves the client's folder.** `dev new` with the same name then fails with "already exists" until you delete `infrastructure/docker/clients/<client>/` yourself.
- **Local passwords are predictable** (`<client>-local-dev`, `<client>-redis-dev`) and the ports are published on all interfaces. Fine on a trusted machine, not on a shared or exposed one.
- **Images follow major-version tags**, not pinned digests.
- **macOS and Linux only.** There is no Windows support.
