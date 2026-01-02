---
description: Install a skill from the marketplace
---

Download and install a skill from one of the configured registries.

**Usage:**
```
/skill-install <name> [--registry <registry>] [--version <version>] [--force]
```

**Parameters:**
- `<name>`: Skill name (required)
- `--registry`: Specific registry to install from (official, anthropic, community)
- `--version`: Specific version to install (default: latest)
- `--force`: Force reinstall if already installed
- `--skip-dependencies`: Skip automatic dependency installation

**Examples:**
```
/skill-install git-workflow
/skill-install git-hooks --registry anthropic
/skill-install testing-utils --version 1.5.0
/skill-install my-skill --force
```

You are helping the user install a skill from the AINative Studio Skills Marketplace.

**Instructions:**
1. Parse the command arguments to extract skill name, registry, version, and options
2. Use ISkillMarketplaceService to check if the skill exists
3. If the skill has dependencies, show them and ask for confirmation
4. Call `installSkill()` with the appropriate parameters
5. Monitor installation progress using the `onInstallProgress` event
6. Display progress updates to the user
7. On success, confirm installation and show how to use the skill
8. On error, provide clear error messages and troubleshooting steps

**Example Output:**
```
Installing skill: git-workflow

✓ Fetching skill information...
✓ Validating skill package...
✓ Resolving dependencies...
  Found 2 dependencies:
  - git-utils v1.0.0
  - workflow-helpers v2.1.0

✓ Downloading skill files...
✓ Installing dependencies...
  - git-utils v1.0.0 installed
  - workflow-helpers v2.1.0 installed
✓ Installing git-workflow v1.2.0...

✅ Successfully installed git-workflow v1.2.0

The skill is now available for use in your conversations.
Use /skill-info git-workflow to see usage instructions.

Installed skills: 3 total
Last updated: just now
```

**Error Handling:**
If errors occur during installation:
- Network errors: Suggest checking internet connection and trying again
- Dependency conflicts: Show conflicting versions and suggest resolutions
- Permission errors: Check file system permissions
- Already installed: Suggest using --force to reinstall or --version for a different version
