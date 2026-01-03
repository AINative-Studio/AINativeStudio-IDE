# AINative Studio Update Server

Serverless update server that checks GitHub Releases for new versions of AINative Studio IDE.

## Architecture

- **Runtime:** Node.js 18+
- **Framework:** Serverless (Vercel)
- **GitHub Integration:** Octokit
- **Caching:** In-memory (5-minute TTL)

## API Endpoint

```
GET /api/update/:platform/:quality/:commit
```

### Parameters

- `platform`: darwin, darwin-arm64, win32-x64, linux-x64, etc.
- `quality`: stable, insider (currently unused)
- `commit`: Current client commit hash

### Response

**Update Available (200):**
```json
{
  "version": "abc123...",
  "productVersion": "1.5.0",
  "timestamp": 1704672000000,
  "url": "https://github.com/.../ainative-studio-darwin-arm64.zip",
  "sha256hash": "e3b0c44..."
}
```

**No Update (204):**
```
HTTP 204 No Content
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create `.env` file:
```
GITHUB_TOKEN=your_github_pat  # Optional, increases rate limits
CACHE_TTL=300                  # Cache duration in seconds
```

### 3. Local Development

```bash
npm run dev
```

Test endpoint:
```bash
curl http://localhost:3000/api/update/darwin-arm64/stable/abc123
```

### 4. Deploy to Vercel

```bash
npm run deploy
```

## Supported Platforms

- `darwin` - macOS Intel
- `darwin-arm64` - macOS Apple Silicon
- `win32-x64` - Windows x64
- `win32-x64-user` - Windows x64 User Setup
- `win32-arm64` - Windows ARM64
- `linux-x64` - Linux x64
- `linux-arm64` - Linux ARM64

## Project Structure

```
ainative-update-server/
├── index.js                    # Vercel entry point
├── package.json                # Dependencies
├── vercel.json                 # Deployment config
├── src/
│   ├── handlers/
│   │   └── updateHandler.js    # HTTP handler
│   ├── services/
│   │   └── githubService.js    # GitHub API integration
│   └── utils/
│       └── platformMapper.js   # Platform mapping
└── README.md
```

## Performance

- Response time: <500ms (p95)
- Rate limit: 60 req/min (without token), 5000 req/hr (with token)
- Cache TTL: 5 minutes

## Error Handling

- 400: Invalid platform
- 404: Asset not found
- 500: Server error
- 503: Rate limit exceeded

## Testing

See Issue #75 for testing requirements.
