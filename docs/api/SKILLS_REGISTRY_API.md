# Skills Registry API Specification

**Version:** 1.0.0
**Last Updated:** 2026-01-02

## Overview

The Skills Registry API provides a RESTful interface for discovering, distributing, and managing AINative Studio skills across multiple registry sources.

## Registries

### Official Registry
- **Base URL:** `https://registry.ainative.studio/v1/skills`
- **Purpose:** Curated, officially supported AINative skills
- **Authentication:** Public read, API key for publishing

### Anthropic Registry
- **Base URL:** `https://registry.anthropic.com/skills`
- **Purpose:** Anthropic-provided skills and integrations
- **Authentication:** Public read-only

### Community Registry
- **Base URL:** `https://community.ainative.studio/skills`
- **Purpose:** User-contributed skills
- **Authentication:** Public read, authentication required for publishing

## API Endpoints

### Health Check

Check registry availability and status.

```http
GET /health
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": 123456,
  "registeredSkills": 42
}
```

---

### Search Skills

Search for skills across the registry.

```http
GET /search
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | No | Search query (searches name, description, keywords) |
| `tags` | string | No | Comma-separated list of tags |
| `author` | string | No | Filter by author |
| `minRating` | number | No | Minimum rating (0-5) |
| `limit` | number | No | Results per page (default: 20, max: 100) |
| `offset` | number | No | Pagination offset (default: 0) |

**Example Request:**
```http
GET /search?q=git&tags=workflow,automation&limit=10
```

**Response (200 OK):**
```json
{
  "results": [
    {
      "name": "git-workflow",
      "version": "1.2.0",
      "description": "Git commit and PR workflow automation",
      "author": "AINative Team",
      "registry": "official",
      "tags": ["git", "workflow", "automation"],
      "metadata": {
        "downloads": 1234,
        "rating": 4.8,
        "updated": "2026-01-01T12:00:00Z",
        "created": "2025-10-01T12:00:00Z"
      }
    }
  ],
  "total": 1,
  "offset": 0,
  "limit": 10,
  "hasMore": false
}
```

---

### Get Skill Details

Retrieve complete information about a specific skill.

```http
GET /packages/{name}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | Skill name (kebab-case) |

**Example Request:**
```http
GET /packages/git-workflow
```

**Response (200 OK):**
```json
{
  "name": "git-workflow",
  "version": "1.2.0",
  "description": "Git commit and PR workflow automation with conventional commits support",
  "author": "AINative Team",
  "registry": "official",
  "tags": ["git", "workflow", "automation", "conventional-commits"],
  "dependencies": [
    {
      "name": "git-utils",
      "version": "^1.0.0",
      "registry": "official"
    }
  ],
  "files": {
    "skill.md": {
      "sha256": "abc123...",
      "size": 2048
    },
    "references/examples.md": {
      "sha256": "def456...",
      "size": 1024
    }
  },
  "metadata": {
    "downloads": 1234,
    "rating": 4.8,
    "updated": "2026-01-01T12:00:00Z",
    "created": "2025-10-01T12:00:00Z",
    "stars": 56,
    "reviews": 12
  },
  "license": "Apache-2.0",
  "repository": "https://github.com/ainative/skills/tree/main/git-workflow",
  "homepage": "https://skills.ainative.studio/git-workflow",
  "bugs": "https://github.com/ainative/skills/issues",
  "readme": "# Git Workflow Skill\n\nAutomate your git workflow..."
}
```

**Response (404 Not Found):**
```json
{
  "error": "SkillNotFound",
  "message": "Skill 'non-existent' not found in registry"
}
```

---

### Get Skill Versions

List all available versions of a skill.

```http
GET /packages/{name}/versions
```

**Response (200 OK):**
```json
["1.2.0", "1.1.0", "1.0.0", "0.9.0"]
```

---

### Get Specific Version

Retrieve a specific version of a skill.

```http
GET /packages/{name}/{version}
```

**Response (200 OK):**
Same as "Get Skill Details" but for the specified version.

