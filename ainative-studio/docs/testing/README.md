# Skills Manager - Testing & QA Documentation

**Welcome to the Skills Manager Testing Documentation**

This directory contains comprehensive testing and QA resources for the Skills Manager system in AINative Studio IDE.

---

## Quick Links

| Document | Description | Audience |
|----------|-------------|----------|
| [Test Plan](./SKILLS_MANAGER_TEST_PLAN.md) | Comprehensive testing strategy and execution plan | QA Engineers, Developers |
| [Bug Report Template](./BUG_REPORT_TEMPLATE.md) | Standardized bug reporting format | All team members |
| [Coverage Report Template](./COVERAGE_REPORT_TEMPLATE.md) | Test coverage tracking and reporting | QA Lead, Engineering Lead |
| [Video Tutorial Outline](./VIDEO_TUTORIAL_OUTLINE.md) | Script and plan for tutorial video | Content creators, Trainers |

---

## Documentation Overview

### 1. Test Plan (`SKILLS_MANAGER_TEST_PLAN.md`)

**Purpose**: Complete testing strategy for all Skills Manager phases

**Contents**:
- Testing objectives and quality metrics
- Phase-by-phase test scenarios (Phases 1-4)
- Coverage requirements (>= 80% overall)
- Performance benchmarks and criteria
- Security testing guidelines
- Accessibility compliance (WCAG 2.1 AA)
- Integration testing strategies
- Manual testing checklists
- CI/CD integration instructions
- Production readiness criteria

**When to Use**:
- Planning test implementation
- Reviewing test coverage
- Preparing for releases
- Onboarding QA team members

---

### 2. Bug Report Template (`BUG_REPORT_TEMPLATE.md`)

**Purpose**: Standardized format for reporting and tracking bugs

**Contents**:
- Bug classification (Severity: Critical/High/Medium/Low)
- Environment details
- Reproduction steps
- Expected vs actual behavior
- Error messages and logs
- Impact assessment
- Verification criteria

**When to Use**:
- Reporting new bugs
- Tracking existing issues
- Communicating with development team
- Planning bug fixes

**Key Features**:
- Severity guidelines (P0-P3)
- Clear reproduction steps
- Impact assessment
- Workaround documentation

---

### 3. Coverage Report Template (`COVERAGE_REPORT_TEMPLATE.md`)

**Purpose**: Track and report test coverage metrics

**Contents**:
- Executive summary with pass/fail status
- Component-by-component coverage breakdown
- Test execution performance metrics
- Coverage trends and historical comparison
- Critical paths analysis (100% coverage required)
- Uncovered code analysis
- Recommendations and action items
- Sign-off checklist

**When to Use**:
- Weekly coverage reviews
- Pre-release quality gates
- Sprint retrospectives
- Stakeholder reporting

**Coverage Targets**:
- Overall: >= 80% line coverage
- Critical paths: 100% coverage
- Phase 1 (Parser): >= 95%
- Phase 2-3: >= 80-85%
- Phase 4 (Skills): >= 75%

---

### 4. Video Tutorial Outline (`VIDEO_TUTORIAL_OUTLINE.md`)

**Purpose**: Comprehensive script for creating Skills Manager tutorial video

**Contents**:
- 8-10 minute tutorial structure
- Section-by-section breakdown
- Screen recording instructions
- Demo scripts and examples
- Troubleshooting common issues
- Production checklist
- Accessibility requirements

**When to Use**:
- Creating tutorial videos
- Training new team members
- User onboarding
- Documentation updates

**Sections**:
1. Introduction (30s)
2. Overview (1m)
3. Using Official Skills (2m)
4. Creating Custom Skills (2.5m)
5. Search and Management (1m)
6. Testing (2m)
7. Troubleshooting (1m)
8. Advanced Features (30s)
9. Conclusion (30s)

---

## Test Fixtures and Resources

### Test Fixtures Location

```
/Users/aideveloper/AINativeStudio-IDE/ainative-studio/test/fixtures/skills/
├── valid/                    # Valid skill files
├── invalid/                  # Invalid skills for error testing
├── edge-cases/               # Edge case scenarios
└── mock-marketplace/         # Mock marketplace responses
```

### Test Implementation Location

```
/Users/aideveloper/AINativeStudio-IDE/ainative-studio/src/vs/workbench/contrib/void/test/browser/
├── skillParser.test.ts       # Parser tests (Phase 1)
├── skillRegistry.test.ts     # Registry tests (Phase 1)
├── testUtils.ts              # Shared test utilities
└── [additional test files]   # To be created in Phases 2-4
```

---

## Quick Start Guide

### Running Tests

```bash
# Navigate to project directory
cd /Users/aideveloper/AINativeStudio-IDE/ainative-studio

# Run all Skills Manager tests
npm run test-node -- --grep "Skills Manager"

# Run specific test file
npm run test-node -- --run src/vs/workbench/contrib/void/test/browser/skillParser.test.ts

# Run with coverage
npm run test-node -- --coverage --grep "Skills Manager"

# View coverage report
open .build/coverage/index.html
```

### Creating a New Test

