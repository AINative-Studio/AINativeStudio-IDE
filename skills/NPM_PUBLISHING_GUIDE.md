# AINative Skills - NPM Publishing Guide

Complete guide for publishing AINative official skills to the NPM registry.

---

## Quick Start

All skills are **ready for immediate publishing**. To publish all 5 skills:

```bash
cd /Users/aideveloper/AINativeStudio-IDE/skills
./publish-skills.sh --publish
```

---

## Prerequisites ✅ COMPLETE

### NPM Authentication
- ✅ Logged in as: `ainative-studio`
- ✅ Organization: `@ainative`
- ✅ Publish permissions: Confirmed

### Package Preparation
- ✅ All package.json files validated
- ✅ All SKILL.md files present
- ✅ npm pack tested for all packages
- ✅ publishConfig.access set to "public"

---

## Available Scripts

### 1. Validation Script
Tests all packages without publishing:

```bash
./validate-skills.sh
```

**Output:**
- Package name and version
- npm pack test results
- publishConfig validation
- Summary of passed/failed/warnings

### 2. Publishing Script
Publishes packages to NPM:

```bash
# Dry run (default - no actual publishing)
./publish-skills.sh

# Live publishing
./publish-skills.sh --publish
```

**Features:**
- NPM login verification
- Version conflict detection
- Success/failure tracking
- Colored output for clarity
- Confirmation prompt before live publishing

---

## Packages to be Published

| Package | Version | Description | Size |
|---------|---------|-------------|------|
| @ainative/skill-railway-deployment | 1.0.0 | Railway deployment workflows, nixpacks, production troubleshooting | 20.4 kB |
| @ainative/skill-zerodb-workflows | 1.0.0 | ZeroDB vector database, semantic search, RLHF, memory management | ~18 kB |
| @ainative/skill-api-design | 1.0.0 | FastAPI best practices, Pydantic models, RESTful design | ~15 kB |
| @ainative/skill-testing-patterns | 1.0.0 | TDD/BDD workflows, pytest, vitest, integration testing | ~25 kB |
| @ainative/skill-mcp-development | 1.0.0 | MCP server development, ZeroDB integration, tool systems | ~20 kB |

**Total:** ~98.4 kB unpacked

---

## Step-by-Step Publishing Process

### Step 1: Pre-Publishing Validation
```bash
cd /Users/aideveloper/AINativeStudio-IDE/skills
./validate-skills.sh
```

Expected output: "🎉 All skills are ready for NPM publishing!"

### Step 2: Dry Run Test
```bash
./publish-skills.sh
```

Verifies:
- NPM login status
- Package configurations
- Version conflicts
- Publishing readiness

### Step 3: Live Publishing
```bash
./publish-skills.sh --publish
```

This will:
1. Confirm NPM authentication
2. Ask for confirmation
3. Publish each package to NPM registry
4. Report success/failure for each package
5. Display final summary

### Step 4: Verification
Check packages on NPM:
- https://www.npmjs.com/package/@ainative/skill-railway-deployment
- https://www.npmjs.com/package/@ainative/skill-zerodb-workflows
- https://www.npmjs.com/package/@ainative/skill-api-design
- https://www.npmjs.com/package/@ainative/skill-testing-patterns
- https://www.npmjs.com/package/@ainative/skill-mcp-development

### Step 5: Installation Testing
```bash
# Test global installation
npm install -g @ainative/skill-railway-deployment

# Verify installation
npm list -g @ainative/skill-railway-deployment

# Repeat for other skills
```

---

## Manual Publishing (If Needed)

To publish a single skill manually:

```bash
cd <skill-directory>
npm publish --access public
```

Example:
```bash
cd railway-deployment
npm publish --access public
```

---

## Post-Publishing Tasks

### 1. Update Issue #79
- [ ] Mark all pre-publishing tasks as complete
- [ ] Mark all publishing tasks as complete
- [ ] Add NPM package links
- [ ] Update with verification results

