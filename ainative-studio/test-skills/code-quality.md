---
name: code-quality
description: Coding style standards and security guidelines
location: managed
tags:
  - quality
  - security
  - standards
version: 1.0.0
author: AINative Team
useWhen:
  - Writing new code
  - Reviewing code
  - Addressing security concerns
---

# Code Quality Standards

## Naming Conventions

- Use camelCase for variables and functions
- Use PascalCase for classes and types
- Use UPPER_CASE for constants
- Use descriptive names that explain intent

## Security Best Practices

- Never commit secrets or API keys
- Validate and sanitize all user input
- Use parameterized queries for database access
- Implement proper error handling

## Code Organization

- Keep functions small and focused
- Follow Single Responsibility Principle
- Use dependency injection where appropriate
- Write self-documenting code with clear names
