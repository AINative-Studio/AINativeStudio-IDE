---
description: Sync skills from core repository
---

Synchronize skills from the core repository (if .claude is symlinked).

**Usage:**
```bash
/skill-sync
/skill-sync --check    # Check sync status only
/skill-sync --force    # Force sync even if up to date
```

**Process:**

1. **Detect Configuration:**
   - Check if `.claude` is symlinked to core repo
   - Identify sync source
   - Check git status of source

2. **Check for Updates:**
   - Fetch latest changes (git fetch)
   - Compare local vs remote
   - Identify new/modified/deleted skills

3. **Show Changes:**
   - List skills that will be updated
   - List new skills available
   - List removed skills
   - Show git diff summary

4. **Sync:**
   - Pull latest changes (git pull)
   - Refresh skills registry
   - Update local cache
   - Reload modified skills

5. **Report:**
   - Show what was synced
   - List any conflicts
   - Show next steps

**Output (Symlinked):**
```
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

To view changes: /skill-list
To view specific skill: /skill-info <skill-name>
```

**Output (Not Symlinked):**
```
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

Alternatively, install skills individually:
  /skill-install <skill-name>
  /skill-search <query>
```

**Check Sync Status:**
```bash
/skill-sync --check

Sync Status:

Source: /Users/user/core/.claude/skills/
Branch: main
Last synced: 2 hours ago
Status: ✓ Up to date

Local skills: 12
Remote skills: 12
Pending updates: 0

No updates available.
Next check: automatic sync checks every 24 hours
To force check: /skill-sync --check
```

**Options:**
- `--check` - Check status only, don't sync
- `--force` - Force sync even if up to date
- `--dry-run` - Show what would be synced
- `--no-pull` - Refresh registry without pulling
- `--auto` - Enable automatic daily sync

**Smart Features:**

1. **Conflict Detection:**
   - Detect local modifications
   - Warn before overwriting
   - Offer to backup customizations

2. **Automatic Sync:**
   - Optional daily auto-sync
   - Background check for updates
   - Notification when updates available

3. **Selective Sync:**
   - Exclude specific skills
   - Only sync official skills
   - Cherry-pick specific updates

**Error Handling:**
- Not a git repository → Explain symlink setup
- Merge conflicts → Show conflict resolution guide
- Network issues → Use cached data, retry later
- Permission issues → Show permission fix
- Diverged histories → Suggest fresh clone

**Git Operations:**
```bash
# Behind the scenes:
cd /Users/user/core/.claude/
git fetch origin
git status
git pull origin main
```

**Safety Features:**
- Always show changes before applying
- Create backup before sync
- Rollback on failure
- Preserve local customizations (with warning)

**Related Commands:**
- `/skill-update <skill>` - Update individual skill
- `/skill-list` - View all skills
- `/skill-info <skill>` - View skill details
