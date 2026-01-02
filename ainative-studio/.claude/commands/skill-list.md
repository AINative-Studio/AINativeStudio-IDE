---
description: List all available and installed skills
---

List all skills available in the AINative Studio Skills Manager.

Use the Skills Manager service to display:

**Installed Skills:**
- Skill name
- Description (first line)
- Version
- Status (enabled/disabled)
- Category/tags
- Source (local, official, community)
- Installation location

**Available Skills (if applicable):**
- Skills available in marketplace
- Official AINative skills
- Community skills
- Installation command hint

**Output Format:**
```
Installed Skills:

✅ git-workflow (v1.0.0) [local]
   Git commit standards and PR workflow
   Location: ~/.ainative/skills/git-workflow/

✅ @ainative/zerodb-workflows (v1.2.0) [official]
   ZeroDB best practices and patterns
   Location: ~/.ainative/skills/zerodb-workflows/

❌ testing-patterns (v1.0.0) [DISABLED]
   TDD/BDD patterns for TypeScript
   Location: ~/.ainative/skills/testing-patterns/

Total: 3 skills (2 enabled, 1 disabled)
```

**Optional Filters:**
- `--enabled` - Show only enabled skills
- `--disabled` - Show only disabled skills
- `--category <category>` - Filter by category

**Steps:**
1. Access SkillsManagerService
2. Retrieve all installed skills
3. Format output with status indicators
4. Apply any filters if specified
5. Display total count summary

**Error Handling:**
- If no skills installed, show helpful message with install command
- If service unavailable, show error and suggest restart