```typescript
// 1. Import dependencies
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';

// 2. Create test suite
suite('Skills Manager - [Component Name]', () => {

  ensureNoDisposablesAreLeakedInTestSuite();

  // 3. Setup and teardown
  setup(() => {
    // Initialize test resources
  });

  teardown(() => {
    // Clean up
  });

  // 4. Write tests in BDD style
  suite('[Feature/Behavior]', () => {
    test('should [expected behavior] when [condition]', () => {
      // Given: Setup
      // When: Action
      // Then: Assertion
      assert.strictEqual(actual, expected);
    });
  });
});
```

### Reporting a Bug

1. Copy the [Bug Report Template](./BUG_REPORT_TEMPLATE.md)
2. Fill in all required sections
3. Attach screenshots/logs
4. Submit as GitHub issue with `bug` label
5. Tag with component (e.g., `skills-parser`, `skills-registry`)

---

## Testing Workflow

### Development Workflow

```
1. Write test (TDD approach)
   ↓
2. Implement feature
   ↓
3. Run tests
   ↓
4. Fix failing tests
   ↓
5. Verify coverage >= 80%
   ↓
6. Commit code
   ↓
7. CI/CD runs full suite
   ↓
8. Review coverage report
```

### Release Workflow

```
1. Run full test suite
   ↓
2. Generate coverage report
   ↓
3. Review coverage gaps
   ↓
4. Execute manual test checklist
   ↓
5. Verify all quality gates pass
   ↓
6. Get sign-off from QA Lead
   ↓
7. Deploy to production
```

---

## Quality Gates

### Pre-Commit

- [ ] All new code has tests
- [ ] All tests passing locally
- [ ] No linting errors

### Pre-Merge (Pull Request)

- [ ] All CI tests passing
- [ ] Code review approved
- [ ] Coverage >= 80% for changed code
- [ ] No high/critical bugs introduced

### Pre-Release

- [ ] All tests passing (unit, integration, E2E)
- [ ] Overall coverage >= 80%
- [ ] Critical paths 100% covered
- [ ] Manual test checklist completed
- [ ] No critical/high bugs open
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] Documentation updated
- [ ] Release notes prepared

---

## Testing Tools and Frameworks

### Test Frameworks

- **Unit Testing**: Mocha with Node.js assert
- **Browser Testing**: Playwright
- **Coverage**: Istanbul/NYC
- **Performance**: Node.js `performance` API

### Development Tools

- **Linting**: ESLint with TypeScript
- **Formatting**: Prettier (if configured)
- **Git Hooks**: Husky for pre-commit checks
- **CI/CD**: GitHub Actions

### Useful Commands

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode (auto-recompile)
npm run watch

# Run unit tests (Node.js)
npm run test-node

# Run browser tests
npm run test-browser

# Run smoke tests (E2E)
npm run smoketest
```

---

## Contact and Support

### Team Contacts

- **QA Lead**: [Name/Email]
- **Engineering Lead**: [Name/Email]
- **Product Owner**: [Name/Email]

### Resources

- **GitHub Issues**: [Repository URL]/issues
- **Documentation**: `/docs/testing/`
- **CI/CD Dashboard**: [GitHub Actions URL]
- **Coverage Dashboard**: [URL if available]

### Getting Help

1. Check existing documentation
2. Search GitHub issues
3. Ask in team chat/Slack
4. Create new issue if needed

---

## Contribution Guidelines

### Adding New Tests

1. Follow BDD style (describe/it)
2. Use Given-When-Then pattern
3. Ensure tests are isolated
4. Add to appropriate test file
5. Update coverage targets if needed

### Updating Documentation

1. Keep templates up to date
2. Document new test scenarios
3. Update coverage requirements
4. Maintain example code
5. Version control all changes

### Improving Quality

1. Monitor coverage trends
2. Identify flaky tests
3. Optimize slow tests
4. Add missing edge cases
5. Refactor test utilities

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-01-02 | Initial comprehensive testing documentation | QA Team |
| | | - Test Plan | |
| | | - Bug Report Template | |
| | | - Coverage Report Template | |
| | | - Video Tutorial Outline | |
| | | - Test Fixtures | |
| | | - Sample Test Implementations | |

---

## Appendix

### Acronyms and Definitions

- **BDD**: Behavior-Driven Development
- **CI/CD**: Continuous Integration/Continuous Deployment
- **E2E**: End-to-End testing
- **SLA**: Service Level Agreement
- **TDD**: Test-Driven Development
- **WCAG**: Web Content Accessibility Guidelines

### Coverage Calculation

```
Line Coverage = (Executed Lines / Total Lines) × 100
Branch Coverage = (Executed Branches / Total Branches) × 100
Function Coverage = (Executed Functions / Total Functions) × 100
```

### Severity Definitions

| Severity | Definition | Response Time |
|----------|-----------|---------------|
| Critical (P0) | System unusable, data loss | Immediate |
| High (P1) | Major feature broken | < 24 hours |
| Medium (P2) | Feature partially works | < 1 week |
| Low (P3) | Minor issue, workaround exists | < 1 month |

---

**Last Updated**: 2026-01-02
**Next Review**: 2026-04-02
**Maintained By**: QA Engineering Team
