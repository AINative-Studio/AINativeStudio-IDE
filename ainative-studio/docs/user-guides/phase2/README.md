# AINative Studio Phase 2: Managed API Documentation

Welcome to the comprehensive user documentation for AINative Studio's Phase 2 Managed API features. This documentation covers everything you need to know about using cloud-powered AI with built-in tools, credits tracking, and advanced configuration.

## What's New in Phase 2?

Phase 2 introduces the **AINative Managed API**, a cloud-based AI service that provides:

- **Managed AI Models**: Access powerful models without managing API keys
- **Code Intelligence**: Analyze code complexity, find symbols, and get function signatures
- **Web Documentation Fetching**: Retrieve official documentation directly in your chat
- **Usage Tracking**: Monitor credits, costs, and usage patterns in real-time
- **Credits System**: Simple, predictable pricing with monthly plans
- **Advanced Tools**: Automated code analysis and documentation retrieval

---

## Documentation Structure

### 1. Getting Started Guide

**File**: [getting-started.md](./getting-started.md)

Learn the basics of the Managed API:
- What is the Managed API?
- Setting up your AINative Cloud account
- Authentication (login/logout)
- Basic chat usage with managed models
- Understanding the credits system
- Plan tiers and pricing

**Start here if you're new to AINative Managed API.**

---

### 2. Code Intelligence Features

**File**: [code-intelligence.md](./code-intelligence.md)

Master AI-powered code analysis:
- What is Code Intelligence?
- Supported languages (Python, JavaScript, TypeScript)
- Analyzing code complexity
- Parsing AST and finding symbols
- Getting function signatures
- Finding references
- Analyzing imports
- Best practices and optimization tips

**Read this to unlock powerful code analysis features.**

---

### 3. Documentation Fetching with Web Fetch

**File**: [web-fetch.md](./web-fetch.md)

Retrieve documentation from trusted sources:
- How Web Fetch works
- Whitelisted domains (60+ documentation sites)
- Fetching documentation in natural language
- Caching behavior and optimization
- Best practices for credit efficiency
- Troubleshooting fetch errors

**Read this to get documentation directly in your chat.**

---

### 4. Usage Tracking & Credits

**File**: [usage-and-credits.md](./usage-and-credits.md)

Understand and manage your credits:
- How credits work
- Viewing the Usage Dashboard
- Understanding credit costs per model
- Managing quota warnings
- Exporting usage data (CSV, JSON, PDF)
- Best practices for credit optimization
- Billing and plan upgrades

**Read this to track and optimize your AI usage.**

---

### 5. Settings & Configuration

**File**: [settings.md](./settings.md)

Customize your Managed API experience:
- Managed API settings overview
- Choosing preferred models for different features
- Configuring tool behavior (enable/disable, rate limits)
- Max iterations setting
- UI preferences (credits display, tool indicators)
- Advanced configuration (debugging, retries, caching)
- Configuration examples for different user profiles

**Read this to configure AINative Studio for your workflow.**

---

### 6. Troubleshooting Guide

**File**: [troubleshooting.md](./troubleshooting.md)

Solve common issues:
- Authentication issues (login failures, session expired)
- Low credits warnings and service pauses
- Tool execution failures (code intelligence, web fetch)
- Network and connectivity problems
- Performance issues (slow responses, high memory)
- Settings and configuration problems
- How to get help and contact support

**Read this when you encounter problems.**

---

## Quick Start

### 5-Minute Setup

1. **Create Account**:
   - Open AINative Studio
   - Command Palette > "AINative: Sign Up"
   - Fill in registration details

2. **Login**:
   - Command Palette > "AINative: Login"
   - Enter credentials

3. **Start Chatting**:
   - Open Chat (Cmd/Ctrl + L)
   - Select a managed model
   - Ask your first question!

### First Chat Example

```
User: Analyze the complexity of this Python function:

def process_data(items, threshold=10):
    results = []
    for item in items:
        if item.value > threshold:
            if item.is_valid():
                results.append(item.transform())
    return results

AI: [Uses code_intelligence tool]

This function has moderate complexity:

Complexity Metrics:
- Cyclomatic Complexity: 3 (2 nested if statements + base)
- Cognitive Complexity: 4 (nested conditions increase difficulty)
- Maintainability Index: 72/100 (Good)
- Rank: MEDIUM

Recommendations:
- Consider extracting the filtering logic into a separate function
- The nested conditions could be simplified with early returns

Credits used: 52.3
```

