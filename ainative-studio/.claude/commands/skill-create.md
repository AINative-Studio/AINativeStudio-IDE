---
description: Create a new custom skill with template
---

Scaffold a new custom skill with proper structure and template files.

**Usage:**
```bash
/skill-create <skill-name>

# Examples:
/skill-create my-project-workflow
/skill-create database-patterns
/skill-create team-conventions
```

**Interactive Prompts:**

The command will guide you through skill creation:

1. **Skill Name:** (provided as argument or prompted)
   - Validate name format (lowercase, hyphens, no spaces)
   - Check for conflicts with existing skills

2. **Description:** (one-line summary)
   - What does this skill help with?
   - Example: "MongoDB best practices for our team"

3. **Category/Tags:**
   - Select from: development, deployment, testing, documentation, workflow, database, other
   - Multiple tags allowed

4. **Skill Type:**
   - Project-specific (for this repo only)
   - Portable (can be shared/published)

5. **Include Examples:** (Y/n)
   - Add example usage in SKILL.md

**Generated Structure:**
```
~/.ainative/skills/<skill-name>/
├── SKILL.md              # Main skill file with frontmatter
├── README.md             # Documentation
├── references/           # Reference documents
│   └── .gitkeep
├── scripts/              # Helper scripts
│   └── .gitkeep
├── assets/               # Images, diagrams
│   └── .gitkeep
└── examples/             # Usage examples
    └── .gitkeep
```

**SKILL.md Template:**
```markdown
---
name: <skill-name>
version: 1.0.0
description: <one-line description>
author: <git user.name>
category: <selected-category>
tags: [<tag1>, <tag2>]
created: <ISO date>
updated: <ISO date>
---

# <Skill Name>

## Purpose

[What problem does this skill solve?]

## When to Use

Use this skill when:
- [Scenario 1]
- [Scenario 2]
- [Scenario 3]

## Instructions

[Main skill instructions that Claude will follow]

### Step 1: [First Step]

[Detailed instructions...]

### Step 2: [Second Step]

[Detailed instructions...]

## Examples

### Example 1: [Use Case]

```
[Example input/output]
```

## References

- [Reference documents in references/ directory]
- [External links]

## Notes

- [Important notes or caveats]
- [Best practices]
```

**After Creation:**

The command will:
1. Create directory structure
2. Generate template files
3. Initialize git (if not in git repo)
4. Open SKILL.md in editor
5. Show next steps

**Output:**
```
Creating new skill: my-project-workflow

✓ Created directory structure
✓ Generated SKILL.md template
✓ Created subdirectories
✓ Initialized metadata

Skill created at: ~/.ainative/skills/my-project-workflow/

Next steps:
1. Edit SKILL.md with your skill instructions
2. Add reference documents to references/
3. Test the skill: /skill invoke my-project-workflow
4. Install for use: /skill-install ./my-project-workflow

Opening SKILL.md in editor...
```

**Options:**
- `--template <template-name>` - Use specific template
- `--no-subdirs` - Don't create subdirectories
- `--no-edit` - Don't open in editor
- `--location <path>` - Create in custom location

**Templates Available:**
- `basic` - Minimal structure (default)
- `workflow` - For workflow/process skills
- `coding` - For coding standards/patterns
- `deployment` - For deployment procedures
- `testing` - For testing strategies

**Error Handling:**
- Skill already exists → Prompt to overwrite or choose new name
- Invalid name format → Show valid format
- Permission denied → Show permission fix
- Location not writable → Suggest alternative location

**Tips:**
- Keep instructions clear and actionable
- Include examples for common scenarios
- Reference external docs in references/
- Use YAML frontmatter for metadata
- Version your skills (start at 1.0.0)
