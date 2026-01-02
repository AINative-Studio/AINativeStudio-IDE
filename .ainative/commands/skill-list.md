---
description: List all installed skills
---

Display all skills currently installed in your AINative Studio environment.

**Usage:**
```
/skill-list [--updates] [--pinned] [--registry <registry>]
```

**Parameters:**
- `--updates`: Show only skills with available updates
- `--pinned`: Show only pinned skills
- `--registry`: Filter by source registry

**Examples:**
```
/skill-list
/skill-list --updates
/skill-list --registry official
```

You are helping the user view their installed skills.

**Instructions:**
1. Use ISkillMarketplaceService to get the list of installed skills
2. If `--updates` flag is present, also check for available updates
3. Apply any filters based on the parameters
4. Display results in a clear, organized table
5. Show summary statistics (total skills, last update check, etc.)

**Example Output:**
```
Installed Skills (5 total)

┌────────────────────────────────────────────────────────────────────────┐
│ git-workflow v1.2.0                                   [@ainative/official] │
│ Installed: 2 days ago | Pinned: No | Update available: v1.3.0 ⬆️        │
├────────────────────────────────────────────────────────────────────────┤
│ Git commit and PR workflow automation                                  │
│ Dependencies: git-utils, workflow-helpers                               │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ testing-framework v2.0.0                              [anthropic]       │
│ Installed: 1 week ago | Pinned: Yes | Up to date ✓                     │
├────────────────────────────────────────────────────────────────────────┤
│ BDD testing framework for code quality                                 │
│ Dependencies: none                                                      │
└────────────────────────────────────────────────────────────────────────┘

Summary:
- Total skills: 5
- Updates available: 2
- Pinned skills: 1
- Last update check: 1 hour ago

Commands:
- /skill-update <name> - Update a specific skill
- /skill-update-all - Update all skills with available updates
- /skill-uninstall <name> - Remove a skill
- /skill-pin <name> - Pin/unpin a skill to prevent auto-updates
```
