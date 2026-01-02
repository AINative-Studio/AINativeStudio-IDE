---
description: Install a skill from various sources
---

Install a skill from marketplace, local path, NPM, GitHub, or URL.

**Usage:**
```bash
/skill-install <source>

# Examples:
/skill-install @ainative/zerodb-workflows    # NPM package (official)
/skill-install ./skills/custom-skill         # Local path
/skill-install anthropics/skills/mcp-builder # GitHub repo
/skill-install https://example.com/skill.zip # URL download
/skill-install custom-skill                  # Marketplace search
```

**Installation Steps:**

1. **Parse Source:**
   - Detect source type (NPM, GitHub, local path, URL, marketplace name)
   - Validate source format
   - Show what will be installed

2. **Download/Copy:**
   - For NPM: `npm install --global <package>` or download from registry
   - For GitHub: Clone or download release
   - For URL: Download and extract .skill zip file
   - For local: Copy to skills directory
   - For marketplace: Search and download from registry

3. **Validate Skill:**
   - Check for SKILL.md file
   - Parse frontmatter (name, version, description)
   - Validate required structure
   - Check for dependencies

4. **Install:**
   - Copy to `~/.ainative/skills/<skill-name>/`
   - Register in SkillsManagerService
   - Update registry
   - Enable by default

5. **Confirm:**
   - Show success message with skill details
   - Display skill description
   - Show how to invoke the skill
   - List any next steps

**Progress Indicators:**
- Downloading... (with progress bar for large downloads)
- Validating skill format...
- Installing to ~/.ainative/skills/...
- Registering skill...
- ✓ Installed successfully!

**Error Handling:**
- Source not found → Show clear error with suggestions
- Invalid skill format → Show validation errors
- Already installed → Prompt to update or reinstall
- Network failure → Retry logic + offline message
- Permission denied → Show permission fix command

**Security Checks:**
- Verify package signatures (for NPM/official)
- Scan for malicious patterns
- Prompt before executing any scripts
- Show file permissions changes

**Post-Install:**
- Run any setup scripts (with user confirmation)
- Display skill documentation
- Show usage examples
