#!/usr/bin/env bash
# Launcher for the m365-graph MCP server.
#
# Credentials come from Bitwarden Secrets Manager at launch. Nothing is stored
# on disk or in Claude Code config. See docs/security/secrets-management.md.
#
# The client's Secrets Manager project holds one secret per variable:
#   TENANT_ID        Microsoft Entra directory (tenant) ID
#   CLIENT_ID        App registration application (client) ID
#   CERT_PATH        Absolute path to the .pfx file on this machine
#   CERT_PASSPHRASE  Passphrase for the .pfx
#   TENANT_DOMAINS   Comma-separated tenant email domains (optional; without it
#                    set_permissions treats every address as external)
#
# Two ways to launch:
#   1. Through a bws wrapper that already injected the secrets (the cc alias in
#      docs/security/runbooks/bws-setup.md). This script finds them in the
#      environment and starts the server.
#   2. Directly. Set BWS_PROJECT_ID in the server's env block in ~/.claude.json.
#      This script reads the access token from the macOS Keychain service named
#      by BWS_TOKEN_SERVICE (default: bws-token) and re-runs itself under
#      `bws run`.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Everything goes to stderr: stdout belongs to the MCP protocol.
fail() { echo "[m365-graph] ERROR: $*" >&2; exit 1; }

if [[ -z "${TENANT_ID:-}" && -z "${M365_GRAPH_SECRETS_INJECTED:-}" ]]; then
  command -v bws >/dev/null 2>&1 || fail "bws not found. See docs/security/runbooks/bws-setup.md."
  [[ -n "${BWS_PROJECT_ID:-}" ]] || fail "BWS_PROJECT_ID is not set. Add it to this server's env block in ~/.claude.json."
  if [[ -z "${BWS_ACCESS_TOKEN:-}" ]]; then
    service="${BWS_TOKEN_SERVICE:-bws-token}"
    BWS_ACCESS_TOKEN="$(security find-generic-password -s "$service" -w 2>/dev/null)" \
      || fail "No access token in Keychain service '$service'. See docs/security/runbooks/bws-setup.md."
    export BWS_ACCESS_TOKEN
  fi
  M365_GRAPH_SECRETS_INJECTED=1 exec bws run --project-id "$BWS_PROJECT_ID" -- "$SCRIPT_DIR/start.sh"
fi

# The server needs the secrets, not the token that fetched them.
unset BWS_ACCESS_TOKEN

missing=()
for name in TENANT_ID CLIENT_ID CERT_PATH CERT_PASSPHRASE; do
  [[ -n "${!name:-}" ]] || missing+=("$name")
done
if [[ ${#missing[@]} -gt 0 ]]; then
  fail "Missing secrets in the Secrets Manager project: ${missing[*]}"
fi

[[ -f "$CERT_PATH" ]] || fail "Certificate file not found at '$CERT_PATH'. Update CERT_PATH in the Secrets Manager project."

tsx="$SCRIPT_DIR/node_modules/.bin/tsx"
[[ -x "$tsx" ]] || fail "Dependencies not installed. Run: (cd '$SCRIPT_DIR' && npm install)"

echo "[m365-graph] Credentials loaded. Starting server..." >&2
exec "$tsx" "$SCRIPT_DIR/src/index.ts"
