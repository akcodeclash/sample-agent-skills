# Runbook: Emergency rotation

Use this when a credential may have been exposed. Policy and normal rotation cadence: [`../secrets-management.md`](../secrets-management.md).

## When to run it

Any one of these:

- A token, key, passphrase or certificate file appears somewhere it should not be: a git commit, a chat message, a screenshot, a ticket, a recording, a paste site.
- A token holder reports a lost, stolen or unattended laptop.
- Secrets Manager access logs or a service's usage show activity nobody can explain.
- A machine account may be compromised.

If you are unsure, run it. An unnecessary rotation costs less than a live leaked credential.

## Steps

### 1. Revoke first

Do not wait for the replacement.

| Leaked credential | Revoke it here |
|---|---|
| Machine-account access token | Secrets Manager: revoke the token |
| API key | The service's dashboard (Anthropic, Context7, Trigger.dev, and so on) |
| M365 certificate (`.pfx`) or its passphrase | The client's Microsoft Entra ID: delete the certificate from the app registration |

If a service cannot revoke, generate a new credential and delete the old one as fast as you can.

### 2. Audit access

Pull logs for the suspected window, and extend it back to the last time you know things were clean.

- Secrets Manager: the machine account's access log. Which secrets were read, when, from which IPs.
- Each service: usage by key. Look for unexpected volume, unfamiliar IPs or user agents, unusual endpoints.
- Microsoft Entra ID: sign-in logs for the app registration, and the audit log for changes it made.

Flag anything that does not match the legitimate holder's activity.

### 3. Rotate everything the leak could reach

Assume the credential was read and used.

- **Access token:** rotate every secret in every project that token could read.
- **API key:** rotate it in the service's dashboard, then check it was not reused anywhere else.
- **M365 certificate or passphrase:** issue a new certificate, upload its public part to the app registration, replace the `.pfx` on each operator's machine, and update `CERT_PASSPHRASE` (and `CERT_PATH` if it moved) in the client's Secrets Manager project. The certificate steps are in the `m365-graph-setup` skill, part 1.3.
- **Laptop loss or theft:** rotate every credential that machine could reach, whatever the project, including every `.pfx` stored on it.

### 4. Issue replacements

- Create the new credential in Secrets Manager or the service's dashboard.
- Deliver it with Bitwarden Send. Never by chat, email body or ticket comment.
- The recipient updates the Keychain: `security add-generic-password -U -s bws-token -a "$USER" -w`.

### 5. Remove the exposed copy

Revoking makes the credential useless. Still remove what you can.

- **Git:** rewriting history or deleting a file does not remove a pushed commit from the host. It stays retrievable by its ID. For a public repository, delete and recreate the repository, or ask the host's support to purge the commit. Assume clones and caches already have it.
- **Chat, tickets, recordings:** delete or redact the message or attachment.

### 6. Post-mortem

Within one business day:

- Write down how the credential leaked and which control failed.
- Add or strengthen the control: a `gitleaks` pre-commit hook, push protection on the git host, screenshot redaction, a training note.
- File the timeline in the security log.

## Communication

- Tell affected team members their credential is dead before you issue the replacement, so nobody troubleshoots a setup that is working as intended.
- Tell the organisation's administrator if the leaked credential reached more than one project.
- Tell the client if their tenant's certificate or data may be affected.
- Do not paste the leaked credential into the incident channel. Refer to it by its Secrets Manager secret ID.
