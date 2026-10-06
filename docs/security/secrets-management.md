# Secrets Management

Policy for every credential this repo touches. Step-by-step procedures live in [`runbooks/`](runbooks/).

## Rules

1. No secrets in git. `.env` files are gitignored. `env.example` files list variable names only.
2. No secrets in cloud-synced directories (OneDrive, SharePoint, iCloud, Dropbox).
3. Bitwarden Secrets Manager (BSM) is the source of truth for every secret.
4. A secret reaches a process only through `bws run`, which injects it into that process's environment. Never pass MCP credentials as `-e` flags to `claude mcp add`: that writes them in plaintext to `~/.claude.json`.
5. Machine-account access tokens live in the macOS Keychain, never in a file or shell profile.
6. Access tokens are read-only and scoped to the fewest projects that work. One token per project.
7. A tenant's global admin account is never used in automation.

One exception to "nothing on disk": a client workspace's `.env.local` holds that client's local development keys (`DATABASE_URL`, `TRIGGER_SECRET_KEY`, `ANTHROPIC_API_KEY`). It is gitignored and stays on the operator's machine.

## Layout in Secrets Manager

- **Project** = a scope. `agent-skills-shared` holds keys used across clients (for example `ANTHROPIC_API_KEY`, `CONTEXT7_API_KEY`). A client with its own credentials gets its own project.
- **Secret key** = the environment variable name, exactly. All caps, underscores.
- **Secret value** = the credential.

The M365 server reads five variables from the client's project:

| Secret key | Value |
|---|---|
| `TENANT_ID` | Microsoft Entra directory (tenant) ID |
| `CLIENT_ID` | App registration application (client) ID |
| `CERT_PATH` | Absolute path to the `.pfx` on the operator's machine |
| `CERT_PASSPHRASE` | Passphrase for the `.pfx` |
| `TENANT_DOMAINS` | Optional. Comma-separated tenant email domains |

The `.pfx` itself is not in Secrets Manager. It stays on the operator's machine, outside every repo and synced folder.

Free tier limits, checked 2026-05-26: 2 users, 3 projects, 3 machine accounts. Verify before relying on the count.

## How a secret reaches a process

Both routes use `bws run` with a token read from the Keychain at launch.

| Route | What it does | Who can read the secrets |
|---|---|---|
| Session wrapper (`cc`) | Starts Claude Code under `bws run` | Claude Code and every process it starts |
| Server launcher (`start.sh`) | The MCP server's own launcher calls `bws run` | Only that server process |

Use the server launcher for client tenant credentials. Use the session wrapper for low-risk API keys that many tools need.

Be clear about what this does and does not protect:

- A token is scoped to one project and is read-only, so a leaked token exposes one project and cannot change anything.
- Any process running as the operator can read the Keychain entry, and that includes an agent with shell access. The Keychain keeps tokens out of files, history and backups. It is not a barrier against the agent itself. Token scope is the real limit on damage.

Setup: [`runbooks/bws-setup.md`](runbooks/bws-setup.md).

## Rotation

| Credential | Cadence |
|---|---|
| Service secrets (API keys) | Every 90 days, on a team member's departure, or before a known expiry |
| Machine-account access tokens | Every 180 days, on departure, or on suspected leak |
| M365 certificates | Before expiry (the setup skill issues them for 730 days) and when an engagement ends |
| Identifiers (`TRIGGERDEV_PROJECT_REF`, tenant and client IDs) | Not secrets. Do not rotate. |

Rotating a secret in BSM is in place: every holder gets the new value on the next `bws run`.

Rotating an access token means the holder replaces the Keychain entry:

```bash
security add-generic-password -U -s bws-token -a "$USER" -w
```

`-U` replaces the entry. `security` prompts for the value, so it never enters shell history.

## Emergency rotation

When a credential may have leaked: [`runbooks/emergency-rotation.md`](runbooks/emergency-rotation.md). Treat suspected exposure as confirmed.

## If the team outgrows the free tier

- **Preferred:** upgrade to Bitwarden Teams. BSM stays the single source of truth.
- **Cold backup only:** fall back to the Bitwarden Password Manager CLI (`bw`). The two stores are separate, so every rotation must update both or one will drift. The fallback wrapper is in [`runbooks/bws-setup.md`](runbooks/bws-setup.md#fallback-password-manager-wrapper).

## History

Secrets moved from a Password Manager (`bw`) wrapper to Secrets Manager in 2026. The record of that move is [`runbooks/bws-migration.md`](runbooks/bws-migration.md).
