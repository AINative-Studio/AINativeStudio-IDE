---
description: Browse available skills from all marketplace sources
---

Browse and search for skills across official AINative, Anthropic, and community marketplaces.

**Usage:**
```bash
/skill marketplace browse [search-term]
/skill marketplace browse --category <category>
/skill marketplace browse --provider <provider>
```

**Examples:**
```bash
# Browse all available skills
/skill marketplace browse

# Search for ZeroDB-related skills
/skill marketplace browse zerodb

# Filter by category
/skill marketplace browse --category database

# Show only official skills
/skill marketplace browse --provider official

# Combine search and filters
/skill marketplace browse deployment --provider community
```

**Options:**
- `search-term` - Search for skills by name or description
- `--category <category>` - Filter by skill category (database, deployment, api, etc.)
- `--provider <provider>` - Filter by marketplace source (official, anthropic, community)
- `--force-refresh` - Bypass cache and fetch fresh data

**Output includes:**
- Skill name and description
- Installation command
- Source marketplace (official, anthropic, community)
- Version information
- Author and metadata

**Marketplaces:**
1. **Official AINative Skills** - Curated skills from @ainative namespace on NPM
2. **Anthropic Skills** - Skills from github.com/anthropics/skills repository
3. **Community Skills** - Community-submitted skills from api.ainative.studio

Use the install command shown in the output to add skills to your IDE.
