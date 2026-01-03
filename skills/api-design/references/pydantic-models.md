# Pydantic Model Patterns

## Base Model Architecture

```python
from pydantic import BaseModel, Field, validator, root_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

# ============================================================================
# Enums for Type Safety
# ============================================================================

class ItemStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"

class ItemCategory(str, Enum):
    ELECTRONICS = "electronics"
    BOOKS = "books"
    CLOTHING = "clothing"

# ============================================================================
# Base Model (Shared Fields)
# ============================================================================

class ItemBase(BaseModel):
    """Shared fields across all Item models"""
    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Item name"
    )
    description: Optional[str] = Field(
        None,
        max_length=500,
        description="Item description"
    )
    price: float = Field(
        ...,
        gt=0,
        description="Item price (must be positive)"
    )
    category: ItemCategory = Field(
        ...,
        description="Item category"
    )
    tags: List[str] = Field(
        default_factory=list,
        max_items=10,
        description="Item tags (max 10)"
    )

    @validator('name')
    def name_must_not_be_empty(cls, v):
        """Ensure name is not just whitespace"""
        if not v.strip():
            raise ValueError('Name cannot be empty or whitespace')
        return v.strip()

    @validator('tags')
    def tags_must_be_lowercase(cls, v):
        """Convert all tags to lowercase"""
        return [tag.lower().strip() for tag in v]

    @validator('price')
    def price_must_have_max_two_decimals(cls, v):
        """Ensure price has max 2 decimal places"""
        if round(v, 2) != v:
            raise ValueError('Price must have at most 2 decimal places')
        return v

# ============================================================================
# Create Model (Input for POST)
# ============================================================================

class ItemCreate(ItemBase):
    """Model for creating new items"""
    initial_stock: int = Field(
        0,
        ge=0,
        description="Initial stock quantity"
    )

    @validator('initial_stock')
    def stock_reasonable(cls, v):
        """Validate stock is reasonable"""
        if v > 10000:
            raise ValueError('Initial stock cannot exceed 10,000')
        return v

# ============================================================================
# Update Model (Input for PUT)
# ============================================================================

class ItemUpdate(BaseModel):
    """Model for updating items (all fields optional)"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    price: Optional[float] = Field(None, gt=0)
    category: Optional[ItemCategory] = None
    tags: Optional[List[str]] = Field(None, max_items=10)
    status: Optional[ItemStatus] = None

    @validator('name')
    def name_must_not_be_empty(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Name cannot be empty or whitespace')
        return v.strip() if v else v

    @validator('tags')
    def tags_must_be_lowercase(cls, v):
        if v is not None:
            return [tag.lower().strip() for tag in v]
        return v

# ============================================================================
# Response Model (Output)
# ============================================================================

class ItemResponse(ItemBase):
    """Model for returning items (includes DB fields)"""
    id: str = Field(..., description="Unique item ID")
    status: ItemStatus = Field(default=ItemStatus.DRAFT)
    stock: int = Field(ge=0, description="Current stock quantity")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    created_by: str = Field(..., description="User ID who created the item")

    class Config:
        from_attributes = True  # Allows creation from ORM models
        json_schema_extra = {
            "example": {
                "id": "item_abc123",
                "name": "Laptop",
                "description": "High-performance laptop",
                "price": 999.99,
                "category": "electronics",
                "tags": ["computer", "portable"],
                "status": "published",
                "stock": 50,
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-15T10:30:00Z",
                "created_by": "user_xyz789"
            }
        }
```

## Advanced Validation Patterns

```python
from pydantic import BaseModel, Field, validator, root_validator
import re

class UserCreate(BaseModel):
    email: str = Field(..., description="User email address")
    username: str = Field(..., min_length=3, max_length=30)
    password: str = Field(..., min_length=8)
    password_confirm: str = Field(..., min_length=8)
    age: Optional[int] = Field(None, ge=13, le=120)
    phone: Optional[str] = None

    @validator('email')
    def email_must_be_valid(cls, v):
        """Validate email format"""
        pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
        if not re.match(pattern, v):
            raise ValueError('Invalid email format')
        return v.lower()

    @validator('username')
    def username_alphanumeric(cls, v):
        """Validate username is alphanumeric with underscores"""
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('Username must be alphanumeric with underscores')
        return v.lower()

    @validator('password')
    def password_strength(cls, v):
        """Validate password strength"""
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        return v

    @root_validator
    def passwords_match(cls, values):
        """Validate passwords match"""
        password = values.get('password')
        password_confirm = values.get('password_confirm')
        if password != password_confirm:
            raise ValueError('Passwords do not match')
        return values

    @validator('phone')
    def phone_format(cls, v):
        """Validate phone number format"""
        if v is None:
            return v
        # Remove non-digits
        digits = re.sub(r'\D', '', v)
        if len(digits) not in [10, 11]:
            raise ValueError('Phone number must be 10 or 11 digits')
        return digits

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "username": "john_doe",
                "password": "SecurePass123!",
                "password_confirm": "SecurePass123!",
                "age": 25,
                "phone": "555-123-4567"
            }
        }
```