---

### Download Skill Package

Download the skill package tarball.

```http
GET /packages/{name}/download
GET /packages/{name}/{version}/download
```

**Response (200 OK):**
- **Content-Type:** `application/gzip`
- **Content-Disposition:** `attachment; filename="git-workflow-1.2.0.tgz"`

**Response Body:**
Binary tarball containing skill files.

---

### Get Tags

List all available tags with usage counts.

```http
GET /tags
```

**Response (200 OK):**
```json
[
  { "tag": "git", "count": 23 },
  { "tag": "testing", "count": 18 },
  { "tag": "workflow", "count": 15 },
  { "tag": "code-quality", "count": 12 }
]
```

---

### Publish Skill (Community Registry Only)

Publish a new skill or version to the community registry.

```http
POST /packages
Authorization: Bearer {api_token}
Content-Type: multipart/form-data
```

**Request Body:**
- `package.json`: Skill manifest (application/json)
- `tarball`: Skill package tarball (application/gzip)

**Example package.json:**
```json
{
  "name": "my-skill",
  "version": "1.0.0",
  "description": "My custom skill",
  "author": "John Doe",
  "registry": "community",
  "tags": ["custom", "utility"],
  "files": {
    "skill.md": {
      "sha256": "abc123...",
      "size": 1024
    }
  },
  "license": "MIT"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Skill 'my-skill' version 1.0.0 published successfully",
  "packageUrl": "https://community.ainative.studio/skills/packages/my-skill"
}
```

**Response (400 Bad Request):**
```json
{
  "error": "ValidationError",
  "message": "Invalid skill package",
  "details": [
    {
      "field": "name",
      "message": "Name must be lowercase alphanumeric with hyphens"
    }
  ]
}
```

**Response (401 Unauthorized):**
```json
{
  "error": "Unauthorized",
  "message": "Valid API token required for publishing"
}
```

**Response (409 Conflict):**
```json
{
  "error": "VersionExists",
  "message": "Skill 'my-skill' version 1.0.0 already exists"
}
```

---

### Unpublish Skill (Community Registry Only)

Remove a skill or specific version from the registry.

```http
DELETE /packages/{name}
DELETE /packages/{name}/{version}
Authorization: Bearer {api_token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Skill 'my-skill' version 1.0.0 unpublished successfully"
}
```

**Response (403 Forbidden):**
```json
{
  "error": "Forbidden",
  "message": "You do not have permission to unpublish this skill"
}
```

---

## Authentication

### API Token

For publishing to the community registry, obtain an API token:

1. Sign up at https://community.ainative.studio
2. Navigate to Account Settings > API Tokens
3. Generate a new token with `publish` scope
4. Include in requests via `Authorization: Bearer {token}` header

### Token Scopes

| Scope | Description |
|-------|-------------|
| `read` | Read public skill information (default, no auth required) |
| `publish` | Publish skills to community registry |
| `unpublish` | Remove own published skills |
| `admin` | Full registry administration (official registry only) |

---

## Rate Limiting

To ensure fair usage, the following rate limits apply:

| Endpoint | Limit | Window |
|----------|-------|--------|
| Search | 100 requests | 1 minute |
| Get Skill Details | 200 requests | 1 minute |
| Download | 50 downloads | 1 hour |
| Publish | 10 publishes | 1 hour |

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704196800
```

**Response (429 Too Many Requests):**
```json
{
  "error": "RateLimitExceeded",
  "message": "Rate limit exceeded. Please try again in 45 seconds",
  "retryAfter": 45
}
```

---

## Package Format

### Tarball Structure

Skill packages are distributed as gzipped tarballs (.tgz) with the following structure:

```
my-skill-1.0.0/
├── package.json          # Skill manifest
├── skill.md              # Main skill file (required)
├── README.md             # Documentation (optional)
├── LICENSE               # License file (recommended)
└── references/           # Additional reference files (optional)
    ├── examples.md
    └── api-docs.md