---

## Key Features Overview

### Managed Models

No need for API keys - we handle everything:

- **GPT-4o** (OpenAI)
- **Claude 3.5 Sonnet** (Anthropic)
- **Claude 3 Haiku** (Anthropic)
- **Llama 3.3 70B** (Meta)
- **Gemini 1.5 Pro** (Google)
- **Gemini 1.5 Flash** (Google)

### Code Intelligence Tools

- **Complexity Analysis**: Cyclomatic and cognitive complexity
- **AST Parsing**: Extract symbols and structure
- **Symbol Search**: Find function/class definitions
- **Reference Finding**: Locate all usages of a symbol
- **Signature Extraction**: Get function signatures with types
- **Import Analysis**: List all dependencies

### Web Fetch Capabilities

Access documentation from 60+ trusted sources:

- Python, JavaScript, TypeScript docs
- Framework docs (React, Django, FastAPI, etc.)
- Database docs (PostgreSQL, MongoDB, Redis)
- Cloud platform docs (AWS, GCP, Azure)
- AI/ML docs (OpenAI, Anthropic, Hugging Face)

### Usage Dashboard

Track everything:

- Credits used/remaining
- Daily, weekly, monthly breakdowns
- Usage by model
- Usage by feature
- Cost analysis
- Export to CSV/JSON/PDF

---

## Credits & Pricing

### Plan Tiers

| Tier | Monthly Credits | Cost | Best For |
|------|----------------|------|----------|
| **Free** | 1,000 | $0/month | Trial and light usage |
| **Starter** | 10,000 | $10/month | Individual developers |
| **Pro** | 50,000 | $40/month | Professional developers |
| **Team** | 200,000 | $150/month | Small teams |
| **Enterprise** | Custom | Custom | Large organizations |

### Typical Usage Examples

| Activity | Credits | Examples Per Month (10,000 credits) |
|----------|---------|-------------------------------------|
| Simple chat (Haiku) | ~2-5 | 2,000-5,000 messages |
| Complex chat (Sonnet) | ~20-50 | 200-500 messages |
| Code analysis | ~50-100 | 100-200 analyses |
| Doc fetch | ~50-500 | 20-200 fetches |

---

## Common Use Cases

### 1. Code Review

```
User: Review this code for potential issues and complexity

AI: [Uses code_intelligence]
- Cyclomatic complexity: 8 (MEDIUM)
- Found 3 potential issues:
  1. No error handling for file operations
  2. Deeply nested conditionals (3 levels)
  3. Function is doing too many things

Recommendations:
- Extract file I/O into separate function
- Add try-catch blocks
- Simplify nested conditions with guard clauses
```

### 2. Learning a New Framework

```
User: How do I create a POST endpoint in FastAPI?

AI: [Fetches from fastapi.tiangolo.com]

To create a POST endpoint in FastAPI:

1. Import FastAPI and Pydantic models
2. Define a data model using Pydantic
3. Create the endpoint with @app.post decorator

Example:
```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class Item(BaseModel):
    name: str
    price: float

@app.post("/items/")
async def create_item(item: Item):
    return {"name": item.name, "price": item.price}
```

[Complete explanation based on official documentation...]
```

### 3. Debugging Complex Code

```
User: Why is this function slow?

def find_duplicates(data):
    duplicates = []
    for i in range(len(data)):
        for j in range(i + 1, len(data)):
            if data[i] == data[j]:
                duplicates.append(data[i])
    return duplicates

AI: [Analyzes complexity]

This function has O(n²) time complexity due to nested loops:
- Outer loop: O(n)
- Inner loop: O(n)
- Total: O(n²)

For large datasets, this becomes very slow. Example:
- 100 items: ~10,000 comparisons
- 1,000 items: ~1,000,000 comparisons
- 10,000 items: ~100,000,000 comparisons

Optimized solution using a set (O(n)):
```python
def find_duplicates(data):
    seen = set()
    duplicates = set()
    for item in data:
        if item in seen:
            duplicates.add(item)
        seen.add(item)
    return list(duplicates)
```

This reduces 1,000 items from 1M comparisons to just 1,000!
```

---

## Best Practices

### 1. Credit Optimization