## Nested Models

```python
from typing import List

class Address(BaseModel):
    """Nested address model"""
    street: str = Field(..., min_length=1)
    city: str = Field(..., min_length=1)
    state: str = Field(..., min_length=2, max_length=2)
    zip_code: str = Field(..., pattern=r'^\d{5}(-\d{4})?$')
    country: str = Field(default="US")

    @validator('state')
    def state_uppercase(cls, v):
        return v.upper()

class OrderItem(BaseModel):
    """Individual order item"""
    item_id: str
    quantity: int = Field(..., gt=0)
    price: float = Field(..., gt=0)

    @property
    def subtotal(self) -> float:
        return self.quantity * self.price

class OrderCreate(BaseModel):
    """Complete order with nested models"""
    items: List[OrderItem] = Field(..., min_items=1, max_items=50)
    shipping_address: Address
    billing_address: Optional[Address] = None
    notes: Optional[str] = Field(None, max_length=500)

    @root_validator
    def set_billing_address(cls, values):
        """Use shipping address as billing if not provided"""
        if values.get('billing_address') is None:
            values['billing_address'] = values.get('shipping_address')
        return values

    @property
    def total(self) -> float:
        """Calculate order total"""
        return sum(item.subtotal for item in self.items)

class OrderResponse(OrderCreate):
    """Order response with computed fields"""
    id: str
    status: str
    total_amount: float
    created_at: datetime

    class Config:
        from_attributes = True
```

## Dynamic Models with Field Validation

```python
from pydantic import BaseModel, Field, validator
from typing import Any, Dict

class DynamicConfig(BaseModel):
    """Model with dynamic configuration"""
    config_type: str
    settings: Dict[str, Any] = Field(default_factory=dict)

    @validator('settings')
    def validate_settings(cls, v, values):
        """Validate settings based on config_type"""
        config_type = values.get('config_type')

        if config_type == 'email':
            required_fields = ['smtp_host', 'smtp_port', 'from_address']
            for field in required_fields:
                if field not in v:
                    raise ValueError(f'Missing required field: {field}')

        elif config_type == 'database':
            required_fields = ['host', 'port', 'database', 'username']
            for field in required_fields:
                if field not in v:
                    raise ValueError(f'Missing required field: {field}')

        return v
```

## Model Inheritance

```python
class BaseEntity(BaseModel):
    """Base model for all entities"""
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AuditedEntity(BaseEntity):
    """Entity with audit fields"""
    created_by: str
    updated_by: str
    version: int = Field(default=1, ge=1)

class SoftDeletableEntity(AuditedEntity):
    """Entity that supports soft deletion"""
    deleted_at: Optional[datetime] = None
    deleted_by: Optional[str] = None
    is_deleted: bool = Field(default=False)

class Item(SoftDeletableEntity):
    """Concrete item model inheriting all audit capabilities"""
    name: str
    price: float
    status: ItemStatus
```

## Computed Fields and Properties

```python
from pydantic import computed_field

class Product(BaseModel):
    name: str
    base_price: float
    tax_rate: float = Field(default=0.08, ge=0, le=1)
    discount: float = Field(default=0.0, ge=0, le=1)

    @computed_field
    @property
    def tax_amount(self) -> float:
        """Calculate tax amount"""
        return round(self.base_price * self.tax_rate, 2)

    @computed_field
    @property
    def discount_amount(self) -> float:
        """Calculate discount amount"""
        return round(self.base_price * self.discount, 2)

    @computed_field
    @property
    def final_price(self) -> float:
        """Calculate final price with tax and discount"""
        subtotal = self.base_price - self.discount_amount
        return round(subtotal + (subtotal * self.tax_rate), 2)
```
