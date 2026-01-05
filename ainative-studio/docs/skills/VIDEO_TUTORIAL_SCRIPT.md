# Skills Manager - Video Tutorial Script

**Duration:** 15 minutes
**Target Audience:** AINative Studio IDE users (beginners to intermediate)
**Presenter:** Testing Team Lead (ranveerd11)
**Last Updated:** 2026-01-04

---

## Pre-Production Checklist

**Setup:**
- [ ] AINative Studio IDE installed and running
- [ ] Clean skills directory (fresh install)
- [ ] Terminal and IDE visible in recording
- [ ] Screen resolution: 1920x1080
- [ ] Audio check completed
- [ ] Test skill files prepared in advance

**Recording Tools:**
- Screen recording software (OBS Studio recommended)
- High-quality microphone
- Video editing software for post-production

---

## Video Structure

### [00:00 - 01:00] Introduction (1 minute)

**On Screen:** AINative Studio IDE logo, title card

**Narration:**
```
Welcome to AINative Studio IDE's Skills Manager tutorial. I'm ranveerd11, testing team lead.

In the next 15 minutes, you'll learn how to:
- Install and manage skills
- Browse the marketplace
- Create custom skills
- Optimize performance
- Troubleshoot common issues

Skills are reusable knowledge modules that enhance AI capabilities with best practices,
project-specific guidelines, and context-aware instructions.

Let's get started!
```

**Visual:**
- Show IDE interface
- Highlight skills sidebar
- Quick preview of what skills look like

---

### [01:00 - 03:30] Installing Your First Skill (2.5 minutes)

**On Screen:** IDE with terminal visible

**Narration:**
```
Let's install our first skill from the official marketplace.

Open the command palette and type "/skill install".

We'll install the ZeroDB Workflows skill from NPM.
```

**Demo:**
```bash
# Show command
/skill install @ainative/skill-zerodb-workflows

# Wait for installation
# Show success message
```

**Narration (continued):**
```
The skill is now installed. Let's verify by listing all installed skills.
```

**Demo:**
```bash
/skill list
```

**On Screen:** Show output with skill details

**Narration (continued):**
```
You can see the skill name, version, description, and source.

The green checkmark means it's enabled and ready to use.

You can also install from local paths or GitHub repositories:
```

**Demo (text overlay):**
```bash
# Local installation
/skill install ./my-custom-skill

# GitHub installation
/skill install anthropics/skills/mcp-builder

# URL installation
/skill install https://example.com/skill.zip
```

**Narration (continued):**
```
That's how easy it is to install skills. Now let's explore the marketplace.
```

---

### [03:30 - 05:30] Browsing the Marketplace (2 minutes)

**On Screen:** Marketplace interface

**Narration:**
```
The Skills Marketplace connects you to three sources:
Official skills from AINative, Anthropic's curated collection,
and community-contributed skills.

Let's browse available skills.
```

**Demo:**
```bash
/skill marketplace browse
```

**On Screen:** Show marketplace results

**Narration (continued):**
```
You can search for specific skills by keyword.
```

**Demo:**
```bash
/skill marketplace browse testing
```

**On Screen:** Filtered results

**Narration (continued):**
```
Filter by category to find exactly what you need.
```

**Demo:**
```bash
/skill marketplace browse --category database
```

**On Screen:** Category-filtered results

**Narration (continued):**
```
Each skill shows:
- Name and description
- Version and author
- Tags for searchability
- Source (official, anthropic, community)

Click any skill to see full details before installing.
```

**Visual:**
- Scroll through marketplace
- Highlight different skills
- Show skill detail view

---

### [05:30 - 09:00] Creating a Custom Skill (3.5 minutes)

**On Screen:** IDE with file explorer

**Narration:**
```
Now let's create a custom skill from scratch.

Every skill needs a specific structure. Let's create one for
Git commit standards.
```

**Demo:**
```bash
mkdir my-git-workflow
cd my-git-workflow
touch SKILL.md
```

**On Screen:** Open SKILL.md in editor

**Narration (continued):**
```
Every SKILL.md file starts with YAML frontmatter containing metadata.

Let me type this out...
```

**Demo (type slowly, visible on screen):**
```markdown
---
name: my-git-workflow
description: Git commit standards and best practices
version: 1.0.0
author: Your Name
tags: [git, workflow, commits, best-practices]
category: development
---

# Git Workflow Standards

## Commit Message Format

All commits must follow this format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

## Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code formatting
- **refactor**: Code restructuring
- **test**: Adding tests
- **chore**: Maintenance tasks

## Examples

Good commit:
```
feat(auth): add OAuth2 authentication

