---
description: Search marketplace for skills
---

Search the AINative Skills Marketplace for available skills.

**Usage:**
```bash
/skill-search <query>
/skill-search <query> [--category <category>]

# Examples:
/skill-search database
/skill-search git workflow
/skill-search testing --category development
/skill-search @ainative/          # Search official skills
/skill-search deployment --sort downloads
```

**Search Behavior:**

1. **Query Processing:**
   - Search skill names, descriptions, tags
   - Support partial matches
   - Case-insensitive search
   - Support multiple keywords (AND logic)

2. **Search Sources:**
   - Official AINative registry (@ainative/* packages)
   - Anthropic Skills GitHub repository
   - Community marketplace
   - NPM registry (scoped packages)

3. **Ranking:**
   - Relevance score
   - Download count
   - Star count (for GitHub)
   - Last updated date
   - Official vs community (official ranked higher)

**Output Format:**
```
Searching marketplace for "database"...

Found 8 results:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Official AINative Skills (2)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. @ainative/zerodb-workflows (v1.2.0) ⭐ 245
   ZeroDB best practices, patterns, and workflows
   Tags: database, zerodb, mcp, best-practices
   Install: /skill-install @ainative/zerodb-workflows

2. @ainative/database-migrations (v1.0.0) ⭐ 89
   Database migration patterns and schema sync strategies
   Tags: database, migrations, postgres, prisma
   Install: /skill-install @ainative/database-migrations

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Community Skills (6)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3. mongodb-patterns (v2.1.0) ⭐ 178
   MongoDB schema design and query optimization
   Tags: database, mongodb, nosql
   Install: /skill-install mongodb-patterns

4. postgres-tuning (v1.3.0) ⭐ 142
   PostgreSQL performance tuning and optimization
   Tags: database, postgres, performance
   Install: /skill-install postgres-tuning

5. prisma-workflows (v1.1.0) ⭐ 98
   Prisma ORM best practices and migration strategies
   Tags: database, prisma, orm, typescript
   Install: /skill-install prisma-workflows

... 3 more results

To see all results: /skill-search database --limit 20
To filter by category: /skill-search database --category development
```

**Filters and Options:**

**Filtering:**
- `--category <category>` - Filter by category
  - Categories: development, deployment, testing, documentation, workflow, database, ai-ml, security, devops
- `--tag <tag>` - Filter by specific tag
- `--source <source>` - Filter by source
  - Sources: official, community, anthropic, github, npm
- `--installed` - Show only installed skills
- `--not-installed` - Show only not installed skills

**Sorting:**
- `--sort relevance` (default) - By search relevance
- `--sort downloads` - By download count
- `--sort stars` - By GitHub stars
- `--sort updated` - By last update date
- `--sort name` - Alphabetically

**Display:**
- `--limit <number>` - Number of results (default: 10)
- `--json` - Output in JSON format
- `--verbose` - Show full descriptions
- `--compact` - Compact one-line format

**Examples:**

**Search by category:**
```bash
/skill-search --category deployment

Found 12 deployment skills:
  1. @ainative/railway-deployment
  2. aws-deployment
  3. kubernetes-workflows
  ...
```

**Search official skills only:**
```bash
/skill-search @ainative/

Official AINative Skills (8):
  1. @ainative/zerodb-workflows
  2. @ainative/railway-deployment
  3. @ainative/mcp-development
  ...
```

**Search with multiple filters:**
```bash
/skill-search testing --category development --sort downloads

Top testing skills:
  1. mandatory-tdd (2.3k downloads)
  2. jest-patterns (1.8k downloads)
  3. playwright-workflows (1.2k downloads)
  ...
```

**Compact format:**
```bash
/skill-search database --compact

8 results: @ainative/zerodb-workflows, mongodb-patterns, postgres-tuning, prisma-workflows, supabase-guide, drizzle-orm, planetscale-workflows, timescale-patterns
```

**Smart Features:**

1. **Did You Mean:**
   - Suggest corrections for typos
   - "Did you mean 'postgresql' instead of 'postgre'?"

2. **Related Searches:**
   - Show related search terms
   - "Also search: postgres, sql, database-design"

3. **Popular Skills:**
   - If no query provided, show trending/popular
   - "Trending this week: ai-agents, mcp-development, railway-deploy"

4. **Installed Indicator:**
   - Mark installed skills
   - "✓ @ainative/zerodb-workflows (installed)"

**No Results Handling:**
```bash
/skill-search xyzabc

No skills found for "xyzabc"

Suggestions:
  - Check spelling
  - Try broader search terms
  - Browse categories: /skill-search --category <category>
  - Browse all: /skill-list --available

Popular searches:
  - git, testing, deployment, database, ai
```

**Error Handling:**
- Network failure → Use cached marketplace data
- Invalid category → Show valid categories
- API timeout → Show partial results + retry option
- Empty query → Show popular/trending skills

**Cache Strategy:**
- Cache marketplace data for 1 hour
- Update cache in background
- Use stale cache if offline
- Manual refresh: /skill-search --refresh

**Related Commands:**
- `/skill-info <skill-name>` - View details before installing
- `/skill-install <skill-name>` - Install from search results
- `/skill-list --available` - Browse all available skills
