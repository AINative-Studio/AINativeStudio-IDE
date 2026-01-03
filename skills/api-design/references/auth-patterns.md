# Authentication Patterns

## JWT Authentication

```python
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

# ============================================================================
# Configuration
# ============================================================================

SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# ============================================================================
# Models
# ============================================================================

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class TokenPayload(BaseModel):
    sub: str  # User ID
    exp: datetime
    iat: datetime
    type: str  # "access" or "refresh"

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    user: UserResponse
    token: Token

# ============================================================================
# Password Hashing
# ============================================================================

def hash_password(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

# ============================================================================
# Token Creation
# ============================================================================

def create_access_token(user_id: str) -> str:
    """Create JWT access token"""
    now = datetime.utcnow()
    expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub": user_id,
        "exp": expire,
        "iat": now,
        "type": "access"
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    """Create JWT refresh token"""
    now = datetime.utcnow()
    expire = now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    payload = {
        "sub": user_id,
        "exp": expire,
        "iat": now,
        "type": "refresh"
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def create_token_pair(user_id: str) -> Token:
    """Create access and refresh token pair"""
    access_token = create_access_token(user_id)
    refresh_token = create_refresh_token(user_id)

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

# ============================================================================
# Token Verification
# ============================================================================

def verify_token(token: str, token_type: str = "access") -> str:
    """Verify JWT token and return user ID"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        user_id: str = payload.get("sub")
        exp: datetime = datetime.fromtimestamp(payload.get("exp"))
        token_type_claim: str = payload.get("type")

        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user ID"
            )

        if token_type_claim != token_type:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token type: expected {token_type}"
            )

        if datetime.utcnow() > exp:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )

        return user_id

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

# ============================================================================
# Dependencies
# ============================================================================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> UserResponse:
    """Get current authenticated user"""
    token = credentials.credentials
    user_id = verify_token(token, token_type="access")

    user = await find_user(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )

    return user

async def get_current_active_admin(
    current_user: UserResponse = Depends(get_current_user)
) -> UserResponse:
    """Get current user and verify admin role"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

# ============================================================================
# Auth Endpoints
# ============================================================================

from fastapi import APIRouter

auth_router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

@auth_router.post("/register", status_code=201, response_model=LoginResponse)
async def register(user_data: UserCreate):
    """Register a new user"""
    # Check if user exists
    if await user_exists_by_email(user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Hash password
    hashed_password = hash_password(user_data.password)

    # Create user
    user = await create_user_db(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed_password
    )

    # Generate tokens
    token = create_token_pair(user.id)

    return LoginResponse(user=user, token=token)

@auth_router.post("/login", response_model=LoginResponse)
async def login(credentials: LoginRequest):
    """Login with email and password"""
    # Find user by email
    user = await find_user_by_email(credentials.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Verify password
    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )

    # Generate tokens
    token = create_token_pair(user.id)

    return LoginResponse(user=user, token=token)

@auth_router.post("/refresh", response_model=Token)
async def refresh_token(refresh_token: str):
    """Refresh access token using refresh token"""
    user_id = verify_token(refresh_token, token_type="refresh")

    # Verify user still exists and is active
    user = await find_user(user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    # Generate new token pair
    return create_token_pair(user_id)

@auth_router.post("/logout", status_code=204)
async def logout(current_user: UserResponse = Depends(get_current_user)):
    """Logout current user (client should discard tokens)"""
    # Optionally: Add token to blacklist
    # await blacklist_token(token)
    return None

@auth_router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: UserResponse = Depends(get_current_user)
):
    """Get current user information"""
    return current_user

@auth_router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    current_user: UserResponse = Depends(get_current_user)
):
    """Update current user profile"""
    updated_user = await update_user_db(current_user.id, user_update)
    return updated_user

@auth_router.post("/change-password", status_code=204)
async def change_password(
    current_password: str,
    new_password: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """Change user password"""
    # Verify current password
    user = await find_user(current_user.id)
    if not verify_password(current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # Validate new password strength
    if len(new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters"
        )

    # Hash and update password
    hashed_password = hash_password(new_password)
    await update_user_password(current_user.id, hashed_password)

    return None
```

## API Key Authentication

```python
from fastapi import Security, HTTPException, status
from fastapi.security import APIKeyHeader

API_KEY_HEADER = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_HEADER, auto_error=False)

async def verify_api_key(api_key: str = Security(api_key_header)) -> dict:
    """Verify API key and return associated data"""
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key required"
        )

    # Look up API key in database
    key_data = await find_api_key(api_key)
    if not key_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )

    # Check if key is active
    if not key_data.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="API key is disabled"
        )

    # Check expiration
    if key_data.expires_at and datetime.utcnow() > key_data.expires_at:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key has expired"
        )

    # Update last used timestamp
    await update_api_key_last_used(api_key)

    return key_data

# Usage in endpoint
@router.get("/api/v1/data")
async def get_data(api_key_data: dict = Depends(verify_api_key)):
    """Endpoint protected by API key"""
    return {"data": "sensitive information"}
```

## Role-Based Access Control (RBAC)

```python
from enum import Enum
from typing import List

class Role(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    USER = "user"
    GUEST = "guest"

class Permission(str, Enum):
    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    ADMIN = "admin"

ROLE_PERMISSIONS = {
    Role.ADMIN: [Permission.READ, Permission.WRITE, Permission.DELETE, Permission.ADMIN],
    Role.MANAGER: [Permission.READ, Permission.WRITE, Permission.DELETE],
    Role.USER: [Permission.READ, Permission.WRITE],
    Role.GUEST: [Permission.READ]
}

def has_permission(user_role: Role, required_permission: Permission) -> bool:
    """Check if role has required permission"""
    return required_permission in ROLE_PERMISSIONS.get(user_role, [])

def require_permission(permission: Permission):
    """Dependency to check user has required permission"""
    async def check_permission(current_user: UserResponse = Depends(get_current_user)):
        if not has_permission(current_user.role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission.value} required"
            )
        return current_user
    return check_permission

def require_role(allowed_roles: List[Role]):
    """Dependency to check user has one of allowed roles"""
    async def check_role(current_user: UserResponse = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: role must be one of {[r.value for r in allowed_roles]}"
            )
        return current_user
    return check_role

# Usage in endpoints
@router.delete("/items/{item_id}")
async def delete_item(
    item_id: str,
    current_user: UserResponse = Depends(require_permission(Permission.DELETE))
):
    """Delete item (requires DELETE permission)"""
    await delete_item_db(item_id)
    return {"deleted": True}

@router.get("/admin/stats")
async def get_admin_stats(
    current_user: UserResponse = Depends(require_role([Role.ADMIN]))
):
    """Admin-only endpoint"""
    return await get_system_stats()
```

## OAuth2 Password Flow

```python
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")

@auth_router.post("/token", response_model=Token)
async def login_oauth2(form_data: OAuth2PasswordRequestForm = Depends()):
    """OAuth2 compatible token endpoint"""
    user = await find_user_by_email(form_data.username)  # OAuth2 uses 'username' field

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return create_token_pair(user.id)

async def get_current_user_oauth2(token: str = Depends(oauth2_scheme)) -> UserResponse:
    """Get current user from OAuth2 token"""
    user_id = verify_token(token)
    user = await find_user(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user
```
