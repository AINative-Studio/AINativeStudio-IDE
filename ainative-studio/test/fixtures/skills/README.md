# Skills Manager Test Fixtures

This directory contains test fixtures for the Skills Manager test suite.

## Directory Structure

```
test/fixtures/skills/
├── valid/               # Valid skill files for positive testing
├── invalid/             # Invalid skill files for error handling tests
├── edge-cases/          # Edge case scenarios
└── mock-marketplace/    # Mock marketplace API responses
```

## Valid Skills

Located in `valid/`:

- **simple-skill.md** - Basic skill with minimal metadata
- **skill-with-dependencies.md** - Skill with dependency declarations
- **skill-with-tags.md** - Skill with comprehensive tag coverage
- **skill-unicode.md** - Skill with Unicode and multi-language content

## Invalid Skills

Located in `invalid/`:

- **missing-frontmatter.md** - Missing frontmatter delimiters
- **invalid-yaml.md** - Malformed YAML in frontmatter
- **missing-required-fields.md** - Missing required metadata fields

## Edge Cases

Located in `edge-cases/`:

- **empty-file.md** - Completely empty file
- **no-content.md** - Frontmatter only, no content
- **special-characters.md** - Special markdown characters
- **large-file.md** - Large file for performance testing (~100KB)

## Mock Marketplace Data

Located in `mock-marketplace/`:

- **official-skills.json** - Mock official skills catalog
- **skill-versions.json** - Version history for skills

## Usage in Tests

```typescript
import { join } from 'path';

const fixturesPath = join(__dirname, '../fixtures/skills');

// Load valid skill
const validSkillPath = join(fixturesPath, 'valid/simple-skill.md');

// Load invalid skill for error testing
const invalidSkillPath = join(fixturesPath, 'invalid/missing-frontmatter.md');

// Load mock marketplace data
const marketplaceData = require(join(fixturesPath, 'mock-marketplace/official-skills.json'));
```

## Maintenance

When adding new test fixtures:

1. Place in appropriate subdirectory
2. Document purpose in comments
3. Update this README
4. Reference in test files that use it
