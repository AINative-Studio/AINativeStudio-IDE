# SkillsRegistry Usage Example

This document demonstrates how to use the SkillsRegistry service.

## Service Registration

The SkillsRegistry is automatically registered as a singleton service using dependency injection:

```typescript
registerSingleton(ISkillsRegistry, SkillsRegistry, InstantiationType.Delayed);
```

## Usage Examples

### 1. Installing a Skill

```typescript
import { ISkillsRegistry } from './skillRegistryTypes.js';

class MyService {
  constructor(
    @ISkillsRegistry private readonly skillsRegistry: ISkillsRegistry
  ) {}

  async installSkill() {
    // Install a skill from a local path
    await this.skillsRegistry.install('/Users/user/.claude/skills/git-workflow');

    console.log('Skill installed successfully!');
  }
}
```

### 2. Listing All Skills

```typescript
async listSkills() {
  const skills = await this.skillsRegistry.list();

  console.log('Installed skills:');
  skills.forEach(skill => {
    console.log(`- ${skill.name} (v${skill.version})`);
    console.log(`  Path: ${skill.path}`);
    console.log(`  Installed: ${new Date(skill.installedAt).toLocaleString()}`);
  });
}
```

### 3. Checking if a Skill is Installed

```typescript
async checkSkill() {
  const isInstalled = await this.skillsRegistry.isInstalled('git-workflow');

  if (isInstalled) {
    console.log('Skill is installed');
  } else {
    console.log('Skill not found');
  }
}
```

### 4. Getting a Specific Skill

```typescript
async getSkill() {
  const skill = await this.skillsRegistry.get('git-workflow');

  if (skill) {
    console.log(`Name: ${skill.name}`);
    console.log(`Version: ${skill.version}`);
    console.log(`Source: ${skill.source}`);
    console.log(`Path: ${skill.path}`);
  } else {
    console.log('Skill not found');
  }
}
```

### 5. Uninstalling a Skill

```typescript
async uninstallSkill() {
  try {
    await this.skillsRegistry.uninstall('git-workflow');
    console.log('Skill uninstalled successfully');
  } catch (error) {
    console.error('Failed to uninstall:', error.message);
  }
}
```

## Registry File Format

The registry is persisted to `~/.ainative/skills/registry.json`:

```json
{
  "git-workflow": {
    "name": "git-workflow",
    "version": "1.0.0",
    "installedAt": 1704067200000,
    "source": "local",
    "path": "/Users/user/.ainative/skills/git-workflow"
  },
  "mandatory-tdd": {
    "name": "mandatory-tdd",
    "version": "1.0.0",
    "installedAt": 1704067300000,
    "source": "local",
    "path": "/Users/user/.ainative/skills/mandatory-tdd"
  }
}
```

## Storage Structure

```
~/.ainative/
└── skills/
    ├── registry.json          # Registry file
    ├── git-workflow/          # Installed skill
    │   ├── SKILL.md
    │   └── references/
    └── mandatory-tdd/         # Another installed skill
        ├── SKILL.md
        └── references/
```

## Error Handling

The registry service throws errors in the following cases:

1. **Duplicate Installation**: When trying to install a skill that already exists
2. **Skill Not Found**: When trying to uninstall a non-existent skill
3. **Invalid Skill Format**: When the skill doesn't have a valid SKILL.md file
4. **File System Errors**: When file operations fail

Example error handling:

```typescript
try {
  await skillsRegistry.install('/path/to/skill');
} catch (error) {
  if (error.message.includes('already installed')) {
    console.error('Skill is already installed. Uninstall first to reinstall.');
  } else if (error.name === 'SkillParseError') {
    console.error('Invalid skill format:', error.message);
  } else {
    console.error('Installation failed:', error.message);
  }
}
```

## Integration with Other Services

The SkillsRegistry depends on:

- **IFileService**: For file system operations (read, write, copy, delete)
- **ISkillParser**: For parsing SKILL.md files and extracting metadata
- **IEnvironmentService**: For accessing the user home directory

These dependencies are automatically injected through the VS Code dependency injection system.
