# Documentation Fetching with Web Fetch

AINative Studio's Web Fetch feature allows you to retrieve documentation from trusted sources directly in your chat, providing context-aware answers based on official documentation.

## Table of Contents

1. [What is Web Fetch?](#what-is-web-fetch)
2. [How to Fetch Documentation](#how-to-fetch-documentation)
3. [Whitelisted Domains](#whitelisted-domains)
4. [Caching Behavior](#caching-behavior)
5. [Best Practices](#best-practices)
6. [FAQ](#faq)

---

## What is Web Fetch?

Web Fetch is a tool that retrieves and processes documentation from whitelisted websites, converts HTML to markdown, and provides it to the AI for answering questions.

### Key Features

- **Trusted Sources Only**: Access to 60+ whitelisted documentation sites
- **Automatic Conversion**: HTML is converted to clean markdown
- **Smart Caching**: Frequently accessed pages are cached for 1 hour
- **Token Limits**: Content is trimmed to fit within token limits
- **Security**: Only whitelisted domains can be accessed

### How It Works

1. You ask a question about a library or framework
2. The AI determines it needs documentation
3. Web Fetch retrieves the documentation from a trusted source
4. The content is converted to markdown and provided to the AI
5. You get an answer based on official documentation

---

## How to Fetch Documentation

### Method 1: Natural Language (Recommended)

Simply ask questions that reference documentation:

```
User: How do I use useState in React?

AI: [Fetches https://react.dev/reference/react/useState]

    useState is a React Hook that lets you add state to your component.

    Syntax:
    const [state, setState] = useState(initialState)

    Parameters:
    - initialState: The value you want the state to be initially

    Returns an array with:
    - state: Current state value
    - setState: Function to update the state

    Example:
    function Counter() {
      const [count, setCount] = useState(0);

      return (
        <button onClick={() => setCount(count + 1)}>
          Count: {count}
        </button>
      );
    }
```

### Method 2: Explicit URL Request

You can directly ask the AI to fetch from a specific URL:

```
User: Fetch documentation from https://docs.python.org/3/library/asyncio.html

AI: [Fetches and summarizes the asyncio documentation]

    asyncio is a library to write concurrent code using async/await syntax.

    Key Concepts:
    - Coroutines: Declared with async def
    - Tasks: Used to schedule coroutines concurrently
    - Event Loop: Manages and executes asynchronous tasks

    [Continues with detailed information from the page]
```

### Method 3: Search and Fetch

Ask the AI to search for documentation:

```
User: Search for FastAPI authentication documentation and explain it

AI: [Searches and fetches from https://fastapi.tiangolo.com]

    FastAPI provides several authentication mechanisms:

    1. OAuth2 with Password Flow
    2. OAuth2 with JWT tokens
    3. HTTP Basic Auth
    4. API Keys

    [Provides detailed explanation based on official docs]
```

---

## Whitelisted Domains

Web Fetch only accesses documentation from trusted, whitelisted domains. This ensures security and quality of information.

### Python & Data Science

- `docs.python.org` - Official Python documentation
- `numpy.org` - NumPy documentation
- `pandas.pydata.org` - Pandas documentation
- `matplotlib.org` - Matplotlib documentation
- `scikit-learn.org` - Scikit-learn documentation
- `pytorch.org` - PyTorch documentation
- `tensorflow.org` - TensorFlow documentation
- `docs.scipy.org` - SciPy documentation
- `jupyter.org` - Jupyter documentation

### JavaScript & Web

- `developer.mozilla.org` - MDN Web Docs
- `nodejs.org` - Node.js documentation
- `docs.npmjs.com` - npm documentation
- `reactjs.org` - React (legacy)
- `react.dev` - React (current)
- `vuejs.org` - Vue.js documentation
- `angular.io` - Angular documentation
- `svelte.dev` - Svelte documentation
- `nextjs.org` - Next.js documentation
- `webpack.js.org` - Webpack documentation

### Backend Frameworks

- `docs.djangoproject.com` - Django documentation
- `flask.palletsprojects.com` - Flask documentation
- `fastapi.tiangolo.com` - FastAPI documentation
- `docs.sqlalchemy.org` - SQLAlchemy documentation
- `expressjs.com` - Express.js documentation
- `nestjs.com` - NestJS documentation
- `spring.io` - Spring Framework documentation

### Databases

- `postgresql.org` - PostgreSQL documentation
- `dev.mysql.com` - MySQL documentation
- `mongodb.com` - MongoDB documentation
- `redis.io` - Redis documentation
- `cassandra.apache.org` - Apache Cassandra documentation
- `docs.influxdata.com` - InfluxDB documentation

### DevOps & Cloud

- `docs.docker.com` - Docker documentation
- `kubernetes.io` - Kubernetes documentation
- `docs.aws.amazon.com` - AWS documentation
- `cloud.google.com` - Google Cloud documentation
- `learn.microsoft.com` - Microsoft Learn (Azure)
- `docs.github.com` - GitHub documentation
- `about.gitlab.com` - GitLab documentation
- `circleci.com` - CircleCI documentation

### CMS & Tools

- `strapi.io` - Strapi documentation
- `wordpress.org` - WordPress documentation
- `drupal.org` - Drupal documentation

### AI & ML

- `docs.anthropic.com` - Anthropic (Claude) documentation
- `platform.openai.com` - OpenAI documentation
- `docs.cohere.ai` - Cohere documentation
- `huggingface.co` - Hugging Face documentation
- `docs.langchain.com` - LangChain documentation

### Programming Languages

- `go.dev` - Go documentation
- `rust-lang.org` / `doc.rust-lang.org` - Rust documentation
- `kotlinlang.org` - Kotlin documentation
- `swift.org` - Swift documentation
- `typescriptlang.org` - TypeScript documentation

### General Resources

- `github.com` - GitHub repositories and documentation
- `gitlab.com` - GitLab repositories and documentation
- `stackoverflow.com` - Stack Overflow Q&A
- `arxiv.org` - Academic papers
- `wikipedia.org` / `en.wikipedia.org` - Wikipedia articles

**Total**: 60+ whitelisted domains

### Requesting New Domains

If you need a domain added to the whitelist:

1. Check if it's a trusted, official documentation source
2. Submit a request via [GitHub Issues](https://github.com/ainative-studio/issues)
3. Include:
   - Domain name
   - Why it should be whitelisted
   - Evidence it's an official/trusted source

---

## Caching Behavior

### How Caching Works

1. **First Request**: Documentation is fetched from the source and cached
2. **Subsequent Requests**: Cached version is used if available and not expired
3. **Cache Expiration**: Entries expire after 1 hour
4. **Cache Cleanup**: Expired entries are automatically removed every 10 minutes

### Cache Benefits

- **Faster Responses**: No need to re-fetch the same page
- **Reduced Credits**: Cached responses use fewer credits
- **Better Performance**: Less network latency

### Cache Statistics

View cache stats programmatically:

```typescript
const webFetchService = accessor.get(IWebFetchService);
const stats = webFetchService.getCacheStats();

console.log(`Cache size: ${stats.size} bytes`);
console.log(`Cached entries: ${stats.entries}`);
```

### Clearing Cache

You can manually clear the cache:

**Clear All Cache**:
```typescript
webFetchService.clearCache();
```

**Clear Specific URL**:
```typescript
webFetchService.clearCache('https://docs.python.org/3/library/asyncio.html');
```

---

## Best Practices

### 1. Be Specific with Questions

**Bad**: "How does React work?"
- Too broad, may fetch multiple pages
- High credit usage

**Good**: "How do I use useEffect in React?"
- Specific, targets one documentation page
- Lower credit usage

### 2. Verify Domain Whitelisting

Before asking for documentation from a source:

1. Check if it's in the [whitelisted domains](#whitelisted-domains)
2. Use official documentation sites when possible
3. Avoid third-party tutorials or blogs (not whitelisted)

### 3. Optimize for Credits

Web Fetch credit usage:

| Content Size | Credits Used |
|-------------|--------------|
| Small page (< 5KB) | ~50-100 |
| Medium page (5-20KB) | ~100-300 |
| Large page (> 20KB) | ~300-500 |

**Tips**:
- Use specific page URLs instead of asking to search
- Avoid fetching entire API references when you only need one function
- Check the cache before making duplicate requests

### 4. Handle Long Documentation

For long documentation pages:

- **Content is automatically truncated** at 10,000 characters
- If truncated, you'll see a `truncated: true` flag
- Ask **follow-up questions** to get different sections

Example:
```
User: Fetch the Django models documentation

AI: [Fetches first 10,000 chars]
    The documentation is large and has been truncated.
    [Provides summary of available content]

User: Tell me specifically about ForeignKey relationships

AI: [Uses cached content to answer specific question]
```

### 5. Dealing with Documentation Updates

Documentation changes over time:

- **Cache TTL**: 1 hour ensures relatively fresh content
- **Manual Refresh**: Clear cache if you need the absolute latest version
- **Version-specific URLs**: Use URLs with version numbers when available
  - Good: `https://docs.python.org/3.11/library/asyncio.html`
  - Less specific: `https://docs.python.org/library/asyncio.html`

---

## FAQ

**Q: Can I fetch from any website?**

A: No. Only whitelisted domains are accessible for security and quality reasons.

**Q: What happens if I request a non-whitelisted domain?**

A: You'll receive an error message:
```
Error: Domain not whitelisted
The domain 'example.com' is not in the approved list of documentation sources.
```

**Q: How is HTML converted to markdown?**

A: Conversion happens server-side using specialized parsers that:
- Remove navigation, headers, footers
- Convert code blocks with syntax highlighting
- Preserve links and structure
- Strip ads and tracking scripts

**Q: Can I fetch documentation offline?**

A: No. Web Fetch requires an internet connection to the managed API.

**Q: What if a documentation page is down?**

A: You'll receive a fetch error with details:
```
Error: Fetch failed
Failed to retrieve documentation from https://example.org/docs
Status: 503 Service Unavailable
```

**Q: Does fetching documentation use credits?**

A: Yes. Credits are charged based on:
- Length of fetched content
- Processing required (HTML to markdown)
- Model usage for answering your question

**Q: Can I fetch PDFs or other file types?**

A: No. Currently, only HTML pages are supported.

**Q: How do I know if content was cached?**

A: In API responses, check the `cached: boolean` field. In chat, it's transparent to the user.

**Q: Can I fetch from private/authenticated documentation?**

A: No. Web Fetch only accesses publicly available documentation. Authentication is not supported.

**Q: What's the maximum page size that can be fetched?**

A: Pages up to 1MB are fetched, but content is truncated to 10,000 characters for processing.

---

## Error Handling

Common errors and solutions:

### Domain Not Whitelisted

**Error Message**:
```
Error: DOMAIN_NOT_WHITELISTED
The domain 'example.com' is not in the approved list.
```

**Solution**:
- Verify you're using an official documentation site
- Check the [whitelisted domains list](#whitelisted-domains)
- Request the domain be added via GitHub Issues

### Fetch Failed

**Error Message**:
```
Error: FETCH_FAILED
Failed to retrieve content from https://docs.example.org/page
Status: 404 Not Found
```

**Solution**:
- Verify the URL is correct
- Check if the page exists
- Try a different page from the same domain

### Timeout

**Error Message**:
```
Error: TIMEOUT
Request to https://docs.example.org timed out after 30 seconds
```

**Solution**:
- Try again (temporary network issue)
- Use a more specific page URL
- Report persistent timeouts to support

### Invalid URL

**Error Message**:
```
Error: INVALID_URL
The provided URL is malformed
```

**Solution**:
- Check URL syntax
- Ensure it starts with `https://` or `http://`
- Avoid special characters that break URL formatting

---

## Related Guides

- [Getting Started](./getting-started.md) - Set up your account
- [Code Intelligence](./code-intelligence.md) - Analyze code with AI
- [Usage & Credits](./usage-and-credits.md) - Track your web fetch usage
- [Troubleshooting](./troubleshooting.md) - Fix common issues

---

**Ready to track your usage?** Learn about [Usage & Credits](./usage-and-credits.md) to monitor your web fetch and model usage!
