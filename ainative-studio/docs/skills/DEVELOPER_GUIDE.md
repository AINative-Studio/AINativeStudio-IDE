# Skills Manager - Developer Guide

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    AINative Studio IDE                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ SkillParser  │  │ SkillLoader  │  │SkillsRegistry│  │
│  │              │  │              │  │              │  │
│  │ - Parse MD   │  │ - LRU Cache  │  │ - Install    │  │
│  │ - Validate   │  │ - Progressive│  │ - Uninstall  │  │
│  │ - Extract    │  │   Loading    │  │ - List       │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                 │           │
│         └─────────────────┼─────────────────┘           │
│                           │                             │
│  ┌────────────────────────┴─────────────────────────┐   │
│  │           Marketplace Integration                │   │
│  ├──────────────────────────────────────────────────┤   │
│  │ OfficialMarketplace  │ AnthropicMarketplace      │   │
│  │ (NPM Registry)       │ (GitHub)                  │   │
│  │                      │                           │   │
│  │ CommunityMarketplace │ SkillSearch               │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Installation:** User → CLI → Marketplace → SkillsRegistry → File System
2. **Loading:** IDE Startup → SkillLoader → Metadata Cache → Memory
3. **Triggering:** User Action → SkillLoader → Full Skill Load → AI Context
4. **References:** On-Demand → File System → AI Context

### Progressive Loading Strategy

```typescript
// Tier 1: Metadata (Always in memory)
interface SkillSummary {
  name: string;           // 20 bytes
  description: string;    // 200 bytes
  tags: string[];        // 50 bytes
  category: string;      // 20 bytes
  location: string;      // 20 bytes
}
// Total: ~300 bytes × 20 skills = 6KB

// Tier 2: Full Skill (LRU Cache, max 5)
interface LoadedSkill {
  metadata: SkillMetadata;
  body: string;          // ~3-5KB
  resources: SkillResource[];
}
// Total: ~5KB × 5 skills = 25KB max

// Tier 3: Reference Files (No cache)
// Loaded on-demand, not kept in memory
```

---

## Skill Format Specification

### SKILL.md Structure

