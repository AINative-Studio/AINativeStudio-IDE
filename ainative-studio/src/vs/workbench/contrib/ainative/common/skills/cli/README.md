# Skills Marketplace CLI Commands

This directory contains CLI command implementations for the Skills Marketplace feature.

## Overview

The marketplace CLI provides commands for browsing, searching, and managing skills from multiple marketplace sources:

1. **Official Marketplace** - Curated @ainative packages from NPM
2. **Anthropic Marketplace** - Skills from github.com/anthropics/skills
3. **Community Marketplace** - Community-submitted skills from api.ainative.studio

## Files

### marketplaceCommand.ts
Core implementation of the marketplace browse command. Handles:
- Fetching skills from all three marketplaces
- Filtering by search term, category, and provider
- Cache management
- Error handling and graceful degradation

**Key Classes:**
- `MarketplaceCommand` - Main command implementation
- `MarketplaceBrowseOptions` - Configuration options interface
- `MarketplaceBrowseResult` - Result type for browse operations

### marketplaceFormatter.ts
Output formatting utilities for CLI display. Handles:
- Grouping skills by marketplace source
- Formatting skill information with icons
- Displaying install commands
- Error message formatting
- Cache status display

**Key Classes:**
- `MarketplaceFormatter` - Static formatting utilities

### marketplaceCommandExample.ts
Example usage patterns and integration examples showing:
- Basic browsing
- Filtering and searching
- Cache management
- Error handling
- VS Code command integration

### cliTypes.ts
Type definitions for CLI commands including:
- `ISkillInstallService` - Service for installing skills
- `InstallOptions` - Installation configuration
- `InstallResult` - Installation result type

## Usage

### Basic Browse

```typescript
import { MarketplaceCommand } from './marketplaceCommand';

const command = new MarketplaceCommand(
    officialMarketplace,
    anthropicMarketplace,
    communityMarketplace,
    searchService,
    logService
);

// Browse all skills
const result = await command.browse();
console.log(result.output);
```

### Filtering

```typescript
// Search by term
const result = await command.browse({ searchTerm: 'database' });

// Filter by category
const result = await command.browse({ category: 'deployment' });

// Filter by provider
const result = await command.browse({ provider: 'official' });

// Combined filters
const result = await command.browse({
    searchTerm: 'deploy',
    category: 'devops',
    provider: 'community'
});
```

### Cache Management

```typescript
// Force refresh (bypass cache)
const result = await command.browse({ forceRefresh: true });

// Show cache status
const result = await command.browse({ showCacheStatus: true });

// Clear all caches
await command.clearCache();
```

## CLI Command Integration

The `/skill marketplace browse` command is defined in:
```
.ainative/commands/skill/marketplace.md
```

### Command Syntax

```bash
# Browse all skills
/skill marketplace browse

# Search for specific skills
/skill marketplace browse [search-term]

# Filter by category
/skill marketplace browse --category <category>

# Filter by provider
/skill marketplace browse --provider <provider>

# Force refresh cache
/skill marketplace browse --force-refresh

# Show cache status
/skill marketplace browse --show-cache-status
```

### Example Output

```
Available Skills:

Official AINative Skills (npmjs.com/@ainative):
  📦 @ainative/zerodb-workflows - ZeroDB best practices
     Install: /skill install @ainative/zerodb-workflows
     v1.0.0 • by AINative Team • ⭐⭐⭐⭐⭐ (4.8) • 1,234 downloads

Anthropic Skills (github.com/anthropics/skills):
  🔧 mcp-builder - Create high-quality MCP servers
     Install: /skill install anthropics/skills/mcp-builder
     v2.1.0 • by Anthropic

Community Skills (api.ainative.studio):
  🌐 mongodb-patterns - MongoDB best practices
     Install: /skill install https://registry.ainative.studio/mongodb-patterns
     v1.2.3 • by user123 • ⭐⭐⭐⭐ (4.5) • 567 downloads

Total: 3 skills available across 3 registries

Use --category or search term to filter results.
```

## Architecture

### Dependencies

The marketplace command depends on these services:

