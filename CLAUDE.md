# sample-agent-skills

An MCP server for Microsoft 365, a local database manager, a skill auditor and the security policy around them. `README.md` has the map. This file is what to know before changing anything.

## Layout

- `mcp-servers/m365-graph/`: TypeScript MCP server and its two skills.
- `infrastructure/docker/`: the `dev` script and compose template.
- `skills/auditing-skills/`: the auditor skill.
- `docs/security/`: policy and runbooks.
- `tests/`: fixtures that are broken on purpose. Do not fix them.

This repository is public. Never add a real client name, tenant or client ID, email address, home-directory path or credential. Use `acme`, `contoso` and `<placeholders>`.

## Rules

Detailed rules load from `.claude/rules/` (skill format, security, git workflow). The ones that matter most:

- No secrets in any tracked file. Credentials come from Bitwarden Secrets Manager through `bws run`.
- A skill that reads external content needs a `## Security` section. A hook reminds you after an edit.
- Conventional Commits, with the co-author line from `.claude/rules/git-workflow.md`.

## Commands

```bash
cd mcp-servers/m365-graph && npm test          # 25 tests
cd mcp-servers/m365-graph && npx tsc --noEmit -p .
infrastructure/docker/scripts/dev status
gitleaks dir .                                 # before committing
```

## When changing things

- Changing the `dev` script or `start.sh`: run `bash -n` on it and exercise the changed path. Both run under `set -euo pipefail`, where a function that ends on a false `[[ ... ]] &&` guard makes the whole script exit.
- Changing an M365 tool: update the tool table and limits in `m365-graph-operations/SKILL.md` in the same commit.
- Changing where secrets come from: update `docs/security/secrets-management.md` and `runbooks/bws-setup.md` in the same commit.
- Adding a skill: `name` must equal the folder name. Run the `auditing-skills` skill afterwards.
