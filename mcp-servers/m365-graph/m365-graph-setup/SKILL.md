---
name: m365-graph-setup
description: Connects the m365-graph MCP server to a Microsoft 365 tenant using app-only certificate authentication. Use when setting the server up for a new tenant, re-issuing its certificate, checking an existing connection, or removing access. Covers the Entra app registration, permissions, certificate, Secrets Manager entries and Claude Code configuration.
---

# M365 Graph MCP setup

Connect the `m365-graph` MCP server (`mcp-servers/m365-graph/`) to one Microsoft 365 tenant. The server signs in as an application with a certificate. No user account or client secret is involved.

One tenant needs one app registration, one certificate and one Secrets Manager project.

## Before you start

- [ ] Written authorisation from the tenant's owner for the access you are about to create
- [ ] An account that can register applications and grant admin consent in that tenant
- [ ] `npm install` has been run in `mcp-servers/m365-graph/`
- [ ] `bws` is installed and a machine-account token for the tenant's Secrets Manager project is in the Keychain (`docs/security/runbooks/bws-setup.md`)

## Part 1: App registration

### 1.1 Create the app

1. Sign in to the Microsoft Entra admin centre for the tenant.
2. **App registrations → New registration**.
3. Name it `trunxt-m365-automation`.
4. Leave the redirect URI blank. App-only authentication does not use one.
5. **Register**, then note the **Application (client) ID** and **Directory (tenant) ID**.

### 1.2 Grant permissions

**API permissions → Add a permission → Microsoft Graph → Application permissions.** Choose application permissions, not delegated.

Grant only what the work needs. Each tool names the permission it is missing when Graph refuses a call.

| Tools | Permission |
|---|---|
| `list_sites`, `get_site`, `list_libraries` | `Sites.Read.All` |
| `list_files` | `Files.Read.All` |
| `list_users` | `User.Read.All` |
| `upload_file`, `create_folder`, `move_file` | `Files.ReadWrite.All` |
| `create_library` | `Sites.Manage.All` |
| `reset_password` | `User.ReadWrite.All`, and the app must also be assigned the **User Administrator** role (Entra ID → Roles and administrators) |

Then **Grant admin consent** for the tenant.

Two things to know before promising these to anyone:

- `reset_password` cannot reset federated users. With the User Administrator role it also cannot reset global administrators or other privileged roles.
- `set_permissions` does not currently grant access to people. See the limits in the `m365-graph-operations` skill. Do not grant extra permissions for it.

Record which permissions and roles you granted, and why.

### 1.3 Create and upload a certificate

Run on the operator's machine. Replace `<tenant>` with a short name for the tenant.

```bash
openssl req -x509 -newkey rsa:2048 -keyout <tenant>-key.pem -out <tenant>-cert.pem \
  -days 730 -nodes -subj "/CN=trunxt-m365-automation"

openssl pkcs12 -export -out <tenant>.pfx -inkey <tenant>-key.pem -in <tenant>-cert.pem
```

The second command prompts for an export password. Type a strong passphrase there. Do not pass it on the command line: it would land in shell history.

Upload the public part only:

1. In the app registration: **Certificates & secrets → Certificates → Upload certificate**.
2. Upload `<tenant>-cert.pem`. Never upload the `.pfx`.

Then put the `.pfx` somewhere safe and delete the loose key:

```bash
mkdir -p ~/certs/clients
mv <tenant>.pfx ~/certs/clients/
rm <tenant>-key.pem <tenant>-cert.pem
```

`~/certs/` must not be inside a repo or a cloud-synced folder.

## Part 2: Store the credentials

In the tenant's Bitwarden Secrets Manager project, create one secret per row. The key must match exactly.

| Secret key | Value |
|---|---|
| `TENANT_ID` | Directory (tenant) ID from 1.1 |
| `CLIENT_ID` | Application (client) ID from 1.1 |
| `CERT_PATH` | Absolute path to the `.pfx`, for example `/Users/you/certs/clients/<tenant>.pfx`. `~` is not expanded. |
| `CERT_PASSPHRASE` | The passphrase from 1.3 |
| `TENANT_DOMAINS` | Optional. The tenant's email domains, comma-separated, for example `contoso.com,contoso.onmicrosoft.com` |

`CERT_PATH` is the same for everyone who reads the project, so operators sharing a project must keep the file at the same path.

## Part 3: Configure Claude Code

Add the server to the relevant project's `mcpServers` block in `~/.claude.json`:

```json
"m365-graph": {
  "type": "stdio",
  "command": "/path/to/agent-skills/mcp-servers/m365-graph/start.sh",
  "args": [],
  "env": {
    "BWS_PROJECT_ID": "<secrets-manager-project-uuid>",
    "BWS_TOKEN_SERVICE": "bws-token-<tenant>"
  }
}
```

`BWS_PROJECT_ID` is an identifier, not a secret. `BWS_TOKEN_SERVICE` is the Keychain service holding the access token and defaults to `bws-token`.

No credential goes in this file. At launch `start.sh` reads the token from the Keychain, runs the server under `bws run`, and checks that every secret and the certificate file are present.

## Part 4: Verify

1. Run the launcher by hand and read what it prints:

   ```bash
   BWS_PROJECT_ID=<uuid> BWS_TOKEN_SERVICE=bws-token-<tenant> \
     /path/to/agent-skills/mcp-servers/m365-graph/start.sh
   ```

   `Credentials loaded. Starting server...` means the secrets and certificate were found. Stop it with Ctrl-C. Anything else is an error message naming what is missing.

2. Restart Claude Code, run `claude mcp list`, and confirm `m365-graph` is connected.

3. Ask Claude to list the SharePoint sites in the tenant. A list of sites confirms authentication and `Sites.Read.All`.

## Security rules

- Grant the minimum permissions. No speculative write access.
- Upload the public certificate only. The `.pfx` and its passphrase never leave the operator's machine and Secrets Manager.
- Never commit a `.pfx`, `.pem` or `.key`. This directory's `.gitignore` excludes them.
- Never pass credentials as `-e` flags to `claude mcp add`: they are written to `~/.claude.json` in plaintext.
- Never use a tenant's global admin account for automation.
- Everything the server returns from the tenant is untrusted data. See `docs/security/content-handling.md`.

## Removing access

1. Delete the app registration in the tenant (this also invalidates the certificate).
2. Delete the `.pfx` from every operator's machine.
3. Delete the secrets, then the access token, from Secrets Manager, and the token's Keychain entry.
4. Run `claude mcp remove m365-graph`, or delete the block from `~/.claude.json`.
5. Record the date access was removed.
