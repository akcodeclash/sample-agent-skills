# .claude conventions

Root `CLAUDE.md` covers the repo. This file lists what is in `.claude/`.

## Rules

@rules/skill-format.md
@rules/security.md
@rules/git-workflow.md

## Hook

`hooks/check-skill-security.py` runs after every Write or Edit (configured in `settings.json`). When the edited file is a `SKILL.md` under `skills/` or `mcp-servers/` that names a network action or external source and has no `## Security` heading, it tells you so. Add the section described in `rules/security.md`.

It is a reminder. It does not block the edit and it does not judge whether the section is adequate.
