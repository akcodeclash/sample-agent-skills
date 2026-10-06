# Git Workflow

## Commits

- Use Conventional Commits format (`feat:`, `fix:`, `docs:`, `refactor:`)
- Co-author line: `Co-Authored-By: anthonyassistant` — no email, no angle brackets
- Commit in stages tied to plan checkpoints
- Each commit should compile and pass tests

## Skills

- Client-specific skills live under `~/clients/<client>/` (separate git repo) and extend shared capabilities
- Never modify shared capability files from client directories
- Test fixtures live under `tests/` (not mixed with production skills)
