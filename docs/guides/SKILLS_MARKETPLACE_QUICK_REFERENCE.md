# Skills Marketplace Quick Reference

**Quick command reference for AINative Studio Skills Marketplace**

## Search & Discovery

```bash
# Search for skills
/skill-search <query>
/skill-search git --registry official
/skill-search --tags testing,automation --sort rating

# Browse by category
/skill-browse-tags
/skill-browse-tags git

# View details
/skill-details <skill-name>
```

## Installation

```bash
# Install latest version
/skill-install <skill-name>

# Install from specific registry
/skill-install <skill-name> --registry anthropic

# Install specific version
/skill-install <skill-name> --version 1.5.0

# Force reinstall
/skill-install <skill-name> --force

# Skip dependencies (advanced)
/skill-install <skill-name> --skip-dependencies
```

## Management

```bash
# List all installed skills
/skill-list

# List skills with updates
/skill-list --updates

# List pinned skills
/skill-list --pinned

# Pin/unpin a skill
/skill-pin <skill-name>
/skill-pin <skill-name> --unpin
```

## Updates

```bash
# Check for updates
/skill-update --check

# Update specific skill
/skill-update <skill-name>

# Update to specific version
/skill-update <skill-name> --version 1.6.0

# Update all skills
/skill-update-all

# Update all (skip breaking changes)
/skill-update-all --skip-breaking

# Rollback to previous version
/skill-update <skill-name> --version 1.4.0
```

## Removal

```bash
# Uninstall a skill
/skill-uninstall <skill-name>

# Remove with data
/skill-uninstall <skill-name> --remove-data

# Force removal (even with dependents)
/skill-uninstall <skill-name> --force
```

## Common Workflows

### Find and Install a Git Skill

```bash
# 1. Search for git skills
/skill-search git --sort rating

# 2. View details
/skill-details git-workflow

# 3. Install
/skill-install git-workflow
```

### Update All Skills Safely

```bash
# 1. Check what updates are available
/skill-update --check

# 2. Update all, skipping breaking changes
/skill-update-all --skip-breaking

# 3. Manually review breaking changes
/skill-details <skill-with-major-update>
/skill-update <skill-name>  # if safe
```

### Troubleshooting Installation

```bash
# 1. Try force reinstall
/skill-install <skill-name> --force

# 2. Check dependencies
/skill-details <skill-name>

# 3. Install without dependencies
/skill-install <skill-name> --skip-dependencies

# 4. Manually install dependencies
/skill-install <dependency-name>
```

## Skill Package Format

### Minimum package.json

```json
{
  "name": "my-skill",
  "version": "1.0.0",
  "description": "Brief description",
  "author": "Your Name",
  "registry": "community",
  "tags": ["tag1", "tag2"],
  "files": {
    "skill.md": {
      "sha256": "hash",
      "size": 1024
    }
  }
}
```

## Registry URLs

- **Official:** `https://registry.ainative.studio/v1/skills`
- **Anthropic:** `https://registry.anthropic.com/skills`
- **Community:** `https://community.ainative.studio/skills`

## Version Format

Follow semantic versioning (semver):

- **Patch:** `1.0.0 → 1.0.1` (bug fixes)
- **Minor:** `1.0.0 → 1.1.0` (new features, backward compatible)
- **Major:** `1.0.0 → 2.0.0` (breaking changes)

## Useful Tips

1. Always review skill details before installing
2. Check ratings and download counts
3. Pin critical skills to prevent breaking updates
4. Regularly check for security updates
5. Test skills in development before production
6. Use `--skip-breaking` for automatic updates
7. Read changelogs before major version updates

## Keyboard Shortcuts

| Action | Command |
|--------|---------|
| Search marketplace | `/skill-search` |
| Install skill | `/skill-install` |
| List installed | `/skill-list` |
| Check updates | `/skill-update --check` |

## File Locations

- **Skills Directory:** `.ainative/skills/`
- **Package Manifest:** `.ainative/skills/<skill-name>/package.json`
- **Main Skill File:** `.ainative/skills/<skill-name>/skill.md`

## Support Resources

- **Full Guide:** [SKILLS_MARKETPLACE.md](./SKILLS_MARKETPLACE.md)
- **API Docs:** [../api/SKILLS_REGISTRY_API.md](../api/SKILLS_REGISTRY_API.md)
- **Community:** https://community.ainative.studio/c/skills
- **Issues:** https://github.com/ainative/skills/issues
