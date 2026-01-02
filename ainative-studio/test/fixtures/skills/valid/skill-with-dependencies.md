---
name: test-skill-with-deps
description: Test skill with multiple dependencies
version: 2.1.0
author: AINative Studio QA Team
tags: [testing, dependencies, complex]
dependencies: [test-skill-simple, test-helper-skill]
---

# Test Skill with Dependencies

This skill depends on other skills to validate dependency resolution.

## Dependencies

This skill requires:
1. **test-skill-simple** - Provides basic functionality
2. **test-helper-skill** - Provides helper utilities

## Purpose

Validates that the dependency resolution system:
- Correctly identifies dependencies
- Loads dependencies in proper order
- Handles missing dependencies appropriately
- Detects circular dependencies

## Usage

Use this skill to test complex dependency scenarios.
