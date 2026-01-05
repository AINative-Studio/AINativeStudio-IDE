# Skills Manager - API Reference

## Table of Contents

- [SkillsManager](#skillsmanager)
- [SkillParser](#skillparser)
- [SkillLoader](#skillloader)
- [SkillsRegistry](#skillsregistry)
- [Marketplace APIs](#marketplace-apis)
- [CLI Commands](#cli-commands)
- [Configuration](#configuration)

---

## SkillsManager

Main service for managing skills.

### install(skillPath: string, source: string): Promise<void>

Install a skill from the specified path and source.

**Parameters:**
- `skillPath` (string): Path to the skill (local, NPM, GitHub, URL)
- `source` (string): Source type ('local', 'official', 'anthropic', 'community')

**Returns:**
- Promise<void>

**Throws:**
- `SkillValidationError`: If skill format is invalid
- `SkillConflictError`: If skill with same name already installed
- `NetworkError`: If download fails

**Example:**
```typescript
await skillsManager.install('@ainative/skill-zerodb-workflows', 'official');
await skillsManager.install('./my-custom-skill', 'local');
await skillsManager.install('anthropics/skills/mcp-builder', 'anthropic');
```

---

### uninstall(skillName: string): Promise<void>

Uninstall a skill by name.

**Parameters:**
- `skillName` (string): Name of the skill to uninstall

**Returns:**
- Promise<void>

**Throws:**
- `SkillNotFoundError`: If skill is not installed

**Example:**
```typescript
await skillsManager.uninstall('git-workflow');
```

---

### list(options?: ListOptions): Promise<RegistryEntry[]>

List installed skills.

**Parameters:**
- `options` (ListOptions, optional): Filter options

**Returns:**
- Promise<RegistryEntry[]>: Array of installed skills

**Example:**
```typescript
// List all skills
const allSkills = await skillsManager.list();

// List only enabled skills
const enabledSkills = await skillsManager.list({ enabled: true });

// List only disabled skills
const disabledSkills = await skillsManager.list({ enabled: false });
```

**RegistryEntry Interface:**
```typescript
interface RegistryEntry {
    name: string;
    version: string;
    installedAt: number;
    source: 'local' | 'official' | 'anthropic' | 'community';
    path: string;
    enabled?: boolean;
}
```

---

## SkillParser

Service for parsing SKILL.md files.

### parseSkillFile(filePath: string): Promise<Skill>

Parse a SKILL.md file and extract metadata, body, and resources.

**Parameters:**
- `filePath` (string): Absolute path to SKILL.md file

**Returns:**
- Promise<Skill>: Parsed skill object

**Throws:**
- `SkillParseError`: If file cannot be parsed
- `FileNotFoundError`: If file doesn't exist

**Example:**
```typescript
const skill = await skillParser.parseSkillFile('/path/to/skill/SKILL.md');

console.log(skill.metadata.name);        // 'my-skill'
console.log(skill.metadata.description); // 'My custom skill'
console.log(skill.body);                 // Markdown content
console.log(skill.resources);            // [SkillResource, ...]
```

**Skill Interface:**
```typescript
interface Skill {
    metadata: SkillMetadata;
    body: string;
    resources: SkillResource[];
    fullPath: string;
}

interface SkillMetadata {
    name: string;
    description: string;
    version?: string;
    author?: string;
    license?: string;
    tags?: string[];
    category?: string;
    location?: 'global' | 'project';
}

interface SkillResource {
    type: 'reference' | 'script' | 'asset';
    path: string;
    content?: string;
}
```

---

### validateSkillFormat(filePath: string): Promise<boolean>

Validate that a file follows the SKILL.md format.

**Parameters:**
- `filePath` (string): Path to file to validate

**Returns:**
- Promise<boolean>: true if valid, false otherwise

**Example:**
```typescript
const isValid = await skillParser.validateSkillFormat('./my-skill/SKILL.md');
if (!isValid) {
    console.error('Invalid skill format');
}
```

---

## SkillLoader

Service for loading skills with progressive disclosure.

### loadMetadataOnly(skillName: string): Promise<SkillSummary>

Load only metadata for a skill (lightweight, ~100 words).

**Parameters:**
- `skillName` (string): Name of the skill

**Returns:**
- Promise<SkillSummary>: Skill metadata

**Throws:**
- `SkillNotFoundError`: If skill is not installed

**Performance:**
- Target: < 10ms per skill
- Cached: Never expires

**Example:**
```typescript
const metadata = await skillLoader.loadMetadataOnly('git-workflow');
console.log(metadata.name);        // 'git-workflow'
console.log(metadata.description); // 'Git commit standards...'
console.log(metadata.tags);        // ['git', 'workflow', 'commits']
```

**SkillSummary Interface:**
```typescript
interface SkillSummary {
    name: string;
    description: string;
    tags: string[];
    category: string;
    location: 'global' | 'project';
}
```

---

### loadFullSkill(skillName: string): Promise<LoadedSkill>

Load full skill including body content.

**Parameters:**
- `skillName` (string): Name of the skill

**Returns:**
- Promise<LoadedSkill>: Full skill with body

**Performance:**
- Target: < 50ms
- Cached: LRU cache (max 5 skills)

**Example:**
```typescript
const skill = await skillLoader.loadFullSkill('git-workflow');
console.log(skill.body); // Full markdown content
```

**LoadedSkill Interface:**
```typescript
interface LoadedSkill {
    metadata: SkillMetadata;
    body: string;
    resources: SkillResource[];
}
```

---

### loadReferenceFile(skillName: string, refPath: string): Promise<string>

Load a reference file on-demand.

**Parameters:**
- `skillName` (string): Name of the skill
- `refPath` (string): Relative path to reference file

**Returns:**
- Promise<string>: File content

**Performance:**
- Target: < 100ms
- Cached: No

**Example:**
```typescript
const examples = await skillLoader.loadReferenceFile(
    'git-workflow',
    'references/examples.md'
);
```

---

### getCacheStats(): CacheStats

Get cache statistics.

**Returns:**
- CacheStats: Current cache state

**Example:**
```typescript
const stats = skillLoader.getCacheStats();
console.log(`Metadata cache: ${stats.metadataCacheSize} skills`);
console.log(`Full skill cache: ${stats.fullSkillCacheSize} skills`);
console.log(`Cache hits: ${stats.metadataCacheHits}`);
console.log(`Cache misses: ${stats.metadataCacheMisses}`);
```

**CacheStats Interface:**
```typescript
interface CacheStats {
    metadataCacheSize: number;
    fullSkillCacheSize: number;
    metadataCacheHits: number;
    metadataCacheMisses: number;
}
```

---

### invalidateCache(skillName?: string): void

Invalidate cache for a skill (or all skills).

**Parameters:**
- `skillName` (string, optional): Skill to invalidate (omit for all)

**Example:**
```typescript
// Invalidate specific skill
skillLoader.invalidateCache('git-workflow');

// Invalidate all
skillLoader.invalidateCache();
```

---

## SkillsRegistry

Service for managing skill installation and registry.

### install(skillPath: string): Promise<void>

Install a skill from a local path.

**Parameters:**
- `skillPath` (string): Path to skill directory

**Throws:**
- `SkillConflictError`: If skill already installed
- `SkillValidationError`: If skill format invalid

**Example:**
```typescript
await skillsRegistry.install('./my-custom-skill');
```

---

### list(): Promise<RegistryEntry[]>

List all installed skills.

**Returns:**
- Promise<RegistryEntry[]>

**Example:**
```typescript
const skills = await skillsRegistry.list();
skills.forEach(skill => {
    console.log(`${skill.name} (${skill.version})`);
});
```

---

### get(skillName: string): Promise<RegistryEntry | null>

Get a specific skill entry.

**Parameters:**
- `skillName` (string): Name of skill

**Returns:**
- Promise<RegistryEntry | null>: Skill entry or null if not found

**Example:**
```typescript
const entry = await skillsRegistry.get('git-workflow');
if (entry) {
    console.log(entry.path);
}
```

---

### isInstalled(skillName: string): Promise<boolean>

Check if a skill is installed.

**Parameters:**
- `skillName` (string): Name of skill

**Returns:**
- Promise<boolean>

**Example:**
```typescript
if (await skillsRegistry.isInstalled('git-workflow')) {
    console.log('Git workflow skill is installed');
}
```

---

## Marketplace APIs

### OfficialMarketplace

#### fetchSkills(query?: string): Promise<MarketplaceSkill[]>

Fetch skills from NPM registry (@ainative namespace).

**Parameters:**
- `query` (string, optional): Search query

**Returns:**
- Promise<MarketplaceSkill[]>

**Example:**
```typescript
const skills = await officialMarketplace.fetchSkills('database');
```

---

### AnthropicMarketplace

#### fetchSkills(query?: string): Promise<MarketplaceSkill[]>

Fetch skills from Anthropic GitHub repository.

**Parameters:**
- `query` (string, optional): Search query

**Returns:**
- Promise<MarketplaceSkill[]>

**Example:**
```typescript
const skills = await anthropicMarketplace.fetchSkills('mcp');
```

---

### SkillSearch

#### searchAll(query: string, filters?: SearchFilters): Promise<MarketplaceSkill[]>

Search across all marketplaces.

**Parameters:**
- `query` (string): Search query
- `filters` (SearchFilters, optional): Filter options

**Returns:**
- Promise<MarketplaceSkill[]>: Sorted and filtered results

**Example:**
```typescript
const results = await skillSearch.searchAll('testing', {
    category: 'development',
    tags: ['tdd', 'bdd'],
    source: 'official'
});
```

**SearchFilters Interface:**
```typescript
interface SearchFilters {
    category?: string;
    tags?: string[];
    source?: 'official' | 'anthropic' | 'community';
    minVersion?: string;
}
```

---

## CLI Commands

### /skill install <source>

Install a skill.

**Arguments:**
- `source`: Local path, NPM package, GitHub repo, or URL

**Examples:**
```bash
/skill install ./my-skill
/skill install @ainative/skill-zerodb-workflows
/skill install anthropics/skills/mcp-builder
/skill install https://example.com/skill.zip
```

---

### /skill uninstall <name>

Uninstall a skill.

**Arguments:**
- `name`: Skill name

**Example:**
```bash
/skill uninstall git-workflow
```

---

### /skill list [--enabled|--disabled]

List installed skills.

**Flags:**
- `--enabled`: Show only enabled skills
- `--disabled`: Show only disabled skills

**Example:**
```bash
/skill list
/skill list --enabled
```

---

### /skill marketplace browse [query] [--category <cat>]

Browse marketplace.

**Arguments:**
- `query` (optional): Search query

**Flags:**
- `--category`: Filter by category

**Example:**
```bash
/skill marketplace browse
/skill marketplace browse testing --category development
```

---

### /skill create <name>

Create a new skill scaffold.

**Arguments:**
- `name`: Skill name

**Example:**
```bash
/skill create my-custom-skill
```

---

### /skill sync

Sync skills from core repository (if .claude is symlinked).

**Example:**
```bash
/skill sync
```

---

## Configuration

### .mcp.json Schema

Project-specific skill configuration.

```json
{
  "$schema": "https://ainative.studio/schemas/mcp.json",
  "skills": {
    "enabled": ["git-workflow", "testing-patterns"],
    "disabled": ["legacy-patterns"],
    "autoInstall": true,
    "marketplace": {
      "sources": ["official", "anthropic", "community"],
      "autoUpdate": false
    },
    "cache": {
      "maxFullSkills": 5,
      "metadataExpiry": -1
    }
  }
}
```

**Schema:**
```typescript
interface McpConfig {
    skills?: {
        enabled?: string[];
        disabled?: string[];
        autoInstall?: boolean;
        marketplace?: {
            sources?: ('official' | 'anthropic' | 'community')[];
            autoUpdate?: boolean;
        };
        cache?: {
            maxFullSkills?: number;
            metadataExpiry?: number; // -1 = never
        };
    };
}
```

---

## Error Types

### SkillParseError

Thrown when SKILL.md cannot be parsed.

**Properties:**
- `message`: Error description
- `filePath`: Path to problematic file

---

### SkillNotFoundError

Thrown when skill is not installed.

**Properties:**
- `message`: Error description
- `skillName`: Name of missing skill

---

### SkillConflictError

Thrown when installing duplicate skill.

**Properties:**
- `message`: Error description
- `skillName`: Name of conflicting skill

---

**Last Updated:** 2026-01-04
**Version:** 1.0.0
