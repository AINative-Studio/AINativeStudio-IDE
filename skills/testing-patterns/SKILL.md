---
name: testing-patterns
description: TDD/BDD workflows for FastAPI + React stack with pytest, vitest, and integration testing. Use when writing tests, configuring test runners, or implementing test-driven development.
version: 1.0.0
author: AINative Studio
tags: [testing, tdd, bdd, pytest, vitest, fastapi, react]
---

# Testing Patterns Skill

This skill provides comprehensive testing patterns and workflows for test-driven development (TDD) and behavior-driven development (BDD) in FastAPI + React applications.

## When to Use This Skill

Activate this skill when you need to:

1. **Write Unit Tests** - Create isolated tests for functions, classes, and components
2. **Configure Test Runners** - Set up pytest, vitest, or other testing frameworks
3. **Implement TDD Workflow** - Follow test-first development practices
4. **Create Integration Tests** - Test API endpoints, database operations, and service integrations
5. **Mock External Dependencies** - Mock databases, APIs, file systems, and third-party services
6. **Set Up Test Fixtures** - Create reusable test data and configuration
7. **Achieve Coverage Goals** - Reach and maintain ≥80% code coverage
8. **Debug Test Failures** - Diagnose and fix failing tests
9. **Write E2E Tests** - Create end-to-end workflow tests

## Core Testing Principles

### Test-Driven Development (TDD) Cycle

```
1. RED - Write a failing test
2. GREEN - Write minimal code to make it pass
3. REFACTOR - Improve code while keeping tests green
```

### Test Structure (AAA Pattern)

```python
def test_example():
    # ARRANGE - Set up test data and conditions
    user = User(email="test@example.com")

    # ACT - Execute the behavior being tested
    result = user.validate_email()

    # ASSERT - Verify the expected outcome
    assert result is True
```

### BDD Given-When-Then Pattern

```python
def test_user_authentication():
    # GIVEN a registered user
    user = create_user(email="test@example.com", password="password123")

    # WHEN the user attempts to login with correct credentials
    result = authenticate(email="test@example.com", password="password123")

    # THEN authentication succeeds
    assert result.success is True
    assert result.user_id == user.id
```

## FastAPI Testing with pytest

### Basic API Test Structure

```python
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_create_item():
    # ARRANGE
    item_data = {"name": "Test Item", "price": 29.99}

    # ACT
    response = client.post("/api/items", json=item_data)

    # ASSERT
    assert response.status_code == 201
    assert response.json()["name"] == "Test Item"
    assert response.json()["price"] == 29.99
```

### Testing with Authentication

```python
import pytest

@pytest.fixture
def auth_headers(client):
    """Fixture providing authenticated headers"""
    response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "password123"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_protected_endpoint(client, auth_headers):
    # ACT
    response = client.get("/api/profile", headers=auth_headers)

    # ASSERT
    assert response.status_code == 200
    assert "email" in response.json()
```

### Database Testing with Fixtures

```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base

@pytest.fixture(scope="function")
def test_db():
    """Create a fresh test database for each test"""
    engine = create_engine('sqlite:///./test.db')
    Base.metadata.create_all(bind=engine)

    TestingSessionLocal = sessionmaker(bind=engine)
    db = TestingSessionLocal()

    yield db

    db.close()
    Base.metadata.drop_all(bind=engine)

def test_create_user(test_db):
    # ARRANGE
    from models import User
    user = User(email="test@example.com", name="Test User")

    # ACT
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)

    # ASSERT
    assert user.id is not None
    assert user.email == "test@example.com"
```

## React Testing with Vitest

### Component Testing

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

describe('Button Component', () => {
  it('renders with correct text', () => {
    // ARRANGE & ACT
    render(<Button>Click Me</Button>)

    // ASSERT
    expect(screen.getByText('Click Me')).toBeInTheDocument()
  })

  it('calls onClick handler when clicked', () => {
    // ARRANGE
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click Me</Button>)

    // ACT
    screen.getByText('Click Me').click()

    // ASSERT
    expect(handleClick).toHaveBeenCalledOnce()
  })
})
```

### Testing Hooks

```typescript
import { renderHook, act } from '@testing-library/react'
import { useCounter } from './useCounter'

describe('useCounter', () => {
  it('increments counter', () => {
    // ARRANGE
    const { result } = renderHook(() => useCounter(0))

    // ACT
    act(() => {
      result.current.increment()
    })

    // ASSERT
    expect(result.current.count).toBe(1)
  })
})
```

## Mocking Strategies

### Mocking External APIs

```python
from unittest.mock import Mock, patch

@pytest.fixture
def mock_openai():
    with patch('openai.ChatCompletion.create') as mock:
        mock.return_value = {
            'choices': [{'message': {'content': 'AI response'}}]
        }
        yield mock

def test_ai_chat(mock_openai):
    # ACT
    response = get_ai_response("Hello")

    # ASSERT
    assert response == "AI response"
    mock_openai.assert_called_once()
```

### Mocking Database Operations

```python
@pytest.fixture
def mock_db_session():
    """Mock database session for unit tests"""
    mock_session = Mock()
    mock_session.query.return_value.filter.return_value.first.return_value = Mock(
        id=1,
        email="test@example.com"
    )
    return mock_session

