---
description: Show detailed information about a skill
---

Display comprehensive information about an installed or available skill.

**Usage:**
```bash
/skill-info <skill-name>

# Examples:
/skill-info git-workflow
/skill-info @ainative/zerodb-workflows
/skill-info mcp-builder
```

**Displayed Information:**

**1. Basic Details:**
- Skill name
- Version
- Description (full)
- Author
- Status (installed/available, enabled/disabled)

**2. Metadata:**
- Category
- Tags
- Created date
- Last updated
- Source (local, official, community, GitHub, NPM)

**3. Installation:**
- Installation location
- Install command (if not installed)
- Size on disk
- Dependencies (if any)

**4. Usage:**
- How to invoke the skill
- Skill command (if applicable)
- Example usage
- When to use this skill

**5. Contents:**
- Number of files
- Main skill file (SKILL.md)
- Reference documents
- Scripts
- Assets

**6. Statistics:**
- Times invoked (if tracked)
- Last used
- Success rate (if tracked)

**Output Format:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
git-workflow (v1.0.0) ✅ INSTALLED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Description:
  Git commit standards, PR workflow, and branching strategy
  enforcement with zero tolerance for AI attribution.

Metadata:
  Category: workflow
  Tags: git, ci-cd, standards
  Author: AINative Team
  Created: 2025-01-01
  Updated: 2025-01-02

Installation:
  Location: ~/.ainative/skills/git-workflow/
  Source: local (project-managed)
  Size: 45 KB
  Status: Enabled

Usage:
  Invoke: Use this skill when creating commits, PRs, or managing
          branches. It provides zero-tolerance enforcement rules.

  The skill includes:
  - Commit message standards
  - PR description templates
  - Branch naming conventions
  - AI attribution prohibition rules

Contents:
  📄 SKILL.md (main skill file)
  📁 references/ (3 documents)
     - git-standards.md
     - pr-template.md
     - branching-strategy.md
  📁 scripts/ (1 script)
     - validate-commit.sh

Dependencies:
  None

Statistics:
  Times invoked: 47
  Last used: 2 hours ago
  Success rate: 98%

Documentation:
  Full content available in SKILL.md

To use this skill, Claude will automatically apply these rules
when you work on git-related tasks.

To disable: /skill-disable git-workflow
To remove: /skill-remove git-workflow
To update: /skill-update git-workflow
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**For Available (Not Installed) Skills:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@ainative/zerodb-workflows (v1.2.0) ⬇️  AVAILABLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Description:
  ZeroDB best practices, patterns, and workflows for building
  production-ready applications with ZeroDB MCP.

Metadata:
  Category: database, development
  Tags: zerodb, mcp, best-practices
  Author: AINative Official
  Version: 1.2.0
  Source: NPM (@ainative scope)

Features:
  - Database schema design patterns
  - Query optimization strategies
  - Vector search best practices
  - Event streaming patterns
  - PostgreSQL integration guides

To install:
  /skill-install @ainative/zerodb-workflows

Preview:
  https://npmjs.com/package/@ainative/zerodb-workflows
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Options:**
- `--json` - Output in JSON format
- `--files` - List all files in skill
- `--content` - Show full SKILL.md content
- `--dependencies` - Show dependency tree

**Error Handling:**
- Skill not found → Search marketplace and show suggestions
- Invalid skill name → Show correct format
- Corrupted skill → Show validation errors

**Use Cases:**
- Before installing a skill
- Understanding what a skill does
- Debugging skill issues
- Deciding whether to keep/remove a skill
