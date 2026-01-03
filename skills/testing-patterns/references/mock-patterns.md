# Mock Patterns for External Services

Comprehensive guide to mocking external dependencies in tests, including databases, APIs, and third-party services.

## Core Mocking Principles

1. **Isolate Tests** - Mock external dependencies to test code in isolation
2. **Control Behavior** - Define exact responses for predictable tests
3. **Avoid Network Calls** - Never make real API calls in unit tests
4. **Fast Execution** - Mocks ensure tests run quickly
5. **Deterministic Results** - Same inputs always produce same outputs

## Python Mocking with pytest

### Using unittest.mock

```python
from unittest.mock import Mock, patch, MagicMock, call
import pytest

# Basic mock creation
mock_object = Mock()
mock_object.method.return_value = "mocked result"

# Mock with side effects
mock_object.method.side_effect = [1, 2, 3]  # Returns different values each call
mock_object.method.side_effect = Exception("Error")  # Raises exception

# Mock verification
mock_object.method.assert_called_once()
mock_object.method.assert_called_with("expected", "arguments")
mock_object.method.assert_not_called()
```

### Patching External Dependencies

```python
from unittest.mock import patch

# Patch decorator
@patch('module.function_to_mock')
def test_with_patch(mock_function):
    mock_function.return_value = "mocked"
    result = call_function_that_uses_it()
    assert result == "mocked"

# Patch context manager
def test_with_context():
    with patch('module.function_to_mock') as mock_function:
        mock_function.return_value = "mocked"
        result = call_function_that_uses_it()
        assert result == "mocked"

# Patch multiple
@patch('module.second_function')
@patch('module.first_function')
def test_multiple_patches(mock_first, mock_second):
    # Note: Patches are applied bottom-up, so parameters are reversed
    mock_first.return_value = "first"
    mock_second.return_value = "second"
```

## Mocking ZeroDB

### Mock ZeroDB Vector Search

```python
import pytest
from unittest.mock import Mock, patch

@pytest.fixture
def mock_zerodb_client():
    """Mock ZeroDB client with vector search capabilities."""
    with patch('services.zerodb.ZeroDBClient') as MockClient:
        mock_instance = Mock()

        # Mock vector search
        mock_instance.vector_search.return_value = [
            {
                'id': 'doc1',
                'score': 0.95,
                'metadata': {
                    'content': 'Machine learning best practices',
                    'author': 'AI Research Team'
                }
            },
            {
                'id': 'doc2',
                'score': 0.87,
                'metadata': {
                    'content': 'Neural networks introduction',
                    'author': 'Deep Learning Expert'
                }
            }
        ]

        # Mock upsert
        mock_instance.upsert_vector.return_value = {
            'success': True,
            'id': 'new-doc-123'
        }

        # Mock delete
        mock_instance.delete_vector.return_value = {'deleted': 1}

        MockClient.return_value = mock_instance
        yield mock_instance


def test_semantic_search(mock_zerodb_client):
    """Test semantic search with mocked ZeroDB."""
    # ARRANGE
    from services.search import perform_semantic_search

    # ACT
    results = perform_semantic_search("machine learning")

    # ASSERT
    assert len(results) == 2
    assert results[0]['score'] > 0.9
    mock_zerodb_client.vector_search.assert_called_once()


def test_store_document(mock_zerodb_client):
    """Test document storage with mocked ZeroDB."""
    # ARRANGE
    from services.documents import store_document

    # ACT
    result = store_document(
        content="Test document",
        metadata={"type": "test"}
    )

    # ASSERT
    assert result['success'] is True
    mock_zerodb_client.upsert_vector.assert_called_once()
```

### Mock ZeroDB Table Operations

```python
@pytest.fixture
def mock_zerodb_table():
    """Mock ZeroDB table operations."""
    with patch('services.zerodb.get_table') as mock_table:
        mock_instance = Mock()

        # Mock query
        mock_instance.query.return_value = [
            {'id': 1, 'name': 'Item 1', 'status': 'active'},
            {'id': 2, 'name': 'Item 2', 'status': 'active'}
        ]

        # Mock insert
        mock_instance.insert.return_value = {'id': 3, 'inserted': True}

        # Mock update
        mock_instance.update.return_value = {'updated': 1}

        mock_table.return_value = mock_instance
        yield mock_instance


def test_get_active_items(mock_zerodb_table):
    """Test retrieving active items."""
    from services.items import get_active_items

    # ACT
    items = get_active_items()

    # ASSERT
    assert len(items) == 2
    assert all(item['status'] == 'active' for item in items)
    mock_zerodb_table.query.assert_called_with(status='active')
```

## Mocking AI Services

### Mock OpenAI API

