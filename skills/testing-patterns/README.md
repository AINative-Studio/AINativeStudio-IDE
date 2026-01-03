# Testing Patterns Skill

> TDD/BDD workflows for FastAPI + React stack with pytest, vitest, and integration testing

## Overview

The **testing-patterns** skill provides comprehensive testing strategies and workflows for implementing test-driven development (TDD) and behavior-driven development (BDD) in modern full-stack applications. This skill covers unit testing, integration testing, mocking strategies, and CI/CD integration.

## Installation

### NPM Installation

```bash
npm install @ainative/skill-testing-patterns
```

### Manual Installation

1. Clone or download this skill to your project's skills directory
2. Reference it in your AINative Studio configuration

## What This Skill Provides

### Core Testing Principles

- **Test-Driven Development (TDD)**: RED → GREEN → REFACTOR cycle
- **Behavior-Driven Development (BDD)**: Given-When-Then pattern
- **AAA Pattern**: Arrange, Act, Assert structure
- **Coverage Goals**: Minimum 80% code coverage requirement

### Framework Coverage

#### Backend (Python/FastAPI)
- pytest configuration and setup
- Database testing with SQLAlchemy
- API endpoint testing with TestClient
- Async operation testing
- Fixture management
- Parametrized testing

#### Frontend (TypeScript/React)
- Vitest configuration
- Component testing with React Testing Library
- Hook testing
- User interaction testing
- Async operation testing
- Snapshot testing

### Testing Strategies

1. **Unit Testing**
   - Isolated function and class testing
   - Mock external dependencies
   - Fast execution (<1ms per test)
   - High coverage of business logic

2. **Integration Testing**
   - Multi-component interaction testing
   - Real database instances
   - API endpoint workflows
   - End-to-end user journeys

3. **Mocking Patterns**
   - External API mocking
   - Database operation mocking
   - File system mocking
   - Third-party service mocking
   - ZeroDB and AI service mocking

4. **CI/CD Integration**
   - GitHub Actions workflows
   - Coverage reporting with Codecov
   - Quality gates and branch protection
   - Parallel test execution
   - Performance testing

## Reference Documentation

This skill includes comprehensive reference files:

- **`SKILL.md`**: Main skill file with core concepts and quick reference
- **`references/pytest-config.md`**: Complete pytest configuration guide
- **`references/vitest-config.md`**: Vitest setup for React testing
- **`references/mock-patterns.md`**: Mocking strategies for all dependencies
- **`references/integration-tests.md`**: Integration and E2E testing patterns
- **`references/ci-integration.md`**: GitHub Actions and CI/CD setup
- **`references/test-examples.md`**: Real-world production test examples

## Quick Start

### For Backend (FastAPI + pytest)

1. **Configure pytest** - See `references/pytest-config.md`

```bash
# Install dependencies
pip install pytest pytest-cov pytest-asyncio

# Create pytest.ini
cd backend
# Copy configuration from pytest-config.md

# Run tests
pytest --cov=src --cov-fail-under=80
```

2. **Write your first test**

```python
def test_user_registration(client, db_session):
    # ARRANGE
    user_data = {"email": "test@example.com", "password": "SecurePass123!"}

    # ACT
    response = client.post("/api/auth/register", json=user_data)

    # ASSERT
    assert response.status_code == 201
    assert response.json()["email"] == "test@example.com"
```

### For Frontend (React + Vitest)

1. **Configure Vitest** - See `references/vitest-config.md`

```bash
# Install dependencies
npm install -D vitest @testing-library/react @testing-library/user-event jsdom

# Create vitest.config.ts
# Copy configuration from vitest-config.md

# Run tests
npm run test:coverage
```

2. **Write your first test**

```typescript
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

test('renders button with text', () => {
  // ARRANGE & ACT
  render(<Button>Click Me</Button>)

  // ASSERT
  expect(screen.getByText('Click Me')).toBeInTheDocument()
})
```

