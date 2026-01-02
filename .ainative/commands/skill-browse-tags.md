---
description: Browse skills by category/tag
---

Explore skills organized by categories and tags across all registries.

**Usage:**
```
/skill-browse-tags [tag] [--registry <registry>]
```

**Parameters:**
- `[tag]`: Optional tag to browse (if omitted, shows all tags)
- `--registry`: Filter by specific registry

**Examples:**
```
/skill-browse-tags
/skill-browse-tags git
/skill-browse-tags testing --registry official
```

You are helping the user browse skills by categories.

**Instructions:**
1. If no tag specified, use `getTags()` to get all available tags
2. Display tags organized by popularity
3. If tag specified, use `browseByTag()` to show skills in that category
4. Format output in a user-friendly way

**Example Output (All Tags):**
```
Skill Categories

Popular Tags:
┌─────────────────────────┬────────┐
│ Tag                     │ Skills │
├─────────────────────────┼────────┤
│ git                     │ 23     │
│ testing                 │ 18     │
│ workflow                │ 15     │
│ code-quality            │ 12     │
│ documentation           │ 10     │
│ automation              │ 8      │
│ security                │ 7      │
│ database                │ 6      │
│ deployment              │ 5      │
│ performance             │ 4      │
└─────────────────────────┴────────┘

All Tags (45 total):
ai, api, authentication, ci-cd, debugging, devops, docker,
formatting, graphql, hooks, kubernetes, linting, microservices,
monitoring, networking, optimization, refactoring, rest, ui, ...

To browse a category: /skill-browse-tags <tag>
To search: /skill-search <query>
```

**Example Output (Specific Tag):**
```
Skills tagged with "git" (23 skills)

Official Registry:
┌────────────────────────────────────────────────────────────────┐
│ git-workflow v1.2.0                     ⭐ 4.8 | 1,234 DL      │
│ Git commit and PR workflow automation                          │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ git-hooks-manager v1.5.0                ⭐ 4.6 | 890 DL        │
│ Manage and validate git hooks                                  │
└────────────────────────────────────────────────────────────────┘

Anthropic Registry:
┌────────────────────────────────────────────────────────────────┐
│ git-analytics v2.0.0                    ⭐ 4.7 | 654 DL        │
│ Analyze git history and contributor metrics                    │
└────────────────────────────────────────────────────────────────┘

Community Registry:
┌────────────────────────────────────────────────────────────────┐
│ git-branch-cleaner v1.0.5               ⭐ 4.2 | 345 DL        │
│ Clean up stale git branches                                    │
└────────────────────────────────────────────────────────────────┘

... and 19 more

Related tags: workflow, automation, hooks, ci-cd

Commands:
- /skill-details <name> - View details
- /skill-install <name> - Install a skill
- /skill-search git - Search within git skills
```