Implement OAuth2 flow for user login using industry-standard
protocols. Supports Google, GitHub, and custom providers.

Closes #42
```

Bad commit:
```
fixed stuff
```

## Rules

1. Keep subject line under 50 characters
2. Capitalize subject line
3. Use imperative mood ("add" not "added")
4. Separate subject from body with blank line
5. Wrap body at 72 characters
```

**Narration (during typing):**
```
The frontmatter defines the skill metadata.

Below the frontmatter, write clear, actionable instructions.

Include code examples to demonstrate concepts.

Use markdown formatting for structure.
```

**Demo (continued):**
```bash
# Create reference directory
mkdir references

# Add detailed examples
touch references/examples.md
```

**On Screen:** Edit references/examples.md

**Narration (continued):**
```
Reference files provide additional documentation without bloating
the main skill file. These load on-demand for better performance.
```

**Demo:**
```bash
# Validate the skill
/skill validate ./my-git-workflow
```

**On Screen:** Show validation success

**Demo:**
```bash
# Install the skill
/skill install ./my-git-workflow
```

**On Screen:** Show installation success

**Narration (continued):**
```
Your custom skill is now installed and ready to guide the AI!
```

---

### [09:00 - 11:00] Managing Skills (2 minutes)

**On Screen:** Skills management interface

**Narration:**
```
Let's look at managing your installed skills.

To disable a skill temporarily:
```

**Demo:**
```bash
/skill disable my-git-workflow
```

**On Screen:** Show disabled status

**Narration (continued):**
```
Disabled skills remain installed but won't trigger.

Re-enable when needed:
```

**Demo:**
```bash
/skill enable my-git-workflow
```

**Narration (continued):**
```
Update skills to get the latest version:
```

**Demo:**
```bash
# Update specific skill
/skill update my-git-workflow

# Update all skills
/skill update --all
```

**Narration (continued):**
```
View only enabled or disabled skills:
```

**Demo:**
```bash
/skill list --enabled
/skill list --disabled
```

**Narration (continued):**
```
Remove skills you no longer need:
```

**Demo:**
```bash
/skill uninstall old-skill-name
```

**On Screen:** Confirmation prompt, then success

**Narration (continued):**
```
For project-specific configuration, create a .mcp.json file:
```

**On Screen:** Show .mcp.json example
```json
{
  "skills": {
    "enabled": ["git-workflow", "testing-patterns"],
    "disabled": ["legacy-patterns"],
    "autoInstall": true
  }
}
```

**Narration (continued):**
```
This ensures team members have the same skills configuration.
```

---

### [11:00 - 12:30] Performance Optimization (1.5 minutes)

**On Screen:** Performance metrics display

**Narration:**
```
Skills Manager uses progressive disclosure for optimal performance.

Three loading tiers:
1. Metadata (always in memory) - about 300 bytes per skill
2. Full skill (LRU cache, max 5) - loads when triggered
3. Reference files (on-demand) - never cached

Let's check cache statistics:
```

**Demo:**
```bash
/skill cache stats
```

**On Screen:** Show cache statistics
```
Metadata cache: 12 skills
Full skill cache: 5/5 skills
Cache hits: 47
Cache misses: 12
Hit rate: 79.7%
```

**Narration (continued):**
```
For best performance:

1. Keep installed skills under 20
2. Keep SKILL.md files under 10KB
3. Use reference files for detailed documentation
4. Clear cache if experiencing issues
```

**Demo:**
```bash
/skill cache clear
```

**Narration (continued):**
```
The Skills Manager is designed to be fast:
- Metadata loads in under 10ms
- Full skills load in under 50ms
- Reference files load in under 100ms

These targets ensure smooth IDE operation.
```

---

### [12:30 - 14:00] Troubleshooting (1.5 minutes)

**On Screen:** Common error examples

**Narration:**
```
Let's address common issues.

Problem: Skill not appearing after installation.

Solution:
```

**Demo:**
```bash
# Check if enabled
/skill list

# If disabled, enable it
/skill enable skill-name

# Clear cache
/skill cache clear

# Restart IDE
```

**Narration (continued):**
```
Problem: Installation fails with "SkillConflictError".

This means a skill with that name already exists.
```

**Demo (text overlay):**
```bash
# Uninstall existing skill first
/skill uninstall existing-skill-name

# Then install new version
/skill install ./new-skill
```

**Narration (continued):**
```
Problem: Skill not triggering when expected.

Check the skill's tags and description. They should match
your use case.
```

**On Screen:** Show SKILL.md with poor tags vs good tags

**Poor tags:**
```yaml
tags: [coding, help, assistant]
```

