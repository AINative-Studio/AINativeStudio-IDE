# Code Intelligence Features

AINative Studio's Code Intelligence provides powerful code analysis capabilities powered by the managed API. Analyze complexity, find symbols, get function signatures, and more - all without leaving your IDE.

## Table of Contents

1. [What is Code Intelligence?](#what-is-code-intelligence)
2. [Supported Languages](#supported-languages)
3. [How to Use Code Intelligence](#how-to-use-code-intelligence)
4. [Features](#features)
5. [Best Practices](#best-practices)
6. [FAQ](#faq)

---

## What is Code Intelligence?

Code Intelligence is an automated code analysis tool that uses AI to understand your code structure, complexity, and relationships. It provides insights that help you:

- **Identify Complex Code**: Find functions with high cyclomatic complexity
- **Understand Code Structure**: Parse AST to see top-level symbols
- **Navigate Codebases**: Find symbol definitions and references
- **Improve Code Quality**: Get actionable recommendations
- **Document Code**: Generate function signatures with type annotations

### How It Works

Code Intelligence uses the `code_intelligence` tool in the managed chat API:

1. You request an analysis (complexity, symbols, etc.)
2. The AI model receives your code and the analysis request
3. The tool parses your code using language-specific parsers
4. Results are returned in structured format
5. You get actionable insights in seconds

---

## Supported Languages

Code Intelligence currently supports:

| Language | Version | Features Supported |
|----------|---------|-------------------|
| **Python** | 3.8+ | All features |
| **JavaScript** | ES6+ | All features |
| **TypeScript** | 4.0+ | All features |

**Upcoming Support** (Phase 3):
- Go
- Rust
- Java
- C/C++

---

## How to Use Code Intelligence

### Method 1: Chat Interface (Recommended)

Simply ask the AI to analyze your code in natural language:

```
User: Analyze the complexity of this Python function:

def process_data(items, threshold=10):
    results = []
    for item in items:
        if item.value > threshold:
            if item.is_valid():
                results.append(item.transform())
    return results

AI: This function has moderate complexity:

Complexity Metrics:
- Cyclomatic Complexity: 3 (2 nested if statements + base)
- Cognitive Complexity: 4 (nested conditions increase difficulty)
- Maintainability Index: 72/100 (Good)
- Rank: MEDIUM

Recommendations:
- Consider extracting the filtering logic into a separate function
- The nested conditions could be simplified with early returns
```

### Method 2: Programmatic Usage (Advanced)

For extension developers or advanced users:

```typescript
import { ICodeIntelligenceService } from 'vs/workbench/contrib/ainative/common/codeIntelligenceService';

// In your extension code
const codeIntelligence = accessor.get(ICodeIntelligenceService);

// Analyze complexity
const result = await codeIntelligence.analyzeComplexity(code, 'python');
console.log(`Average complexity: ${result.averageComplexity}`);
```

---

## Features

### 1. Complexity Analysis

**What it does**: Calculates cyclomatic complexity, cognitive complexity, and maintainability for all functions.

**Use case**: Identify code that needs refactoring before it becomes technical debt.

**Example Request**:

```
Analyze the complexity of this code:

function calculateDiscount(price, customer) {
    if (customer.isPremium) {
        if (price > 100) {
            return price * 0.2;
        }
        return price * 0.1;
    }
    if (customer.isNew) {
        return price * 0.05;
    }
    return 0;
}
```

**Example Response**:

```
Function: calculateDiscount
- Cyclomatic Complexity: 4
- Cognitive Complexity: 5
- Maintainability: 68/100 (Medium)
- Rank: MEDIUM

Complexity Breakdown:
1. Base path: +1
2. if (customer.isPremium): +1
3. if (price > 100): +1 (nested, +1 cognitive penalty)
4. if (customer.isNew): +1

Recommendations:
- Refactor nested conditions using guard clauses
- Consider using a strategy pattern for discount calculation
```

**Complexity Ranks**:

| Rank | Cyclomatic Complexity | Meaning |
|------|----------------------|---------|
| **LOW** | 1-5 | Simple, easy to test |
| **MEDIUM** | 6-10 | Moderate, consider refactoring |
| **HIGH** | 11-20 | Complex, hard to maintain |
| **VERY_HIGH** | 21+ | Critical, refactor immediately |

### 2. AST Parsing

**What it does**: Parses code into an Abstract Syntax Tree and extracts top-level symbols.

**Use case**: Quickly understand code structure without reading the entire file.

**Example Request**:

```
Parse this Python code and show me the symbols:

class UserManager:
    def __init__(self, db):
        self.db = db

    def create_user(self, name, email):
        return self.db.insert({'name': name, 'email': email})

def send_email(to, subject, body):
    pass

MAX_USERS = 1000
```

**Example Response**:

```
Symbols Found: 3

1. Class: UserManager (line 1)
   Methods:
   - __init__ (line 2)
   - create_user (line 5)

2. Function: send_email (line 8)
   Parameters: to, subject, body

3. Variable: MAX_USERS (line 11)
   Value: 1000
```

### 3. Symbol Search

**What it does**: Finds the definition of a specific symbol (function, class, variable).

**Use case**: Quickly locate where a symbol is defined in a large file.

**Example Request**:

```
Find the definition of 'calculateTax' in this code:

[large code file]
```

**Example Response**:

```
Symbol Found: calculateTax

Location: Line 47, Column 10
Type: Function
Signature: calculateTax(income: number, deductions: number): number

Definition:
```typescript
function calculateTax(income: number, deductions: number): number {
    const taxableIncome = income - deductions;
    return taxableIncome * 0.25;
}
```
```

### 4. Find References

**What it does**: Finds all locations where a symbol is used (calls, accesses, assignments).

**Use case**: Understand the impact of changing a function or variable.

**Example Request**:

```
Find all references to 'user_id' in this code:

def get_user(user_id):
    return db.query(User).filter_by(id=user_id).first()

def update_user(user_id, data):
    user = get_user(user_id)
    user.update(data)
    return user
```

**Example Response**:

```
References to 'user_id': 4 found

1. Line 1, Column 13: Parameter definition
   def get_user(user_id):

2. Line 2, Column 35: Reference in filter_by
   return db.query(User).filter_by(id=user_id).first()

3. Line 4, Column 16: Parameter definition
   def update_user(user_id, data):

4. Line 5, Column 18: Argument to get_user
   user = get_user(user_id)

Usage Summary:
- Parameter: 2 times
- Argument: 1 time
- Filter condition: 1 time
```

### 5. Function Signatures

**What it does**: Extracts function signatures with parameter types and return types.

**Use case**: Generate documentation or understand function contracts.

**Example Request**:

```
Get the signature of the 'process_payment' function:

def process_payment(
    amount: float,
    currency: str = "USD",
    provider: Optional[PaymentProvider] = None
) -> PaymentResult:
    """Process a payment transaction."""
    if provider is None:
        provider = default_provider()
    return provider.charge(amount, currency)
```

**Example Response**:

```
Function: process_payment

Signature:
process_payment(amount: float, currency: str = "USD", provider: Optional[PaymentProvider] = None) -> PaymentResult

Parameters:
1. amount: float (required)
2. currency: str (optional, default: "USD")
3. provider: Optional[PaymentProvider] (optional, default: None)

Return Type: PaymentResult

Docstring:
"Process a payment transaction."
```

### 6. Import Analysis

**What it does**: Extracts all import statements from source code.

**Use case**: Understand dependencies or detect unused imports.

**Example Request**:

```
Show me all imports in this Python file:

import os
import sys
from typing import List, Optional
from datetime import datetime
import numpy as np
from .models import User, Post
```

**Example Response**:

```
Imports Found: 6

Standard Library:
1. os
2. sys
3. typing.List
4. typing.Optional
5. datetime.datetime

Third-Party:
6. numpy (aliased as 'np')

Local:
7. .models.User
8. .models.Post

Summary:
- Standard library: 5
- Third-party: 1
- Local modules: 2
```

---

## Best Practices

### 1. Analyzing Large Files

For files over 500 lines, consider:

- **Analyzing specific functions**: Instead of the entire file, paste just the function
- **Breaking into chunks**: Analyze sections separately
- **Using Find Symbol**: Quickly locate specific definitions

### 2. Optimizing Credit Usage

Code Intelligence uses credits based on code size:

- **Short code snippets** (< 100 lines): ~10-20 credits
- **Medium files** (100-500 lines): ~50-100 credits
- **Large files** (500+ lines): ~200-500 credits

**Tip**: Analyze only what you need. Don't paste entire files when you only care about one function.

### 3. Interpreting Complexity Metrics

**Cyclomatic Complexity**:
- Counts decision points (if, while, for, case)
- Good indicator of testing burden

**Cognitive Complexity**:
- Measures how hard code is to understand
- Accounts for nesting and control flow

**Maintainability Index**:
- 0-25: Very Low (critical issues)
- 26-50: Low (needs refactoring)
- 51-75: Medium (acceptable)
- 76-100: High (well-maintained)

### 4. Handling Unsupported Languages

If you need analysis for unsupported languages:

1. **Use general chat**: Describe your code and ask for insights
2. **Manual review**: The AI can still provide general advice
3. **Wait for updates**: Check release notes for new language support

---

## FAQ

**Q: Does Code Intelligence execute my code?**

A: No. Code Intelligence only performs static analysis. Your code is never executed.

**Q: Can I analyze code with syntax errors?**

A: Partial support. The AI will attempt to parse incomplete code but may return limited results.

**Q: How accurate is complexity analysis?**

A: Very accurate. We use industry-standard parsers and well-established complexity metrics.

**Q: Can I analyze code from multiple files?**

A: Currently, each request analyzes a single file. For multi-file analysis, make separate requests.

**Q: Does Code Intelligence work offline?**

A: No. Code Intelligence requires an internet connection to the managed API.

**Q: What about code privacy?**

A: Your code is transmitted securely (TLS encryption) and is not stored or used for training. See our [Privacy Policy](https://ainative.studio/privacy).

**Q: Can I integrate Code Intelligence into my CI/CD pipeline?**

A: Not currently. Code Intelligence is designed for interactive IDE usage. CI/CD integration is planned for future releases.

**Q: How do I report inaccurate results?**

A: Please submit an issue on [GitHub](https://github.com/ainative-studio/issues) with the code snippet and expected vs. actual results.

---

## Related Guides

- [Getting Started](./getting-started.md) - Set up your account
- [Usage & Credits](./usage-and-credits.md) - Track your code intelligence usage
- [Settings](./settings.md) - Configure tool behavior
- [Troubleshooting](./troubleshooting.md) - Fix common issues

---

**Ready to fetch documentation?** Learn how to use [Web Fetch](./web-fetch.md) to get documentation directly in your chat!