- **Use appropriate models**: Haiku for simple tasks, Sonnet for complex reasoning
- **Limit tool usage**: Only analyze code when necessary
- **Batch requests**: Ask multiple questions in one message
- **Monitor usage**: Check dashboard weekly

### 2. Code Intelligence

- **Analyze specific functions**: Don't paste entire files
- **Fix syntax errors first**: Parser requires valid code
- **Use supported languages**: Python, JavaScript, TypeScript only
- **Keep code under 1000 lines**: Better performance and lower cost

### 3. Web Fetch

- **Use specific URLs**: Direct links are faster than searches
- **Stick to whitelisted domains**: Official docs only
- **Leverage caching**: Ask follow-up questions to reuse fetched content
- **Check docs existence**: Ensure page exists before requesting

### 4. General Tips

- **Enable per-message cost**: Track spending in real-time
- **Set warning thresholds**: Get alerted at 80% usage
- **Export usage monthly**: Analyze patterns and optimize
- **Keep IDE updated**: Get latest features and bug fixes

---

## Supported Languages & Platforms

### Code Intelligence

- **Python** 3.8+
- **JavaScript** ES6+
- **TypeScript** 4.0+

### Documentation Sources

60+ whitelisted domains including:
- Official language docs (Python, JavaScript, Go, Rust, etc.)
- Framework docs (React, Django, FastAPI, Spring, etc.)
- Database docs (PostgreSQL, MongoDB, Redis, etc.)
- Cloud platforms (AWS, GCP, Azure)
- AI/ML platforms (OpenAI, Anthropic, Hugging Face)

See [Web Fetch Guide](./web-fetch.md#whitelisted-domains) for complete list.

---

## Getting Help

### Documentation

- [Getting Started](./getting-started.md)
- [Code Intelligence](./code-intelligence.md)
- [Web Fetch](./web-fetch.md)
- [Usage & Credits](./usage-and-credits.md)
- [Settings](./settings.md)
- [Troubleshooting](./troubleshooting.md)

### Community

- **Forum**: [community.ainative.studio](https://community.ainative.studio)
- **Discord**: [discord.gg/ainative](https://discord.gg/ainative)
- **Reddit**: [r/AINativeStudio](https://reddit.com/r/ainativestudio)
- **Twitter**: [@AINativeStudio](https://twitter.com/ainativestudio)

### Support

- **Email**: support@ainative.studio
- **GitHub Issues**: [github.com/ainative-studio/issues](https://github.com/ainative-studio/issues)
- **Status Page**: [status.ainative.studio](https://status.ainative.studio)

### Enterprise

For enterprise inquiries:
- **Sales**: sales@ainative.studio
- **Partnerships**: partnerships@ainative.studio

---

## Release Notes

### Phase 2.0 (Current)

**Released**: January 2026

**Features**:
- AINative Cloud authentication
- Managed API with 8+ models
- Code Intelligence tool
- Web Fetch tool
- Usage Dashboard with real-time tracking
- Credits system with monthly plans
- Comprehensive settings and configuration

**Improvements**:
- No API key management required
- Unified billing across all models
- Built-in tools for enhanced capabilities
- Real-time usage tracking and warnings

**Known Issues**:
- Code Intelligence limited to Python, JS, TS
- Web Fetch requires whitelisted domains only
- Maximum 10,000 character documentation pages

---

## Roadmap

### Phase 2.1 (Q1 2026)

- Additional language support (Go, Rust, Java)
- Custom model fine-tuning
- Team collaboration features
- Advanced usage analytics

### Phase 2.2 (Q2 2026)

- API access for programmatic usage
- Custom domain whitelisting for enterprises
- Multi-file code intelligence
- Workspace-level usage tracking

### Phase 3 (Q3 2026)

- Local model support with managed fallback
- Plugin system for custom tools
- CI/CD integration
- Advanced security features

---

## Contributing

We welcome contributions to improve documentation:

1. **Fork** the repository
2. **Create** a branch for your changes
3. **Submit** a pull request with:
   - Clear description of improvements
   - Screenshots if applicable
   - Updated table of contents if needed

---

## License

Documentation is licensed under [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).

Code samples in documentation are licensed under [MIT License](https://opensource.org/licenses/MIT).

---

**Ready to get started?** Begin with the [Getting Started Guide](./getting-started.md) to set up your account and start using the Managed API!
