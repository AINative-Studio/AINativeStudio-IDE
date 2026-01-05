# Skills Manager - Troubleshooting Guide

## Common Installation Issues

### Issue: Skill installation fails with "SkillConflictError"

**Symptoms:**
```
Error: SkillConflictError: A skill with name 'git-workflow' is already installed
```

**Cause:** Attempting to install a skill that already exists in the registry.

**Solution:**
```bash
# Option 1: Uninstall existing skill first
/skill uninstall git-workflow
/skill install ./my-git-workflow

# Option 2: Update existing skill instead
/skill update git-workflow
```

---

### Issue: NPM package installation fails

**Symptoms:**
```
Error: NetworkError: Failed to fetch package from NPM registry
npm ERR! code ETARGET
npm ERR! notarget No matching version found for @ainative/skill-nonexistent
```

**Cause:** Package doesn't exist, network issues, or incorrect package name.

**Solution:**
```bash
# 1. Verify package name exists
npm search @ainative/skill-

# 2. Check network connection
curl -I https://registry.npmjs.org/

# 3. Try with specific version
/skill install @ainative/skill-zerodb-workflows@1.2.0

# 4. Check NPM registry access
npm config get registry
# Should return: https://registry.npmjs.org/
```

---

### Issue: GitHub repository installation fails

**Symptoms:**
```
Error: Failed to clone repository: anthropics/skills/invalid-repo
fatal: repository 'https://github.com/anthropics/skills/invalid-repo' not found
```

**Cause:** Repository doesn't exist, private repository, or incorrect path.

**Solution:**
```bash
# 1. Verify repository exists
curl -I https://github.com/anthropics/skills/mcp-builder

# 2. Check if repository is public
# Private repos require authentication

# 3. Use correct GitHub path format
/skill install anthropics/skills/mcp-builder  # Correct
/skill install anthropics/mcp-builder          # Also correct
```

---

### Issue: Local skill installation fails with "SkillValidationError"

**Symptoms:**
```
Error: SkillValidationError: Invalid skill format
Missing required field: name
```

**Cause:** SKILL.md file is missing required YAML frontmatter fields.

**Solution:**
```bash
# 1. Validate skill format
/skill validate ./my-skill

# 2. Check SKILL.md structure
cat ./my-skill/SKILL.md
# Should have:
# ---
# name: skill-identifier
# description: Description here
# ---

# 3. Ensure required fields exist
# Required: name, description
# Optional: version, author, tags, category, license
```

**Example Valid SKILL.md:**
```markdown
---
name: my-custom-skill
description: A brief description of the skill
version: 1.0.0
---

# Skill content here
```

---

## Skill Loading Problems

### Issue: Skill not appearing in IDE

**Symptoms:**
- Skill installed successfully
- Not appearing in available skills list
- Not triggering when expected

**Diagnosis:**
```bash
# 1. Verify installation
/skill list

# 2. Check if enabled
/skill list --disabled
# If skill appears here, it's disabled

# 3. Check cache
/skill cache stats
```

**Solution:**
```bash
# 1. Enable skill if disabled
/skill enable my-skill

# 2. Clear cache and reload
/skill cache clear
# Restart IDE

# 3. Reinstall if still not working
/skill uninstall my-skill
/skill install ./my-skill
```

---

### Issue: Skill triggers too frequently or not at all

**Symptoms:**
- Skill activates in wrong contexts
- Expected trigger doesn't work

**Cause:** Tag or description mismatch with actual use case.

**Solution:**
```bash
# 1. Check skill metadata
cat ~/.ainative/skills/my-skill/SKILL.md | head -20

# 2. Review tags and description
# Tags should match keywords related to when skill should trigger
# Description should clearly state skill purpose

# 3. Update metadata
# Edit SKILL.md frontmatter
# Reinstall skill
```

**Example Better Tags:**
```yaml
# Instead of generic tags:
tags: [coding, help, assistant]

# Use specific, relevant tags:
tags: [testing, pytest, bdd, tdd, unit-tests]
```

---

### Issue: Reference files not loading

**Symptoms:**
```
Error: FileNotFoundError: Cannot load reference file: references/examples.md
```

**Cause:** Reference file missing or incorrect path.

**Solution:**
```bash
# 1. Verify file structure
tree ~/.ainative/skills/my-skill/
# Should show:
# my-skill/
# ├── SKILL.md
# └── references/
#     └── examples.md

# 2. Check file permissions
ls -la ~/.ainative/skills/my-skill/references/

# 3. Use correct relative path
# In SKILL.md, reference as: references/examples.md
# NOT: ./references/examples.md or /references/examples.md
```

---

## Performance Issues

### Issue: Slow IDE startup with many skills

**Symptoms:**
- IDE takes > 5 seconds to start
- Noticeable delay loading workspace
- High memory usage

**Diagnosis:**
```bash
# 1. Count active skills
/skill list --enabled | wc -l

# 2. Check skill sizes
du -sh ~/.ainative/skills/*

# 3. Check cache stats
/skill cache stats
```

