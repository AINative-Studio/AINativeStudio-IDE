# Anthropic Marketplace Integration

This component implements GitHub-based marketplace integration for fetching and installing skills from the [anthropics/skills](https://github.com/anthropics/skills) repository.

## Architecture

### Files Created

1. **marketplaceTypes.ts** - Base marketplace interface and types
   - `IMarketplace` interface (all marketplace providers implement this)
   - `MarketplaceSkill` type for skill metadata
   - `MarketplaceError` for error handling
   - `MarketplaceCacheData` for caching support

2. **anthropicMarketplaceTypes.ts** - Anthropic-specific types
   - `IAnthropicMarketplace` interface (extends `IMarketplace`)
   - GitHub API response types (`GitHubDirectoryItem`, `GitHubFileContent`)
   - Anthropic-specific methods

3. **anthropicMarketplace.ts** - Main implementation
   - `AnthropicMarketplace` service class
   - GitHub API integration using `@octokit/rest`
   - Caching mechanism (6-hour TTL)
   - Skill fetching, searching, and installation

4. **anthropicMarketplaceExample.ts** - Usage examples
   - Complete workflow demonstrations
   - Error handling patterns
   - Example GitHub API responses

## Features

### 1. Fetch Skills from GitHub
Fetches all skills from `anthropics/skills/skills/` directory:
- Lists all subdirectories
- Fetches `SKILL.md` for each skill
- Parses frontmatter metadata
- Caches results for 6 hours

### 2. Search Skills
Search skills by name, description, or tags:
```typescript
const results = await marketplace.search('mcp');
```

### 3. Install Skills
Download and install skills from GitHub:
```typescript
await marketplace.install('mcp-builder');
```

### 4. Caching
- Cache location: `~/.ainative/cache/marketplace/anthropic.json`
- TTL: 6 hours
- Automatic cache validation
- Manual cache clearing

### 5. Rate Limit Handling
- Supports unauthenticated (60 req/hour) and authenticated (5000 req/hour) requests
- Falls back to cache on rate limit errors
- Set `GITHUB_TOKEN` environment variable for higher limits

## GitHub API Integration

### Repository Structure
```
anthropics/skills/
└── skills/
    ├── mcp-builder/
    │   ├── SKILL.md
    │   ├── references/
    │   ├── scripts/
    │   └── assets/
    ├── skill-creator/
    │   └── SKILL.md
    └── ...
```

### API Endpoints Used

1. **Get Directory Listing**
   ```
   GET /repos/anthropics/skills/contents/skills
   ```
   Returns array of directories (each is a skill)

2. **Get File Content**
   ```
   GET /repos/anthropics/skills/contents/skills/{skillName}/SKILL.md
   ```
   Returns base64-encoded file content

3. **Download Files**
   Uses `download_url` from file content response

## SKILL.md Format

Expected frontmatter format:
```markdown
---
name: mcp-builder
description: Build and test Model Context Protocol (MCP) servers
version: 1.0.0
author: Anthropic
tags: [mcp, tools, development]
---

# Skill Body Content
...
```

## Installation Workflow

1. **Verify Skill Exists**
   - Fetch skill list from GitHub
   - Check if skill name matches

2. **Check Not Already Installed**
   - Query `ISkillsRegistry.isInstalled()`

3. **Download Skill Files**
   - Fetch all files in skill directory
   - Recursively download subdirectories (references/, scripts/, assets/)
   - Write to `~/.ainative/skills/{skillName}/`

4. **Register Skill**
   - Call `ISkillsRegistry.install()`
   - Updates registry.json

## Error Handling

### Error Codes
- `NETWORK_ERROR` - Network/API failure
- `RATE_LIMIT` - GitHub API rate limit exceeded
- `NOT_FOUND` - Skill not found in marketplace
- `PARSE_ERROR` - Failed to parse SKILL.md
- `INSTALL_ERROR` - Installation failed

### Error Recovery
- Network errors → use cached data
- Rate limits → use cached data + show warning
- Invalid SKILL.md → skip skill
- 404 errors → skill not found error

## Dependencies

- `@octokit/rest` - GitHub API client
- `IFileService` - File system operations
- `IEnvironmentService` - User home directory
- `ISkillsRegistry` - Skill registration
- `ISkillParser` - Parse SKILL.md files

## Service Registration

Service is registered as a singleton using VS Code's DI system:
```typescript
registerSingleton(IAnthropicMarketplace, AnthropicMarketplace, InstantiationType.Delayed);
```

## Usage Example

```typescript
import { IAnthropicMarketplace } from './anthropicMarketplaceTypes';

// Service is injected via constructor
constructor(
  @IAnthropicMarketplace private marketplace: IAnthropicMarketplace
) {}

// Fetch all skills
const skills = await this.marketplace.fetchSkills();

// Search for skills
const mcpSkills = await this.marketplace.search('mcp');

// Get skill details
const skill = await this.marketplace.getSkillDetails('mcp-builder');

// Install a skill
await this.marketplace.install('mcp-builder');

// Clear cache
await this.marketplace.clearCache();
```

## Testing

The implementation includes:
- Proper error handling for all GitHub API calls
- Fallback to cached data on network failures
- Rate limit detection and handling
- Validation of SKILL.md format
- Recursive directory downloading

## Next Steps

1. **UI Integration** - Create React components for marketplace browsing
2. **NPM Marketplace** - Implement NPM registry integration
3. **Community Marketplace** - Support custom skill repositories
4. **Auto-updates** - Check for skill updates periodically
5. **Analytics** - Track skill installations and usage

## Success Criteria

- ✅ Fetch directory listing from GitHub API
- ✅ Parse SKILL.md frontmatter for each skill
- ✅ Download as individual files (supports subdirectories)
- ✅ Extract specific skill folder
- ✅ Handle GitHub API rate limits
- ✅ Cache skill list (6h TTL)
- ✅ Service registered with DI
- ✅ Compiles without errors