```python
@pytest.fixture
def mock_openai():
    """Mock OpenAI API responses."""
    with patch('openai.ChatCompletion.create') as mock_create:
        mock_create.return_value = {
            'id': 'chatcmpl-123',
            'choices': [
                {
                    'message': {
                        'role': 'assistant',
                        'content': 'This is a mocked AI response.'
                    },
                    'finish_reason': 'stop'
                }
            ],
            'usage': {
                'prompt_tokens': 10,
                'completion_tokens': 20,
                'total_tokens': 30
            }
        }
        yield mock_create


def test_ai_chat_completion(mock_openai):
    """Test AI chat with mocked OpenAI."""
    from services.ai import get_ai_response

    # ACT
    response = get_ai_response("What is machine learning?")

    # ASSERT
    assert response == "This is a mocked AI response."
    mock_openai.assert_called_once()
    call_args = mock_openai.call_args
    assert call_args.kwargs['model'] == 'gpt-4'
```

### Mock Anthropic Claude API

```python
@pytest.fixture
def mock_anthropic():
    """Mock Anthropic Claude API."""
    with patch('anthropic.Anthropic') as MockAnthropic:
        mock_client = Mock()
        mock_client.messages.create.return_value = Mock(
            content=[Mock(text="Mocked Claude response")],
            stop_reason="end_turn",
            usage=Mock(input_tokens=50, output_tokens=100)
        )
        MockAnthropic.return_value = mock_client
        yield mock_client


def test_claude_chat(mock_anthropic):
    """Test Claude chat completion."""
    from services.ai import get_claude_response

    # ACT
    response = get_claude_response("Explain TDD")

    # ASSERT
    assert response == "Mocked Claude response"
    mock_anthropic.messages.create.assert_called_once()
```

## Mocking Database Operations

### Mock SQLAlchemy Session

```python
@pytest.fixture
def mock_db_session():
    """Mock SQLAlchemy database session."""
    mock_session = Mock()

    # Mock query
    mock_query = Mock()
    mock_query.filter.return_value = mock_query
    mock_query.first.return_value = Mock(
        id=1,
        email="test@example.com",
        name="Test User"
    )
    mock_query.all.return_value = [
        Mock(id=1, email="user1@example.com"),
        Mock(id=2, email="user2@example.com")
    ]
    mock_session.query.return_value = mock_query

    # Mock add/commit
    mock_session.add.return_value = None
    mock_session.commit.return_value = None
    mock_session.refresh.return_value = None

    yield mock_session


def test_get_user_by_email(mock_db_session):
    """Test user retrieval with mocked database."""
    from services.users import get_user_by_email
    from models import User

    # ACT
    user = get_user_by_email(mock_db_session, "test@example.com")

    # ASSERT
    assert user.email == "test@example.com"
    mock_db_session.query.assert_called_with(User)
    mock_db_session.query().filter.assert_called_once()
```

### Mock Redis Cache

```python
@pytest.fixture
def mock_redis():
    """Mock Redis client."""
    with patch('redis.Redis') as MockRedis:
        mock_client = Mock()

        # Mock get/set
        mock_client.get.return_value = b'{"key": "cached_value"}'
        mock_client.set.return_value = True
        mock_client.delete.return_value = 1
        mock_client.exists.return_value = True

        MockRedis.return_value = mock_client
        yield mock_client


def test_cache_get(mock_redis):
    """Test cache retrieval."""
    from services.cache import get_cached_value

    # ACT
    value = get_cached_value("test_key")

    # ASSERT
    assert value == {"key": "cached_value"}
    mock_redis.get.assert_called_with("test_key")
```

## Mocking HTTP Requests

### Mock requests Library

```python
@pytest.fixture
def mock_requests():
    """Mock HTTP requests."""
    with patch('requests.get') as mock_get:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'status': 'success',
            'data': {'id': 123, 'name': 'Test'}
        }
        mock_get.return_value = mock_response
        yield mock_get


def test_external_api_call(mock_requests):
    """Test external API call."""
    from services.external_api import fetch_data

    # ACT
    data = fetch_data("https://api.example.com/data")

    # ASSERT
    assert data['status'] == 'success'
    mock_requests.assert_called_once_with(
        "https://api.example.com/data",
        timeout=30
    )
```

### Mock httpx (Async HTTP)

```python
import pytest
from unittest.mock import AsyncMock, patch

@pytest.fixture
def mock_httpx():
    """Mock httpx async client."""
    with patch('httpx.AsyncClient') as MockClient:
        mock_client = AsyncMock()
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'result': 'success'}

        mock_client.__aenter__.return_value = mock_client
        mock_client.get.return_value = mock_response

        MockClient.return_value = mock_client
        yield mock_client


@pytest.mark.asyncio
async def test_async_api_call(mock_httpx):
    """Test async API call."""
    from services.async_api import fetch_async_data

    # ACT
    data = await fetch_async_data("https://api.example.com/async")

    # ASSERT
    assert data['result'] == 'success'
```

