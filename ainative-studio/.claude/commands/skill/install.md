# Skill Install Command

Install a skill from various sources including local paths, NPM packages, GitHub repositories, or direct URLs.

## Usage

```bash
/skill install <source> [options]
```

## Sources

### Local Path
Install from a local directory containing a skill:
```bash
/skill install ./my-skills/custom-skill
/skill install /Users/username/skills/my-skill
```

### NPM Package
Install from the NPM registry:
```bash
/skill install @ainative/zerodb-workflows
/skill install skill-package-name
```

### GitHub Repository
Install from a GitHub repository:
```bash
/skill install anthropics/skills/mcp-builder
/skill install github:username/repo-name
```

### Direct URL
Install from a direct URL to a ZIP or tarball:
```bash
/skill install https://example.com/skills/my-skill.zip
/skill install https://example.com/skills/my-skill.tar.gz
```

## Options

- `--force` - Force reinstall even if the skill is already installed
- `--skip-validation` - Skip validation during installation

## Examples

Install a local skill:
```bash
/skill install ./skills/my-custom-skill
```

Install from NPM with force reinstall:
```bash
/skill install @ainative/zerodb-workflows --force
```

Install from GitHub:
```bash
/skill install anthropics/skills/mcp-builder
```

## What It Does

1. **Detects Source Type** - Automatically identifies whether the source is a local path, NPM package, GitHub repo, or URL
2. **Downloads/Copies** - Downloads the skill to a temporary directory or copies from local path
3. **Validates Format** - Checks that the skill has a valid SKILL.md file and proper structure
4. **Checks Duplicates** - Ensures the skill isn't already installed (unless `--force` is used)
5. **Installs Files** - Copies skill files to `~/.ainative/skills/{skill-name}/`
6. **Registers Skill** - Adds the skill to the registry at `~/.ainative/skills/registry.json`
7. **Shows Success** - Displays a success message with skill name, version, and installation location

## Error Handling

- **Network Errors** - Shows clear error if download fails
- **Invalid Format** - Rejects skills that don't have a valid SKILL.md file
- **Duplicate Detection** - Prevents installing the same skill twice (unless `--force` is used)
- **Validation Errors** - Shows specific errors if skill format is incorrect

## Progress Indicators

The command shows progress during:
- Preparing installation
- Downloading skill
- Validating skill format
- Reading skill metadata
- Installing skill files
- Registering skill

## Success Output

```
Successfully installed skill 'skill-name' (version 1.0.0) from local
Installed at: ~/.ainative/skills/skill-name
```

## Command Implementation

This command is implemented in:
- `/src/vs/workbench/contrib/ainative/common/skills/cli/installCommand.ts`
- Registered as: `ainative.skill.install`
