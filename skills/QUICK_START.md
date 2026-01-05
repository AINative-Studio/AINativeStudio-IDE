# Quick Start: Publishing AINative Skills to NPM

This is a quick reference guide for common NPM publishing tasks. For detailed documentation, see [PUBLISHING.md](./PUBLISHING.md).

## Prerequisites

- Node.js 18+ installed
- NPM account with access to `@ainative` organization
- GitHub repository access

## Quick Commands

### Test All Skills Locally

```bash
cd skills/
./publish-local.sh
```

### Test a Specific Skill

```bash
cd skills/
./publish-local.sh api-design
```

### Publish via GitHub Actions (Recommended)

1. Go to: https://github.com/AINative-Studio/AINativeStudio-IDE/actions
2. Select: "Publish Official Skills to NPM"
3. Click: "Run workflow"
4. Choose:
   - **skill**: `all` (or select specific skill)
   - **dry_run**: `true` for testing, `false` for production

### Manual Publish (Local)

```bash
# Login to NPM (one time)
npm login

# Publish a single skill
cd skills/api-design
npm publish --access public

# Publish all skills
cd skills/
for skill in zerodb-workflows mcp-development api-design testing-patterns railway-deployment; do
  cd $skill
  npm publish --access public
  cd ..
done
```

## Verify Published Package

```bash
# Check package details
npm view @ainative/skill-api-design

# Test installation
npm install @ainative/skill-api-design
```

## Common Tasks

### Update Package Version

1. Edit `skills/<skill-name>/package.json`
2. Change `version` field (e.g., "1.0.0" → "1.0.1")
3. Commit and push changes
4. Publish using GitHub Actions or manual method

### Create Release Tag

```bash
# Create and push tag
git tag skills/v1.0.0
git push origin skills/v1.0.0

# This triggers GitHub Actions automatically
```

### Rollback/Deprecate a Version

```bash
# Deprecate (not remove)
npm deprecate @ainative/skill-api-design@1.0.0 "Description of issue"

# Unpublish (within 72 hours only)
npm unpublish @ainative/skill-api-design@1.0.0
```

## Package Information

| Package | Size | Keywords | License |
|---------|------|----------|---------|
| @ainative/skill-zerodb-workflows | 14.7 kB | 9 | Apache-2.0 |
| @ainative/skill-mcp-development | 13.6 kB | 8 | MIT |
| @ainative/skill-api-design | 14.4 kB | 12 | MIT |
| @ainative/skill-testing-patterns | 12.7 kB | 13 | MIT |
| @ainative/skill-railway-deployment | 14.2 kB | 10 | MIT |

## Troubleshooting

### "Permission denied" error

```bash
# Login to NPM
npm login

# Verify organization access
npm org ls ainative
```

### "Package already exists" error

```bash
# Check if you have permissions
npm view @ainative/skill-<name>

# Verify you're logged in
npm whoami
```

### Validation failures

```bash
# Run local test script
cd skills/
./publish-local.sh <skill-name>

# Check specific validation
node -e "require('./skills/<skill-name>/package.json')"
```

## GitHub Actions Setup

Add NPM token to GitHub secrets:

1. Create NPM token at: https://www.npmjs.com/settings/tokens
2. Choose "Automation" type
3. Copy token
4. Go to: GitHub repo → Settings → Secrets and variables → Actions
5. Add secret: `NPM_TOKEN` = `<your-token>`

## File Structure

Each skill package must include:

```
skills/<skill-name>/
├── package.json          # NPM metadata
├── SKILL.md             # Main documentation
├── README.md            # NPM package page
└── references/          # Additional docs
    ├── file1.md
    ├── file2.md
    └── ...
```

## Required package.json Fields

```json
{
  "name": "@ainative/skill-<name>",
  "version": "1.0.0",
  "description": "Clear description",
  "keywords": ["keyword1", "keyword2", "ainative", "skill"],
  "author": "AINative Studio",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/AINative-Studio/ainative-skills",
    "directory": "skills/<skill-name>"
  },
  "files": [
    "SKILL.md",
    "README.md",
    "references/"
  ],
  "publishConfig": {
    "access": "public"
  }
}
```

## Resources

- **Full Documentation**: [PUBLISHING.md](./PUBLISHING.md)
- **Status Report**: [NPM_PUBLISHING_STATUS.md](./NPM_PUBLISHING_STATUS.md)
- **NPM Organization**: https://www.npmjs.com/org/ainative
- **GitHub Actions**: https://github.com/AINative-Studio/AINativeStudio-IDE/actions
- **Issues**: https://github.com/AINative-Studio/ainative-skills/issues

## Quick Checklist Before Publishing

- [ ] All tests pass: `./publish-local.sh`
- [ ] Version number updated (if not 1.0.0)
- [ ] SKILL.md is current and complete
- [ ] README.md has correct installation instructions
- [ ] No sensitive data in files
- [ ] License is correct
- [ ] Logged into NPM: `npm whoami`
- [ ] GitHub Actions has NPM_TOKEN secret

## First Time Publishing All Skills

```bash
# 1. Test locally
cd skills/
./publish-local.sh

# 2. Verify all tests pass
# (Should see: Successful: 5/5)

# 3. Use GitHub Actions for safe publish
# Go to GitHub Actions → Publish Official Skills to NPM
# Run with dry_run: true first
# Then run with dry_run: false

# 4. Verify on NPM
npm view @ainative/skill-zerodb-workflows
npm view @ainative/skill-mcp-development
npm view @ainative/skill-api-design
npm view @ainative/skill-testing-patterns
npm view @ainative/skill-railway-deployment

# Done! All skills published.
```

## Support

For questions or issues:
- Open an issue: https://github.com/AINative-Studio/ainative-skills/issues
- Check documentation: [PUBLISHING.md](./PUBLISHING.md)
- Review status: [NPM_PUBLISHING_STATUS.md](./NPM_PUBLISHING_STATUS.md)
