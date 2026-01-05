# AINative Skills NPM Publishing Guide

This document describes the NPM publishing infrastructure for the 5 official AINative skills packages.

## Overview

All AINative skills are published to NPM under the `@ainative` organization scope with the naming convention `@ainative/skill-*`.

### Official Skills

| Skill | Package Name | Description |
|-------|--------------|-------------|
| ZeroDB Workflows | `@ainative/skill-zerodb-workflows` | Vector database, semantic search, RLHF workflows |
| MCP Development | `@ainative/skill-mcp-development` | Model Context Protocol server development patterns |
| API Design | `@ainative/skill-api-design` | FastAPI best practices and RESTful design |
| Testing Patterns | `@ainative/skill-testing-patterns` | TDD/BDD workflows for FastAPI + React |
| Railway Deployment | `@ainative/skill-railway-deployment` | Railway deployment and nixpacks configuration |

## Package Structure

Each skill package follows this structure:

```
skills/<skill-name>/
├── package.json          # NPM package metadata
├── SKILL.md             # Main skill documentation (agentskills.io spec)
├── README.md            # Package README for NPM
└── references/          # Reference documentation files
    ├── reference-1.md
    ├── reference-2.md
    └── ...
```

### Required Files

1. **package.json** - Must include:
   - `name`: Following `@ainative/skill-*` convention
   - `version`: Currently `1.0.0` for all skills
   - `description`: Clear, concise description
   - `keywords`: Relevant keywords for discoverability
   - `author`: "AINative Studio"
   - `license`: MIT or Apache-2.0
   - `repository`: GitHub repository information
   - `files`: Array of files to include in package
   - `publishConfig.access`: "public" for NPM public packages

2. **SKILL.md** - Must follow the agentskills.io specification:
   - YAML frontmatter with metadata
   - Clear "When to Use This Skill" section
   - Core concepts and patterns
   - Code examples and best practices

3. **README.md** - Package documentation for NPM registry

