# Runbook: Secrets Manager setup (per machine)

One-time setup so that `bws run` can inject secrets, with the access token held in the macOS Keychain. Policy and reasoning: [`../secrets-management.md`](../secrets-management.md).

## Before you start

- A Bitwarden organisation with Secrets Manager enabled.
- A machine account with a read-only access token for each project you need.
- The project UUIDs, from the Secrets Manager web UI.

## 1. Install `bws`

```bash
brew install bitwarden/tap/bws
```

## 2. Store each access token in the Keychain

```bash
security add-generic-password -U -s bws-token -a "$USER" -w
```

- `-U` updates an existing entry instead of adding a duplicate.
- With nothing after `-w`, `security` prompts for the value. The token never reaches shell history, `ps` or scrollback.

One Keychain service per project. `bws-token` is the default name. For a client project use `bws-token-<client>`.

## 3. Wire up the launch route you need

### Session wrapper (shared API keys)

Add to `~/.zshrc`:

```bash
cc() {
  BWS_ACCESS_TOKEN=$(security find-generic-password -s bws-token -w) \
    bws run --project-id <project-uuid> -- claude "$@"
}
```

Every secret in that project is then in Claude Code's environment for the session.

### Server launcher (M365 server)

`mcp-servers/m365-graph/start.sh` calls `bws run` itself, so only the server process receives the client's credentials. Tell it which project and which Keychain service in the server's `env` block in `~/.claude.json`:

```json
"m365-graph": {
  "type": "stdio",
  "command": "/path/to/agent-skills/mcp-servers/m365-graph/start.sh",
  "args": [],
  "env": {
    "BWS_PROJECT_ID": "<client-project-uuid>",
    "BWS_TOKEN_SERVICE": "bws-token-<client>"
  }
}
```

`BWS_PROJECT_ID` is an identifier, not a secret. `BWS_TOKEN_SERVICE` defaults to `bws-token` when omitted.

If Claude Code was started through a wrapper that already injected `TENANT_ID` and the other M365 variables, `start.sh` uses those and does not call `bws` again.

## 4. Validate without printing the secret

```bash
BWS_ACCESS_TOKEN=$(security find-generic-password -s bws-token -w) \
  bws run --project-id <project-uuid> -- sh -c 'test -n "$CONTEXT7_API_KEY" && echo present'
```

`present` means injection works. Nothing printed means the secret is missing from the project or the token cannot read it.

For the M365 server, run the launcher by hand. It reports what is missing on stderr and exits:

```bash
BWS_PROJECT_ID=<client-project-uuid> BWS_TOKEN_SERVICE=bws-token-<client> \
  /path/to/agent-skills/mcp-servers/m365-graph/start.sh
```

A healthy start prints `Credentials loaded. Starting server...` and then waits for MCP input. Stop it with Ctrl-C.

## 5. Restart the shell

```bash
exec zsh
```

## Headless or SSH sessions

The login keychain is unlocked after a GUI login. In a headless session unlock it first:

```bash
security unlock-keychain ~/Library/Keychains/login.keychain-db
```

## Fallback: Password Manager wrapper

Use only if Secrets Manager is unavailable. The secrets must also exist in the Password Manager vault, and the two stores drift unless every rotation updates both.

```bash
cc() {
  (
    set -euo pipefail
    export BW_SESSION=$(bw unlock --raw)
    CONTEXT7_API_KEY=$(bw get item context7 --session "$BW_SESSION" \
      | jq -er '.fields[]|select(.name=="CONTEXT7_API_KEY").value')
    export CONTEXT7_API_KEY
    exec claude "$@"
  )
}
```

`set -euo pipefail` with `jq -e` aborts on a missing or empty field instead of launching Claude Code with blank credentials. The subshell keeps the variables out of the parent shell.

This fallback hands Claude Code a session for the whole vault, not one project. That is the reason Secrets Manager replaced it. `start.sh` does not support it.
