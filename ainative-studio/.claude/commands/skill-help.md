---
description: Show Skills Manager help and quick reference
---

Display comprehensive help for Skills Manager commands.

# Skills Manager Quick Reference

The Skills Manager helps you install, create, and manage AI skills in AINative Studio.

## Quick Commands

### Essential Commands

```bash
/skill-list                           # List all skills
/skill-search <query>                 # Search marketplace
/skill-install <source>               # Install a skill
/skill-info <skill-name>              # Show skill details
/skill-create <skill-name>            # Create new skill
```

### Management Commands

```bash
/skill-enable <skill-name>            # Enable a skill
/skill-disable <skill-name>           # Disable a skill
/skill-remove <skill-name>            # Remove a skill
/skill-update <skill-name>            # Update to latest
/skill-sync                           # Sync from core repo
```

## Common Workflows

### Install Your First Skill

```bash
# 1. Search for skills
/skill-search database

# 2. Get more info
/skill-info @ainative/zerodb-workflows

# 3. Install it
/skill-install @ainative/zerodb-workflows
```

### Create Custom Skill

```bash
# 1. Create from template
/skill-create my-team-standards

# 2. Edit SKILL.md (opens automatically)
# Add your team's conventions and patterns

# 3. Start using it
# The skill is now active in Claude's context
```

### Manage Skills

```bash
# List all skills
/skill-list

# Disable temporarily
/skill-disable testing-patterns

# Re-enable when needed
/skill-enable testing-patterns

# Remove completely
/skill-remove old-skill
```

## Installation Sources

Skills can be installed from:

```bash
# Official NPM packages
/skill-install @ainative/zerodb-workflows

# Local directories
/skill-install ./my-skills/custom-skill

# GitHub repositories
/skill-install anthropics/skills/mcp-builder

# Direct URLs
/skill-install https://example.com/skill.zip

# Marketplace by name
/skill-install database-patterns
```

## Command Options

Most commands support helpful flags:

```bash
# Get JSON output
/skill-info my-skill --json

# Force operations
/skill-install my-skill --force
/skill-remove my-skill --force

# Dry run (preview)
/skill-update --dry-run

# Update all skills
/skill-update --all

# Check for updates only
/skill-update --check
```

## Filtering and Sorting

```bash
# Filter by status
/skill-list --enabled
/skill-list --disabled

# Filter by category
/skill-list --category testing
/skill-search deployment --category devops

# Sort search results
/skill-search database --sort downloads
/skill-search testing --sort stars
```

## Skill Status Indicators

When listing skills, you'll see:

- ✅ Enabled and active
- ❌ Disabled (installed but inactive)
- ⬇️  Available in marketplace (not installed)

## Getting Help

For detailed documentation:

- **Full Guide**: See /docs/guides/SKILLS_MANAGER_COMMANDS.md
- **Command Help**: Use any command to see its documentation
- **Skill Format**: See existing skills in .claude/skills/
- **Examples**: Check /skill-info <skill-name> for usage examples

## Quick Tips

1. **Start Small**: Install 1-2 official skills first
2. **Customize**: Create project-specific skills for your workflow
3. **Share**: Publish useful skills to help the community
4. **Update**: Regularly check for skill updates
5. **Experiment**: Disable rather than remove skills while testing

## Troubleshooting

**Skill not working?**
```bash
# Check if enabled
/skill-list

# Enable if disabled
/skill-enable <skill-name>

# Check for errors
/skill-info <skill-name>
```

**Installation failed?**
```bash
# Try local installation instead
/skill-install ./path/to/skill

# Check network connection
# Verify marketplace is accessible
```

**Conflicting skills?**
```bash
# Disable one to test
/skill-disable <skill-name>

# Check dependencies
/skill-info <skill-name> --dependencies
```

## Support

- **Issues**: Report bugs on GitHub
- **Community**: Join AINative Studio Discord
- **Documentation**: Check /docs/guides/ directory
- **Logs**: View IDE output panel for details

---

For complete documentation, see:
/docs/guides/SKILLS_MANAGER_COMMANDS.md
