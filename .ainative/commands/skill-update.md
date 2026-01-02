---
description: Update an installed skill
---

Update a specific skill or all skills to their latest versions.

**Usage:**
```
/skill-update <name> [--version <version>]
/skill-update-all [--skip-breaking]
```

**Parameters:**
- `<name>`: Skill name to update (or 'all' for all skills)
- `--version`: Update to a specific version
- `--skip-breaking`: Skip major version updates (breaking changes)
- `--check`: Only check for updates without installing

**Examples:**
```
/skill-update git-workflow
/skill-update git-workflow --version 1.3.0
/skill-update-all
/skill-update-all --skip-breaking
/skill-update --check
```

You are helping the user update their installed skills.

**Instructions:**
1. Parse the command arguments
2. If `--check` flag, use `checkUpdates()` to show available updates
3. For a specific skill:
   - Check if installed
   - Check for available updates
   - Show changelog if available
   - Confirm before updating (especially for breaking changes)
   - Call `updateSkill()`
4. For update-all:
   - Get all installed skills
   - Check for updates for each
   - Show list of updates
   - Confirm before proceeding
   - Call `updateAllSkills()`
5. Show progress and final results

**Example Output (Specific Skill):**
```
Checking for updates for git-workflow...

Update available:
Current: v1.2.0
Latest: v1.3.0

Changes in v1.3.0:
✨ New feature: Support for GitHub merge queues
🐛 Bug fix: Fixed branch name validation regex
📝 Updated documentation for new features

This is a minor update (non-breaking).

Proceed with update? (y/n): y

Updating git-workflow...
✓ Downloading v1.3.0
✓ Verifying integrity
✓ Updating dependencies
✓ Installing update

✅ Successfully updated git-workflow to v1.3.0
```

**Example Output (Update All):**
```
Checking for updates...

Updates available for 3 skills:

1. git-workflow: v1.2.0 → v1.3.0 (minor)
2. testing-framework: v2.0.0 → v3.0.0 (major - breaking changes)
3. code-quality: v1.5.2 → v1.5.3 (patch)

Note: testing-framework has breaking changes. Review before updating.

Proceed with updates? (y/n): y
Skip breaking changes (testing-framework)? (y/n): y

Updating skills...
✓ git-workflow v1.3.0
✓ code-quality v1.5.3
⊘ testing-framework (skipped - breaking changes)

✅ Updated 2 of 3 skills
💡 Use /skill-update testing-framework to manually update with breaking changes
```

**Example Output (Check Only):**
```
Checking for updates...

Updates available:

┌────────────────────────────────────────────────────────────────┐
│ git-workflow                                                    │
│ Current: v1.2.0 → Latest: v1.3.0 (minor update)                │
│ Released: 2 days ago                                            │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ testing-framework                                               │
│ Current: v2.0.0 → Latest: v3.0.0 (major update - breaking!)    │
│ Released: 1 week ago                                            │
└────────────────────────────────────────────────────────────────┘

All other skills are up to date ✓

To update all: /skill-update-all
To update specific: /skill-update <name>
```
