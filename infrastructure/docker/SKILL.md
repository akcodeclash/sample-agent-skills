---
name: docker
description: Manages per-client local Docker environments (Postgres and Redis) through the dev script. Use when creating, starting, stopping, inspecting or removing a client's local development databases, or when troubleshooting them.
---

# Per-client local databases

Each client has its own Postgres and Redis containers with separate ports, volumes and passwords. One script manages them: `infrastructure/docker/scripts/dev`. Full reference: [README.md](README.md).

## Running it

Call the script by its path, or through an alias the operator has set up. Do not symlink it: it locates its files relative to itself.

```bash
~/projects/agent-skills/infrastructure/docker/scripts/dev <command> [client]
```

## Commands

```bash
dev new <client>      # create Docker config + ~/clients/<client>/ workspace
dev up <client>       # start Postgres and Redis, print connection strings
dev down <client>     # stop containers, keep data
dev status            # every client's containers and their state
dev ports             # port assignments
dev logs <client>     # follow container logs
dev db <client>       # psql shell
dev redis <client>    # redis-cli shell
dev nuke <client>     # delete containers AND volumes
dev open <client>     # open the workspace in VS Code
```

Client names: lowercase letters, digits, hyphens.

## Rules

- **`dev nuke` destroys data.** Run it only when the user has asked, in this conversation, to delete that named client's local data. The script asks for the client name as confirmation: have the user type it.
- **Never print `.env` or `.env.local`.** They hold passwords. To check a variable is set, test for it without echoing the value.
- **Do not edit files under `infrastructure/docker/clients/<client>/` by hand** unless the user asks. `dev new` generates them.
- **This stack is for development.** Do not point a production automation at it.

## After `dev new`

```bash
dev up <client>
cd ~/clients/<client>
npx trigger.dev@latest init     # if this is a new Trigger.dev project
# the operator adds TRIGGER_SECRET_KEY and ANTHROPIC_API_KEY to .env.local
npx trigger.dev@latest dev      # local tunnel, development only
```

## Troubleshooting

| Symptom | Likely cause | Check |
|---|---|---|
| `Client '<name>' not found` | `dev new` was never run for it, or the name is misspelled | `dev status` |
| `already exists in docker clients` | A folder from an earlier client, often left by `dev nuke` | `ls infrastructure/docker/clients/` |
| Port already allocated | Another client or a local service holds the port | `dev ports`, then `lsof -i :<port>` |
| Container exits or is unhealthy | See its logs | `dev logs <client>` |
| `docker: command not found` or cannot connect | Docker is not installed or not running | `docker info` |

The known limitations of port assignment and `dev nuke` are in [README.md](README.md#known-limitations).
