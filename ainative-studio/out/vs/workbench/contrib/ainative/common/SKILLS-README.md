# Skills Manager System

## Overview

The Skills Manager system provides infrastructure for parsing, storing, and managing AI skills in AINative Studio IDE.

## Architecture

### Core Components

1. **skillTypes.ts** - Type definitions and interfaces
2. **skillParser.ts** - Parse markdown files with YAML frontmatter
3. **skillRegistry.ts** - In-memory storage with efficient indexing
4. **skillsManagerService.ts** - Main service with VS Code integration

### File Structure

```
ainative/
├── common/
│   ├── skillTypes.ts          # Type definitions
│   ├── skillParser.ts          # Parsing logic
│   ├── skillRegistry.ts        # In-memory registry
│   ├── skillsManagerService.ts # Main service
│   └── storageKeys.ts          # Storage keys (modified)
└── test/
    └── common/
        ├── skillParser.test.ts
        ├── skillRegistry.test.ts
        └── skillsManagerService.test.ts
```

## Skill File Format

Skills are markdown files with YAML frontmatter:

```markdown
---
name: skill-name
description: Brief description
location: managed | project
tags:
  - tag1
  - tag2
dependencies:
  - other-skill
version: 1.0.0
author: Author Name
useWhen:
  - Context hint
---

# Skill Content

Markdown instructions here.
```

### Required Fields

- `name` - Unique identifier
- `description` - Human-readable description
- `location` - Either 'managed' or 'project'

### Optional Fields

- `tags` - Array of tags for categorization
- `dependencies` - Array of skill names this skill depends on
- `version` - Semantic version
- `author` - Author information
- `useWhen` - Context hints for when to use this skill

## Usage

### Service Access

```typescript
import { ISkillsManagerService } from './skillsManagerService.js';

// Get service via dependency injection
constructor(
  @ISkillsManagerService private readonly skillsManager: ISkillsManagerService
) {}
```

### Load a Skill

```typescript
await skillsManager.loadSkillFromFile(URI.file('/path/to/skill.md'));
```

### Retrieve Skills

```typescript
// By name
const skill = skillsManager.getSkillByName('mandatory-tdd');

// By tag
const testingSkills = skillsManager.getSkillsByTag('testing');

// With dependencies resolved
const skills = skillsManager.getSkillsWithDependencies('skill-name');

// All skills
const allSkills = skillsManager.getAllSkills();
```

### Manage Preferences

```typescript
// Track installation
skillsManager.markSkillAsInstalled('skill-name');

// Track usage
skillsManager.incrementSkillUsage('skill-name');

// Enable/disable
skillsManager.disableSkill('skill-name');
skillsManager.enableSkill('skill-name');

// Get preferences
const prefs = skillsManager.getPreferences();
```

### Events

```typescript
// Listen for changes
skillsManager.onDidChangeSkills(() => {
  console.log('Skills changed!');
});
```

## Testing

Run tests:
```bash
npm run test-node -- --grep "Skill"
```

Test coverage:
- 63 total tests
- 17 tests for parser
- 29 tests for registry
- 17 tests for service

## Features

- ✅ YAML frontmatter parsing
- ✅ Tag-based indexing
- ✅ Dependency resolution
- ✅ Circular dependency protection
- ✅ Persistent user preferences
- ✅ Event-driven architecture
- ✅ Graceful error handling
- ✅ VS Code dependency injection

## Future Enhancements

- File system watcher for auto-reload
- Skill marketplace integration
- UI components for browsing
- Full-text search
- Version compatibility checking

## Implementation Status

**Phase 1: Complete** ✅
- Core parser, registry, and loader implemented
- Comprehensive test coverage
- Storage integration
- Service registration

**Phase 2+: Planned**
- File watching
- UI components
- Marketplace
- AI integration
