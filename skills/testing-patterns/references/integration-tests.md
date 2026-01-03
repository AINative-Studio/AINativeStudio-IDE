# Integration Testing Strategies

Comprehensive guide to integration and end-to-end testing for FastAPI + React applications.

## Integration vs Unit Testing

| Aspect | Unit Tests | Integration Tests |
|--------|------------|-------------------|
| Scope | Single function/class | Multiple components |
| Dependencies | Mocked | Real or test instances |
| Speed | Very fast (<1ms) | Slower (10ms-1s) |
| Isolation | Complete | Partial |
| Purpose | Verify logic | Verify interactions |

## FastAPI Integration Testing

### Basic API Integration Test

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.main import app
from src.database import Base, get_db
from src.models.user import User


@pytest.fixture(scope="function")
def test_db():
    """Create test database for integration tests."""
    engine = create_engine('sqlite:///./test.db')
    Base.metadata.create_all(bind=engine)

    TestingSessionLocal = sessionmaker(bind=engine)
    db = TestingSessionLocal()

    yield db

    db.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(test_db):
    """TestClient with real database."""
    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.mark.integration
def test_user_registration_and_login(client, test_db):
    """
    Integration test for complete user registration and login flow.

    Tests:
    1. User registration with valid data
    2. Email uniqueness validation
    3. Login with correct credentials
    4. Access to protected endpoints with token
    """
    # STEP 1: Register new user
    registration_data = {
        "email": "newuser@example.com",
        "password": "SecurePassword123!",
        "full_name": "New User"
    }

    response = client.post("/api/auth/register", json=registration_data)

    assert response.status_code == 201
    assert response.json()["email"] == "newuser@example.com"
    assert "id" in response.json()
    user_id = response.json()["id"]

    # STEP 2: Verify user exists in database
    user = test_db.query(User).filter(User.id == user_id).first()
    assert user is not None
    assert user.email == "newuser@example.com"
    assert user.full_name == "New User"

    # STEP 3: Try to register with same email (should fail)
    response = client.post("/api/auth/register", json=registration_data)
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"].lower()

    # STEP 4: Login with correct credentials
    login_data = {
        "email": "newuser@example.com",
        "password": "SecurePassword123!"
    }

    response = client.post("/api/auth/login", json=login_data)
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "bearer"
    access_token = response.json()["access_token"]

    # STEP 5: Access protected endpoint with token
    headers = {"Authorization": f"Bearer {access_token}"}
    response = client.get("/api/users/me", headers=headers)

    assert response.status_code == 200
    assert response.json()["email"] == "newuser@example.com"
    assert response.json()["id"] == user_id

    # STEP 6: Login with wrong password (should fail)
    wrong_login = {
        "email": "newuser@example.com",
        "password": "WrongPassword"
    }

    response = client.post("/api/auth/login", json=wrong_login)
    assert response.status_code == 401
