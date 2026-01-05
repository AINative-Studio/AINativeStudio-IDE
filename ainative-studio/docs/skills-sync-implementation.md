# Skills Sync Implementation

## Overview

The `/skill sync` command allows users to synchronize skills from a core repository when the `.claude` directory is symlinked. This is part of Issue #55 - Skills Manager Phase 2.

## Architecture

### Components

1. **Command File** (`/skill-sync.md`)
   - Command description and metadata
   - Usage examples
   - Expected output formats

2. **Symlink Utilities** (`symlinkUtils.ts`)
   - Symlink detection
   - Setup instructions generation
   - Git repository validation

3. **Git Operations** (`gitOperations.ts`)
   - Git repository checks
   - Git status checking
   - Git pull operations
   - Error handling for git operations

4. **Skills Registry** (`skillsRegistry.ts`)
   - Extended with `refresh()` method
   - Scans skills directory
   - Compares versions
   - Updates registry

5. **Sync Command** (`syncCommand.ts`)
   - Main command orchestration
   - Error handling and user feedback
   - Output formatting

## Workflow

```
┌─────────────────────────────────────┐
│  User runs /skill sync              │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Check if .claude is symlinked      │
├─────────────────────────────────────┤
│  - Not symlinked → Show setup       │
│  - Symlinked → Continue             │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Verify target is git repository    │
├─────────────────────────────────────┤
│  - Not git repo → Error             │
│  - Git repo → Continue              │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Check git status                   │
├─────────────────────────────────────┤
│  - Uncommitted changes → Warn       │
│  - Clean → Continue                 │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Execute git pull origin main       │
├─────────────────────────────────────┤
│  - Merge conflict → Error           │
│  - Network error → Error            │
│  - Success → Continue               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Refresh skills registry            │
├─────────────────────────────────────┤
│  - Scan .claude/skills/ directory   │
│  - Parse SKILL.md files             │
│  - Compare versions                 │
│  - Update registry                  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Display summary                    │
├─────────────────────────────────────┤
│  - Updated skills (old → new)       │
│  - New skills [NEW]                 │
│  - Removed skills [REMOVED]         │
│  - Total count                      │
└─────────────────────────────────────┘
```

## File Structure

```
ainative-studio/
├── .claude/
│   ├── commands/
│   │   └── skill-sync.md              # Command definition
│   └── skills/                         # Skills directory (may be symlinked)
│
└── src/vs/workbench/contrib/ainative/common/skills/
    ├── symlinkUtils.ts                 # Symlink detection utilities
    ├── gitOperations.ts                # Git operation helpers
    ├── skillRegistryTypes.ts           # Updated with refresh types
    ├── skillsRegistry.ts               # Updated with refresh implementation
    │
    ├── cli/
    │   └── syncCommand.ts              # Main sync command
    │
    └── test/common/
        ├── syncCommand.test.ts         # Sync command tests
        ├── gitOperations.test.ts       # Git operations tests
        ├── symlinkUtils.test.ts        # Symlink utils tests
        └── skillsRegistry.refresh.test.ts  # Registry refresh tests
```

## Key Features

### 1. Symlink Detection

The system uses Node.js `fs.lstat()` and `fs.readlink()` to detect and resolve symlinks:

```typescript
const stats = await fs.lstat(path);
if (stats.isSymbolicLink()) {
  const target = await fs.readlink(path);
  const resolved = await fs.realpath(path);
}
```

### 2. Git Operations

All git operations use `child_process.exec()` with proper error handling:

```typescript
const result = await execAsync(`git pull origin main`, {
  cwd: repoPath,
  timeout: 30000
});
```

Error types handled:
- Merge conflicts
- Network errors
- Authentication failures
- Permission errors

### 3. Skills Refresh

The refresh process:
1. Scans `.claude/skills/` directory
2. Parses each skill's `SKILL.md` file
3. Compares versions with current registry
4. Categorizes changes (updated, new, removed, unchanged)
5. Updates registry atomically

### 4. User Feedback

Output is formatted for clarity:

```
Checking for skill updates...

Detected symlink: .claude → /Users/aideveloper/core/.claude
Pulling latest changes from core repository...

✓ Repository updated successfully

Refreshing skills cache...

Updated Skills:
  ✓ git-workflow (1.0.0 → 1.1.0)
  ✓ mandatory-tdd (1.2.0 → 1.3.0)
  + delivery-checklist (1.0.0) [NEW]

Total: 10 skills in registry (3 updated, 1 new, 6 unchanged)

Your skills are now up to date!
```

