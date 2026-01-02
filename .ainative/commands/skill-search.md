---
description: Search for skills in the marketplace
---

Search for skills across all configured registries (Official, Anthropic, Community).

**Usage:**
```
/skill-search <query> [--registry <registry>] [--tags <tags>] [--sort <field>]
```

**Parameters:**
- `<query>`: Search term (searches name, description, keywords)
- `--registry`: Filter by specific registry (official, anthropic, community)
- `--tags`: Filter by tags (comma-separated)
- `--sort`: Sort results by downloads, rating, updated, created, or name (default: downloads)

**Examples:**
```
/skill-search git
/skill-search "testing workflow" --registry official
/skill-search --tags git,workflow --sort rating
```

You are helping the user search for skills in the AINative Studio Skills Marketplace.

**Instructions:**
1. Use the ISkillMarketplaceService to search for skills
2. Parse the command arguments to extract query, registry, tags, and sort options
3. Call `searchSkills()` with the appropriate filters
4. Display results in a clear, formatted table showing:
   - Skill name and version
   - Author and registry
   - Description
   - Rating and downloads
   - Tags
5. Provide the installation command for each skill
6. If no results found, suggest alternative search terms or browsing by tags

**Example Output Format:**
```
Found 5 skills matching "git":

┌─────────────────────────────────────────────────────────────────┐
│ git-workflow v1.2.0                          [@ainative/official]│
│ by AINative Team                             ⭐ 4.8 | 1,234 DL  │
├─────────────────────────────────────────────────────────────────┤
│ Git commit and PR workflow automation                           │
│ Tags: git, workflow, automation                                 │
│ Install: /skill-install git-workflow                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ git-hooks v2.0.1                             [anthropic]        │
│ by Anthropic                                 ⭐ 4.5 | 890 DL    │
├─────────────────────────────────────────────────────────────────┤
│ Manage git hooks and pre-commit checks                          │
│ Tags: git, hooks, quality                                       │
│ Install: /skill-install git-hooks --registry anthropic          │
└─────────────────────────────────────────────────────────────────┘

Use /skill-details <name> to see more information about a skill.
Use /skill-browse-tags to explore skills by category.
```
