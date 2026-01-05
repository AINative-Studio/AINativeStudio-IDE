# Quick Test Guide - Skills Manager Core Tests

## Quick Start

### 1. Setup
```bash
cd /Users/aideveloper/AINativeStudio-IDE/ainative-studio
npm install
npm run compile
```

### 2. Run All Skills Manager Tests
```bash
npm run test-node -- --grep "SkillParser|SkillsRegistry|SkillLoader|SkillConfigService"
```

## Run Individual Test Suites

### SkillParser Tests (23 tests)
```bash
npm run test-node -- --grep "SkillParser Tests"
```

### SkillsRegistry Tests (30 tests)
```bash
npm run test-node -- --grep "SkillsRegistry Tests"
```

### SkillLoader Tests (29 tests)
```bash
npm run test-node -- --grep "SkillLoader Tests"
```

### SkillConfigService Tests (33 tests)
```bash
npm run test-node -- --grep "SkillConfigService Tests"
```

## Run Specific Test Categories

### Performance Tests
```bash
npm run test-node -- --grep "Performance"
```

### Error Handling Tests
```bash
npm run test-node -- --grep "Error Handling"
```

### Validation Tests
```bash
npm run test-node -- --grep "Validation"
```

## File Locations

### Test Files
- `/ainative-studio/src/vs/workbench/contrib/ainative/test/common/skillParser.test.ts`
- `/ainative-studio/src/vs/workbench/contrib/ainative/test/common/skillsRegistry.test.ts`
- `/ainative-studio/src/vs/workbench/contrib/ainative/test/common/skillLoader.test.ts`
- `/ainative-studio/src/vs/workbench/contrib/ainative/test/common/skillConfigService.test.ts`

### Test Fixtures
- `/ainative-studio/src/vs/workbench/contrib/ainative/test/common/fixtures/skills/`

### Source Files (Being Tested)
- `/ainative-studio/src/vs/workbench/contrib/ainative/common/skills/skillParser.ts`
- `/ainative-studio/src/vs/workbench/contrib/ainative/common/skills/skillsRegistry.ts`
- `/ainative-studio/src/vs/workbench/contrib/ainative/common/skills/skillLoader.ts`
- `/ainative-studio/src/vs/workbench/contrib/ainative/common/skills/skillConfigService.ts`

## Expected Results

- **Total Tests:** 115
- **Test Breakdown:**
  - SkillParser: 23 tests
  - SkillsRegistry: 30 tests
  - SkillLoader: 29 tests
  - SkillConfigService: 33 tests

- **Expected Execution Time:** <10 seconds for all tests
- **Expected Coverage:**
  - SkillParser: 100%
  - SkillsRegistry: 100%
  - SkillLoader: 100%
  - SkillConfigService: ≥80%

## Troubleshooting

### Compilation Errors
If you encounter compilation errors:
```bash
# Clean and rebuild
npm run clean
npm run compile
```

### Test Timeouts
If tests timeout, increase the timeout:
```bash
npm run test-node -- --timeout 10000 --grep "YourTestName"
```

### Missing Fixtures
If fixture files are not found, verify they exist:
```bash
ls -la src/vs/workbench/contrib/ainative/test/common/fixtures/skills/
```

Expected fixtures:
- minimal-skill
- comprehensive-skill
- empty-body-skill
- skill-with-resources
- unicode-skill
- invalid-missing-name
- invalid-missing-description
- invalid-no-frontmatter
- invalid-bad-yaml
- crlf-skill
- large-skill

## Test Coverage Report

To generate coverage report:
```bash
npm run test-node -- --coverage
```

## Continuous Integration

These tests are designed to run in CI/CD pipelines. Ensure:
- Node.js 18+ is installed
- All dependencies are installed (`npm install`)
- Code is compiled before tests (`npm run compile`)
- Tests complete in <10 seconds
- All 115 tests pass

## Documentation

For comprehensive test documentation, see:
- `TEST_SUMMARY.md` - Complete test suite overview
- This file (`QUICK_TEST_GUIDE.md`) - Quick reference
