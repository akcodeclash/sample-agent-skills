# Runbook: Move from the Password Manager wrapper to Secrets Manager

Status: done for this repo's own tooling. The M365 launcher (`start.sh`) was the last piece and moved in October 2026. Keep this as the record, and as the procedure if a new organisation or machine has to repeat the move. Policy: [`../secrets-management.md`](../secrets-management.md).

## Who does what

The Bitwarden organisation's administrator runs steps 1 to 3 and step 7. Each team member runs steps 4 to 6.

## Steps

### 1. Enable Secrets Manager on the organisation

Free tier, checked 2026-05-26: 2 users, 3 projects, 3 machine accounts. Verify the limits first.

### 2. Create projects

- `agent-skills-shared` for credentials used across clients.
- One project for each client that has its own credentials.

If the three-project ceiling pinches, fold clients with nothing sensitive into `agent-skills-shared`.

### 3. Copy secrets from the vault into projects

For each secret: key = the environment variable name, value = the credential, project = the scope that owns it.

An M365 vault item with custom fields becomes one secret per field in the client's project: `TENANT_ID`, `CLIENT_ID`, `CERT_PATH`, `CERT_PASSPHRASE`, and `TENANT_DOMAINS` if used.

Leave the vault entries in place until step 7.

### 4. Create a machine account and token

- Create the machine account in the Secrets Manager web UI.
- Grant read-only access to only the projects that person needs.
- Generate one token per project. Deliver it with Bitwarden Send if you are provisioning for someone else.

### 5. Store the token in the Keychain

```bash
security add-generic-password -U -s bws-token -a "$USER" -w
```

Use `bws-token-<client>` for a client project's token.

### 6. Validate, then switch

Validate first, without printing the secret:

```bash
BWS_ACCESS_TOKEN=$(security find-generic-password -s bws-token -w) \
  bws run --project-id <project-uuid> -- sh -c 'test -n "$CONTEXT7_API_KEY" && echo present'
```

Only after it prints `present`, replace the old `cc()` in `~/.zshrc` and set `BWS_PROJECT_ID` for the M365 server, both as described in [`bws-setup.md`](bws-setup.md). Switching before validating leaves you with a wrapper that cannot start.

### 7. Delete the old vault entries

After every team member confirms the new route works, delete the migrated entries from the Password Manager vault.

Keep them only if you plan to use the Password Manager fallback. In that case record which secrets live in both stores, and update both on every rotation.

## Rollback

1. Stop. Do not delete vault entries.
2. Each team member restores the previous `cc()` wrapper.
3. Find the cause: token scope, project UUID, `bws` install, or the Keychain entry.
4. Resume from step 4.

The M365 launcher has no rollback to the vault: it reads Secrets Manager only. To roll that back, check out the earlier `start.sh` from git history.