def test_get_user_by_email(mock_db_session):
    # ACT
    user = get_user_by_email(mock_db_session, "test@example.com")

    # ASSERT
    assert user.email == "test@example.com"
    mock_db_session.query.assert_called_once()
```

## Integration Testing

### API Integration Tests

```python
@pytest.mark.integration
def test_user_registration_flow(client, test_db):
    # GIVEN no existing user
    assert test_db.query(User).count() == 0

    # WHEN user registers
    response = client.post("/api/auth/register", json={
        "email": "newuser@example.com",
        "password": "securepass123"
    })

    # THEN user is created and can login
    assert response.status_code == 201
    assert test_db.query(User).count() == 1

    login_response = client.post("/api/auth/login", json={
        "email": "newuser@example.com",
        "password": "securepass123"
    })
    assert login_response.status_code == 200
    assert "access_token" in login_response.json()
```

### Testing ZeroDB Integration

```python
@pytest.fixture
def mock_zerodb_client():
    with patch('services.zerodb.ZeroDBClient') as mock:
        mock_instance = Mock()
        mock_instance.vector_search.return_value = [
            {'id': '1', 'score': 0.95, 'content': 'Relevant document'}
        ]
        mock.return_value = mock_instance
        yield mock_instance

@pytest.mark.integration
def test_semantic_search(client, mock_zerodb_client, auth_headers):
    # ACT
    response = client.post("/api/search",
        headers=auth_headers,
        json={"query": "machine learning"}
    )

    # ASSERT
    assert response.status_code == 200
    assert len(response.json()["results"]) > 0
    mock_zerodb_client.vector_search.assert_called_once()
```

## Coverage Requirements

All tests must achieve **≥80% code coverage**:

```bash
# Run with coverage
pytest --cov=src --cov-report=html --cov-report=term-missing --cov-fail-under=80

# View HTML coverage report
open htmlcov/index.html
```

## Test Organization

### Directory Structure

```
project/
├── src/
│   ├── api/
│   ├── services/
│   └── models/
├── tests/
│   ├── unit/
│   │   ├── test_api.py
│   │   ├── test_services.py
│   │   └── test_models.py
│   ├── integration/
│   │   ├── test_api_integration.py
│   │   └── test_db_integration.py
│   ├── conftest.py
│   └── pytest.ini
└── frontend/
    ├── src/
    └── tests/
        ├── components/
        ├── hooks/
        └── utils/
```

### Test Markers

```python
# pytest.ini
[pytest]
markers =
    unit: Unit tests (fast, isolated)
    integration: Integration tests (slower, with dependencies)
    slow: Slow tests (skip in CI with -m "not slow")
    smoke: Critical smoke tests
```

### Running Tests Selectively

```bash
# Run only unit tests
pytest -m unit

# Run all except slow tests
pytest -m "not slow"

# Run specific test file
pytest tests/unit/test_api.py

# Run tests matching pattern
pytest -k "test_user"
```

## Continuous Integration

Tests run automatically in GitHub Actions:

```yaml
- name: Run tests with coverage
  run: |
    cd backend
    pytest --cov=src --cov-report=xml --cov-fail-under=80

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./backend/coverage.xml
```

## Best Practices

### ✅ DO

- Write tests before implementation (TDD)
- Use descriptive test names: `test_user_cannot_access_other_users_data`
- Test one behavior per test
- Use fixtures for shared setup
- Mock external dependencies
- Test error cases and edge cases
- Keep tests independent (no shared state)
- Aim for fast test execution

### ❌ DON'T

- Write tests after implementation
- Test implementation details
- Share state between tests
- Use sleep() or arbitrary waits
- Ignore flaky tests
- Skip error case testing
- Commit failing tests

## Reference Files

This skill includes detailed reference documentation:

- `references/pytest-config.md` - pytest configuration and setup
- `references/vitest-config.md` - vitest configuration for React
- `references/mock-patterns.md` - Mocking strategies for external services
- `references/integration-tests.md` - End-to-end testing patterns
- `references/ci-integration.md` - GitHub Actions test configuration
- `references/test-examples.md` - Real-world test examples

## Integration with Other Skills

Works seamlessly with:

- **mandatory-tdd** - Enforces TDD workflow and coverage requirements
- **code-quality** - Ensures tests follow coding standards
- **ci-cd-compliance** - Integrates tests into CI/CD pipeline

## Quick Reference

### Common pytest Commands

```bash
pytest                              # Run all tests
pytest -v                           # Verbose output
pytest -x                           # Stop on first failure
pytest --lf                         # Run last failed tests
pytest --cov=src                    # Run with coverage
pytest -m unit                      # Run unit tests only
pytest -k "test_user"               # Run tests matching pattern
```

### Common Vitest Commands

```bash
npm run test                        # Run all tests
npm run test:watch                  # Watch mode
npm run test:ui                     # UI mode
npm run test:coverage               # Generate coverage
```

---

**Remember**: Tests are not just verification - they are documentation, design tools, and safety nets. Write tests that clarify intent and catch regressions.
