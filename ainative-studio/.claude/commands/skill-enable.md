---
description: Enable a disabled skill
---

Enable a previously disabled skill to make it active again.

**Usage:**
```bash
/skill-enable <skill-name>

# Examples:
/skill-enable testing-patterns
/skill-enable @ainative/zerodb-workflows
```

**Process:**
1. Check if skill exists and is currently disabled
2. Update skill status in registry
3. Reload skill into active context
4. Confirm activation

**Output:**
```
Enabling skill: testing-patterns

✓ Updated registry
✓ Loaded skill context
✓ Skill 'testing-patterns' is now active

The skill will be available in all new conversations.
To use in current session, skill context has been loaded.
```

**Error Handling:**
- Skill not found → Show list of installed skills
- Already enabled → Inform user, no action needed
- Skill corrupted → Show validation errors
