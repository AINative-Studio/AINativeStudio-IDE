# pytest Configuration Patterns

Complete guide to configuring pytest for FastAPI applications with best practices and production-ready patterns.

## pytest.ini Configuration

```ini
[pytest]
# Test discovery patterns
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*

# Command-line options
addopts =
    -v
    --strict-markers
    --strict-config
    --cov=src
    --cov-report=html
    --cov-report=term-missing:skip-covered
    --cov-fail-under=80
    --tb=short
    --disable-warnings
    -ra

# Custom markers
markers =
    unit: Unit tests (fast, isolated)
    integration: Integration tests (with database/external services)
    slow: Slow tests (may be skipped in development)
    smoke: Critical smoke tests
    api: API endpoint tests
    database: Database operation tests
    security: Security-related tests

# Coverage configuration
[coverage:run]
source = src
omit =
    */tests/*
    */migrations/*
    */__pycache__/*
    */venv/*

[coverage:report]
exclude_lines =
    pragma: no cover
    def __repr__
    raise AssertionError
    raise NotImplementedError
    if __name__ == .__main__.:
    if TYPE_CHECKING:
    @abstractmethod
```

## Project Structure

```
backend/
├── src/
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes.py
│   │   └── dependencies.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   └── user.py
│   ├── models/
│   │   ├── __init__.py
│   │   └── user.py
│   └── main.py
├── tests/
│   ├── unit/
│   │   ├── __init__.py
│   │   ├── test_services.py
│   │   └── test_models.py
│   ├── integration/
│   │   ├── __init__.py
│   │   └── test_api.py
│   ├── conftest.py
│   └── pytest.ini
├── requirements.txt
└── requirements-dev.txt
```

## conftest.py - Global Fixtures

```python
"""
Global pytest fixtures available to all tests.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from src.main import app
from src.database import Base, get_db
from src.models.user import User
from src.services.auth import create_access_token


# ============================================================================
# Database Fixtures
# ============================================================================

@pytest.fixture(scope="session")
def engine():
    """
    Create a test database engine that persists for the entire test session.
    Uses SQLite in-memory database for speed.
    """
    return create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )


@pytest.fixture(scope="session")
def tables(engine):
    """Create all database tables once per session."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(engine, tables) -> Session:
    """
    Create a fresh database session for each test function.
    Automatically rolls back changes after each test.
    """
    connection = engine.connect()
    transaction = connection.begin()
    SessionLocal = sessionmaker(bind=connection)
    session = SessionLocal()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db_session: Session):
    """
    FastAPI TestClient with database dependency override.
    Each test gets a fresh client with isolated database.
    """
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


# ============================================================================
# Authentication Fixtures
# ============================================================================

@pytest.fixture
def test_user(db_session: Session) -> User:
    """Create a test user in the database."""
    from src.services.auth import get_password_hash

    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("testpassword123"),
        full_name="Test User",
        is_active=True,
        is_superuser=False
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def superuser(db_session: Session) -> User:
    """Create a superuser for admin tests."""
    from src.services.auth import get_password_hash

    user = User(
        email="admin@example.com",
        hashed_password=get_password_hash("adminpassword123"),
        full_name="Admin User",
        is_active=True,
        is_superuser=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user: User) -> dict:
    """Generate authentication headers for test user."""
    token = create_access_token({"sub": str(test_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers(superuser: User) -> dict:
    """Generate authentication headers for superuser."""
    token = create_access_token({"sub": str(superuser.id)})
    return {"Authorization": f"Bearer {token}"}


# ============================================================================
# Mock External Services
# ============================================================================

@pytest.fixture
def mock_openai(monkeypatch):
    """Mock OpenAI API calls."""
    from unittest.mock import Mock

    mock_response = Mock()
    mock_response.choices = [
        Mock(message=Mock(content="This is a mocked AI response"))
    ]

    def mock_create(*args, **kwargs):
        return mock_response

    monkeypatch.setattr(
        "openai.ChatCompletion.create",
        mock_create
    )
    return mock_response


@pytest.fixture
def mock_zerodb(monkeypatch):
    """Mock ZeroDB client."""
    from unittest.mock import Mock

    mock_client = Mock()
    mock_client.vector_search.return_value = [
        {
            "id": "doc1",
            "score": 0.95,
            "metadata": {"content": "Relevant document"}
        }
    ]

    def mock_get_client():
        return mock_client

    monkeypatch.setattr(
        "src.services.zerodb.get_zerodb_client",
        mock_get_client
    )
    return mock_client


@pytest.fixture
def mock_email_service(monkeypatch):
    """Mock email sending service."""
    from unittest.mock import Mock

    mock_send = Mock(return_value=True)

    monkeypatch.setattr(
        "src.services.email.send_email",
        mock_send
    )
    return mock_send


# ============================================================================
# Test Data Factories
# ============================================================================

@pytest.fixture
def user_factory(db_session: Session):
    """Factory for creating test users."""
    from src.services.auth import get_password_hash

    def create_user(
        email: str = None,
        password: str = "defaultpassword",
        full_name: str = "Test User",
        is_active: bool = True,
        is_superuser: bool = False
    ) -> User:
        if email is None:
            import uuid
            email = f"user-{uuid.uuid4()}@example.com"

        user = User(
            email=email,
            hashed_password=get_password_hash(password),
            full_name=full_name,
            is_active=is_active,
            is_superuser=is_superuser
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user

    return create_user


# ============================================================================
# Cleanup Fixtures
# ============================================================================

@pytest.fixture(autouse=True)
def reset_db_state(db_session: Session):
    """Automatically reset database state after each test."""
    yield
    # Cleanup happens automatically via db_session rollback


@pytest.fixture(autouse=True)
def reset_app_state():
    """Reset application state after each test."""
    yield
    app.dependency_overrides.clear()


# ============================================================================
# Performance Fixtures
# ============================================================================

@pytest.fixture
def timer():
    """Timer fixture for performance testing."""
    import time

    class Timer:
        def __init__(self):
            self.start_time = None
            self.end_time = None

        def start(self):
            self.start_time = time.time()

        def stop(self):
            self.end_time = time.time()

        @property
        def elapsed(self):
            if self.start_time and self.end_time:
                return self.end_time - self.start_time
            return None

    return Timer()
```