**Good tags:**
```yaml
tags: [testing, pytest, bdd, tdd, unit-tests]
```

**Narration (continued):**
```
Problem: Performance is slow with many skills.

Reduce active skills to under 20 recommended.
```

**Demo:**
```bash
/skill list --enabled
# Disable unused skills
/skill disable rarely-used-skill
```

**Narration (continued):**
```
For detailed troubleshooting, check the documentation:
```

**On Screen:** Show file path
```
docs/skills/TROUBLESHOOTING.md
```

---

### [14:00 - 15:00] Conclusion and Resources (1 minute)

**On Screen:** Summary slide

**Narration:**
```
Congratulations! You now know how to:

✅ Install skills from marketplace, local paths, or GitHub
✅ Browse and search the marketplace
✅ Create custom skills with SKILL.md
✅ Manage enabled/disabled skills
✅ Optimize performance with cache management
✅ Troubleshoot common issues

Skills make your AI more effective by providing:
- Consistent code quality
- Project-specific context
- Best practices enforcement
- Reusable team knowledge

Resources:
```

**On Screen (text overlay):**
```
📖 User Guide: docs/skills/USER_GUIDE.md
📖 Developer Guide: docs/skills/DEVELOPER_GUIDE.md
📖 API Reference: docs/skills/API_REFERENCE.md
📖 Troubleshooting: docs/skills/TROUBLESHOOTING.md

🐛 Report issues: github.com/AINative-Studio/AINativeStudio-IDE/issues
💬 Community: community.ainative.studio
📝 Specification: agentskills.io
```

**Narration (continued):**
```
Thank you for watching! Start creating skills to enhance your
AI-powered development workflow.

Happy coding with AINative Studio IDE!
```

**Visual:**
- Fade to AINative Studio IDE logo
- Show end screen with resource links
- Include subscribe/follow call-to-action

---

## Post-Production Notes

### Editing Checklist

- [ ] Trim any mistakes or long pauses
- [ ] Add chapter markers at each section timestamp
- [ ] Include text overlays for commands
- [ ] Add subtle background music (optional)
- [ ] Ensure audio levels consistent throughout
- [ ] Add captions/subtitles for accessibility
- [ ] Export in 1080p, 30fps minimum
- [ ] Create thumbnail with clear title

### Video Description (YouTube/Platform)

```
Learn how to use the Skills Manager in AINative Studio IDE!

In this comprehensive 15-minute tutorial, you'll discover:
✅ Installing skills from the marketplace
✅ Creating custom skills for your team
✅ Managing and optimizing skill performance
✅ Troubleshooting common issues

🔗 Resources:
- Documentation: [link]
- GitHub Repository: [link]
- Community Forum: [link]

⏱️ Timestamps:
00:00 - Introduction
01:00 - Installing Your First Skill
03:30 - Browsing the Marketplace
05:30 - Creating a Custom Skill
09:00 - Managing Skills
11:00 - Performance Optimization
12:30 - Troubleshooting
14:00 - Conclusion and Resources

👨‍💻 About AINative Studio IDE:
AINative Studio IDE is a powerful AI-enhanced development environment
designed to accelerate your coding workflow with intelligent assistance.

#AINativeStudio #Programming #AI #Development #Skills #Tutorial
```

### Thumbnail Design

**Text:** "Skills Manager Tutorial"
**Subtitle:** "15-Minute Complete Guide"
**Visual:** AINative Studio IDE logo + skill icons
**Colors:** Match IDE branding

---

## Recording Tips

1. **Pace:** Speak clearly and moderately slow
2. **Pauses:** Pause 2-3 seconds between major sections
3. **Commands:** Type commands slowly so viewers can follow
4. **Mouse:** Use smooth, deliberate mouse movements
5. **Errors:** If you make a mistake, pause and re-record that section
6. **Energy:** Maintain enthusiastic but professional tone
7. **Focus:** Keep IDE and terminal in focus, avoid desktop clutter

---

## Alternative Formats

### Short Version (5 minutes)

Focus on:
1. Installing first skill (1 min)
2. Browsing marketplace (1 min)
3. Creating simple skill (2 min)
4. Basic troubleshooting (1 min)

### Advanced Version (30 minutes)

Additional topics:
- Marketplace integration development
- Custom skill loaders
- Advanced caching strategies
- Performance profiling
- Contributing to official skills
- CI/CD integration
- Team workflow best practices

---

**Production Status:** Script Complete ✅
**Ready for:** Recording and editing
**Approver:** ranveerd11 (Testing Team Lead)
**Date:** 2026-01-04
