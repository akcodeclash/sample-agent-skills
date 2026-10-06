# Tests

Fixtures for the `auditing-skills` skill. Nothing here is a real skill.

## What is here

`auditing/dirty-test-repo/` is a small skills repo that is broken on purpose. Each fixture carries one planted defect:

| Fixture | Planted defect | Check it exercises |
|---|---|---|
| `capabilities/wrong-name/` | `name: totally-wrong` in a folder called `wrong-name` | 1. Name and folder match |
| `patterns/no-description/` | No `description:` field | 2. Required frontmatter |
| `capabilities/stale-refs/` | Refers to `analyzing-data` and `generating-report`, which do not exist | 4. Stale skill references |
| `capabilities/broken-link/` | Links to `references/nonexistent.md` | 5. Broken links |

All four are also shorter than five lines, so check 6 (incomplete body) fires on each.

Checks 3 (frontmatter delimiters) and 7 (body over 500 lines) have no fixture yet.

## How it is used

Ask Claude to audit `tests/auditing/dirty-test-repo` and compare the report with the expected findings in `skills/auditing-skills/evals/evals.json` (eval 2). There is no automated runner: the evals are a checklist for a person or an eval harness.

When the whole repository is audited, the skill leaves `tests/` out, so these planted defects do not show up as real findings.
