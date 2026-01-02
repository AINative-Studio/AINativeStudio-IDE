---
description: Update skill to latest version
---

Update an installed skill to the latest version from its source.

**Usage:**
```bash
/skill-update <skill-name>
/skill-update --all

# Examples:
/skill-update git-workflow
/skill-update @ainative/zerodb-workflows
/skill-update --all                      # Update all skills
/skill-update --check                    # Check for updates only
```

**Update Process:**

1. **Check for Updates:**
   - Determine skill source (NPM, GitHub, marketplace, local)
   - Fetch latest version information
   - Compare current version with latest
   - Show what will be updated

2. **Show Changes:**
   - Version change (current → latest)
   - Changelog/release notes (if available)
   - List of modified files
   - Breaking changes warning (if any)

3. **Backup Current:**
   - Create backup of current version
   - Save to `~/.ainative/skills/.backups/<skill-name>-<version>/`
   - Allow rollback if update fails

4. **Update:**
   - Download/fetch latest version
   - Validate new version
   - Preserve user customizations (if any)
   - Update skill files
   - Update registry

5. **Verify:**
   - Test skill loads correctly
   - Verify all files present
   - Check for errors
   - Show success message

**Output:**
```
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

**Update All Skills:**
```bash
/skill-update --all

Checking for updates...

Updates available:
  git-workflow:          v1.0.0 → v1.2.0
  @ainative/zerodb:      v1.1.0 → v1.3.0
  testing-patterns:      v2.0.0 → v2.1.0

Update all 3 skills? (Y/n): y

[Progress bars for each update]

✅ Updated 3 skills successfully
⚠️  0 skills failed to update

Summary:
  ✓ git-workflow (v1.2.0)
  ✓ @ainative/zerodb (v1.3.0)
  ✓ testing-patterns (v2.1.0)
```

**Check for Updates Only:**
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

**Options:**
- `--all` - Update all skills with available updates
- `--check` - Check for updates without installing
- `--force` - Force update even if no new version
- `--no-backup` - Skip backup creation
- `--dry-run` - Show what would be updated
- `--pre-release` - Include pre-release versions
- `--yes` or `-y` - Skip confirmation prompts

**Version Sources:**
- **NPM packages:** Check npm registry
- **GitHub repos:** Check releases/tags
- **Marketplace:** Check registry API
- **Local skills:** Check git status (if in git repo)

**Error Handling:**
- No updates available → Show current version is latest
- Network failure → Use cached data + show offline warning
- Update failed → Restore from backup automatically
- Incompatible version → Show compatibility issues
- User modifications → Prompt to preserve or overwrite

**Safety Features:**
- Always create backup before update
- Automatic rollback on failure
- Preserve user customizations
- Show breaking changes clearly
- Test skill after update

**Post-Update:**
- Clear skill cache
- Reload skill in active sessions
- Show migration guide (if breaking changes)
- Prompt to review changes

**Related Commands:**
- `/skill-rollback <skill-name> <version>` - Rollback to previous version
- `/skill-info <skill-name>` - View current version
- `/skill-list` - View all installed versions