**Solution:**
```bash
# 1. Reduce number of active skills (recommended: < 20)
/skill list --enabled
/skill disable unused-skill-1
/skill disable unused-skill-2

# 2. Keep skill files small (< 10KB recommended)
# Move large content to reference files

# 3. Clear cache if bloated
/skill cache clear

# 4. Optimize .mcp.json
# Only enable skills needed for current project
```

**Recommended .mcp.json:**
```json
{
  "skills": {
    "enabled": ["git-workflow", "testing-patterns"],
    "cache": {
      "maxFullSkills": 5
    }
  }
}
```

---

### Issue: High memory consumption

**Symptoms:**
- IDE using > 2GB RAM
- System slowdown
- Frequent garbage collection

**Diagnosis:**
```bash
# 1. Check cache stats
/skill cache stats
# Look for: fullSkillCacheSize

# 2. Check number of loaded skills
# Metadata: Always loaded (~300 bytes × 20 = 6KB)
# Full skills: LRU cache (~5KB × 5 = 25KB max)
```

**Solution:**
```bash
# 1. Reduce LRU cache size
# Edit .mcp.json:
{
  "skills": {
    "cache": {
      "maxFullSkills": 3  // Reduce from default 5
    }
  }
}

# 2. Disable unused skills
/skill list --enabled
/skill disable rarely-used-skill

# 3. Restart IDE to clear memory
```

---

### Issue: Skill loading takes > 100ms

**Symptoms:**
- Noticeable delay when triggering skill
- Performance metrics show slow load times

**Diagnosis:**
```bash
# 1. Check skill file size
du -h ~/.ainative/skills/slow-skill/SKILL.md
# Should be < 10KB

# 2. Check reference file count
find ~/.ainative/skills/slow-skill/references/ -type f | wc -l
# Many small files are better than one huge file

# 3. Profile skill loading
# Enable debug mode: SKILLS_DEBUG=true
```

**Solution:**
```bash
# 1. Split large SKILL.md into main + references
# Main SKILL.md: < 5KB (core instructions)
# References: Detailed docs, examples

# 2. Optimize reference structure
# Instead of:
# references/
#   └── everything.md (50KB)
#
# Do:
# references/
#   ├── examples.md (10KB)
#   ├── api-docs.md (15KB)
#   └── patterns.md (8KB)

# 3. Use progressive disclosure
# Load references on-demand, not eagerly
```

---

## Marketplace Errors

### Issue: Marketplace not refreshing

**Symptoms:**
```
/skill marketplace browse
# Shows: "No skills found" or outdated listings
```

**Cause:** Stale marketplace cache or network issues.

**Solution:**
```bash
# 1. Refresh marketplace cache
/skill marketplace refresh

# 2. Check network access
curl -I https://registry.npmjs.org/
curl -I https://api.github.com/

# 3. Clear all caches
/skill cache clear
/skill marketplace refresh

# 4. Check NPM registry configuration
npm config get registry
# Should return: https://registry.npmjs.org/
```

---

### Issue: Community marketplace not showing results

**Symptoms:**
- Official marketplace works
- Community/Anthropic marketplaces show no results

**Cause:** API rate limiting, network issues, or marketplace configuration.

**Solution:**
```bash
# 1. Check .mcp.json marketplace configuration
cat .mcp.json
# Should include:
{
  "skills": {
    "marketplace": {
      "sources": ["official", "anthropic", "community"]
    }
  }
}

# 2. Test API access
curl -I https://api.github.com/repos/anthropics/skills

# 3. Wait and retry (rate limiting)
# GitHub API: 60 requests/hour (unauthenticated)
# Wait 60 minutes or authenticate

# 4. Check logs
/skill logs
# Look for: API errors, network timeouts
```

---

## Cache Issues

### Issue: Skill changes not reflected after edit

**Symptoms:**
- Edited SKILL.md but old content still loads
- Updated metadata not showing

**Cause:** Aggressive caching.

**Solution:**
```bash
# 1. Invalidate specific skill cache
/skill cache clear my-skill

# 2. Invalidate all caches
/skill cache clear

# 3. Reinstall skill
/skill uninstall my-skill
/skill install ./my-skill

# 4. Restart IDE
# Metadata cache survives invalidation by design
# Full restart clears everything
```

---

### Issue: Cache corruption

**Symptoms:**
```
Error: Cannot deserialize cached skill metadata
TypeError: Cannot read property 'name' of undefined
```

**Cause:** Cache file corrupted or format changed.

**Solution:**
```bash
# 1. Clear cache completely
/skill cache clear

# 2. Verify installation
/skill list

# 3. If issue persists, reinstall all skills
/skill list > /tmp/installed-skills.txt
# Uninstall all, then reinstall
```

---

## Compilation and Build Problems

### Issue: TypeScript compilation errors preventing test execution

**Symptoms:**
```
npm run compile
# Shows: 246 errors
# Tests cannot execute
```

**Cause:** Base VS Code codebase has compilation errors.

**Diagnosis:**
```bash
# 1. Run compilation
npm run compile 2>&1 | tee compile-errors.log

# 2. Count errors
grep -c "error TS" compile-errors.log

# 3. Check common patterns
grep "Cannot find module" compile-errors.log
grep "has no exported member" compile-errors.log
```

