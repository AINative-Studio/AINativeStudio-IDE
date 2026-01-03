# SkillLoader Service - Progressive Disclosure

**Component 3 of 4** for Issue #54 - Skills Manager Core

## Overview

The SkillLoader service implements intelligent skill loading with progressive disclosure:
1. **Metadata Always**: Load lightweight summaries for all skills (~1000 tokens total)
2. **Body On-Demand**: Load full skill content only when invoked
3. **References When Needed**: Load reference files when explicitly requested

## Architecture

### Progressive Loading Strategy

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: Workspace Startup                                  │
│ Load metadata for all skills (~100 words each)              │
│ Total: ~1000 tokens for 10 skills                          │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 2: Skill Invocation                                   │
│ Load full skill body when user activates skill              │
│ Body: ~2000-5000 tokens per skill                          │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 3: Reference Request                                  │
│ Load reference files when Claude needs extra context        │
│ Reference: ~1000-3000 tokens per file                      │
└─────────────────────────────────────────────────────────────┘
```

### Caching Strategy

| Cache Type | Max Size | Eviction | Purpose |
|------------|----------|----------|---------|
| Metadata Cache | Unlimited | Never | Always-available skill summaries |
| Full Skill Cache | 5 skills | LRU | Recently used skills |
| Reference Files | No cache | N/A | On-demand only |

## Files

### `skillLoaderTypes.ts`
Service interface and type definitions.

**Key Types:**
- `SkillSummary`: Lightweight metadata (~100 words)
- `LoadedSkill`: Full skill with body and resources
- `ISkillLoader`: Service interface

### `skillLoader.ts`
Main service implementation with caching logic.

**Key Features:**
- LRU cache for full skills
- Persistent metadata cache
- Performance tracking
- Error handling

### `skillLoaderExample.ts`
Comprehensive usage examples demonstrating all service methods.

## Usage

### 1. Load Metadata (Always in Context)

```typescript
const loader: ISkillLoader = ...;

// Load all skill metadata at startup
const allMetadata = await loader.getAllMetadata();
// Returns: [{ name, description, tags, category, location }, ...]
// Size: ~1000 tokens for 10 skills
```

### 2. Load Full Skill (On-Demand)

```typescript
// User invokes skill "git-workflow"
const fullSkill = await loader.loadFullSkill('git-workflow');

console.log(fullSkill.metadata);  // Frontmatter data
console.log(fullSkill.body);      // Full markdown body
console.log(fullSkill.resources); // Available reference files
```

### 3. Load Reference File (When Requested)

```typescript
// Claude requests additional context
const content = await loader.loadReference(
  'git-workflow',
  'ai-attribution-enforcement.md'
);
// Returns: Raw file content
```

### 4. Preload Metadata (Startup Optimization)

```typescript
// Warm cache during workspace initialization
const enabledSkills = ['git-workflow', 'mandatory-tdd', 'code-quality'];
await loader.preloadMetadata(enabledSkills);
```

### 5. Clear Cache (Testing/Updates)

```typescript
// Clear all caches
loader.clearCache();
```

## Performance Metrics

### Target Performance

| Operation | Target | Cache Hit |
|-----------|--------|-----------|
| Metadata loading | < 10ms | < 1ms |
| Full skill loading | < 50ms | < 1ms |
| Reference file loading | < 100ms | N/A (no cache) |
| All metadata (10 skills) | < 50ms | < 5ms |

### Memory Usage

| Cache | Size | Total |
|-------|------|-------|
| Metadata (10 skills) | ~500 bytes each | ~5KB |
| Full skills (max 5) | ~10KB each | ~50KB |
| **Total** | | **< 60KB** |

### Context Token Usage

| Phase | Tokens | When |
|-------|--------|------|
| Metadata only (10 skills) | ~1000 | Always in context |
| Full skill body | ~2000-5000 | On invocation |
| Reference file | ~1000-3000 | On request |

## Integration

### Dependencies

The SkillLoader requires three dependencies (to be implemented):

```typescript
// Component 1 - Registry (provides skill paths)
interface ISkillsRegistry {
  getSkillPath(skillName: string): Promise<string | null>;
  getAllInstalledSkills(): Promise<string[]>;
}

