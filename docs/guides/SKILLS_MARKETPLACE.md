# Skills Marketplace User Guide

**Version:** 1.0.0
**Last Updated:** 2026-01-02

## Overview

The AINative Studio Skills Marketplace is a comprehensive ecosystem for discovering, installing, and managing AI-powered skills that extend Claude's capabilities. Skills are distributed across three registries:

- **Official Registry** (`@ainative`): Curated, professionally maintained skills
- **Anthropic Registry**: Skills provided directly by Anthropic
- **Community Registry**: User-contributed skills from the community

## Table of Contents

1. [Getting Started](#getting-started)
2. [Discovering Skills](#discovering-skills)
3. [Installing Skills](#installing-skills)
4. [Managing Installed Skills](#managing-installed-skills)
5. [Updating Skills](#updating-skills)
6. [Publishing Your Own Skills](#publishing-your-own-skills)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)
9. [FAQ](#faq)

---

## Getting Started

### Prerequisites

- AINative Studio IDE version 1.0.0 or later
- Internet connection for accessing registries
- (Optional) GitHub account for publishing community skills

### First Time Setup

The Skills Marketplace is enabled by default in AINative Studio. No additional configuration is required for basic usage.

To verify your marketplace is working:

```
/skill-search test
```

You should see available skills matching "test" from all registries.

---

## Discovering Skills

### Searching for Skills

The most direct way to find skills is through search:

```
/skill-search <query>
```

**Examples:**

```bash
# Basic search
/skill-search git

# Search within a specific registry
/skill-search "code quality" --registry official

# Search by tags
/skill-search --tags testing,automation

# Sort by rating
/skill-search workflow --sort rating
```

### Browsing by Category

Skills are organized by tags/categories:

```bash
# View all available tags
/skill-browse-tags

# Browse a specific category
/skill-browse-tags git
/skill-browse-tags testing
/skill-browse-tags workflow
```

**Popular Categories:**

- `git` - Git workflow automation, commit helpers, PR tools
- `testing` - Test frameworks, BDD tools, quality assurance
- `workflow` - Productivity workflows, automation
- `code-quality` - Linting, formatting, code review
- `documentation` - Doc generation, API documentation
- `security` - Security scanning, vulnerability checks
- `deployment` - CI/CD, deployment automation
- `database` - Database management and migrations

### Viewing Skill Details

Before installing, review complete skill information:

```bash
/skill-details <skill-name>
```

This shows:
- Full description and README
- Author and registry source
- Version history
- Dependencies
- Ratings and download stats
- Installation instructions
- Usage examples

**Example:**

```bash
/skill-details git-workflow
```

---

## Installing Skills

### Basic Installation

Install the latest version of a skill:

```bash
/skill-install <skill-name>
```

**Example:**

```bash
/skill-install git-workflow
```

### Installing from a Specific Registry

If a skill exists in multiple registries:

```bash
/skill-install <skill-name> --registry <registry>
```

**Example:**

```bash
/skill-install git-hooks --registry anthropic
```

### Installing a Specific Version

Pin to a specific version:

```bash
/skill-install <skill-name> --version <version>
```

**Example:**

```bash
/skill-install testing-framework --version 1.5.0
```

### Handling Dependencies

Skills automatically install their dependencies. You'll see a summary before installation:

```
Installing skill: advanced-git-tools

Dependencies:
- git-workflow v1.2.0 (official)
- git-utils v2.0.0 (official)

Total size: 3.5 MB

Proceed with installation? (y/n):
```

To skip dependencies (advanced):

```bash
/skill-install my-skill --skip-dependencies
```

### Force Reinstall

If a skill is already installed:

```bash
/skill-install my-skill --force
```

This removes the existing installation and reinstalls fresh.

---

## Managing Installed Skills

### Viewing Installed Skills

List all installed skills:

```bash
/skill-list
```

**Filter options:**

```bash
# Show only skills with updates
/skill-list --updates

# Show only pinned skills
/skill-list --pinned

# Filter by registry
/skill-list --registry official
```

### Checking Skill Information

View details about an installed skill:

```bash
/skill-details <skill-name>
```

This works for both installed and marketplace skills.

### Pinning Skills

Pin a skill to prevent automatic updates:

```bash
/skill-pin <skill-name>
```

Unpinning:

```bash
/skill-pin <skill-name> --unpin
```

**Use Cases for Pinning:**
- You depend on specific behavior that might change
- You've customized the skill (though not recommended)
- Waiting to test a major version before upgrading

### Uninstalling Skills

Remove a skill:

```bash
/skill-uninstall <skill-name>
```

**Options:**

```bash
# Remove skill data and configuration
/skill-uninstall my-skill --remove-data

# Force removal even if other skills depend on it
/skill-uninstall dependency-skill --force
```

---

## Updating Skills

### Checking for Updates

Check all installed skills for updates:

```bash
/skill-update --check
```

This shows available updates without installing them.

### Updating a Specific Skill

```bash
/skill-update <skill-name>
```

**Example:**

```bash
/skill-update git-workflow
```

### Updating to a Specific Version

```bash
/skill-update <skill-name> --version <version>
```

### Updating All Skills

Update all skills with available updates:

```bash
/skill-update-all
```

**Skip breaking changes:**

```bash
/skill-update-all --skip-breaking
```

This only updates minor and patch versions, skipping major version updates that might have breaking changes.

### Understanding Version Updates

- **Patch updates (1.0.0 → 1.0.1)**: Bug fixes, safe to auto-update
- **Minor updates (1.0.0 → 1.1.0)**: New features, backward compatible
- **Major updates (1.0.0 → 2.0.0)**: Breaking changes, review before updating

### Rollback

If an update causes issues, rollback to a previous version:

```bash
/skill-update <skill-name> --version <old-version>
```

**Example:**

```bash
/skill-update git-workflow --version 1.1.0
```

---

## Publishing Your Own Skills

### Creating a Skill Package

1. **Create the skill directory:**

```
my-skill/
├── package.json
├── skill.md
├── README.md
└── LICENSE
```

2. **Write package.json:**

```json
{
  "name": "my-awesome-skill",
  "version": "1.0.0",
  "description": "A skill that does awesome things",
  "author": "Your Name",
  "registry": "community",
  "tags": ["utility", "automation"],
  "files": {
    "skill.md": {
      "sha256": "",
      "size": 0
    }
  },
  "license": "MIT",
  "repository": "https://github.com/yourusername/my-awesome-skill",
  "dependencies": []
}
```

3. **Write skill.md:**

This is the main skill file that defines Claude's behavior. See [Skill Authoring Guide](./SKILL_AUTHORING.md) for details.

### Testing Your Skill Locally

Before publishing, test your skill:

1. Copy skill to `.ainative/skills/my-awesome-skill/`
2. Test in conversations
3. Verify behavior and edge cases

### Publishing to Community Registry

**Prerequisites:**
- GitHub account
- Community registry API token

**Steps:**

1. **Get an API token:**
   - Visit https://community.ainative.studio
   - Go to Account Settings > API Tokens
   - Generate a token with `publish` scope

2. **Publish the skill:**

```bash
/skill-publish my-awesome-skill --token YOUR_API_TOKEN
```

Or via GitHub (recommended):

1. Fork https://github.com/ainative/community-skills
2. Add your skill to `skills/my-awesome-skill/`
3. Create a pull request
4. Wait for review and approval

### Publishing Guidelines

**Naming:**
- Use kebab-case: `my-skill-name`
- Be descriptive but concise
- Avoid generic names like `helper` or `utils`

**Versioning:**
- Follow semantic versioning (semver)
- Start at `1.0.0` for production-ready skills
- Use `0.x.x` for experimental skills

**Documentation:**
- Include comprehensive README
- Provide usage examples
- Document dependencies
- Add troubleshooting section

**Quality:**
- Test thoroughly before publishing
- Handle edge cases gracefully
- Provide clear error messages
- Follow best practices

### Updating Published Skills

Publish a new version:

```bash
/skill-publish my-awesome-skill --version 1.1.0 --token YOUR_API_TOKEN
```

Or create a new release tag in GitHub.

---

## Best Practices

### Choosing Skills

✅ **Do:**
- Read reviews and ratings
- Check download counts
- Review dependencies
- Test in a safe environment first
- Prefer official/Anthropic registry for critical workflows

❌ **Don't:**
- Install skills blindly without reviewing
- Trust low-rated or unreviewed skills
- Install skills with suspicious dependencies

### Managing Updates

✅ **Do:**
- Regularly check for updates
- Read changelogs before updating
- Test updates in development first
- Pin critical production skills

❌ **Don't:**
- Auto-update everything without review
- Ignore security updates
- Skip testing major version updates

### Dependency Management

✅ **Do:**
- Review dependency trees before installing
- Keep dependencies minimal
- Update dependencies regularly
- Understand what each dependency does

❌ **Don't:**
- Install skills with circular dependencies
- Ignore dependency warnings
- Force install with broken dependencies

### Skill Development

✅ **Do:**
- Follow the skill authoring guide
- Write comprehensive tests
- Document thoroughly
- Use semantic versioning correctly
- Respond to user feedback

❌ **Don't:**
- Publish untested skills
- Break backward compatibility without major version bump
- Include secrets or sensitive data
- Abandon maintained skills

---

## Troubleshooting

### Installation Fails

**Problem:** Skill installation fails with network error

**Solution:**
1. Check internet connection
2. Verify registry is accessible: `/skill-test-registry official`
3. Check firewall/proxy settings
4. Try again later if registry is down

---

**Problem:** Dependency conflicts

**Solution:**
1. Review dependency tree: `/skill-details <skill-name>`
2. Update conflicting dependencies
3. Check if versions can be reconciled
4. Contact skill author for compatibility

---

**Problem:** Permission errors

**Solution:**
1. Check file system permissions for `.ainative/skills/`
2. Run AINative Studio with appropriate permissions
3. Check disk space availability

---

### Update Issues

**Problem:** Update breaks existing functionality

**Solution:**
1. Rollback to previous version: `/skill-update <name> --version <old-version>`
2. Report issue to skill author
3. Pin to working version temporarily
4. Wait for fix or use alternative skill

---

**Problem:** "No updates available" but you know there should be

**Solution:**
1. Clear marketplace cache: `/skill-clear-cache`
2. Refresh manually: `/skill-refresh-cache`
3. Check if skill is pinned: `/skill-list --pinned`

---

### Skill Not Working

**Problem:** Installed skill doesn't activate

**Solution:**
1. Verify installation: `/skill-list`
2. Check dependencies: `/skill-verify <name>`
3. Review skill documentation for activation triggers
4. Restart AINative Studio
5. Reinstall with `--force`

---

**Problem:** Skill causes errors in conversations

**Solution:**
1. Check skill integrity: `/skill-verify <name>`
2. Review error messages and logs
3. Repair skill: `/skill-repair <name>`
4. Report bug to skill author
5. Uninstall if issue persists

---

## FAQ

### General

**Q: Are skills safe to install?**

A: Skills from the official and Anthropic registries are reviewed and vetted. Community skills should be reviewed carefully - check ratings, reviews, author reputation, and source code if available.

---

**Q: Do skills have access to my files?**

A: Skills define Claude's behavior and context. They don't execute arbitrary code but can influence what Claude does with your files through its standard capabilities.

---

**Q: Can I use multiple skills together?**

A: Yes! Skills are designed to work together. Claude intelligently combines relevant skills based on your task.

---

**Q: How much storage do skills use?**

A: Most skills are small (< 1 MB). You can check total usage: `/skill-stats`

---

### Installation & Updates

**Q: How often should I update skills?**

A: Check monthly or when new features are needed. Enable update notifications in settings for important updates.

---

**Q: What happens if I uninstall a skill other skills depend on?**

A: You'll get a warning listing dependent skills. Use `--force` to proceed anyway, but dependent skills may break.

---

**Q: Can I have multiple versions of the same skill?**

A: No, only one version per skill. Use version pinning if you need to stay on a specific version.

---

### Publishing

**Q: How long does community registry approval take?**

A: Typically 1-3 business days for initial review. Updates to approved skills are usually faster.

---

**Q: Can I publish closed-source skills?**

A: Community registry requires open source. For private/commercial skills, contact us about private registries.

---

**Q: How do I handle breaking changes?**

A: Increment major version (e.g., 1.x.x → 2.0.0), document changes in CHANGELOG.md, and provide migration guide.

---

**Q: Can I delete a published skill?**

A: You can unpublish specific versions. Complete deletion requires contacting registry administrators.

---

## Additional Resources

- **Skill Authoring Guide:** [SKILL_AUTHORING.md](./SKILL_AUTHORING.md)
- **Registry API Documentation:** [../api/SKILLS_REGISTRY_API.md](../api/SKILLS_REGISTRY_API.md)
- **Example Skills:** https://github.com/ainative/example-skills
- **Community Forum:** https://community.ainative.studio/c/skills
- **Official Skills Repository:** https://github.com/ainative/skills

---

## Support

Need help? We're here for you:

- **Documentation:** https://docs.ainative.studio/skills
- **GitHub Issues:** https://github.com/ainative/skills/issues
- **Community Forum:** https://community.ainative.studio
- **Email:** skills@ainative.studio

---

## Changelog

### v1.0.0 (2026-01-02)
- Initial Skills Marketplace release
- Three-tier registry system (official, anthropic, community)
- Full dependency management
- Version control and updates
- Publishing workflow for community skills
- Comprehensive search and discovery