- `IOfficialMarketplace` - Official NPM marketplace service
- `IAnthropicMarketplace` - Anthropic GitHub marketplace service
- `ICommunityMarketplace` - Community API marketplace service
- `ISkillSearchService` - Unified search service across all marketplaces
- `ILogService` - Logging service for diagnostics

### Error Handling

The command handles errors gracefully:

1. **Partial Failures** - If one marketplace fails, results from other sources are still shown
2. **Complete Failures** - If all marketplaces fail, a helpful error message is displayed
3. **Network Issues** - Cached results are used when available
4. **Rate Limiting** - Appropriate messages guide users to use cached data

### Caching Strategy

Each marketplace maintains its own cache with TTL:
- **Official**: 1 hour cache
- **Anthropic**: 1 hour cache
- **Community**: 15 minutes cache

The `--force-refresh` flag bypasses all caches.

## Testing

Comprehensive tests are in:
```
ainative-studio/src/vs/workbench/contrib/ainative/test/common/marketplaceCommand.test.ts
```

Test coverage includes:
- ✅ Basic browse functionality
- ✅ Search filtering
- ✅ Category filtering
- ✅ Provider filtering
- ✅ Combined filtering
- ✅ Cache management
- ✅ Error handling
- ✅ Formatter output

Run tests:
```bash
npm run test-node -- --grep "MarketplaceCommand"
```

## Future Enhancements

Potential improvements:
1. Add sorting options (by downloads, rating, date)
2. Implement pagination for large result sets
3. Add skill comparison feature
4. Support for skill recommendations
5. Integration with skill installation workflow
6. Add skill version history viewing
7. Support for skill ratings and reviews

## Related Files

- `../marketplace/` - Marketplace service implementations
- `../../test/common/marketplaceCommand.test.ts` - Test suite
- `.ainative/commands/skill/marketplace.md` - Slash command definition

---

# Skills Install/Uninstall Commands

## Overview

In addition to marketplace browsing, this directory contains commands for installing and uninstalling skills from multiple sources.

## Commands

### /skill install

Install a skill from various sources including local paths, NPM packages, GitHub repositories, or direct URLs.

**Supported Sources:**

1. **Local Path** (fully implemented)
   ```bash
   /skill install ./skills/my-skill
   /skill install /absolute/path/to/skill
   ```

2. **NPM Package** (partial - throws not implemented error)
   ```bash
   /skill install @ainative/skill-name
   /skill install skill-package
   ```

3. **GitHub Repository** (partial - throws not implemented error)
   ```bash
   /skill install owner/repo
   /skill install github:owner/repo
   ```

4. **Direct URL** (partial - throws not implemented error)
   ```bash
   /skill install https://example.com/skill.zip
   ```

**Options:**
- `--force` - Force reinstall even if already installed
- `--skip-validation` - Skip validation during installation

**Implementation:** `installCommand.ts`

### /skill uninstall

Uninstall an installed skill with confirmation.

**Usage:**
```bash
/skill uninstall skill-name
/skill uninstall skill-name --skip-confirmation
```

**Options:**
- `--skip-confirmation` - Skip confirmation dialog

**Implementation:** `uninstallCommand.ts`

### /skill list

List all installed skills with details.

**Usage:**
```bash
/skill list
```

**Implementation:** Registered in `skillCommands.contribution.ts`

## File Structure

```
cli/
├── cliTypes.ts                      # TypeScript interfaces
├── installCommand.ts                # Install implementation
├── uninstallCommand.ts              # Uninstall implementation
├── skillCommands.contribution.ts    # Command registration
└── README.md                        # This file
```

## Testing

Unit tests are provided:
- `../../test/common/skillInstallCommand.test.ts` - Install command tests
- `../../test/common/skillUninstallCommand.test.ts` - Uninstall command tests

**Test Coverage:**
- ✅ Source type detection (local, NPM, GitHub, URL)
- ✅ Local path installation
- ✅ Force reinstall
- ✅ Skip validation
- ✅ Duplicate detection
- ✅ Confirmation dialogs
- ✅ Error handling
- ✅ Cleanup on failure

Run tests:
```bash
npm run test-node
```

## Command Documentation

User-facing documentation is available at:
- `.claude/commands/skill/install.md` - Install command docs
- `.claude/commands/skill/uninstall.md` - Uninstall command docs
