# API Design Skill

Expert FastAPI backend architect specializing in RESTful API design, Pydantic data validation, and scalable backend systems.

## Installation

```bash
npm install @ainative/skill-api-design
```

## Usage

Activate this skill when:
- Designing new REST APIs or endpoints
- Creating Pydantic models and schemas
- Implementing authentication (JWT, OAuth)
- Setting up error handling and validation
- Structuring FastAPI applications
- Working with OpenAPI/Swagger documentation

## What's Included

### Core Skill File
- `SKILL.md` - Complete FastAPI and Pydantic expertise

### Reference Documentation

#### 1. Endpoint Patterns (`references/endpoint-patterns.md`)
- Complete CRUD implementation examples
- List endpoints with pagination and filtering
- Nested resource patterns
- Bulk operations
- Search and filtering
- Custom actions (publish, archive, etc.)

#### 2. Pydantic Models (`references/pydantic-models.md`)
- Base model architecture (Create, Update, Response)
- Advanced validation patterns
- Nested models and relationships
- Dynamic models with field validation
- Model inheritance patterns
- Computed fields and properties

#### 3. Error Handling (`references/error-handling.md`)
- Standard error response models
- Custom exception classes (ValidationError, NotFoundError, etc.)
- Global exception handlers
- Database error handling with retries
- Validation helper functions

#### 4. Authentication Patterns (`references/auth-patterns.md`)
- Complete JWT authentication implementation
- Password hashing with bcrypt
- Token creation and verification
- Protected endpoint dependencies
- API key authentication
- Role-based access control (RBAC)
- OAuth2 password flow

## Quick Examples

### Complete API Endpoint

```python
from fastapi import APIRouter, HTTPException, Depends

router = APIRouter(prefix="/api/v1/users", tags=["users"])

@router.post("/", status_code=201, response_model=UserResponse)
async def create_user(
    user: UserCreate,
    current_user=Depends(get_current_admin)
):
    """Create a new user (admin only)"""
    if await user_exists(user.email):
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = hash_password(user.password)
    new_user = await create_user_db(user, hashed_password)
    return new_user
```

### Pydantic Model with Validation

```python
from pydantic import BaseModel, Field, validator

class UserCreate(BaseModel):
    email: str = Field(..., pattern=r"^[\w\.-]+@[\w\.-]+\.\w+$")
    password: str = Field(..., min_length=8)
    age: int = Field(..., ge=13, le=120)

    @validator('password')
    def password_strength(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain uppercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain a digit')
        return v
```

### JWT Authentication

```python
from fastapi import Depends
from fastapi.security import HTTPBearer

security = HTTPBearer()

async def get_current_user(credentials=Depends(security)):
    token = credentials.credentials
    payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    user_id = payload.get("sub")
    return await find_user(user_id)

@router.get("/me", response_model=UserResponse)
async def get_profile(current_user=Depends(get_current_user)):
    return current_user
```

## Key Principles

1. **RESTful Design** - Semantic HTTP methods, resource-oriented URLs
2. **Pydantic First** - Define schemas before endpoints
3. **Security by Default** - Always validate input, use dependency injection
4. **Developer Experience** - Clear structure, comprehensive docs

## Best Practices

- Use `Field()` for validation and documentation
- Separate Create/Update/Response models
- Return appropriate HTTP status codes
- Implement comprehensive error handling
- Use dependency injection for auth and database
- Document with docstrings (becomes OpenAPI docs)
- Version your API (`/api/v1/`)
- Use async/await for I/O operations

## Requirements

```python
fastapi>=0.104.0
pydantic>=2.0.0
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
python-multipart>=0.0.6
```

## OpenAPI Integration

All examples automatically generate:
- Interactive Swagger UI at `/docs`
- ReDoc documentation at `/redoc`
- OpenAPI schema at `/openapi.json`

## Testing Examples

```python
from fastapi.testclient import TestClient

client = TestClient(app)

def test_create_user():
    response = client.post("/api/v1/users", json={
        "email": "test@example.com",
        "password": "SecurePass123!",
        "age": 25
    })
    assert response.status_code == 201
    assert response.json()["email"] == "test@example.com"
```

## License

MIT

## Support

For issues and questions, please visit the [GitHub repository](https://github.com/ainative/skills).
