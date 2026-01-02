---
name: test-invalid-yaml
description: "Unclosed quote
version: 1.0.0
tags: [unclosed, array
dependencies: [missing-bracket
author: Invalid YAML Test
---

# Invalid YAML Frontmatter

This skill has malformed YAML in the frontmatter.

## Expected Behavior

The parser should:
1. Detect YAML syntax errors
2. Return specific error about the YAML issue
3. Identify the line where parsing failed

## Test Scenario

Use this to validate YAML parsing error handling.