## Usage Examples

### Testing API Endpoints

```python
@pytest.mark.integration
def test_create_and_retrieve_item(client, auth_headers):
    # Create item
    response = client.post("/api/items", json={
        "name": "Test Item",
        "price": 29.99
    }, headers=auth_headers)

    assert response.status_code == 201
    item_id = response.json()["id"]

    # Retrieve item
    response = client.get(f"/api/items/{item_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Test Item"
```

### Testing React Components

```typescript
import userEvent from '@testing-library/user-event'

test('form submission', async () => {
  const user = userEvent.setup()
  const handleSubmit = vi.fn()

  render(<LoginForm onSubmit={handleSubmit} />)

  await user.type(screen.getByLabelText(/email/i), 'test@example.com')
  await user.type(screen.getByLabelText(/password/i), 'password123')
  await user.click(screen.getByRole('button', { name: /login/i }))

  expect(handleSubmit).toHaveBeenCalledWith({
    email: 'test@example.com',
    password: 'password123'
  })
})
```

### Mocking External Services

```python
@pytest.fixture
def mock_openai():
    with patch('openai.ChatCompletion.create') as mock:
        mock.return_value = {
            'choices': [{'message': {'content': 'AI response'}}]
        }
        yield mock

def test_ai_completion(mock_openai):
    response = get_ai_response("Hello")
    assert response == "AI response"
    mock_openai.assert_called_once()
```

## Integration with Other Skills

### Works With

- **mandatory-tdd**: Enforces TDD workflow and coverage requirements
- **code-quality**: Ensures tests follow coding standards
- **ci-cd-compliance**: Integrates tests into CI/CD pipeline
- **database-schema-sync**: Tests database migrations and schema changes

### Complementary Skills

This skill provides the testing implementation patterns that complement:
- Backend API development workflows
- Frontend component development
- Database operation testing
- Security testing practices

## Best Practices

### DO ✅

- Write tests before implementation (TDD)
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Test edge cases and error conditions
- Mock external dependencies
- Maintain ≥80% code coverage
- Run tests in CI/CD pipeline

### DON'T ❌

- Skip tests for "simple" code
- Write tests after implementation
- Test implementation details
- Share state between tests
- Use sleep() for timing
- Ignore flaky tests
- Commit failing tests

## Common Commands

### pytest Commands

```bash
pytest                          # Run all tests
pytest -v                       # Verbose output
pytest -x                       # Stop on first failure
pytest --lf                     # Run last failed
pytest --cov=src                # With coverage
pytest -m unit                  # Run unit tests only
pytest -k "test_user"           # Pattern matching
```

### Vitest Commands

```bash
npm run test                    # Run tests
npm run test:watch              # Watch mode
npm run test:ui                 # UI mode
npm run test:coverage           # Generate coverage
```

## Coverage Requirements

All code must maintain **minimum 80% code coverage**:

```bash
# Backend
pytest --cov=src --cov-fail-under=80

# Frontend
npm run test:coverage  # Configured in vitest.config.ts
```

## Troubleshooting

### Common Issues

**Tests pass locally but fail in CI**
- Ensure environment parity
- Check for timing/race conditions
- Verify database state reset

**Slow test execution**
- Use pytest-xdist for parallel execution
- Mock external dependencies
- Optimize database fixtures

**Flaky tests**
- Identify root cause (timing, state, randomness)
- Fix properly, don't just retry
- Ensure test isolation

## Contributing

When adding new test patterns to this skill:

1. Follow existing structure and format
2. Include real-world examples
3. Document best practices
4. Keep files under 500 lines
5. Test all examples before committing

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or contributions:
- GitHub Issues: https://github.com/ainative/skills/issues
- Documentation: See reference files in this skill
- Examples: See `references/test-examples.md`

---

**Version**: 1.0.0
**Author**: AINative Studio
**Tags**: testing, tdd, bdd, pytest, vitest, fastapi, react