## Error Handling

### Not Symlinked

```
⚠️  Skills sync not available

Your .claude directory is not symlinked to the core repository.

To enable syncing:
1. Clone core repository: git clone https://github.com/ainative/core.git
2. Remove current .claude: rm -rf .claude
3. Create symlink: ln -s /path/to/core/.claude .claude

After setup, run /skill sync again to pull latest skills.
```

### Uncommitted Changes

```
⚠️  Cannot sync: Uncommitted changes detected

Branch: main
Modified files: 3
Untracked files: 2

Please commit or stash your changes before syncing:

  git add .
  git commit -m "Your commit message"

OR

  git stash

Then run /skill sync again.
```

### Merge Conflicts

```
✗ Git pull failed

Merge conflict detected. Please resolve conflicts manually.

To resolve conflicts:
1. Navigate to the repository directory
2. Resolve conflicts manually
3. Complete the merge with: git commit
4. Run /skill sync again
```

## Testing

### Unit Tests

- **SyncCommand Tests**: 10 test cases covering all scenarios
- **GitOperations Tests**: Tests for output formatting
- **SymlinkUtils Tests**: Tests for setup instructions
- **Registry Refresh Tests**: Tests for version comparison logic

### Test Scenarios

1. Not symlinked → Show setup instructions
2. Not git repo → Error
3. Uncommitted changes → Warn
4. Git pull failure → Error with suggestions
5. Successful sync with updates
6. Successful sync with no changes
7. Merge conflicts → Error with resolution steps
8. Removed skills → Show in summary

### Running Tests

```bash
npm run test-node -- --grep "SyncCommand|GitOperations|SymlinkUtils"
```

## Usage Examples

### Basic Sync

```bash
/skill sync
```

### Expected Flow (Success)

1. User runs `/skill sync`
2. System detects `.claude` is symlinked to `/path/to/core/.claude`
3. Verifies target is a git repository
4. Checks for uncommitted changes (none found)
5. Executes `git pull origin main`
6. Refreshes skills registry from `.claude/skills/`
7. Displays summary of changes

### Expected Flow (Not Symlinked)

1. User runs `/skill sync`
2. System detects `.claude` is NOT a symlink
3. Displays setup instructions
4. User follows instructions to create symlink
5. User runs `/skill sync` again
6. Sync proceeds normally

## Integration Points

### ISkillsRegistry Interface

Extended with:
- `refresh(skillsSourceDir: string): Promise<SkillRefreshResult>`
- `clearCache(): void`

### New Types

```typescript
interface SkillRefreshResult {
  updated: SkillChange[];
  new: SkillChange[];
  removed: SkillChange[];
  unchanged: string[];
  total: number;
}

interface SkillChange {
  name: string;
  oldVersion: string | null;
  newVersion: string | null;
}
```

## Security Considerations

1. **Symlink Validation**: Only follows symlinks to local paths
2. **Git Operations**: 30-second timeout on all git commands
3. **Path Sanitization**: All paths are validated before use
4. **No Automatic Force**: Never uses `git pull --force`
5. **User Confirmation**: Warns before any destructive operations

## Performance

- Symlink check: < 1ms
- Git operations: 1-5 seconds (network dependent)
- Registry refresh: < 100ms for typical skill count (10-50 skills)
- Total sync time: 2-10 seconds (typical)

## Future Enhancements

1. **Auto-sync**: Automatic background sync on interval
2. **Conflict Resolution**: Interactive conflict resolution
3. **Selective Sync**: Sync only specific skills
4. **Rollback**: Ability to rollback to previous version
5. **Remote Sources**: Support for multiple remote repositories

## Troubleshooting

### Symlink Not Detected

- Verify symlink exists: `ls -la .claude`
- Check permissions: `ls -ld .claude`
- Recreate symlink if needed

### Git Pull Fails

- Check network connection
- Verify git credentials
- Ensure remote repository is accessible
- Check for merge conflicts

### Skills Not Refreshing

- Verify `.claude/skills/` directory exists
- Check SKILL.md files are valid
- Review logs for parsing errors
- Clear registry cache and retry

## Related Issues

- Issue #55: Skills Manager Phase 2
- PR #XXX: Implement `/skill sync` command

## Dependencies

- Node.js `fs.promises` for file operations
- Node.js `child_process` for git operations
- VS Code File Service for directory scanning
- Skills Parser for SKILL.md parsing