**Solution:**
```bash
# 1. Report to urbantech team (Issue #80)
# Compilation errors must be fixed before full test execution

# 2. Use standalone tests in meantime
node --test standalone-skills-tests.js

# 3. Track compilation fix progress
# Check Issue #80 for updates

# 4. Verify fix when available
npm run compile
# Should show: 0 errors
```

---

### Issue: Tests exist but cannot execute

**Symptoms:**
```
npm run test-node
# Error: Cannot find module 'buffer.js'
# 49 test files created but not running
```

**Cause:** Compilation errors prevent test file compilation.

**Workaround:**
```bash
# 1. Use standalone tests (no VS Code dependencies)
node --test standalone-skills-tests.js

# 2. Wait for compilation fix (Issue #80)
# Full test suite will execute once base errors resolved

# 3. Verify test structure
ls -la src/vs/workbench/contrib/ainative/test/common/skills/
# Should show: *.test.ts files

# 4. When compilation fixed, run full suite
npm run test-node
```

---

## Permission and Access Issues

### Issue: Cannot write to skills directory

**Symptoms:**
```
Error: EACCES: permission denied, mkdir '/Users/user/.ainative/skills'
```

**Cause:** Insufficient permissions on skills directory.

**Solution:**
```bash
# 1. Check directory permissions
ls -la ~/.ainative/

# 2. Fix permissions
chmod 755 ~/.ainative/
chmod 755 ~/.ainative/skills/

# 3. Ensure ownership
sudo chown -R $USER:$USER ~/.ainative/

# 4. Retry installation
/skill install ./my-skill
```

---

### Issue: Cannot read skill files

**Symptoms:**
```
Error: EACCES: permission denied, open '/Users/user/.ainative/skills/my-skill/SKILL.md'
```

**Cause:** Incorrect file permissions.

**Solution:**
```bash
# 1. Fix file permissions
chmod -R u+rw ~/.ainative/skills/

# 2. Verify permissions
ls -la ~/.ainative/skills/my-skill/

# 3. Should show: -rw-r--r-- for files
# Should show: drwxr-xr-x for directories
```

---

## Advanced Debugging

### Enable Debug Logging

**For development:**
```bash
# Set environment variable
export SKILLS_DEBUG=true
./scripts/code.sh

# Check logs
/skill logs
```

**In code:**
```typescript
const DEBUG = process.env.SKILLS_DEBUG === 'true';

if (DEBUG) {
    console.log('[SkillLoader] Loading metadata:', skillName);
    console.log('[SkillLoader] Cache stats:', this.getCacheStats());
}
```

---

### Inspecting Registry

**Location:**
```bash
# Registry file
~/.ainative/skills/.registry.json

# View registry
cat ~/.ainative/skills/.registry.json | jq
```

**Expected format:**
```json
{
  "git-workflow": {
    "name": "git-workflow",
    "version": "1.0.0",
    "installedAt": 1735948800000,
    "source": "local",
    "path": "/Users/user/.ainative/skills/git-workflow",
    "enabled": true
  }
}
```

---

### Performance Profiling

**Measure skill load times:**
```typescript
const start = performance.now();
const skill = await skillLoader.loadFullSkill('my-skill');
const duration = performance.now() - start;

console.log(`Load time: ${duration.toFixed(2)}ms`);
// Target: < 50ms
```

**Check cache efficiency:**
```bash
/skill cache stats
# Look for:
# - Cache hit rate (higher is better)
# - Cache size (should not exceed maxFullSkills)
# - Miss count (lower is better)
```

---

## Getting Help

### Documentation Resources
- **User Guide**: [USER_GUIDE.md](USER_GUIDE.md) - Getting started and basic usage
- **Developer Guide**: [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) - Advanced topics and contributing
- **API Reference**: [API_REFERENCE.md](API_REFERENCE.md) - Complete API documentation

### Support Channels
- **GitHub Issues**: https://github.com/AINative-Studio/AINativeStudio-IDE/issues
- **Community Forum**: https://community.ainative.studio
- **Stack Overflow**: Tag questions with `ainative-studio` and `skills-manager`

### Reporting Bugs

**Before reporting:**
1. Search existing issues
2. Check this troubleshooting guide
3. Verify you're on latest version

**When reporting, include:**
```bash
# 1. Version info
/skill version

# 2. List of installed skills
/skill list

# 3. Error logs
/skill logs

# 4. Cache stats
/skill cache stats

# 5. System info
uname -a
node --version
npm --version
```

**Example bug report:**
```markdown
## Issue
Skill installation fails with NetworkError

## Steps to Reproduce
1. Run: /skill install @ainative/skill-test
2. Error appears immediately

## Environment
- OS: macOS 14.2
- Node: v20.10.0
- IDE Version: 1.0.0
- Skills installed: 12 (all enabled)

## Logs
[Paste relevant logs here]

## Expected Behavior
Skill should install successfully

## Actual Behavior
NetworkError: Failed to fetch package
```

---

**Last Updated:** 2026-01-04
**Version:** 1.0.0
