# Skill Uninstall Command

Uninstall an installed skill from your system.

## Usage

```bash
/skill uninstall <skill-name> [options]
```

## Arguments

- `<skill-name>` - The name of the skill to uninstall (required)

## Options

- `--skip-confirmation` - Skip the confirmation prompt and uninstall immediately

## Examples

Uninstall a skill with confirmation:
```bash
/skill uninstall my-skill
```

Uninstall without confirmation:
```bash
/skill uninstall my-skill --skip-confirmation
```

## What It Does

1. **Checks Installation** - Verifies that the skill is actually installed
2. **Shows Confirmation** - Displays a dialog with skill details and asks for confirmation (unless `--skip-confirmation` is used)
3. **Removes Files** - Deletes all skill files from `~/.ainative/skills/{skill-name}/`
4. **Updates Registry** - Removes the skill entry from `~/.ainative/skills/registry.json`
5. **Shows Success** - Displays a success message

## Confirmation Dialog

When you run the uninstall command, you'll see a confirmation dialog showing:
- Skill name
- Installed version
- Installation path
- Source type (local, npm, git)

Example:
```
Are you sure you want to uninstall 'my-skill'?

This will remove all files for the skill from your system.

Installed at: ~/.ainative/skills/my-skill
Version: 1.0.0
Source: local
```

You can choose:
- **Uninstall** - Proceed with uninstallation
- **Cancel** - Cancel the operation

## Error Handling

- **Skill Not Found** - Shows error if the skill name doesn't exist
- **Permission Errors** - Shows error if files cannot be deleted
- **User Cancellation** - Silently exits if user cancels the confirmation dialog

## Success Output

```
Successfully uninstalled skill 'my-skill'
```

## Listing Installed Skills

To see which skills are installed and available for uninstallation, use:
```bash
/skill list
```

This will show all installed skills with their:
- Name
- Version
- Source type
- Installation date

## Command Implementation

This command is implemented in:
- `/src/vs/workbench/contrib/ainative/common/skills/cli/uninstallCommand.ts`
- Registered as: `ainative.skill.uninstall`
