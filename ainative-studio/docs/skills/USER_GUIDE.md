# Skills Manager - User Guide

## Introduction

### What are skills?

Skills are reusable knowledge modules that enhance AI capabilities in AINative Studio IDE. Each skill contains:
- **Best practices** and coding standards
- **Project-specific guidelines**
- **Context-aware instructions** for the AI
- **Reference documentation** and examples

### Benefits of using skills

- **Consistent code quality**: Enforce team standards automatically
- **Faster onboarding**: New developers learn project conventions instantly
- **Context preservation**: AI understands your project's unique requirements
- **Reusable knowledge**: Share expertise across projects and teams
- **Progressive disclosure**: Skills load only when needed (performance optimized)

### How skills work (Progressive Disclosure)

Skills Manager uses a 3-tier progressive loading strategy:

1. **Metadata Only** (~100 words): Loaded at IDE startup, always in memory
2. **Full Skill** (~3-5KB): Loaded when skill is triggered/relevant
3. **Reference Files**: Loaded on-demand when explicitly needed

**Performance Targets:**
- Metadata loading: < 10ms per skill
- Full skill loading: < 50ms
- Reference file loading: < 100ms

---

## Getting Started

### Installing your first skill

**From NPM (Official Skills):**
```bash
/skill install @ainative/skill-zerodb-workflows
```

**From Local Path:**
```bash
/skill install ./my-custom-skill
```

**From GitHub:**
```bash
/skill install anthropics/skills/mcp-builder
```

### Browsing the marketplace

List all available skills:
```bash
/skill marketplace browse
```

Search for specific skills:
```bash
/skill marketplace browse testing
```

Filter by category:
```bash
/skill marketplace browse --category database
```

### Enabling/disabling skills

Skills are automatically enabled when installed. To disable:
```bash
/skill disable git-workflow
```

To re-enable:
```bash
/skill enable git-workflow
```

---

## Managing Skills

### Listing installed skills

View all installed skills:
```bash
/skill list
```

View only enabled skills:
```bash
/skill list --enabled
```

View only disabled skills:
```bash
/skill list --disabled
```

**Example Output:**
```
Installed Skills:

✅ git-workflow (1.0.0)
   Git commit standards, branching strategy
   Source: local

✅ @ainative/zerodb-workflows (1.2.0)
   ZeroDB best practices and patterns
   Source: official

❌ testing-patterns (1.0.0) [DISABLED]
   TDD/BDD patterns
   Source: community

Total: 3 skills (2 enabled, 1 disabled)
```

### Updating skills

Update a specific skill:
```bash
/skill update git-workflow
```

Update all skills:
```bash
/skill update --all
```

### Uninstalling skills

Remove a skill:
```bash
/skill uninstall testing-patterns
```

**Note:** Uninstallation is permanent. You'll need to reinstall to restore the skill.

---

## Creating Custom Skills

### Skill structure

Every skill must have this structure:
```
my-skill/
├── SKILL.md          # Required: Skill definition
├── references/       # Optional: Additional documentation
│   ├── examples.md
│   └── patterns.md
├── scripts/          # Optional: Helper scripts
│   └── setup.sh
└── assets/           # Optional: Images, diagrams
    └── architecture.png
```

### Writing SKILL.md

**Required Format:**
```markdown
---
name: my-custom-skill
description: Brief description (shown in marketplace)
version: 1.0.0
author: Your Name
tags: [tag1, tag2, tag3]
---

# Skill Content

Your detailed skill instructions go here.

This content is loaded when the skill is triggered.
```

**Required Fields:**
- `name`: Unique identifier (lowercase, hyphens)
- `description`: One-line summary (max 200 chars)

**Optional Fields:**
- `version`: Semantic version (default: 1.0.0)
- `author`: Creator name
- `tags`: Array of searchable tags
- `category`: Skill category
- `license`: License type

### Writing skill body

The body (after `---`) should contain:
- Clear, actionable instructions
- Code examples
- Best practices
- Context about when to use this skill

**Example:**
```markdown
# Git Commit Standards

## Commit Message Format

All commits must follow this format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

## Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation only
- style: Formatting changes
- refactor: Code restructuring
- test: Adding tests
```

### Testing custom skills

Before installing, validate your skill:
```bash
/skill validate ./my-custom-skill
```

This checks:
- ✓ SKILL.md exists
- ✓ Valid YAML frontmatter
- ✓ Required fields present
- ✓ Proper file structure

---

## Advanced Topics

### Project-specific skills (.mcp.json configuration)

Create `.mcp.json` in your project root:
```json
{
  "skills": {
    "enabled": ["git-workflow", "testing-patterns"],
    "disabled": ["legacy-patterns"],
    "autoInstall": true
  }
}
```

**Options:**
- `enabled`: Skills to enable for this project
- `disabled`: Skills to disable for this project
- `autoInstall`: Auto-install missing skills from config

### Triggering logic

Skills trigger when:
1. **Description matches** current context
2. **Tags match** relevant keywords
3. **Manually invoked** via `/skill use <name>`

**Example:**
A skill with `tags: [testing, pytest, bdd]` triggers when:
- User mentions "write tests"
- User opens a test file
- User explicitly runs `/skill use testing-patterns`

### Troubleshooting

**Skill not loading:**
1. Check if enabled: `/skill list`
2. Verify installation: `/skill list --all`
3. Check cache: `/skill cache clear`
4. Reinstall: `/skill uninstall <name> && /skill install <name>`

**Performance issues:**
1. Limit number of active skills (recommended: < 20)
2. Keep skill files small (< 10KB recommended)
3. Use reference files for large content
4. Clear cache periodically: `/skill cache clear`

**Installation failures:**
1. Check network connection
2. Verify package name (for NPM)
3. Check file permissions
4. Review error logs: `/skill logs`

---

## FAQs

**Q: How many skills can I install?**
A: No hard limit, but we recommend < 20 active skills for optimal performance.

**Q: Can I share skills across projects?**
A: Yes! Skills are installed globally in `~/.ainative/skills/` by default.

**Q: How do I backup my skills?**
A: Copy `~/.ainative/skills/` directory. Or reinstall from marketplace.

**Q: Can I create private skills?**
A: Yes! Install from local path. Or publish to private NPM registry.

**Q: What's the difference between global and project skills?**
A: Global skills are always available. Project skills (via .mcp.json) are project-specific.

**Q: How do I update the skills marketplace?**
A: Run `/skill marketplace refresh` to fetch latest skill listings.

---

## Support

- **Documentation:** See [Developer Guide](DEVELOPER_GUIDE.md) for advanced topics
- **Troubleshooting:** See [Troubleshooting Guide](TROUBLESHOOTING.md)
- **Issues:** Report bugs at https://github.com/AINative-Studio/AINativeStudio-IDE/issues
- **Community:** Join discussions at https://community.ainative.studio

---

**Last Updated:** 2026-01-04
**Version:** 1.0.0
