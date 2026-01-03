# RESTful Endpoint Patterns

## Complete CRUD Implementation

```python
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/api/v1/items", tags=["items"])

# ============================================================================
# LIST - GET /api/v1/items
# ============================================================================

@router.get("/", response_model=List[ItemResponse])
async def list_items(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Max items to return"),
    status: Optional[str] = Query(None, description="Filter by status"),
    sort_by: str = Query("created_at", description="Field to sort by"),
    sort_desc: bool = Query(True, description="Sort descending"),
    current_user=Depends(get_current_user)
):
    """
    List items with pagination and filtering.

    - **skip**: Number of items to skip (for pagination)
    - **limit**: Maximum items to return (1-1000)
    - **status**: Filter by status (optional)
    - **sort_by**: Field to sort by
    - **sort_desc**: Sort in descending order
    """
    filters = {}
    if status:
        filters["status"] = status

    items = await get_items(
        skip=skip,
        limit=limit,
        filters=filters,
        sort_by=sort_by,
        sort_desc=sort_desc
    )
    return items

# ============================================================================
# GET - GET /api/v1/items/{item_id}
# ============================================================================

@router.get("/{item_id}", response_model=ItemResponse)
async def get_item(
    item_id: str,
    current_user=Depends(get_current_user)
):
    """
    Get a specific item by ID.

    Returns 404 if item not found.
    """
    item = await find_item(item_id)
    if not item:
        raise HTTPException(
            status_code=404,
            detail=f"Item with id {item_id} not found"
        )

    # Check permissions
    if not can_view_item(current_user, item):
        raise HTTPException(status_code=403, detail="Permission denied")

    return item

# ============================================================================
# CREATE - POST /api/v1/items
# ============================================================================

@router.post("/", status_code=201, response_model=ItemResponse)
async def create_item(
    item: ItemCreate,
    current_user=Depends(get_current_user)
):
    """
    Create a new item.

    Returns 201 Created with the new item.
    Returns 400 if validation fails.
    """
    # Business logic validation
    if await item_name_exists(item.name):
        raise HTTPException(
            status_code=400,
            detail="Item with this name already exists"
        )

    # Create item
    new_item = await create_item_db(
        item=item,
        created_by=current_user.id
    )

    # Trigger background tasks
    await notify_item_created(new_item)

    return new_item

# ============================================================================
# UPDATE - PUT /api/v1/items/{item_id}
# ============================================================================

@router.put("/{item_id}", response_model=ItemResponse)
async def update_item(
    item_id: str,
    item_update: ItemUpdate,
    current_user=Depends(get_current_user)
):
    """
    Update an existing item (full update).

    Returns 404 if item not found.
    Returns 400 if validation fails.
    """
    # Check item exists
    existing_item = await find_item(item_id)
    if not existing_item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Check permissions
    if not can_edit_item(current_user, existing_item):
        raise HTTPException(status_code=403, detail="Permission denied")

    # Update item
    updated_item = await update_item_db(item_id, item_update)

    return updated_item

# ============================================================================
# PARTIAL UPDATE - PATCH /api/v1/items/{item_id}
# ============================================================================

@router.patch("/{item_id}", response_model=ItemResponse)
async def partial_update_item(
    item_id: str,
    item_patch: ItemPatch,
    current_user=Depends(get_current_user)
):
    """
    Partially update an item (only provided fields).

    Returns 404 if item not found.
    """
    existing_item = await find_item(item_id)
    if not existing_item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Only update provided fields
    update_data = item_patch.model_dump(exclude_unset=True)

    updated_item = await patch_item_db(item_id, update_data)
    return updated_item

# ============================================================================
# DELETE - DELETE /api/v1/items/{item_id}
# ============================================================================

@router.delete("/{item_id}", status_code=204)
async def delete_item(
    item_id: str,
    current_user=Depends(get_current_user)
):
    """
    Delete an item.

    Returns 204 No Content on success.
    Returns 404 if item not found.
    """
    item = await find_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Check permissions
    if not can_delete_item(current_user, item):
        raise HTTPException(status_code=403, detail="Permission denied")

    # Soft delete or hard delete
    await delete_item_db(item_id)

    # Return 204 No Content (no response body)
```

## Nested Resource Patterns

```python
# GET /api/v1/users/{user_id}/posts
@router.get("/users/{user_id}/posts", response_model=List[PostResponse])
async def list_user_posts(
    user_id: str,
    skip: int = 0,
    limit: int = 100
):
    """Get all posts by a specific user"""
    user = await find_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    posts = await get_posts_by_user(user_id, skip=skip, limit=limit)
    return posts

# POST /api/v1/users/{user_id}/posts
@router.post("/users/{user_id}/posts", status_code=201, response_model=PostResponse)
async def create_user_post(
    user_id: str,
    post: PostCreate,
    current_user=Depends(get_current_user)
):
    """Create a new post for a user"""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Can only create posts for yourself")

    new_post = await create_post_db(user_id=user_id, post=post)
    return new_post
```

## Bulk Operations

```python
# POST /api/v1/items/bulk
@router.post("/bulk", status_code=201, response_model=BulkCreateResponse)
async def create_items_bulk(
    items: List[ItemCreate],
    current_user=Depends(get_current_user)
):
    """
    Create multiple items at once.

    Returns list of created items and any errors.
    """
    if len(items) > 100:
        raise HTTPException(
            status_code=400,
            detail="Cannot create more than 100 items at once"
        )

    results = []
    errors = []

    for idx, item in enumerate(items):
        try:
            new_item = await create_item_db(item, created_by=current_user.id)
            results.append(new_item)
        except Exception as e:
            errors.append({"index": idx, "error": str(e)})

    return {
        "created": results,
        "errors": errors,
        "total": len(items),
        "success_count": len(results),
        "error_count": len(errors)
    }

# DELETE /api/v1/items/bulk
@router.delete("/bulk", status_code=200)
async def delete_items_bulk(
    item_ids: List[str],
    current_user=Depends(get_current_user)
):
    """Delete multiple items by ID"""
    deleted_count = await delete_items_db(item_ids)
    return {"deleted": deleted_count, "requested": len(item_ids)}
```

## Search and Filtering

```python
@router.get("/search", response_model=List[ItemResponse])
async def search_items(
    q: str = Query(..., min_length=1, description="Search query"),
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    limit: int = Query(50, le=200)
):
    """
    Full-text search with filters.

    - **q**: Search query (required)
    - **category**: Filter by category
    - **min_price**: Minimum price filter
    - **max_price**: Maximum price filter
    """
    filters = build_search_filters(
        query=q,
        category=category,
        min_price=min_price,
        max_price=max_price
    )

    results = await search_items_db(filters, limit=limit)
    return results
```

## Custom Actions

```python
# POST /api/v1/items/{item_id}/publish
@router.post("/{item_id}/publish", response_model=ItemResponse)
async def publish_item(
    item_id: str,
    current_user=Depends(get_current_user)
):
    """Publish a draft item"""
    item = await find_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if item.status != "draft":
        raise HTTPException(
            status_code=400,
            detail="Only draft items can be published"
        )

    published_item = await publish_item_db(item_id)
    await notify_item_published(published_item)

    return published_item

# POST /api/v1/items/{item_id}/archive
@router.post("/{item_id}/archive", response_model=ItemResponse)
async def archive_item(item_id: str, current_user=Depends(get_current_user)):
    """Archive an item (soft delete)"""
    item = await find_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    archived_item = await archive_item_db(item_id)
    return archived_item
```
