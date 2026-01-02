---
name: test-incomplete
tags: [testing]
---

# Incomplete Skill Metadata

This skill is missing required fields:
- description (required)
- version (required)

## Expected Behavior

The parser should:
1. Detect missing required fields
2. List all missing fields in error message
3. Reject the skill from being loaded

## Test Scenario

Validates required field validation.
