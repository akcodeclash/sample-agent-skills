# Skill Format Rules

Every skill requires SKILL.md with name + description frontmatter. Keep SKILL.md under 500 lines; move overflow to `references/`.

## Required frontmatter

```
---
name: skill-name
description: When and why to use this skill (third person, imperative tone)
---
```

## Checklist for new skills

- [ ] `name` matches the folder name exactly
- [ ] `description` explains when to invoke it
- [ ] `## Security` section if the skill retrieves external content
- [ ] Output format defined (template or example)
- [ ] Long reference material moved to `references/` subdirectory

## Oversized skills

If SKILL.md exceeds 500 lines, split into:

```
<skill-name>/
├── SKILL.md           # overview + navigation (under 500 lines)
├── references/         # detailed docs, schemas, examples
│   ├── advanced.md
│   └── examples.md
└── scripts/           # optional helper scripts
```

Reference supporting files from SKILL.md:

```
## Additional resources
- For complete API details, see [references/advanced.md](references/advanced.md)
```
