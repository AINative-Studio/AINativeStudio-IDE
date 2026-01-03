# Error Handling Patterns

## Standard Error Response Model

```python
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class ErrorDetail(BaseModel):
    """Individual error detail"""
    field: Optional[str] = None
    message: str
    code: Optional[str] = None

class ErrorResponse(BaseModel):
    """Standard error response format"""
    error: str
    message: str
    details: Optional[List[ErrorDetail]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    path: Optional[str] = None
    request_id: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "error": "ValidationError",
                "message": "Request validation failed",
                "details": [
                    {
                        "field": "email",
                        "message": "Invalid email format",
                        "code": "INVALID_FORMAT"
                    }
                ],
                "timestamp": "2024-01-15T10:30:00Z",
                "path": "/api/v1/users",
                "request_id": "req_abc123"
            }
        }
```

## Custom Exception Classes

```python
from fastapi import HTTPException
from typing import Optional, Dict, Any

class APIException(HTTPException):
    """Base API exception"""
    def __init__(
        self,
        status_code: int,
        error: str,
        message: str,
        details: Optional[List[Dict[str, Any]]] = None
    ):
        self.error = error
        self.message = message
        self.details = details
        super().__init__(status_code=status_code, detail=message)

class ValidationError(APIException):
    """Validation error (400)"""
    def __init__(self, message: str, details: Optional[List[Dict]] = None):
        super().__init__(
            status_code=400,
            error="ValidationError",
            message=message,
            details=details
        )

class NotFoundError(APIException):
    """Resource not found (404)"""
    def __init__(self, resource: str, identifier: str):
        super().__init__(
            status_code=404,
            error="NotFoundError",
            message=f"{resource} with identifier '{identifier}' not found"
        )

class UnauthorizedError(APIException):
    """Unauthorized access (401)"""
    def __init__(self, message: str = "Authentication required"):
        super().__init__(
            status_code=401,
            error="UnauthorizedError",
            message=message
        )

class ForbiddenError(APIException):
    """Forbidden access (403)"""
    def __init__(self, message: str = "Permission denied"):
        super().__init__(
            status_code=403,
            error="ForbiddenError",
            message=message
        )

class ConflictError(APIException):
    """Resource conflict (409)"""
    def __init__(self, message: str):
        super().__init__(
            status_code=409,
            error="ConflictError",
            message=message
        )

class RateLimitError(APIException):
    """Rate limit exceeded (429)"""
    def __init__(self, retry_after: int):
        super().__init__(
            status_code=429,
            error="RateLimitError",
            message=f"Rate limit exceeded. Retry after {retry_after} seconds"
        )
        self.retry_after = retry_after

class InternalServerError(APIException):
    """Internal server error (500)"""
    def __init__(self, message: str = "Internal server error"):
        super().__init__(
            status_code=500,
            error="InternalServerError",
            message=message
        )
```

## Global Exception Handlers

```python
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError as PydanticValidationError
import traceback
import logging

app = FastAPI()
logger = logging.getLogger(__name__)

# ============================================================================
# Handle Pydantic Validation Errors
# ============================================================================

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors"""
    details = []
    for error in exc.errors():
        details.append({
            "field": ".".join(str(x) for x in error["loc"][1:]),  # Skip 'body'
            "message": error["msg"],
            "code": error["type"].upper()
        })

    error_response = ErrorResponse(
        error="ValidationError",
        message="Request validation failed",
        details=details,
        path=request.url.path,
        request_id=request.headers.get("X-Request-ID")
    )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_response.model_dump()
    )

# ============================================================================
# Handle Custom API Exceptions
# ============================================================================

@app.exception_handler(APIException)
async def api_exception_handler(request: Request, exc: APIException):
    """Handle custom API exceptions"""
    error_response = ErrorResponse(
        error=exc.error,
        message=exc.message,
        details=exc.details,
        path=request.url.path,
        request_id=request.headers.get("X-Request-ID")
    )

    # Log error
    logger.error(
        f"API Error: {exc.error} - {exc.message}",
        extra={
            "path": request.url.path,
            "status_code": exc.status_code,
            "request_id": request.headers.get("X-Request-ID")
        }
    )

    return JSONResponse(
        status_code=exc.status_code,
        content=error_response.model_dump()
    )

# ============================================================================
# Handle Generic HTTP Exceptions
# ============================================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle FastAPI HTTP exceptions"""
    error_response = ErrorResponse(
        error="HTTPException",
        message=exc.detail,
        path=request.url.path,
        request_id=request.headers.get("X-Request-ID")
    )

    return JSONResponse(
        status_code=exc.status_code,
        content=error_response.model_dump()
    )

# ============================================================================
# Handle Unhandled Exceptions
# ============================================================================

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions"""
    # Log full traceback
    logger.error(
        f"Unhandled exception: {str(exc)}",
        exc_info=True,
        extra={
            "path": request.url.path,
            "request_id": request.headers.get("X-Request-ID")
        }
    )

    # Don't expose internal error details in production
    error_response = ErrorResponse(
        error="InternalServerError",
        message="An unexpected error occurred",
        path=request.url.path,
        request_id=request.headers.get("X-Request-ID")
    )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_response.model_dump()
    )
```