### 2. Test Skills Manager Integration
- [ ] Verify OfficialMarketplace discovers packages
- [ ] Test skill installation via CLI
- [ ] Verify skill search functionality
- [ ] Test skill loading in IDE

### 3. Documentation Updates
- [ ] Add NPM badges to skill README files
- [ ] Update main project README
- [ ] Create CHANGELOG.md for each skill
- [ ] Document version management strategy

### 4. Create GitHub Releases
```bash
# Tag releases
git tag skill-railway-deployment-v1.0.0
git tag skill-zerodb-workflows-v1.0.0
git tag skill-api-design-v1.0.0
git tag skill-testing-patterns-v1.0.0
git tag skill-mcp-development-v1.0.0

# Push tags
git push origin --tags
```

---

## Version Management

### Current Strategy
- All skills start at version 1.0.0
- Follow semantic versioning (semver)
- Update versions independently per skill

### Future Updates

**Patch Release (1.0.x):**
```bash
cd <skill-directory>
npm version patch
npm publish --access public
```

**Minor Release (1.x.0):**
```bash
npm version minor
npm publish --access public
```

**Major Release (x.0.0):**
```bash
npm version major
npm publish --access public
```

---

## Troubleshooting

### Issue: "You must be logged in to publish packages"
**Solution:**
```bash
npm login
# Enter credentials when prompted
```

### Issue: "You do not have permission to publish"
**Solution:**
- Verify you're logged in as `ainative-studio`
- Check organization membership: https://www.npmjs.com/settings/ainative/members
- Contact organization owner if needed

### Issue: "Version X.X.X already exists"
**Solution:**
```bash
# Update version in package.json
npm version patch
npm publish --access public
```

### Issue: "npm ERR! 402 Payment Required"
**Solution:**
- Verify @ainative organization has active subscription
- Check billing settings: https://www.npmjs.com/settings/ainative/billing

---

## Rollback Procedure

If a published version has critical issues:

### 1. Deprecate the Version
```bash
npm deprecate @ainative/skill-<name>@<version> "Critical issue - use version X.X.X instead"
```

### 2. Publish Fixed Version
```bash
cd <skill-directory>
# Fix the issue
npm version patch
npm publish --access public
```

### 3. Notify Users
- Update package README with known issues
- Post announcement in project discussions
- Update documentation with migration guide

---

## Security Considerations

- **Access Tokens:** Never commit NPM tokens to Git
- **2FA:** Enable two-factor authentication on NPM account
- **Permissions:** Limit publish access to trusted maintainers
- **Audit:** Regularly audit package dependencies
- **Signing:** Consider package signing for verification

---

## CI/CD Integration (Future)

Automate publishing with GitHub Actions:

```yaml
name: Publish Skills to NPM

on:
  push:
    tags:
      - 'skill-*-v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{secrets.NPM_TOKEN}}
```

---

## Support & Resources

- **NPM Documentation:** https://docs.npmjs.com/
- **Package Issues:** https://github.com/AINative-Studio/ainative-skills/issues
- **AINative Support:** support@ainative.studio
- **Community:** https://discord.gg/ainative

---

## Checklist Summary

### Pre-Publishing ✅
- [x] Package validation complete
- [x] npm pack tested for all packages
- [x] NPM authentication verified
- [x] Publishing scripts created and tested

### Ready to Publish ✅
- [x] All packages configured correctly
- [x] All files properly included
- [x] publishConfig set to public
- [x] Dry run successful

### Execute Publishing
- [ ] Run `./publish-skills.sh --publish`
- [ ] Verify packages on npmjs.com
- [ ] Test installations
- [ ] Complete post-publishing tasks
- [ ] Close Issue #79

---

**Status:** ✅ READY FOR IMMEDIATE PUBLISHING

Execute `./publish-skills.sh --publish` to publish all 5 skills to NPM.
