---
description: Disable an active skill without removing it
---

Temporarily disable a skill without uninstalling it.

**Usage:**
```bash
/skill-disable <skill-name>

# Examples:
/skill-disable testing-patterns
/skill-disable @ainative/zerodb-workflows
```

**Process:**
1. Check if skill exists and is currently enabled
2. Update skill status in registry
3. Remove from active context
4. Confirm deactivation

**Output:**
```
Disabling skill: testing-patterns

✓ Updated registry
✓ Removed from active context
✓ Skill 'testing-patterns' is now disabled

The skill will not be loaded in new conversations.
To re-enable: /skill-enable testing-patterns
To remove completely: /skill-remove testing-patterns
```

**Use Cases:**
- Testing without a skill
- Resolving conflicts between skills
- Temporarily reducing context size
- Debugging skill issues

**Error Handling:**
- Skill not found → Show list of installed skills
- Already disabled → Inform user, no action needed
- Core skill → Warn against disabling essential skills