**Compliant with [Agent Skills Specification](https://agentskills.io)**

```markdown
---
name: skill-identifier
description: One-line description (max 200 chars)
version: 1.0.0
author: Author Name
license: MIT
tags: [tag1, tag2, tag3]
category: development
location: global
---

# Skill Title

## Section 1

Detailed instructions...

## Section 2

More content...
```

### YAML Frontmatter Schema

```typescript
interface SkillMetadata {
  // Required
  name: string;          // Unique identifier, lowercase-hyphenated
  description: string;   // One-line summary

  // Optional
  version?: string;      // Semantic version (default: "1.0.0")
  author?: string;       // Creator name
  license?: string;      // License type
  tags?: string[];       // Searchable tags
  category?: string;     // Skill category
  location?: 'global' | 'project';  // Scope
}
```

### Bundled Resources

**Directory Structure:**
```
skill-name/
├── SKILL.md               # Required
├── references/            # Optional
│   ├── api-docs.md       # Additional documentation
│   ├── examples.md       # Code examples
│   └── patterns.md       # Design patterns
├── scripts/              # Optional
│   ├── setup.sh          # Setup scripts
│   └── validate.js       # Validation scripts
└── assets/               # Optional
    ├── diagram.png       # Images
    └── architecture.svg  # Diagrams
```

---

## Creating Official Skills

### Content Guidelines

1. **Clarity**: Instructions must be clear and actionable
2. **Brevity**: Keep main content < 5KB (use references for details)
3. **Examples**: Include code examples for complex concepts
4. **Structure**: Use clear headings and sections
5. **Tone**: Professional, direct, imperative

**Good Example:**
```markdown
## Error Handling

Always use explicit error types:

\`\`\`typescript
try {
  await riskyOperation();
} catch (error) {
  if (error instanceof ValidationError) {
    handleValidationError(error);
  } else {
    throw error;
  }
}
\`\`\`
```

**Bad Example:**
```markdown
## Error Handling

You should probably handle errors properly. Maybe use try-catch or something.
```

### Quality Standards

**Required:**
- ✅ Validated YAML frontmatter
- ✅ Clear, actionable instructions
- ✅ At least 3 code examples
- ✅ Proper markdown formatting
- ✅ No spelling errors

**Recommended:**
- 📋 Reference documentation for deep dives
- 📋 Visual diagrams for complex concepts
- 📋 Setup scripts for environment config
- 📋 Validation scripts for compliance checking

### Testing Requirements

**Before publishing, verify:**

```bash
# 1. Validate skill format
/skill validate ./my-skill

# 2. Install locally
/skill install ./my-skill

# 3. Test triggering
# Open relevant file, verify skill loads

# 4. Test all examples
# Copy/paste all code examples, ensure they work

# 5. Check performance
# Skill body should be < 10KB
# Load time should be < 50ms
```

### Publishing Workflow

**To NPM (@ainative namespace):**

```bash
# 1. Prepare package.json
cd my-skill
cat > package.json << EOF
{
  "name": "@ainative/skill-my-skill",
  "version": "1.0.0",
  "description": "Brief description",
  "main": "SKILL.md",
  "keywords": ["ainative", "skill", "development"],
  "author": "Your Name",
  "license": "MIT"
}
EOF

# 2. Test locally
npm pack
/skill install ./ainative-skill-my-skill-1.0.0.tgz

# 3. Publish
npm login
npm publish --access public

# 4. Verify
npm search @ainative/skill-my-skill
/skill marketplace refresh
/skill marketplace browse my-skill
```

---

## Contributing

### Setting up development environment

```bash
# 1. Clone repository
git clone https://github.com/AINative-Studio/AINativeStudio-IDE
cd AINativeStudio-IDE/ainative-studio

# 2. Install dependencies
npm install

# 3. Build React components
npm run buildreact

# 4. Watch mode for development
npm run watch

# 5. Run tests
npm run test-node
```

### Running tests

**Unit Tests:**
```bash
# Run all tests
npm run test-node

# Run specific test file
npm run test-node -- --run out/vs/workbench/contrib/ainative/test/common/skills/skillParser.test.js

# Run with coverage
npm run test-node -- --coverage
```

**Standalone Tests:**
```bash
node standalone-skills-tests.js
```

### Code Style Guidelines

**Follow project conventions:**
- **Naming:** camelCase for variables/functions, PascalCase for classes
- **Indentation:** 4 spaces (tabs for TS, spaces for MD)
- **Line length:** ≤ 100 chars (wrap thoughtfully)
- **Comments:** Meaningful, updated; delete stale comments
- **Imports:** Group by: node built-ins, external, internal

**TypeScript Example:**
```typescript
import { URI } from '../../../../../base/common/uri.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { ISkillParser } from './skillParserTypes.js';

export class SkillParser implements ISkillParser {
    constructor(
        @IFileService private readonly fileService: IFileService
    ) {}

    async parseSkillFile(filePath: string): Promise<Skill> {
        // Implementation
    }
}
```

### PR Process

**Before submitting:**

1. **Run tests:** All tests must pass
   ```bash
   npm run test-node
   ```

2. **Check coverage:** Must be >= 80%
   ```bash
   npm run test-node -- --coverage
   ```

3. **Lint code:** Fix all linting errors
   ```bash
   npm run eslint
   ```

4. **Update docs:** If adding features

5. **Write commit message:** Follow conventional commits
   ```
   feat(skills): add marketplace search filtering

   - Add filter by category
   - Add filter by tags
   - Update marketplace command
   ```

**PR Template:**
```markdown
## Problem/Context
What issue are we solving?

## Solution
How does this change address the problem?

## Test Plan
Commands + results proving functionality

## Test Evidence
\`\`\`
$ npm run test-node
✓ All tests passing (12/12)
Coverage: 85%
\`\`\`

## Risk/Rollback
Potential issues and how to revert

## Story Link
Closes #58
```

---

## Extending the Skills Manager

### Adding New Marketplace Sources

**Example: GitLab Marketplace**

```typescript
// src/vs/workbench/contrib/ainative/common/marketplace/gitlabMarketplace.ts

export class GitLabMarketplace implements IMarketplace {
    async fetchSkills(query?: string): Promise<MarketplaceSkill[]> {
        // 1. Fetch from GitLab API
        const response = await fetch(
            `https://gitlab.com/api/v4/projects?search=${query}&topic=ainative-skill`
        );

        // 2. Parse response
        const projects = await response.json();

        // 3. Transform to MarketplaceSkill format
        return projects.map(proj => ({
            name: proj.name,
            description: proj.description,
            source: 'gitlab',
            installPath: proj.http_url_to_repo
        }));
    }

    async install(skill: MarketplaceSkill): Promise<void> {
        // Implementation
    }
}
```

### Custom Skill Loaders

**Example: Remote Skill Loader**

```typescript
export class RemoteSkillLoader implements ISkillLoader {
    async loadFullSkill(skillName: string): Promise<LoadedSkill> {
        // Fetch from remote server
        const response = await fetch(`https://skills.example.com/${skillName}`);
        const skillData = await response.json();

        return {
            metadata: skillData.metadata,
            body: skillData.content,
            resources: skillData.files
        };
    }
}
```

### Plugin Architecture

**Extend via dependency injection:**

```typescript
// Register custom marketplace
registerSingleton(
    IGitLabMarketplace,
    GitLabMarketplace,
    InstantiationType.Delayed
);

