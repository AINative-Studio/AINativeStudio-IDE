# Skill Sync Command

Sync skills from the core repository when `.claude` is symlinked to a git repository.

## Usage

```bash
/skill sync
```

## What It Does

This command synchronizes skills from a core repository when your `.claude` directory is symlinked to a shared git repository. This is useful for teams or multi-project setups where skills are managed centrally.

### Workflow

1. **Detect Symlink** - Checks if `.claude` directory is a symlink
2. **Resolve Target** - Finds the actual repository path the symlink points to
3. **Git Pull** - Pulls latest changes from the core repository
4. **Refresh Registry** - Re-scans `.claude/skills/` and updates the registry
5. **Show Summary** - Displays updated, new, and removed skills

## Output Example

```
Checking for skill updates...

Detected symlink: .claude → /Users/aideveloper/core/.claude
Pulling latest changes from core repository...

From https://github.com/company/core
   abc123..def456  main -> origin/main
Already up to date.

✓ Repository updated successfully

Refreshing skills cache...

Updated Skills:
  ✓ git-workflow (1.0.0 → 1.1.0)
  ✓ mandatory-tdd (1.2.0 → 1.3.0)
  + delivery-checklist (1.0.0) [NEW]

Total: 10 skills in registry (3 updated, 1 new, 6 unchanged)

Your skills are now up to date!
```

## Prerequisites

- `.claude` directory must be a symlink to a git repository
- The target repository must have a `skills/` subdirectory
- Git must be installed and configured
- Network access to pull from remote repository

## Error Handling

### Not a Symlink

If `.claude` is not a symlink:
```
Error: .claude is not a symlink

To enable skill sync, create a symlink to a core repository:

  1. Backup your current .claude directory:
     mv .claude .claude.backup

  2. Clone the core repository:
     git clone https://github.com/your-org/core ~/core

  3. Create symlink:
     ln -s ~/core/.claude .claude

  4. Run sync again:
     /skill sync
```

### Not a Git Repository

If the symlink target is not a git repository:
```
Error: Symlink target is not a git repository
Target: /Users/aideveloper/core/.claude

Initialize git in this directory or symlink to a valid git repository.
```

### Uncommitted Changes

If there are uncommitted changes in the repository:
```
Warning: The core repository has uncommitted changes:

  M skills/git-workflow/SKILL.md
  ?? skills/new-skill/

Please commit or stash these changes before syncing:
  cd /Users/aideveloper/core
  git stash

Then run /skill sync again.
```

### Merge Conflicts

If git pull results in merge conflicts:
```
Error: Merge conflicts detected

Please resolve conflicts manually:
  cd /Users/aideveloper/core
  git status
  # Resolve conflicts
  git add .
  git commit

Then run /skill sync again.
```

### Network Failures

If unable to reach the remote repository:
```
Error: Failed to pull from remote repository

Network error or remote repository unavailable.

Try again later or check your internet connection.
You can also pull manually:
  cd /Users/aideveloper/core
  git pull origin main
```

### Permission Errors

If permission denied errors occur:
```
Error: Permission denied accessing repository

Check that you have:
  - Read/write access to: /Users/aideveloper/core
  - SSH keys configured for GitHub (if using SSH)
  - GitHub authentication set up (if using HTTPS)
```

## Options

Currently this command has no options, but future versions may support:

- `--dry-run` - Show what would be updated without making changes
- `--force` - Force pull even with uncommitted changes (git stash)
- `--branch <name>` - Pull from a specific branch instead of main

## Command Implementation

This command is implemented in:
- `/src/vs/workbench/contrib/ainative/common/skills/cli/syncCommand.ts`
- `/src/vs/workbench/contrib/ainative/common/skills/cli/gitOperations.ts`
- Registered as: `ainative.skill.sync`

## Related Commands

- `/skill install` - Install a skill from various sources
- `/skill uninstall` - Uninstall a skill
- `/skill list` - List all installed skills
