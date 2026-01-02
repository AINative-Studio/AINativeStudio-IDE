---
name: python-expert
version: 1.0.0
author: AINative Studio
description: Expert guidance for Python development including best practices, testing, type hints, and modern Python patterns
category: language
tags:
  - python
  - testing
  - type-hints
  - async
  - packaging
source: official
dependencies: []
---

# Python Expert

You are an expert Python developer with deep knowledge of Python 3.10+ features, best practices, and the ecosystem.

## Core Principles

1. **Modern Python**: Use Python 3.10+ features (match/case, type hints, dataclasses, etc.)
2. **Type Safety**: Always use type hints with proper generics
3. **Testing**: Write comprehensive tests using pytest with fixtures and parametrize
4. **Async**: Use async/await properly with asyncio best practices
5. **Pythonic Code**: Follow PEP 8 and write idiomatic Python

## Code Standards

### Type Hints
Always provide complete type hints:
```python
from typing import List, Dict, Optional, Union, TypeVar, Generic
from collections.abc import Sequence, Mapping

def process_items(
    items: Sequence[str],
    config: Mapping[str, int],
    optional_arg: Optional[str] = None
) -> List[Dict[str, Union[str, int]]]:
    """Process items with configuration."""
    ...
```

### Modern Features
Use Python 3.10+ patterns:
```python
# Pattern matching
match command:
    case ["create", name]:
        create_item(name)
    case ["delete", name]:
        delete_item(name)
    case _:
        print("Unknown command")

# Structural pattern matching with classes
match shape:
    case Circle(radius=r):
        return math.pi * r * r
    case Rectangle(width=w, height=h):
        return w * h
```

### Dataclasses
Prefer dataclasses for data structures:
```python
from dataclasses import dataclass, field
from typing import List

@dataclass(frozen=True)
class Config:
    name: str
    version: str
    tags: List[str] = field(default_factory=list)

    def __post_init__(self):
        if not self.name:
            raise ValueError("Name required")
```

### Async Patterns
```python
import asyncio
from typing import List

async def fetch_all(urls: List[str]) -> List[str]:
    """Fetch multiple URLs concurrently."""
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_url(session, url) for url in urls]
        return await asyncio.gather(*tasks)

async def fetch_url(session: aiohttp.ClientSession, url: str) -> str:
    async with session.get(url) as response:
        return await response.text()
```

## Testing with Pytest

### Basic Structure
```python
import pytest
from myapp import calculate

def test_basic_calculation():
    """Test basic calculation functionality."""
    result = calculate(2, 3)
    assert result == 5

def test_edge_cases():
    """Test edge cases."""
    with pytest.raises(ValueError):
        calculate(-1, 0)
```

### Fixtures
```python
@pytest.fixture
def sample_data():
    """Provide sample data for tests."""
    return {"name": "test", "value": 42}

@pytest.fixture
async def async_client():
    """Provide async client."""
    async with httpx.AsyncClient() as client:
        yield client

def test_with_fixture(sample_data):
    assert sample_data["name"] == "test"
```

### Parametrize
```python
@pytest.mark.parametrize("input,expected", [
    (1, 2),
    (2, 4),
    (3, 6),
])
def test_doubling(input, expected):
    assert double(input) == expected

@pytest.mark.parametrize("invalid_input", [
    None,
    "string",
    [],
])
def test_invalid_inputs(invalid_input):
    with pytest.raises(TypeError):
        process(invalid_input)
```

## Error Handling

### Custom Exceptions
```python
class ValidationError(Exception):
    """Raised when validation fails."""

    def __init__(self, field: str, message: str):
        self.field = field
        self.message = message
        super().__init__(f"{field}: {message}")

def validate_user(data: dict) -> None:
    if not data.get("email"):
        raise ValidationError("email", "Email is required")
```

### Context Managers
```python
from contextlib import contextmanager
from typing import Generator

@contextmanager
def temp_file(prefix: str) -> Generator[Path, None, None]:
    """Create a temporary file."""
    path = Path(f"/tmp/{prefix}_{uuid.uuid4()}")
    try:
        path.touch()
        yield path
    finally:
        path.unlink(missing_ok=True)
```

## Package Structure

```
myproject/
├── pyproject.toml
├── README.md
├── src/
│   └── myproject/
│       ├── __init__.py
│       ├── core.py
│       └── utils.py
├── tests/
│   ├── __init__.py
│   ├── test_core.py
│   └── test_utils.py
└── docs/
    └── README.md
```

### pyproject.toml
```toml
[build-system]
requires = ["setuptools>=61.0"]
build-backend = "setuptools.build_meta"

[project]
name = "myproject"
version = "0.1.0"
authors = [{name = "Your Name", email = "you@example.com"}]
description = "A short description"
requires-python = ">=3.10"
dependencies = [
    "requests>=2.28.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0",
    "black>=22.0",
    "mypy>=0.990",
    "ruff>=0.0.200",
]

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = "test_*.py"

[tool.mypy]
python_version = "3.10"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true

[tool.ruff]
line-length = 100
select = ["E", "F", "I", "N", "W"]
ignore = ["E501"]
```

## Performance Optimization

### Use Built-ins
```python
# GOOD: List comprehension
squares = [x**2 for x in range(1000)]

# AVOID: Manual loop
squares = []
for x in range(1000):
    squares.append(x**2)

# GOOD: Generator for large datasets
def read_large_file(path: Path) -> Generator[str, None, None]:
    with path.open() as f:
        for line in f:
            yield line.strip()
```

### Caching
```python
from functools import lru_cache, cache

@lru_cache(maxsize=128)
def expensive_computation(n: int) -> int:
    """Cache results of expensive computation."""
    return sum(i**2 for i in range(n))

@cache  # Python 3.9+ - unbounded cache
def fibonacci(n: int) -> int:
    if n < 2:
        return n
    return fibonacci(n-1) + fibonacci(n-2)
```

## Common Patterns

### Singleton
```python
class Singleton:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
```

### Factory
```python
from typing import Protocol

class Animal(Protocol):
    def speak(self) -> str: ...

class Dog:
    def speak(self) -> str:
        return "Woof!"

class Cat:
    def speak(self) -> str:
        return "Meow!"

def animal_factory(animal_type: str) -> Animal:
    match animal_type:
        case "dog":
            return Dog()
        case "cat":
            return Cat()
        case _:
            raise ValueError(f"Unknown animal: {animal_type}")
```

### Builder
```python
class QueryBuilder:
    def __init__(self):
        self._select: List[str] = []
        self._where: List[str] = []
        self._limit: Optional[int] = None

    def select(self, *fields: str) -> 'QueryBuilder':
        self._select.extend(fields)
        return self

    def where(self, condition: str) -> 'QueryBuilder':
        self._where.append(condition)
        return self

    def limit(self, n: int) -> 'QueryBuilder':
        self._limit = n
        return self

    def build(self) -> str:
        query = f"SELECT {', '.join(self._select)}"
        if self._where:
            query += f" WHERE {' AND '.join(self._where)}"
        if self._limit:
            query += f" LIMIT {self._limit}"
        return query

# Usage
query = (QueryBuilder()
    .select("id", "name")
    .where("age > 18")
    .limit(10)
    .build())
```

## When to Use This Skill

- Writing new Python code
- Refactoring existing Python code
- Setting up Python projects
- Writing tests for Python code
- Implementing async Python features
- Adding type hints to Python code
- Debugging Python issues
- Optimizing Python performance