// Use in search service
export class EnhancedSkillSearch {
    constructor(
        @IOfficialMarketplace private official: IOfficialMarketplace,
        @IAnthropicMarketplace private anthropic: IAnthropicMarketplace,
        @IGitLabMarketplace private gitlab: IGitLabMarketplace
    ) {}

    async searchAll(query: string): Promise<MarketplaceSkill[]> {
        const results = await Promise.all([
            this.official.fetchSkills(query),
            this.anthropic.fetchSkills(query),
            this.gitlab.fetchSkills(query)
        ]);

        return results.flat();
    }
}
```

---

## Performance Optimization

### Benchmarks

**Target Performance:**
```typescript
describe('Performance Benchmarks', () => {
    it('should parse SKILL.md in < 50ms', async () => {
        const start = performance.now();
        await parser.parseSkillFile('/path/to/SKILL.md');
        const duration = performance.now() - start;

        assert.ok(duration < 50);
    });

    it('should load metadata for 20 skills in < 100ms', async () => {
        const start = performance.now();
        await Promise.all(
            skills.map(s => loader.loadMetadataOnly(s.name))
        );
        const duration = performance.now() - start;

        assert.ok(duration < 100);
    });
});
```

### Memory Management

**LRU Cache Implementation:**
```typescript
class LRUCache<K, V> {
    private cache = new Map<K, V>();
    private maxSize: number;

    get(key: K): V | undefined {
        const value = this.cache.get(key);
        if (value) {
            // Move to end (most recently used)
            this.cache.delete(key);
            this.cache.set(key, value);
        }
        return value;
    }

    set(key: K, value: V): void {
        if (this.cache.size >= this.maxSize) {
            // Evict oldest (first item)
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }
}
```

### Optimization Tips

1. **Keep skills small:** < 10KB recommended
2. **Use references:** For detailed documentation
3. **Lazy load:** Only load what's needed
4. **Cache metadata:** Never expires
5. **Limit active skills:** < 20 recommended

---

## Debugging

### Enable Debug Logging

```typescript
// Set environment variable
process.env.SKILLS_DEBUG = 'true';

// Or in code
const DEBUG = true;

if (DEBUG) {
    console.log('[SkillLoader] Loading metadata:', skillName);
}
```

### Common Issues

**Issue: Skill not parsing**
```bash
# Check YAML syntax
/skill validate ./my-skill

# View parser logs
SKILLS_DEBUG=true /skill install ./my-skill
```

**Issue: Performance degradation**
```bash
# Check cache stats
/skill cache stats

# Clear cache
/skill cache clear

# Reduce active skills
/skill list --enabled
/skill disable unused-skill
```

---

## API Versioning

Skills Manager follows semantic versioning:

- **Major (1.x.x):** Breaking changes to SKILL.md format
- **Minor (x.1.x):** New features (backward compatible)
- **Patch (x.x.1):** Bug fixes

**Migration Guide:** See [MIGRATION.md](MIGRATION.md) for version upgrades

---

## Resources

- **Specification:** https://agentskills.io
- **Source Code:** https://github.com/AINative-Studio/AINativeStudio-IDE
- **NPM Registry:** https://www.npmjs.com/org/ainative
- **Community:** https://community.ainative.studio

---

**Last Updated:** 2026-01-04
**Version:** 1.0.0