## pytest Plugins

Add to `requirements-dev.txt`:

```txt
pytest==7.4.0
pytest-cov==4.1.0
pytest-asyncio==0.21.0
pytest-mock==3.11.1
pytest-env==0.8.2
pytest-timeout==2.1.0
pytest-xdist==3.3.1
pytest-benchmark==4.0.0
```

## Running Tests

### Basic Commands

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest tests/unit/test_services.py

# Run specific test function
pytest tests/unit/test_services.py::test_create_user

# Run tests matching pattern
pytest -k "test_user"
```

### Coverage Commands

```bash
# Run with coverage report
pytest --cov=src

# Generate HTML coverage report
pytest --cov=src --cov-report=html

# Show missing lines
pytest --cov=src --cov-report=term-missing

# Fail if coverage below 80%
pytest --cov=src --cov-fail-under=80
```

### Marker Commands

```bash
# Run only unit tests
pytest -m unit

# Run only integration tests
pytest -m integration

# Run all except slow tests
pytest -m "not slow"

# Run unit and api tests
pytest -m "unit or api"
```

### Debugging Commands

```bash
# Stop on first failure
pytest -x

# Run last failed tests
pytest --lf

# Run failed tests first
pytest --ff

# Show local variables on failure
pytest -l

# Enter debugger on failure
pytest --pdb
```

### Parallel Execution

```bash
# Run tests in parallel (4 workers)
pytest -n 4

# Run tests in parallel (auto detect CPU count)
pytest -n auto
```

## Environment Variables

Create `.env.test` file:

```bash
# Database
DATABASE_URL=sqlite:///./test.db

# JWT
SECRET_KEY=test_secret_key_do_not_use_in_production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# External Services (use test/mock endpoints)
OPENAI_API_KEY=test_key
ZERODB_API_KEY=test_key

# Feature Flags
ENABLE_EMAIL=false
ENABLE_ANALYTICS=false
```

Load in `conftest.py`:

```python
import pytest
from dotenv import load_dotenv
import os

@pytest.fixture(scope="session", autouse=True)
def load_test_env():
    """Load test environment variables."""
    load_dotenv(".env.test")
    yield
```

## Best Practices

### Test Naming

```python
# ✅ GOOD - Descriptive names
def test_user_cannot_login_with_wrong_password():
    pass

def test_create_user_with_duplicate_email_returns_409():
    pass

# ❌ BAD - Vague names
def test_user():
    pass

def test_login():
    pass
```

### Test Independence

```python
# ✅ GOOD - Each test is independent
def test_create_user(db_session):
    user = create_user(db_session, "test@example.com")
    assert user.email == "test@example.com"

def test_get_user(db_session):
    user = create_user(db_session, "test@example.com")
    found = get_user_by_email(db_session, "test@example.com")
    assert found.id == user.id

# ❌ BAD - Tests depend on each other
user_id = None

def test_create_user(db_session):
    global user_id
    user = create_user(db_session, "test@example.com")
    user_id = user.id

def test_get_user(db_session):
    # This test fails if test_create_user doesn't run first
    found = get_user_by_id(db_session, user_id)
    assert found is not None
```

### Fixture Scope

```python
# Use session scope for expensive setup
@pytest.fixture(scope="session")
def database_engine():
    """Created once per test session."""
    return create_engine("sqlite:///:memory:")

# Use function scope for test isolation
@pytest.fixture(scope="function")
def db_session(database_engine):
    """Fresh session for each test."""
    session = Session(database_engine)
    yield session
    session.rollback()
```

## Troubleshooting

### Common Issues

**Issue**: Tests pass individually but fail in suite
**Solution**: Tests have shared state. Use function-scoped fixtures.

**Issue**: Database state persists between tests
**Solution**: Ensure db_session fixture rolls back transactions.

**Issue**: Slow test execution
**Solution**: Use pytest-xdist for parallel execution.

**Issue**: Flaky tests (random failures)
**Solution**: Identify and fix race conditions, use proper async handling.

---

This configuration provides a robust foundation for testing FastAPI applications with pytest.