## Mocking File System

### Mock File Operations

```python
from unittest.mock import mock_open, patch

def test_read_config_file():
    """Test reading configuration file."""
    # ARRANGE
    mock_file_content = "key=value\napi_key=secret123"

    with patch('builtins.open', mock_open(read_data=mock_file_content)):
        from services.config import load_config

        # ACT
        config = load_config('config.txt')

        # ASSERT
        assert config['key'] == 'value'
        assert config['api_key'] == 'secret123'


def test_write_log_file():
    """Test writing to log file."""
    mock_file = mock_open()

    with patch('builtins.open', mock_file):
        from services.logger import write_log

        # ACT
        write_log("Test log message")

        # ASSERT
        mock_file.assert_called_once_with('app.log', 'a')
        handle = mock_file()
        handle.write.assert_called_once_with("Test log message\n")
```

## TypeScript/JavaScript Mocking with Vitest

### Mock ES6 Modules

```typescript
import { vi } from 'vitest'
import * as api from '@services/api'

// Mock entire module
vi.mock('@services/api')

// Mock specific functions
vi.spyOn(api, 'fetchUser').mockResolvedValue({
  id: '123',
  name: 'Test User',
  email: 'test@example.com'
})

// Restore original implementation
vi.restoreAllMocks()
```

### Mock Fetch API

```typescript
import { vi } from 'vitest'

global.fetch = vi.fn()

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches user data successfully', async () => {
    // ARRANGE
    const mockUser = { id: '1', name: 'Test' }
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockUser,
    } as Response)

    // ACT
    const user = await fetchUser('1')

    // ASSERT
    expect(user).toEqual(mockUser)
    expect(fetch).toHaveBeenCalledWith('/api/users/1')
  })

  it('handles fetch errors', async () => {
    // ARRANGE
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

    // ACT & ASSERT
    await expect(fetchUser('1')).rejects.toThrow('Network error')
  })
})
```

### Mock localStorage

```typescript
import { vi } from 'vitest'

const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})
```

## Advanced Mocking Patterns

### Mock with Side Effects

```python
from unittest.mock import Mock

def test_retry_logic():
    """Test retry mechanism with side effects."""
    mock_api = Mock()

    # First two calls fail, third succeeds
    mock_api.call.side_effect = [
        Exception("Timeout"),
        Exception("Timeout"),
        {"status": "success"}
    ]

    from services.retry import call_with_retry

    # ACT
    result = call_with_retry(mock_api.call, max_retries=3)

    # ASSERT
    assert result['status'] == 'success'
    assert mock_api.call.call_count == 3
```

### Partial Mocking

```python
from unittest.mock import patch

def test_partial_mock():
    """Mock only specific methods of an object."""
    from services.calculator import Calculator

    calc = Calculator()

    with patch.object(calc, 'add', return_value=100):
        # add() is mocked
        assert calc.add(5, 5) == 100

        # subtract() uses real implementation
        assert calc.subtract(10, 5) == 5
```

### Mock Chaining

```python
def test_method_chaining():
    """Test mocking method chains."""
    mock_db = Mock()

    # Configure chain: db.query().filter().first()
    mock_db.query.return_value.filter.return_value.first.return_value = Mock(
        id=1,
        name="Test"
    )

    # ACT
    result = mock_db.query(User).filter(User.id == 1).first()

    # ASSERT
    assert result.name == "Test"
```

## Best Practices

### ✅ DO

- **Use fixtures for reusable mocks**
- **Mock at the boundary** (mock external services, not internal logic)
- **Verify important calls** with `assert_called_with()`
- **Reset mocks between tests** with `beforeEach` or fixtures
- **Mock only what you need** (avoid over-mocking)

### ❌ DON'T

- **Mock too much** (reduces test value)
- **Mock internal implementation details**
- **Forget to assert mock calls** (verify behavior)
- **Share mock state** between tests
- **Use mocks in integration tests** (use real dependencies)

## Troubleshooting

### Common Mock Issues

**Issue**: Mock not being used
```python
# ❌ Wrong - Mocking after import
from services import user_service
with patch('openai.ChatCompletion.create'):
    # user_service already imported the real function

# ✅ Correct - Mock before import
with patch('openai.ChatCompletion.create'):
    from services import user_service
```

**Issue**: Mock verification fails
```python
# ❌ Wrong - Different arguments
mock.method("arg1", "arg2")
mock.method.assert_called_with("arg1")  # Fails - missing arg2

# ✅ Correct - Match exact arguments
mock.method.assert_called_with("arg1", "arg2")
```

---

Effective mocking isolates tests, improves speed, and ensures reliability.