## Using Exceptions in Endpoints

```python
from fastapi import APIRouter, Depends

router = APIRouter(prefix="/api/v1/users", tags=["users"])

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    """Get user by ID with proper error handling"""
    user = await find_user(user_id)

    if not user:
        raise NotFoundError(resource="User", identifier=user_id)

    return user

@router.post("/", status_code=201, response_model=UserResponse)
async def create_user(user: UserCreate):
    """Create user with validation"""
    # Check for duplicate email
    if await user_exists_by_email(user.email):
        raise ConflictError(message="Email already registered")

    # Check for duplicate username
    if await user_exists_by_username(user.username):
        raise ConflictError(message="Username already taken")

    # Validate age restriction
    if user.age and user.age < 13:
        raise ValidationError(
            message="User must be at least 13 years old",
            details=[{
                "field": "age",
                "message": "Must be at least 13",
                "code": "MIN_AGE_VIOLATION"
            }]
        )

    try:
        new_user = await create_user_db(user)
        return new_user
    except Exception as e:
        logger.error(f"Failed to create user: {str(e)}")
        raise InternalServerError(message="Failed to create user")

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    current_user=Depends(get_current_user)
):
    """Update user with permission check"""
    # Check user exists
    user = await find_user(user_id)
    if not user:
        raise NotFoundError(resource="User", identifier=user_id)

    # Check permissions
    if current_user.id != user_id and not current_user.is_admin:
        raise ForbiddenError(message="Can only update your own profile")

    # Check for email conflict
    if user_update.email and user_update.email != user.email:
        if await user_exists_by_email(user_update.email):
            raise ConflictError(message="Email already in use")

    updated_user = await update_user_db(user_id, user_update)
    return updated_user
```

## Database Error Handling

```python
from sqlalchemy.exc import IntegrityError, OperationalError
import asyncio

async def safe_db_operation(operation, *args, **kwargs):
    """Wrapper for database operations with error handling"""
    max_retries = 3
    retry_delay = 1

    for attempt in range(max_retries):
        try:
            return await operation(*args, **kwargs)

        except IntegrityError as e:
            # Constraint violation (unique, foreign key, etc.)
            if "unique" in str(e).lower():
                raise ConflictError(message="Resource already exists")
            elif "foreign" in str(e).lower():
                raise ValidationError(message="Invalid reference to related resource")
            else:
                raise InternalServerError(message="Database constraint violation")

        except OperationalError as e:
            # Database connection issues
            if attempt < max_retries - 1:
                logger.warning(f"Database error, retrying... (attempt {attempt + 1})")
                await asyncio.sleep(retry_delay * (attempt + 1))
                continue
            else:
                logger.error(f"Database operation failed after {max_retries} attempts")
                raise InternalServerError(message="Database temporarily unavailable")

        except Exception as e:
            logger.error(f"Unexpected database error: {str(e)}", exc_info=True)
            raise InternalServerError(message="Database operation failed")

# Usage in endpoints
@router.post("/", status_code=201)
async def create_item(item: ItemCreate):
    """Create item with database error handling"""
    try:
        return await safe_db_operation(create_item_db, item)
    except (ConflictError, ValidationError, InternalServerError):
        raise  # Re-raise our custom exceptions
```

## Validation Helper Functions

```python
def validate_id_format(id_value: str, resource: str) -> None:
    """Validate ID format"""
    if not id_value or len(id_value) < 10:
        raise ValidationError(
            message=f"Invalid {resource} ID format",
            details=[{
                "field": "id",
                "message": "ID must be at least 10 characters",
                "code": "INVALID_ID_FORMAT"
            }]
        )

def validate_date_range(start_date: datetime, end_date: datetime) -> None:
    """Validate date range"""
    if end_date < start_date:
        raise ValidationError(
            message="Invalid date range",
            details=[{
                "field": "date_range",
                "message": "End date must be after start date",
                "code": "INVALID_DATE_RANGE"
            }]
        )

def validate_permissions(user, required_permission: str) -> None:
    """Validate user has required permission"""
    if not user.has_permission(required_permission):
        raise ForbiddenError(
            message=f"Missing required permission: {required_permission}"
        )
```
