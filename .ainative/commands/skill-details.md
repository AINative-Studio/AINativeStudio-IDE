---
description: Show detailed information about a skill
---

Display comprehensive information about a skill from the marketplace or an installed skill.

**Usage:**
```
/skill-details <name> [--registry <registry>] [--version <version>]
```

**Parameters:**
- `<name>`: Skill name (required)
- `--registry`: Specific registry to query (if not installed)
- `--version`: Specific version to view (default: latest)

**Examples:**
```
/skill-details git-workflow
/skill-details git-hooks --registry anthropic
/skill-details testing-utils --version 1.5.0
```

You are helping the user view detailed information about a skill.

**Instructions:**
1. Parse the command arguments
2. Check if the skill is installed using `getInstalledSkill()`
3. If not installed, fetch details using `getSkillDetails()`
4. Display comprehensive information including:
   - Name, version, and author
   - Description and README (if available)
   - Tags and keywords
   - Registry source
   - Dependencies
   - Metadata (downloads, rating, last updated)
   - Installation instructions
   - Usage examples (if available)

**Example Output:**
```
═══════════════════════════════════════════════════════════════════════════
  git-workflow v1.2.0
═══════════════════════════════════════════════════════════════════════════

Author: AINative Team
Registry: @ainative/official
License: Apache-2.0

Description:
Git commit and PR workflow automation with conventional commits support,
branch naming validation, and automated PR creation.

⭐ Rating: 4.8/5.0 (42 reviews)
📥 Downloads: 1,234
📅 Last Updated: 2 days ago
📅 Created: 3 months ago

Tags: git, workflow, automation, conventional-commits, pr

Dependencies:
- git-utils v1.0.0 (official)
- workflow-helpers v2.1.0 (official)

Available Versions:
- v1.3.0 (latest) - New features available
- v1.2.0 (current)
- v1.1.0
- v1.0.0

Repository: https://github.com/ainative/skills/tree/main/git-workflow
Homepage: https://skills.ainative.studio/git-workflow
Issues: https://github.com/ainative/skills/issues

README:
────────────────────────────────────────────────────────────────────────
# Git Workflow Skill

Automate your git workflow with conventional commits, branch naming
validation, and automated PR creation.

## Features
- Conventional commit message validation
- Branch naming conventions
- Automated PR creation with templates
- Commit history analysis
- Release note generation

## Usage
This skill is automatically invoked when you work with git operations...
────────────────────────────────────────────────────────────────────────

Installation:
$ /skill-install git-workflow

Update available:
v1.3.0 is now available (currently on v1.2.0)
$ /skill-update git-workflow
```