```

### Testing CRUD Operations

```python
@pytest.mark.integration
def test_item_crud_operations(client, test_db, auth_headers):
    """
    Integration test for complete CRUD operations on items.

    Tests: Create, Read, Update, Delete operations with database persistence.
    """
    # CREATE
    item_data = {
        "name": "Test Item",
        "description": "A test item for integration testing",
        "price": 29.99,
        "quantity": 10
    }

    response = client.post(
        "/api/items",
        json=item_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    created_item = response.json()
    item_id = created_item["id"]
    assert created_item["name"] == "Test Item"
    assert created_item["price"] == 29.99

    # READ - Get single item
    response = client.get(f"/api/items/{item_id}")
    assert response.status_code == 200
    assert response.json()["id"] == item_id
    assert response.json()["name"] == "Test Item"

    # READ - List all items
    response = client.get("/api/items")
    assert response.status_code == 200
    items = response.json()
    assert len(items) >= 1
    assert any(item["id"] == item_id for item in items)

    # UPDATE
    update_data = {
        "name": "Updated Item",
        "price": 39.99
    }

    response = client.patch(
        f"/api/items/{item_id}",
        json=update_data,
        headers=auth_headers
    )

    assert response.status_code == 200
    updated_item = response.json()
    assert updated_item["name"] == "Updated Item"
    assert updated_item["price"] == 39.99
    assert updated_item["description"] == item_data["description"]  # Unchanged

    # Verify update persisted in database
    from src.models.item import Item
    db_item = test_db.query(Item).filter(Item.id == item_id).first()
    assert db_item.name == "Updated Item"
    assert db_item.price == 39.99

    # DELETE
    response = client.delete(
        f"/api/items/{item_id}",
        headers=auth_headers
    )

    assert response.status_code == 204

    # Verify deletion
    response = client.get(f"/api/items/{item_id}")
    assert response.status_code == 404

    # Verify deletion in database
    db_item = test_db.query(Item).filter(Item.id == item_id).first()
    assert db_item is None
```

### Testing Database Transactions

```python
@pytest.mark.integration
def test_transaction_rollback_on_error(client, test_db, auth_headers):
    """
    Test that database transactions rollback on error.

    Ensures data consistency when operations fail partway through.
    """
    from src.models.item import Item

    # Get initial item count
    initial_count = test_db.query(Item).count()

    # Attempt to create item with invalid data (should trigger rollback)
    invalid_data = {
        "name": "Test Item",
        "price": -10  # Negative price should be rejected
    }

    response = client.post(
        "/api/items",
        json=invalid_data,
        headers=auth_headers
    )

    assert response.status_code == 422  # Validation error

    # Verify no item was created (transaction rolled back)
    final_count = test_db.query(Item).count()
    assert final_count == initial_count


@pytest.mark.integration
def test_concurrent_updates(client, test_db, auth_headers):
    """Test handling of concurrent update attempts."""
    # Create initial item
    item_data = {"name": "Original", "price": 10.0}
    response = client.post("/api/items", json=item_data, headers=auth_headers)
    item_id = response.json()["id"]

    # Simulate concurrent updates
    update_1 = {"name": "Update 1"}
    update_2 = {"name": "Update 2"}

    response_1 = client.patch(f"/api/items/{item_id}", json=update_1, headers=auth_headers)
    response_2 = client.patch(f"/api/items/{item_id}", json=update_2, headers=auth_headers)

    assert response_1.status_code == 200
    assert response_2.status_code == 200

    # Final state should be deterministic (last write wins)
    response = client.get(f"/api/items/{item_id}")
    assert response.json()["name"] == "Update 2"
```

### Testing Pagination and Filtering

```python
@pytest.mark.integration
def test_pagination_and_filtering(client, test_db, auth_headers):
    """
    Test API pagination and filtering capabilities.
    """
    # Create test items
    for i in range(25):
        item_data = {
            "name": f"Item {i}",
            "price": 10.0 + i,
            "category": "electronics" if i % 2 == 0 else "books"
        }
        client.post("/api/items", json=item_data, headers=auth_headers)

    # Test pagination
    response = client.get("/api/items?page=1&size=10")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 10
    assert data["total"] == 25
    assert data["page"] == 1
    assert data["pages"] == 3

    # Test second page
    response = client.get("/api/items?page=2&size=10")
    assert len(response.json()["items"]) == 10

    # Test filtering
    response = client.get("/api/items?category=electronics")
    assert response.status_code == 200
    items = response.json()["items"]
    assert all(item["category"] == "electronics" for item in items)
    assert len(items) == 13  # 25 / 2 rounded up

    # Test combined pagination and filtering
    response = client.get("/api/items?category=books&page=1&size=5")
    data = response.json()
    assert len(data["items"]) == 5
    assert all(item["category"] == "books" for item in data["items"])
```

## Testing External Service Integration

### Testing ZeroDB Integration

```python
import pytest
from unittest.mock import patch, Mock

@pytest.mark.integration
def test_semantic_search_with_zerodb(client, test_db, auth_headers):
    """
    Integration test for semantic search using ZeroDB.

    Note: Uses mocked ZeroDB to avoid external dependencies in CI/CD.
    For E2E tests, use real ZeroDB instance.
    """
    with patch('services.zerodb.ZeroDBClient') as MockZeroDB:
        # Configure mock
        mock_client = Mock()
        mock_client.vector_search.return_value = [
            {
                'id': 'doc1',
                'score': 0.95,
                'metadata': {
                    'title': 'Machine Learning Guide',
                    'content': 'Complete guide to ML'
                }
            },
            {
                'id': 'doc2',
                'score': 0.87,
                'metadata': {
                    'title': 'Deep Learning Basics',
                    'content': 'Introduction to deep learning'
                }
            }
        ]
        MockZeroDB.return_value = mock_client

        # Execute search
        search_data = {"query": "machine learning tutorials"}
        response = client.post(
            "/api/search/semantic",
            json=search_data,
            headers=auth_headers
        )

        # Verify response
        assert response.status_code == 200
        results = response.json()["results"]
        assert len(results) == 2
        assert results[0]["score"] > results[1]["score"]
        assert "machine learning" in results[0]["title"].lower()

        # Verify ZeroDB was called correctly
        mock_client.vector_search.assert_called_once()
        call_args = mock_client.vector_search.call_args
        assert "machine learning tutorials" in str(call_args)
```

### Testing AI Service Integration

```python
@pytest.mark.integration
@pytest.mark.slow
def test_ai_completion_workflow(client, test_db, auth_headers):
    """
    Integration test for AI completion workflow.

    Tests entire flow: user request -> AI processing -> response storage
    """
    with patch('services.ai.get_openai_client') as mock_openai:
        # Configure mock AI response
        mock_openai.return_value.chat.completions.create.return_value = Mock(
            choices=[Mock(message=Mock(content="AI generated response"))],
            usage=Mock(total_tokens=150)
        )

        # Make AI request
        request_data = {
            "prompt": "Explain test-driven development",
            "model": "gpt-4"
        }

        response = client.post(
            "/api/ai/complete",
            json=request_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        result = response.json()
        assert result["response"] == "AI generated response"
        assert result["tokens_used"] == 150

        # Verify conversation was saved to database
        from src.models.conversation import Conversation
        conversation = test_db.query(Conversation).first()
        assert conversation is not None
        assert conversation.prompt == "Explain test-driven development"
        assert conversation.response == "AI generated response"
```

## React Integration Testing

### Testing Component with API Integration

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { UserList } from '@components/UserList'

// Setup MSW server for API mocking
const server = setupServer(
  rest.get('/api/users', (req, res, ctx) => {
    return res(
      ctx.json([
        { id: '1', name: 'John Doe', email: 'john@example.com' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
      ])
    )
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('UserList Integration', () => {
  it('fetches and displays users from API', async () => {
    // ARRANGE & ACT
    render(<UserList />)

    // Loading state
    expect(screen.getByText(/loading/i)).toBeInTheDocument()

    // ASSERT - Users loaded
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    // ARRANGE - Override handler to return error
    server.use(
      rest.get('/api/users', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Server error' }))
      })
    )

    // ACT
    render(<UserList />)

    // ASSERT
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })

  it('deletes user and refreshes list', async () => {
    // ARRANGE
    const user = userEvent.setup()

    server.use(
      rest.delete('/api/users/:id', (req, res, ctx) => {
        return res(ctx.status(204))
      })
    )

    render(<UserList />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // ACT - Delete user
    const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0]
    await user.click(deleteButton)

    // Confirm deletion
    await user.click(screen.getByRole('button', { name: /confirm/i }))

    // ASSERT - User removed from list
    await waitFor(() => {
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
    })
  })
})
```

## End-to-End Testing with Playwright

### E2E User Journey Test

```typescript
import { test, expect } from '@playwright/test'

test.describe('User Registration and Purchase Flow', () => {
  test('complete user journey from registration to purchase', async ({ page }) => {
    // STEP 1: Navigate to application
    await page.goto('http://localhost:3000')

    // STEP 2: Register new user
    await page.click('text=Sign Up')
    await page.fill('input[name="email"]', 'e2e@example.com')
    await page.fill('input[name="password"]', 'SecurePass123!')
    await page.fill('input[name="fullName"]', 'E2E Test User')
    await page.click('button[type="submit"]')

    // Verify registration success
    await expect(page.locator('text=Welcome')).toBeVisible()

    // STEP 3: Browse products
    await page.click('text=Products')
    await expect(page.locator('.product-card')).toHaveCount(10, { timeout: 5000 })

    // STEP 4: Search for specific product
    await page.fill('input[placeholder*="Search"]', 'laptop')
    await page.press('input[placeholder*="Search"]', 'Enter')
    await expect(page.locator('.product-card')).toHaveCount(3)

    // STEP 5: Add item to cart
    await page.click('.product-card:first-child button:has-text("Add to Cart")')
    await expect(page.locator('.cart-badge')).toHaveText('1')

    // STEP 6: View cart
    await page.click('.cart-icon')
    await expect(page.locator('.cart-item')).toHaveCount(1)

    // STEP 7: Proceed to checkout
    await page.click('button:has-text("Checkout")')

    // Fill shipping information
    await page.fill('input[name="address"]', '123 Test St')
    await page.fill('input[name="city"]', 'Test City')
    await page.fill('input[name="zipCode"]', '12345')

    // Fill payment information
    await page.fill('input[name="cardNumber"]', '4242424242424242')
    await page.fill('input[name="expiry"]', '12/25')
    await page.fill('input[name="cvv"]', '123')

    // STEP 8: Complete purchase
    await page.click('button:has-text("Place Order")')

    // Verify order confirmation
    await expect(page.locator('text=Order Confirmed')).toBeVisible()
    await expect(page.locator('.order-number')).toBeVisible()

    // STEP 9: Verify order in database (via API)
    const orderNumber = await page.locator('.order-number').textContent()
    const response = await page.request.get(`/api/orders/${orderNumber}`)
    const order = await response.json()

    expect(order.status).toBe('confirmed')
    expect(order.userEmail).toBe('e2e@example.com')
  })
})
```

## Performance Testing

```python
import pytest
import time

@pytest.mark.integration
def test_api_response_time(client):
    """Test API response time meets performance requirements."""
    start_time = time.time()

    response = client.get("/api/items?page=1&size=100")

    elapsed = time.time() - start_time

    assert response.status_code == 200
    assert elapsed < 0.5  # Response must be under 500ms


@pytest.mark.integration
def test_concurrent_requests(client, auth_headers):
    """Test handling of concurrent requests."""
    import concurrent.futures

    def make_request():
        return client.get("/api/items", headers=auth_headers)

    # Execute 50 concurrent requests
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(make_request) for _ in range(50)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]

    # All requests should succeed
    assert all(r.status_code == 200 for r in results)
```

## Best Practices

### ✅ DO

- Test complete user workflows end-to-end
- Use real database instances (separate test DB)
- Verify database state after operations
- Test error handling and edge cases
- Include performance assertions
- Test concurrent operations
- Clean up test data after each test

### ❌ DON'T

- Mix integration and unit tests
- Skip database cleanup
- Use production data or services
- Ignore slow test warnings
- Test every edge case in integration tests (use unit tests)

---

Integration tests verify that components work together correctly in realistic scenarios.
