---
description: Remove an installed skill
---

Remove an installed skill from the system.

**Usage:**
```bash
/skill-remove <skill-name>

# Examples:
/skill-remove git-workflow
/skill-remove @ainative/zerodb-workflows
/skill-remove testing-patterns
```

**Aliases:**
- `/skill-uninstall`
- `/skill-delete`

**Removal Steps:**

1. **Validate:**
   - Check if skill exists
   - Verify skill is installed (not just available)
   - Check for dependent skills or active usage

2. **Confirm:**
   - Show skill details (name, version, location)
   - Ask for confirmation: "Are you sure you want to remove <skill-name>? (y/N)"
   - Allow --force flag to skip confirmation

3. **Remove:**
   - Unregister from SkillsManagerService
   - Remove from registry
   - Delete skill files from `~/.ainative/skills/<skill-name>/`
   - Clean up any cached data

4. **Verify:**
   - Confirm files deleted
   - Confirm registry updated
   - Show success message

**Output:**
```
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

**Flags:**
- `--force` or `-f` - Skip confirmation prompt
- `--keep-config` - Remove skill but keep configuration
- `--dry-run` - Show what would be removed without actually removing

**Error Handling:**
- Skill not found → Show list of installed skills
- Skill in use → Warning about active usage
- Permission denied → Show permission fix
- Deletion failed → Show what remains and manual cleanup steps

**Safety Features:**
- Always confirm before deletion (unless --force)
- Create backup before removal (optional)
- Show exactly what will be deleted
- Prevent removal of core/system skills
- Warn if skill has dependents

**Post-Removal:**
- Clear any related cache
- Update skill list
- Suggest alternatives if available