4. **references/** - Directory containing additional reference documentation

## Publishing Methods

### Method 1: GitHub Actions (Recommended)

The automated GitHub Actions workflow provides the safest and most consistent publishing process.

#### Trigger Workflow Manually

1. Go to GitHub Actions in the repository
2. Select "Publish Official Skills to NPM" workflow
3. Click "Run workflow"
4. Choose options:
   - **skill**: Select specific skill or "all"
   - **dry_run**:
     - `true` (default): Validate and test without publishing
     - `false`: Actually publish to NPM

#### Trigger via Git Tag

Create a tag with the format `skills/v*.*.*`:

```bash
git tag skills/v1.0.0
git push origin skills/v1.0.0
```

This will automatically trigger validation and publishing for all skills.

### Method 2: Local Testing

Test packaging locally before publishing:

```bash
cd skills/
./publish-local.sh              # Test all skills
./publish-local.sh api-design   # Test specific skill
```

This script:
- Validates package.json structure and required fields
- Validates SKILL.md existence and size
- Checks references/ directory
- Creates test tarballs with `npm pack`
- Reports package size and contents
- Cleans up test artifacts

### Method 3: Manual NPM Publishing

For manual publishing (requires NPM credentials):

```bash
# Login to NPM (one time)
npm login

# Publish a specific skill
cd skills/<skill-name>
npm publish --access public

# Or publish all skills
cd skills/
for skill in zerodb-workflows mcp-development api-design testing-patterns railway-deployment; do
  cd $skill
  npm publish --access public
  cd ..
done
```

## Pre-Publishing Checklist

Before publishing any skill:

- [ ] package.json has correct metadata
  - [ ] Name follows `@ainative/skill-*` convention
  - [ ] Version is correct (use semantic versioning)
  - [ ] Description is clear and accurate
  - [ ] Keywords are relevant and comprehensive
  - [ ] Repository URLs are correct
  - [ ] `publishConfig.access` is set to "public"
  - [ ] `files` array includes all necessary files

- [ ] SKILL.md follows agentskills.io spec
  - [ ] YAML frontmatter is complete
  - [ ] "When to Use This Skill" section exists
  - [ ] Examples are current and working
  - [ ] No sensitive information or credentials

- [ ] README.md is up to date
  - [ ] Installation instructions are correct
  - [ ] Usage examples work
  - [ ] Links are valid

- [ ] references/ directory is complete
  - [ ] All reference files are included
  - [ ] No broken links between references
  - [ ] Content is accurate and up to date

- [ ] Local testing passed
  - [ ] `./publish-local.sh <skill-name>` succeeds
  - [ ] Tarball contents are correct
  - [ ] No unexpected files in package

## Version Management

All skills currently use version `1.0.0`. For version updates:

### Semantic Versioning Guidelines

- **Patch (1.0.x)**: Bug fixes, typos, minor documentation updates
- **Minor (1.x.0)**: New features, new reference documents, non-breaking enhancements
- **Major (x.0.0)**: Breaking changes to skill structure or API patterns

### Update Version

1. Edit `package.json` in the skill directory
2. Update the `version` field
3. Commit changes
4. Create git tag: `git tag skills/v1.1.0`
5. Push tag: `git push origin skills/v1.1.0`

## NPM Organization Setup

### Required Secrets

The GitHub Actions workflow requires the following secret:

- `NPM_TOKEN`: NPM access token with publish permissions for `@ainative` organization

To create an NPM token:

1. Login to npmjs.com
2. Go to Account Settings → Access Tokens
3. Create new token with "Automation" type
4. Add token to GitHub repository secrets as `NPM_TOKEN`

### Organization Access

Ensure the NPM token has:
- Publishing permissions for `@ainative` scope
- Access to create new packages
- Public package publishing enabled

## Troubleshooting

### Package Name Already Exists

If you get "package name already taken":
- Check if package exists on NPM: `npm view @ainative/skill-<name>`
- Verify you have permissions to publish under `@ainative` scope
- Ensure NPM_TOKEN has correct organization access

### Validation Failures

If local or CI validation fails:
- Run `./publish-local.sh <skill-name>` to see detailed errors
- Check that all required files exist
- Validate JSON syntax in package.json: `node -e "require('./package.json')"`
- Ensure SKILL.md is at least 1KB in size

### Permission Denied

If publishing fails with permission error:
- Verify NPM_TOKEN secret is set correctly
- Check NPM token hasn't expired
- Ensure token has publishing permissions
- Verify organization membership

### Tarball Too Large

If package size is excessive:
- Check `.gitignore` and `.npmignore` files
- Verify `files` array in package.json only includes necessary files
- Remove any example code or test files
- Use `npm pack --dry-run` to see what would be included

## Post-Publishing Verification

After successful publishing:

1. **Verify on NPM**
   ```bash
   npm view @ainative/skill-<name>
   ```

2. **Test Installation**
   ```bash
   npm install @ainative/skill-<name>
   ```

3. **Check Package Page**
   - Visit: `https://www.npmjs.com/package/@ainative/skill-<name>`
   - Verify README displays correctly
   - Check all metadata is accurate

4. **Update Documentation**
   - Update any references to skill versions
   - Add release notes if applicable
   - Update agentskills.io registry (if applicable)

## Rollback Procedure

If a published version has critical issues:

### Deprecate Version

```bash
npm deprecate @ainative/skill-<name>@<version> "Reason for deprecation"
```

### Unpublish (Within 72 Hours)

```bash
npm unpublish @ainative/skill-<name>@<version>
```

**Note**: NPM only allows unpublishing within 72 hours of publication.

### Publish Fixed Version

1. Increment version (patch or minor)
2. Fix the issues
3. Test thoroughly with `./publish-local.sh`
4. Publish new version

## Continuous Integration

The GitHub Actions workflow automatically:

1. **Validates** all package.json files
2. **Checks** SKILL.md and references/ existence
3. **Tests** package creation with npm pack
4. **Creates** tarball artifacts for review
5. **Publishes** to NPM (when dry_run=false)
6. **Creates** GitHub releases (on tag triggers)
7. **Generates** summary reports

### CI/CD Best Practices

- Always run with `dry_run: true` first to validate
- Review artifact tarballs before production publish
- Use git tags for version tracking
- Monitor NPM downloads and issues
- Keep skill content synchronized with main repository

## Package Metadata Standards

### Keywords

Include relevant keywords for discoverability:
- Technology names (fastapi, pytest, railway, etc.)
- Skill type (testing, deployment, api-design, etc.)
- General terms (ainative, skill)

### Description

Write clear, concise descriptions (under 200 characters):
- What the skill provides
- Key technologies covered
- Primary use cases

### Repository

Always include repository information:
```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/AINative-Studio/ainative-skills",
    "directory": "skills/<skill-name>"
  }
}
```

### License

Choose appropriate license:
- `MIT`: Most permissive, recommended for general skills
- `Apache-2.0`: For skills requiring patent protection

## Security Considerations

### What NOT to Include

Never include in skill packages:
- API keys or credentials
- Sensitive configuration
- Private/proprietary code
- Large binary files
- node_modules or dependencies
- Build artifacts
- Test fixtures with sensitive data

### Review Process

Before publishing:
1. Review all markdown files for sensitive content
2. Check code examples for hardcoded credentials
3. Verify no .env files are included
4. Ensure no internal URLs or endpoints are exposed

## Support and Maintenance

### Reporting Issues

Users can report issues at:
https://github.com/AINative-Studio/ainative-skills/issues

### Maintenance Schedule

- **Monthly**: Review and update reference documentation
- **Quarterly**: Update versions for dependency changes
- **As Needed**: Patch critical bugs or security issues

### Community Contributions

To contribute improvements:
1. Fork the repository
2. Create feature branch
3. Update skill content
4. Submit pull request
5. Maintainers will review and merge

## References

- NPM Documentation: https://docs.npmjs.com/
- agentskills.io Specification: https://agentskills.io/
- Semantic Versioning: https://semver.org/
- GitHub Actions: https://docs.github.com/actions
