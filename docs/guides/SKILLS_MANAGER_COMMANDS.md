# Skills Manager Commands Guide

Complete reference for managing skills in AINative Studio using CLI commands.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Command Reference](#command-reference)
  - [/skill-list](#skill-list)
  - [/skill-install](#skill-install)
  - [/skill-remove](#skill-remove)
  - [/skill-create](#skill-create)
  - [/skill-info](#skill-info)
  - [/skill-update](#skill-update)
  - [/skill-search](#skill-search)
  - [/skill-enable](#skill-enable)
  - [/skill-disable](#skill-disable)
  - [/skill-sync](#skill-sync)
- [Common Workflows](#common-workflows)
- [Troubleshooting](#troubleshooting)
- [Advanced Topics](#advanced-topics)

---

## Overview

The Skills Manager provides a powerful CLI for installing, managing, and creating AI skills that enhance Claude's capabilities in AINative Studio. Skills are reusable instruction sets that guide Claude's behavior for specific tasks.

**What are Skills?**

Skills are structured markdown files with YAML frontmatter that contain:
- Instructions for Claude to follow
- Reference materials and documentation
- Scripts and automation helpers
- Best practices and patterns

**Why Use Skills?**

- **Consistency**: Enforce standards across your team
- **Reusability**: Share proven patterns and workflows
- **Context**: Give Claude domain-specific knowledge
- **Productivity**: Automate repetitive instruction patterns

---

## Quick Start

### List Available Skills

```bash
/skill-list
```

Shows all installed skills with their status (enabled/disabled).

### Install a Skill

```bash
# From marketplace
/skill-install @ainative/zerodb-workflows

# From local directory
/skill-install ./my-skills/custom-skill

# From GitHub
/skill-install anthropics/skills/mcp-builder
```

### Create Your Own Skill

```bash
/skill-create my-project-workflow
```

This scaffolds a new skill with proper structure and template files.

### Get Skill Information

```bash
/skill-info git-workflow
```

Shows detailed information about a skill including usage, version, and dependencies.

---

## Command Reference

### /skill-list

List all installed and available skills.

**Usage:**
```bash
/skill-list
/skill-list --enabled
/skill-list --disabled
/skill-list --category <category>
```

**Options:**
- `--enabled` - Show only enabled skills
- `--disabled` - Show only disabled skills
- `--category <category>` - Filter by category

**Example Output:**
```
Installed Skills:

✅ git-workflow (v1.0.0) [local]
   Git commit standards and PR workflow
   Tags: git, ci-cd, standards

✅ @ainative/zerodb-workflows (v1.2.0) [official]
   ZeroDB best practices and patterns
   Tags: database, zerodb, mcp

❌ testing-patterns (v1.0.0) [DISABLED]
   TDD/BDD patterns for TypeScript
   Tags: testing, tdd, bdd

Total: 3 skills (2 enabled, 1 disabled)
```

**Tips:**
- Use `--category testing` to find all testing-related skills
- Disabled skills don't load in Claude's context but remain installed
- Local skills are project-specific, official skills come from @ainative

---

### /skill-install

Install a skill from various sources.

**Usage:**
```bash
/skill-install <source>

# Sources:
/skill-install @ainative/zerodb-workflows    # NPM package (official)
/skill-install ./skills/custom-skill         # Local path
/skill-install anthropics/skills/mcp-builder # GitHub repo
/skill-install https://example.com/skill.zip # URL download
/skill-install custom-skill                  # Marketplace search
```

**Installation Process:**

1. **Source Detection**: Automatically detects source type
2. **Download/Copy**: Fetches skill files
3. **Validation**: Checks skill format and structure
4. **Registration**: Adds to skills registry
5. **Confirmation**: Shows installation success

**Example:**
```bash
/skill-install @ainative/zerodb-workflows

Installing from NPM: @ainative/zerodb-workflows

⬇️  Downloading v1.2.0...
✓ Downloaded successfully (45 KB)
✓ Validated skill format
✓ Installed to ~/.ainative/skills/zerodb-workflows/
✓ Registered in skills manager

✅ Successfully installed @ainative/zerodb-workflows (v1.2.0)

The skill provides:
  - Database schema design patterns
  - Query optimization strategies
  - Vector search best practices
  - Event streaming patterns

The skill is now enabled and ready to use.
```

**Error Handling:**

- **Already Installed**: Use `--force` flag to reinstall
- **Network Failure**: Shows retry options and offline suggestions
- **Invalid Format**: Shows specific validation errors
- **Permission Denied**: Suggests permission fixes

---

### /skill-remove

Remove an installed skill.

**Usage:**
```bash
/skill-remove <skill-name>
/skill-remove <skill-name> --force

# Aliases:
/skill-uninstall <skill-name>
/skill-delete <skill-name>
```

**Options:**
- `--force` or `-f` - Skip confirmation prompt
- `--keep-config` - Remove skill but keep configuration
- `--dry-run` - Show what would be removed without actually removing

**Example:**
```bash
/skill-remove git-workflow

Removing skill: git-workflow (v1.0.0)
Location: ~/.ainative/skills/git-workflow/

⚠️  This will permanently delete:
  - Skill files (5 files, 24 KB)
  - Configuration data
  - Any custom modifications

Proceed with removal? (y/N): y

✓ Unregistered from service
✓ Removed from registry
✓ Deleted files
✓ Skill 'git-workflow' removed successfully

To reinstall: /skill-install git-workflow
```

**Safety Features:**
- Always confirms before deletion (unless `--force`)
- Shows exactly what will be deleted
- Prevents removal of core/system skills
- Warns if skill has dependents

---

### /skill-create

Create a new custom skill with template.

**Usage:**
```bash
/skill-create <skill-name>
/skill-create <skill-name> --template <template-name>
```

**Options:**
- `--template <template-name>` - Use specific template (basic, workflow, coding, deployment, testing)
- `--no-subdirs` - Don't create subdirectories
- `--no-edit` - Don't open in editor
- `--location <path>` - Create in custom location

**Interactive Prompts:**

1. **Description**: One-line summary of the skill
2. **Category/Tags**: Classification and searchability
3. **Skill Type**: Project-specific or portable
4. **Include Examples**: Add usage examples

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

**Example:**
```bash
/skill-create my-project-workflow

Creating new skill: my-project-workflow

Description: MongoDB best practices for our team
Category: database
Tags: mongodb, nosql, patterns
Include examples? (Y/n): y

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

**SKILL.md Template:**
```markdown
---
name: my-project-workflow
version: 1.0.0
description: MongoDB best practices for our team
author: Your Name
category: database
tags: [mongodb, nosql, patterns]
created: 2025-01-02T10:30:00Z
updated: 2025-01-02T10:30:00Z
---

# My Project Workflow

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

---

### /skill-info

Show detailed information about a skill.

**Usage:**
```bash
/skill-info <skill-name>
/skill-info <skill-name> --json
```

**Options:**
- `--json` - Output in JSON format
- `--files` - List all files in skill
- `--content` - Show full SKILL.md content
- `--dependencies` - Show dependency tree

**Example Output:**
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

To disable: /skill-disable git-workflow
To remove: /skill-remove git-workflow
To update: /skill-update git-workflow
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Use Cases:**
- Before installing a skill (preview from marketplace)
- Understanding what a skill does
- Debugging skill issues
- Deciding whether to keep/remove a skill

---

### /skill-update

Update skill to latest version.

**Usage:**
```bash
/skill-update <skill-name>
/skill-update --all
/skill-update --check
```

**Options:**
- `--all` - Update all skills with available updates
- `--check` - Check for updates without installing
- `--force` - Force update even if no new version
- `--no-backup` - Skip backup creation
- `--dry-run` - Show what would be updated
- `--pre-release` - Include pre-release versions
- `--yes` or `-y` - Skip confirmation prompts

**Example:**
```bash
/skill-update git-workflow

Checking for updates: git-workflow

Current version: v1.0.0
Latest version:  v1.2.0

Changes in v1.2.0:
  + Added PR review checklist
  + Updated commit message format
  + Fixed branch naming validation
  ! Breaking: Changed default branch from master to main

Backup location: ~/.ainative/skills/.backups/git-workflow-1.0.0/

Proceed with update? (Y/n): y

⬇️  Downloading v1.2.0...
✓ Downloaded successfully
✓ Validated skill format
✓ Created backup
✓ Updated files
✓ Updated registry

✅ git-workflow updated: v1.0.0 → v1.2.0

What's new:
  - PR review checklist now includes security checks
  - Commit format supports conventional commits
  - Branch naming more flexible for feature flags

To rollback: /skill-rollback git-workflow v1.0.0
```

**Check for Updates:**
```bash
/skill-update --check

Checking for updates...

Updates available (3):
  git-workflow:          v1.0.0 → v1.2.0 (minor update)
  @ainative/zerodb:      v1.1.0 → v1.3.0 (minor update)
  testing-patterns:      v2.0.0 → v2.1.0 (patch update)

Up to date (5):
  ✓ mandatory-tdd
  ✓ code-quality
  ✓ database-schema-sync
  ✓ delivery-checklist
  ✓ file-placement

To update all: /skill-update --all
To update specific: /skill-update <skill-name>
```

**Safety Features:**
- Always creates backup before update
- Automatic rollback on failure
- Preserves user customizations
- Shows breaking changes clearly
- Tests skill after update

---

### /skill-search

Search marketplace for skills.

**Usage:**
```bash
/skill-search <query>
/skill-search <query> --category <category>
/skill-search <query> --sort <sort-type>
```

**Options:**
- `--category <category>` - Filter by category
- `--tag <tag>` - Filter by specific tag
- `--source <source>` - Filter by source (official, community, anthropic)
- `--sort <type>` - Sort by: relevance, downloads, stars, updated, name
- `--limit <number>` - Number of results (default: 10)
- `--json` - Output in JSON format
- `--verbose` - Show full descriptions
- `--compact` - Compact one-line format

**Example:**
```bash
/skill-search database

Searching marketplace for "database"...

Found 8 results:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Official AINative Skills (2)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. @ainative/zerodb-workflows (v1.2.0) ⭐ 245
   ZeroDB best practices, patterns, and workflows
   Tags: database, zerodb, mcp, best-practices
   Install: /skill-install @ainative/zerodb-workflows

2. @ainative/database-migrations (v1.0.0) ⭐ 89
   Database migration patterns and schema sync strategies
   Tags: database, migrations, postgres, prisma
   Install: /skill-install @ainative/database-migrations

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Community Skills (6)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3. mongodb-patterns (v2.1.0) ⭐ 178
   MongoDB schema design and query optimization
   Tags: database, mongodb, nosql
   Install: /skill-install mongodb-patterns

... 5 more results

To see all results: /skill-search database --limit 20
```

**Advanced Search:**
```bash
# Search by category
/skill-search --category deployment

# Search official skills only
/skill-search @ainative/

# Search with multiple filters
/skill-search testing --category development --sort downloads

# Compact format
/skill-search database --compact
```

---

### /skill-enable

Enable a disabled skill.

**Usage:**
```bash
/skill-enable <skill-name>
```

**Example:**
```bash
/skill-enable testing-patterns

Enabling skill: testing-patterns

✓ Updated registry
✓ Loaded skill context
✓ Skill 'testing-patterns' is now active

The skill will be available in all new conversations.
To use in current session, skill context has been loaded.
```

---

### /skill-disable

Disable an active skill without removing it.

**Usage:**
```bash
/skill-disable <skill-name>
```

**Example:**
```bash
/skill-disable testing-patterns

Disabling skill: testing-patterns

✓ Updated registry
✓ Removed from active context
✓ Skill 'testing-patterns' is now disabled

The skill will not be loaded in new conversations.
To re-enable: /skill-enable testing-patterns
To remove completely: /skill-remove testing-patterns
```

**Use Cases:**
- Testing without a skill
- Resolving conflicts between skills
- Temporarily reducing context size
- Debugging skill issues

---

### /skill-sync

Sync skills from core repository.

**Usage:**
```bash
/skill-sync
/skill-sync --check
/skill-sync --force
```

**Options:**
- `--check` - Check status only, don't sync
- `--force` - Force sync even if up to date
- `--dry-run` - Show what would be synced
- `--no-pull` - Refresh registry without pulling
- `--auto` - Enable automatic daily sync

**Example (Symlinked):**
```bash
/skill-sync

Checking for skill updates...

Source: /Users/user/core/.claude/skills/
Status: Symlinked to core repository

Fetching latest changes...

Changes available:
  Updated (3):
    ✓ git-workflow: v1.0.0 → v1.2.0
    ✓ mandatory-tdd: v2.0.0 → v2.1.0
    ✓ code-quality: v1.5.0 → v1.5.1

  New (2):
    + database-optimization
    + api-design-patterns

  Removed (1):
    - deprecated-skill

Proceed with sync? (Y/n): y

Syncing...
✓ Pulled latest changes
✓ Refreshed skills registry
✓ Updated 3 skills
✓ Added 2 new skills
✓ Removed 1 deprecated skill

Summary:
  Total skills: 12 (up from 11)
  Updated: 3
  Added: 2
  Removed: 1
```

**Example (Not Symlinked):**
```bash
/skill-sync

Checking sync configuration...

❌ .claude is not symlinked to core repository

Current setup:
  .claude location: /path/to/project/.claude
  Type: Local directory

To enable sync:
1. Clone core repository:
   git clone <core-repo-url> ~/core

2. Symlink .claude:
   rm -rf .claude
   ln -s ~/core/.claude .claude

3. Run sync:
   /skill-sync
```

---

## Common Workflows

### Workflow 1: Installing Your First Skill

```bash
# 1. Browse available skills
/skill-search database

# 2. Get info about a specific skill
/skill-info @ainative/zerodb-workflows

# 3. Install the skill
/skill-install @ainative/zerodb-workflows

# 4. Verify installation
/skill-list

# 5. Start using it (skill is automatically loaded)
```

### Workflow 2: Creating a Custom Team Skill

```bash
# 1. Create new skill
/skill-create team-coding-standards

# 2. Edit SKILL.md with team conventions
# (File opens in editor automatically)

# 3. Add reference materials
# Copy files to ~/.ainative/skills/team-coding-standards/references/

# 4. Test the skill
# Ask Claude to apply your coding standards

# 5. Share with team
# Commit to git or publish to NPM
```

### Workflow 3: Managing Skills Across Projects

```bash
# Setup core skills repository (once)
git clone <core-repo-url> ~/core
cd ~/my-project
ln -s ~/core/.claude .claude

# In each project, sync latest skills
/skill-sync

# Check for updates regularly
/skill-update --check

# Update all skills at once
/skill-update --all --yes
```

### Workflow 4: Debugging Skill Issues

```bash
# 1. Check skill status
/skill-info problematic-skill

# 2. Temporarily disable to test
/skill-disable problematic-skill

# 3. Test without the skill
# (Verify if issue persists)

# 4. If skill is the issue, update or remove
/skill-update problematic-skill
# or
/skill-remove problematic-skill

# 5. Re-enable if fixed
/skill-enable problematic-skill
```

### Workflow 5: Publishing a Skill to Marketplace

```bash
# 1. Create and perfect your skill
/skill-create my-awesome-skill

# 2. Test thoroughly
# Use the skill extensively

# 3. Package for distribution
cd ~/.ainative/skills/my-awesome-skill/
npm init  # If publishing to NPM

# 4. Publish
npm publish  # For NPM
# or push to GitHub for community sharing
```

---

## Troubleshooting

### Common Issues

#### Issue: Skill not loading in Claude's context

**Symptoms**: Installed skill doesn't affect Claude's behavior

**Solutions**:
```bash
# Check if skill is enabled
/skill-list

# If disabled, enable it
/skill-enable <skill-name>

# Verify skill content is valid
/skill-info <skill-name> --content

# Reload skills
/skill-sync --no-pull
```

#### Issue: Installation fails with network error

**Symptoms**: `/skill-install` fails with timeout or connection error

**Solutions**:
```bash
# Check network connection
# Verify marketplace is accessible

# Try local installation instead
/skill-install ./path/to/skill

# Use cached version if available
/skill-install <skill-name> --offline
```

#### Issue: Skill conflicts with another skill

**Symptoms**: Unexpected behavior when multiple skills are enabled

**Solutions**:
```bash
# List all enabled skills
/skill-list --enabled

# Disable one skill to test
/skill-disable <potential-conflict>

# Check skill priorities and dependencies
/skill-info <skill-name> --dependencies

# Reorder skills if needed (advanced)
# Edit .ainative/skills/config.json
```

#### Issue: Update breaks existing functionality

**Symptoms**: Skill behavior changes after update

**Solutions**:
```bash
# Rollback to previous version
/skill-rollback <skill-name> <version>

# Check what changed
/skill-info <skill-name>

# Review migration guide if available
cat ~/.ainative/skills/<skill-name>/MIGRATION.md
```

#### Issue: Cannot create skill (permission denied)

**Symptoms**: `/skill-create` fails with permission error

**Solutions**:
```bash
# Check directory permissions
ls -la ~/.ainative/

# Create directory if missing
mkdir -p ~/.ainative/skills/

# Fix permissions
chmod 755 ~/.ainative/
chmod 755 ~/.ainative/skills/

# Try creating in custom location
/skill-create my-skill --location ~/my-skills/
```

### Getting Help

If you encounter issues not covered here:

1. **Check Logs**: Look in AINative Studio's output panel
2. **GitHub Issues**: Search or create issue in the repository
3. **Community**: Ask in AINative Studio Discord/forums
4. **Documentation**: Review skill format and best practices

---

## Advanced Topics

### Skill Format Specification

Skills use markdown with YAML frontmatter. Required fields:

```yaml
---
name: skill-name          # Unique identifier (lowercase, hyphens)
version: 1.0.0            # Semantic version
description: One line     # Brief description
category: workflow        # Category for organization
tags: [tag1, tag2]        # Searchable tags
---
```

Optional fields:
```yaml
author: Author Name       # Creator
license: MIT              # License type
dependencies: []          # Other skills required
source: local             # Source type
created: 2025-01-01       # Creation date
updated: 2025-01-02       # Last update date
```

### Skill Directory Structure

Recommended structure for complex skills:

```
skill-name/
├── SKILL.md              # Main skill file (required)
├── README.md             # Human-readable docs (recommended)
├── MIGRATION.md          # Update/migration guide (for breaking changes)
├── references/           # Reference materials
│   ├── architecture.md
│   ├── api-spec.yaml
│   └── examples/
│       ├── example1.md
│       └── example2.md
├── scripts/              # Helper scripts
│   ├── setup.sh
│   └── validate.sh
├── assets/               # Images, diagrams
│   ├── architecture.png
│   └── workflow.svg
├── tests/                # Test cases for skill
│   └── test-skill.md
└── package.json          # NPM metadata (for published skills)
```

### Skill Dependencies

Skills can depend on other skills:

```yaml
---
name: advanced-deployment
version: 1.0.0
description: Advanced deployment patterns
dependencies:
  - git-workflow
  - ci-cd-compliance
  - code-quality
---
```

Dependencies are automatically resolved and loaded.

### Skill Versioning

Follow semantic versioning:

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
- **MINOR** (1.0.0 → 1.1.0): New features, backward compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes

### Skill Publishing

**To NPM:**
```bash
cd ~/.ainative/skills/my-skill/
npm init
npm publish --access public
```

**To GitHub:**
```bash
cd ~/.ainative/skills/my-skill/
git init
git add .
git commit -m "Initial commit"
gh repo create
git push
```

### Skill Testing

Test skills before publishing:

1. **Manual Testing**: Use skill in real scenarios
2. **Validation**: Check skill format
3. **Peer Review**: Have others review instructions
4. **Documentation**: Ensure examples work

### Skill Security

**Best Practices:**
- Never include API keys or secrets
- Validate all external dependencies
- Use signed packages when possible
- Review community skills before installing
- Keep skills updated for security patches

### Custom Skill Categories

Standard categories:
- `development` - Coding patterns and practices
- `deployment` - CI/CD and deployment
- `testing` - Testing strategies
- `documentation` - Documentation standards
- `workflow` - Process and workflow
- `database` - Database patterns
- `ai-ml` - AI/ML specific
- `security` - Security practices
- `devops` - DevOps practices

Create custom categories as needed.

---

## Reference

### Skill Aliases

Quick command shortcuts:

```bash
# List
/skill ls          → /skill-list
/skill list        → /skill-list

# Install
/skill i           → /skill-install
/skill install     → /skill-install

# Remove
/skill rm          → /skill-remove
/skill uninstall   → /skill-remove
/skill delete      → /skill-remove

# Info
/skill show        → /skill-info
/skill describe    → /skill-info

# Search
/skill find        → /skill-search
/skill browse      → /skill-search

# Update
/skill upgrade     → /skill-update
```

### Environment Variables

Configure skill behavior:

```bash
# Custom skills directory
export AINATIVE_SKILLS_DIR=~/my-custom-skills/

# Marketplace API endpoint
export AINATIVE_MARKETPLACE_URL=https://custom-marketplace.com

# Disable auto-updates
export AINATIVE_AUTO_UPDATE_SKILLS=false

# Default skill author
export AINATIVE_SKILL_AUTHOR="Your Name"
```

### Configuration Files

**Global Config**: `~/.ainative/config.json`
```json
{
  "skills": {
    "directory": "~/.ainative/skills",
    "autoUpdate": false,
    "marketplace": "https://marketplace.ainative.com"
  }
}
```

**Project Config**: `.ainative/config.json`
```json
{
  "skills": {
    "enabled": ["git-workflow", "code-quality"],
    "disabled": ["testing-patterns"]
  }
}
```

---

## Appendix

### Exit Codes

Skills commands use standard exit codes:

- `0` - Success
- `1` - General error
- `2` - Invalid arguments
- `3` - Skill not found
- `4` - Network error
- `5` - Permission denied
- `6` - Validation error

### API Reference

For programmatic access, see:
- [SkillCommandService API](../../src/vs/workbench/contrib/ainative/common/skillCommandService.ts)
- [SkillsManagerService API](../../src/vs/workbench/contrib/ainative/common/skillsManagerService.ts)

### Contributing

To contribute to Skills Manager:

1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Update documentation
5. Submit pull request

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for details.

---

**Last Updated**: 2025-01-02
**Version**: 1.0.0
**Maintainer**: AINative Studio Team