```

### Package.json Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["name", "version", "description", "author", "files"],
  "properties": {
    "name": {
      "type": "string",
      "pattern": "^[a-z0-9-]+$",
      "description": "Skill name (kebab-case)"
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+(-[a-z0-9.]+)?$",
      "description": "Semantic version"
    },
    "description": {
      "type": "string",
      "maxLength": 200,
      "description": "Short description"
    },
    "author": {
      "type": "string",
      "description": "Author name or organization"
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "maxItems": 10,
      "description": "Search tags"
    },
    "dependencies": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name"],
        "properties": {
          "name": { "type": "string" },
          "version": { "type": "string" },
          "registry": { "enum": ["official", "anthropic", "community"] },
          "optional": { "type": "boolean" }
        }
      }
    },
    "files": {
      "type": "object",
      "required": ["skill.md"],
      "additionalProperties": {
        "type": "object",
        "properties": {
          "sha256": { "type": "string" },
          "size": { "type": "number" }
        }
      }
    },
    "license": {
      "type": "string",
      "description": "SPDX license identifier"
    },
    "repository": {
      "type": "string",
      "format": "uri"
    },
    "homepage": {
      "type": "string",
      "format": "uri"
    },
    "bugs": {
      "type": "string",
      "format": "uri"
    }
  }
}
```

---

## Error Responses

All error responses follow a consistent format:

```json
{
  "error": "ErrorCode",
  "message": "Human-readable error message",
  "details": [] // Optional additional information
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `SkillNotFound` | 404 | Skill or version not found |
| `ValidationError` | 400 | Invalid request data |
| `Unauthorized` | 401 | Missing or invalid authentication |
| `Forbidden` | 403 | Insufficient permissions |
| `VersionExists` | 409 | Skill version already published |
| `RateLimitExceeded` | 429 | Too many requests |
| `InternalError` | 500 | Server error |
| `ServiceUnavailable` | 503 | Registry temporarily unavailable |

---

## Caching

### Client-Side Caching

Clients should implement caching with the following TTLs:

- **Skill Details:** 1 hour
- **Search Results:** 30 minutes
- **Version Lists:** 1 hour
- **Tags:** 4 hours

### Cache Headers

The API includes standard HTTP caching headers:

```http
Cache-Control: public, max-age=3600
ETag: "abc123..."
Last-Modified: Wed, 01 Jan 2026 12:00:00 GMT
```

Clients should use `If-None-Match` and `If-Modified-Since` for conditional requests.

---

## GitHub-Based Registry (Alternative Implementation)

For simpler deployment, registries can be backed by GitHub repositories:

### Repository Structure

```
ainative-studio/skills/
├── skills/
│   ├── git-workflow/
│   │   ├── package.json
│   │   ├── skill.md
│   │   └── README.md
│   └── testing-framework/
│       ├── package.json
│       └── skill.md
├── index.json              # Auto-generated skill index
└── tags.json               # Auto-generated tag index
```

### GitHub API Mapping

| Registry API | GitHub API |
|--------------|------------|
| `GET /search` | Search in `index.json` |
| `GET /packages/{name}` | Read `skills/{name}/package.json` |
| `GET /packages/{name}/download` | Download release tarball |
| `POST /packages` | Create PR with new skill |

### Benefits

- No custom backend infrastructure required
- Version control and audit trail
- Community contribution via pull requests
- Free hosting via GitHub Pages

---

## Versioning

The API follows semantic versioning. Breaking changes will increment the major version and be served from a new URL path (e.g., `/v2/skills`).

Current version: **v1**

---

## Support

- **Documentation:** https://docs.ainative.studio/skills/registry-api
- **Issues:** https://github.com/ainative/skills/issues
- **Community Forum:** https://community.ainative.studio/c/skills

---

## Changelog

### v1.0.0 (2026-01-02)
- Initial API specification
- Support for three registries (official, anthropic, community)
- Search, download, and publishing endpoints
- Rate limiting and authentication
- Package format specification