// Component 2 - Parser (parses SKILL.md files)
interface ISkillParser {
  parseMetadataOnly(content: string): SkillMetadata;
  parseFullSkill(content: string): { metadata, body, resources };
}

// VS Code Platform Service
import { IFileService } from 'vs/platform/files/common/files';
```

### Service Registration

```typescript
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { ISkillLoader } from './skillLoaderTypes';
import { SkillLoader } from './skillLoader';

registerSingleton(ISkillLoader, SkillLoader, InstantiationType.Delayed);
```

### Dependency Injection

```typescript
constructor(
  @ISkillLoader private readonly skillLoader: ISkillLoader
) {
  // Service is automatically injected
}
```

## Examples

See `skillLoaderExample.ts` for complete examples:

1. **Load All Metadata** - Populate skill picker
2. **Load Full Skill** - Handle skill invocation
3. **Load Reference** - Provide additional context
4. **Preload Metadata** - Startup optimization
5. **Cache Performance** - Demonstrate speedup
6. **Progressive Workflow** - Complete user journey

## Implementation Details

### LRU Cache

The full skill cache uses a Least Recently Used (LRU) eviction policy:

```typescript
class LRUCache<K, V> {
  private cache: Map<K, V> = new Map();
  private maxSize: number;

  get(key: K): V | undefined {
    // Move accessed item to end (most recent)
  }

  set(key: K, value: V): void {
    // Evict oldest if at capacity
  }
}
```

### Error Handling

```typescript
// Skill not found
throw new Error(`Skill not found: ${skillName}`);

// Reference file not found
throw new Error(`Reference file not found: ${skillName}/references/${path}`);
```

### Performance Tracking

```typescript
// Internal cache statistics
getCacheStats(): CacheStats {
  metadataCount: number;
  fullSkillCount: number;
  estimatedMemoryUsage: number;
  hitRatio: number;
}
```

## Testing

### Compilation

```bash
cd ainative-studio
npm run compile
```

Verify output:
- `out/vs/workbench/contrib/ainative/common/skills/skillLoader.js`
- `out/vs/workbench/contrib/ainative/common/skills/skillLoaderTypes.js`
- `out/vs/workbench/contrib/ainative/common/skills/skillLoaderExample.js`

### Manual Testing

```typescript
import { runAllExamples } from './skillLoaderExample';

// Create mock dependencies
const mockRegistry = ...;
const mockParser = ...;
const fileService = ...;

const loader = new SkillLoader(mockRegistry, mockParser, fileService);
await runAllExamples(loader);
```

## Benefits

### Context Window Optimization

- **Before**: Load all 10 skills fully (~20,000 tokens)
- **After**: Load metadata only (~1,000 tokens)
- **Savings**: 95% reduction in initial context size

### Memory Efficiency

- Metadata cache: Permanent, small footprint (~5KB)
- Full skill cache: Limited to 5 most recent (~50KB max)
- No reference file caching: Read on-demand only

### Performance

- Metadata: Sub-millisecond cache hits
- Full skills: ~10x speedup with caching
- Lazy loading: Only pay for what you use

## Future Enhancements

1. **Preload Hints**: Predictive loading based on user patterns
2. **Compression**: Compress cached full skills
3. **Telemetry**: Track skill usage for optimization
4. **Background Loading**: Preload likely-needed skills
5. **Memory Pressure**: Auto-evict on low memory

## Related Components

- **Component 1**: SkillsRegistry (provides skill paths)
- **Component 2**: SkillParser (parses SKILL.md files)
- **Component 4**: SkillManager (orchestrates all components)

## References

- Issue #54: Skills Manager Core
- Progressive Disclosure Pattern: https://www.nngroup.com/articles/progressive-disclosure/
- LRU Cache Algorithm: https://en.wikipedia.org/wiki/Cache_replacement_policies#LRU
