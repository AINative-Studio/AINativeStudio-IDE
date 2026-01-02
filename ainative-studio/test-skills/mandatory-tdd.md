---
name: mandatory-tdd
description: Enforces Test-Driven Development with BDD-style tests
location: managed
tags:
  - testing
  - tdd
  - quality
dependencies:
  - code-quality
version: 1.0.0
author: AINative Team
useWhen:
  - Writing any new code or feature
  - Fixing bugs
  - Refactoring existing code
---

# Mandatory TDD

All code must follow Test-Driven Development (TDD) principles.

## Rules

1. **Write tests first** before implementation
2. **Ensure >= 80% coverage** with proof of passing status
3. **Use BDD-style tests** (`describe()` and `test()` blocks)
4. **Run tests before commits** - no commits without passing tests

## Test Structure

```typescript
suite('ComponentName', () => {
  test('should do something specific', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = doSomething(input);

    // Assert
    strictEqual(result, expected);
  });
});
```

## Coverage Requirements

Use coverage tools to verify >= 80% coverage:
- Line coverage
- Branch coverage
- Function coverage
