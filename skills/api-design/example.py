"""
Example FastAPI application demonstrating patterns from api-design skill
This is a working example that can be run with: uvicorn example:app --reload
"""

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

# ============================================================================
# Models
# ============================================================================

class ItemStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"

class ItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    price: float = Field(..., gt=0)

    @validator('name')
    def name_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError('Name cannot be empty')
        return v.strip()

class ItemCreate(ItemBase):
    pass

class ItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)

class ItemResponse(ItemBase):
    id: str
    status: ItemStatus
    created_at: datetime

    class Config:
        from_attributes = True

# ============================================================================
# FastAPI App Setup
# ============================================================================

app = FastAPI(
    title="Item Management API",
    description="Example API demonstrating FastAPI best practices",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(prefix="/api/v1/items", tags=["items"])

# ============================================================================
# In-Memory Database (for demonstration)
# ============================================================================

items_db = {}
item_counter = 0

def generate_id() -> str:
    global item_counter
    item_counter += 1
    return f"item_{item_counter}"

# ============================================================================
# Endpoints
# ============================================================================

@router.get("/", response_model=List[ItemResponse])
async def list_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[ItemStatus] = None
):
    """
    List items with pagination and filtering.

    - **skip**: Number of items to skip
    - **limit**: Maximum items to return
    - **status**: Filter by status (optional)
    """
    items = list(items_db.values())

    if status:
        items = [item for item in items if item["status"] == status]

    return items[skip:skip + limit]

@router.get("/{item_id}", response_model=ItemResponse)
async def get_item(item_id: str):
    """Get item by ID"""
    if item_id not in items_db:
        raise HTTPException(status_code=404, detail="Item not found")
    return items_db[item_id]

@router.post("/", status_code=201, response_model=ItemResponse)
async def create_item(item: ItemCreate):
    """Create a new item"""
    item_id = generate_id()

    new_item = {
        "id": item_id,
        "name": item.name,
        "description": item.description,
        "price": item.price,
        "status": ItemStatus.DRAFT,
        "created_at": datetime.utcnow()
    }

    items_db[item_id] = new_item
    return new_item

@router.put("/{item_id}", response_model=ItemResponse)
async def update_item(item_id: str, item_update: ItemUpdate):
    """Update an existing item"""
    if item_id not in items_db:
        raise HTTPException(status_code=404, detail="Item not found")

    item = items_db[item_id]
    update_data = item_update.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        item[field] = value

    return item

@router.delete("/{item_id}", status_code=204)
async def delete_item(item_id: str):
    """Delete an item"""
    if item_id not in items_db:
        raise HTTPException(status_code=404, detail="Item not found")

    del items_db[item_id]

@router.post("/{item_id}/publish", response_model=ItemResponse)
async def publish_item(item_id: str):
    """Publish a draft item"""
    if item_id not in items_db:
        raise HTTPException(status_code=404, detail="Item not found")

    item = items_db[item_id]

    if item["status"] != ItemStatus.DRAFT:
        raise HTTPException(
            status_code=400,
            detail="Only draft items can be published"
        )

    item["status"] = ItemStatus.PUBLISHED
    return item

app.include_router(router)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "items_count": len(items_db)}
