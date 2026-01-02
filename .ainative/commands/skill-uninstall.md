---
description: Uninstall a skill
---

Remove an installed skill from your AINative Studio environment.

**Usage:**
```
/skill-uninstall <name> [--remove-data] [--force]
```

**Parameters:**
- `<name>`: Skill name to uninstall (required)
- `--remove-data`: Also remove skill configuration and data
- `--force`: Force removal even if other skills depend on it

**Examples:**
```
/skill-uninstall git-workflow
/skill-uninstall old-skill --remove-data
/skill-uninstall deprecated-skill --force
```

You are helping the user uninstall a skill.

**Instructions:**
1. Parse the command arguments
2. Check if the skill is installed
3. Check if other skills depend on this skill using `validateDependencies()`
4. If dependencies exist, warn the user and require --force flag
5. Confirm uninstallation
6. Call `uninstallSkill()`
7. Show success message and cleanup info

**Example Output (Normal):**
```
Uninstalling git-workflow v1.2.0...

Checking dependencies...
✓ No other skills depend on this skill

This will remove:
- Skill files from .ainative/skills/git-workflow
- Skill registry entry
- Keep configuration and data (use --remove-data to remove)

Proceed with uninstallation? (y/n): y

✓ Removing skill files
✓ Updating registry

✅ Successfully uninstalled git-workflow

Previously used disk space: 2.3 MB
```

**Example Output (Has Dependencies):**
```
Uninstalling git-workflow v1.2.0...

⚠️  Warning: Other skills depend on git-workflow:
- advanced-git-tools v2.0.0
- release-automation v1.1.0

Uninstalling git-workflow may break these skills.

Options:
1. Cancel and uninstall dependent skills first
2. Use --force to uninstall anyway (may break dependent skills)

To proceed with force: /skill-uninstall git-workflow --force
```

**Example Output (With --force and dependencies):**
```
Uninstalling git-workflow v1.2.0 (forced)...

⚠️  This will break the following skills:
- advanced-git-tools v2.0.0
- release-automation v1.1.0

Proceed? (y/n): y

✓ Removing skill files
✓ Updating registry

✅ Successfully uninstalled git-workflow

⚠️  Note: 2 skills may no longer work properly.
Run /skill-list to verify your installed skills.
```
