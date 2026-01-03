# Community Marketplace Integration - Usage Examples

This document demonstrates the Community Marketplace service implementation.

## API Response Format

### List All Skills
**Endpoint:** `GET https://api.ainative.studio/v1/skills/marketplace`

**Response:**
```json
{
  "skills": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "mongodb-patterns",
      "description": "MongoDB best practices and common patterns",
      "author": "johndoe",
      "category": "database",
      "keywords": ["mongodb", "database", "nosql", "patterns"],
      "version": "1.2.0",
      "rating_avg": 4.5,
      "rating_count": 23,
      "download_count": 156,
      "status": "approved",
      "skill_file_url": "https://cdn.ainative.studio/skills/mongodb-patterns-v1.2.0.zip",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-15T12:00:00Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "redis-caching",
      "description": "Redis caching strategies for high-performance applications",
      "author": "janedoe",
      "category": "caching",
      "keywords": ["redis", "cache", "performance"],
      "version": "2.0.1",
      "rating_avg": 4.8,
      "rating_count": 45,
      "download_count": 342,
      "status": "approved",
      "skill_file_url": "https://cdn.ainative.studio/skills/redis-caching-v2.0.1.zip",
      "created_at": "2023-12-15T00:00:00Z",
      "updated_at": "2024-01-20T14:30:00Z"
    }
  ]
}
```

### Search Skills
**Endpoint:** `GET https://api.ainative.studio/v1/skills/marketplace/search?q=database`

**Response:** Same format as list, but filtered results

### Get Skill Details
**Endpoint:** `GET https://api.ainative.studio/v1/skills/marketplace/mongodb-patterns`

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "mongodb-patterns",
  "description": "MongoDB best practices and common patterns",
  "author": "johndoe",
  "category": "database",
  "keywords": ["mongodb", "database", "nosql", "patterns"],
  "version": "1.2.0",
  "rating_avg": 4.5,
  "rating_count": 23,
  "download_count": 156,
  "status": "approved",
  "skill_file_url": "https://cdn.ainative.studio/skills/mongodb-patterns-v1.2.0.zip",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T12:00:00Z"
}
```

## Installation Workflow

### Step 1: Fetch Skill Details
```typescript
const marketplace = instantiationService.createInstance(CommunityMarketplace);
const skill = await marketplace.getSkillDetails('mongodb-patterns');

console.log(skill);
// Output:
// {
//   name: 'mongodb-patterns',
//   description: 'MongoDB best practices and common patterns',
//   version: '1.2.0',
//   source: 'community',
//   author: 'johndoe',
//   keywords: ['mongodb', 'database', 'nosql', 'patterns'],
//   rating: 4.5,
//   downloads: 156,
//   updatedAt: Date('2024-01-15T12:00:00Z'),
//   installCommand: 'ainative skill install mongodb-patterns',
//   repository: 'https://cdn.ainative.studio/skills/mongodb-patterns-v1.2.0.zip'
// }
```

### Step 2: Install Skill
```typescript
await marketplace.install('mongodb-patterns');

// Internal workflow:
// 1. Check if already installed → Error if exists
// 2. Fetch skill details from API
// 3. Download zip from CDN: skill.repository
// 4. Save to temp: /tmp/mongodb-patterns-1234567890.zip
// 5. Extract to: ~/.ainative/skills/mongodb-patterns/
// 6. Register with SkillsRegistry
// 7. Increment download count (fire and forget)
// 8. Clean up temp file
```

### Step 3: Verify Installation
```typescript
const registry = instantiationService.createInstance(SkillsRegistry);
const isInstalled = await registry.isInstalled('mongodb-patterns');
console.log(isInstalled); // true

const entry = await registry.get('mongodb-patterns');
console.log(entry);
// Output:
// {
//   name: 'mongodb-patterns',
//   version: '1.2.0',
//   installedAt: 1705334400000,
//   source: 'local',
//   path: '/Users/username/.ainative/skills/mongodb-patterns'
// }
```

## Submission Workflow

### Step 1: Authenticate
```typescript
const marketplace = instantiationService.createInstance(CommunityMarketplace);

// Set auth token (from GitHub OAuth or similar)
marketplace.setAuthToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');

const isAuth = await marketplace.isAuthenticated();
console.log(isAuth); // true
```

### Step 2: Submit Skill
```typescript
const skillPath = '/Users/username/my-custom-skill';

const response = await marketplace.submit(skillPath);

console.log(response);
// Output:
// {
//   id: '770e8400-e29b-41d4-a716-446655440002',
//   status: 'pending',
//   message: 'Skill submitted successfully. It will be reviewed within 48 hours.'
// }

// Internal workflow:
// 1. Check authentication → Error if not authenticated
// 2. Parse SKILL.md with SkillParser
// 3. Validate skill format
// 4. Create zip: /tmp/my-custom-skill-1234567890.zip
// 5. Prepare FormData with metadata
// 6. Upload to API: POST /v1/skills/marketplace
// 7. Return submission response
// 8. Clean up temp file
```

## Rating Workflow

### Rate a Skill
```typescript
const marketplace = instantiationService.createInstance(CommunityMarketplace);

// Must be authenticated
marketplace.setAuthToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');

// Rate skill (1-5 stars)
await marketplace.rate('550e8400-e29b-41d4-a716-446655440000', 5);

// Internal workflow:
// 1. Validate rating (1-5, integer)
// 2. Check authentication → Error if not authenticated
// 3. POST /v1/skills/marketplace/{id}/rate
// 4. Clear cache to get fresh ratings
```

## Search Workflow

### Search by Keyword
```typescript
const marketplace = instantiationService.createInstance(CommunityMarketplace);

const results = await marketplace.search('database');

console.log(results);
// Output:
// [
//   {
//     name: 'mongodb-patterns',
//     description: 'MongoDB best practices...',
//     keywords: ['mongodb', 'database', 'nosql'],
//     ...
//   },
//   {
//     name: 'postgresql-guide',
//     description: 'PostgreSQL best practices...',
//     keywords: ['postgresql', 'database', 'sql'],
//     ...
//   }
// ]

// Workflow:
// 1. Try API search: GET /search?q=database
// 2. If fails, fallback to local cache search
// 3. Filter by name, description, keywords, or author
// 4. Return matching skills
```

## Caching Strategy

### Cache Location
```
~/.ainative/cache/marketplace/community.json
```

### Cache Format
```json
{
  "skills": [
    {
      "name": "mongodb-patterns",
      "description": "MongoDB best practices...",
      "version": "1.2.0",
      "source": "community",
      "author": "johndoe",
      "keywords": ["mongodb", "database"],
      "rating": 4.5,
      "downloads": 156,
      "updatedAt": "2024-01-15T12:00:00Z",
      "installCommand": "ainative skill install mongodb-patterns",
      "repository": "https://cdn.ainative.studio/skills/mongodb-patterns-v1.2.0.zip"
    }
  ],
  "timestamp": 1705334400000,
  "ttl": 3600000
}
```

### Cache Lifecycle
1. **Miss:** No cache or expired → Fetch from API
2. **Hit:** Valid cache → Return cached data
3. **Stale:** Network error → Return expired cache with warning
4. **Invalidate:** After install/submit/rate → Clear cache

### TTL: 1 hour (3600000 ms)

## Error Handling

### Authentication Required
```typescript
try {
  await marketplace.submit('/path/to/skill');
} catch (error) {
  if (error.code === 'AUTH_REQUIRED') {
    console.log('Please sign in to submit skills');
    // Redirect to login
  }
}
```

### Network Error
```typescript
try {
  const skills = await marketplace.fetchSkills();
} catch (error) {
  if (error.code === 'NETWORK_ERROR') {
    console.log('Using cached data due to network error');
    // Falls back to stale cache automatically
  }
}
```

### Rate Limit
```typescript
try {
  await marketplace.fetchSkills();
} catch (error) {
  if (error.code === 'RATE_LIMIT') {
    console.log('Rate limit exceeded. Try again later.');
    // Shows retry-after header value
  }
}
```

### Validation Error
```typescript
try {
  await marketplace.submit('/path/to/invalid-skill');
} catch (error) {
  if (error.code === 'VALIDATION_ERROR') {
    console.log('Skill format is invalid. Check SKILL.md');
  }
}
```

## Retry Logic

- **Max Retries:** 3 attempts
- **Backoff:** Exponential (1s, 2s, 4s)
- **Timeout:** 30 seconds per request
- **Errors that don't retry:**
  - AUTH_REQUIRED
  - VALIDATION_ERROR
  - NOT_FOUND

## Integration with VS Code Services

### Dependency Injection
```typescript
import { ICommunityMarketplace } from './communityMarketplaceTypes';

class MyComponent {
  constructor(
    @ICommunityMarketplace private marketplace: ICommunityMarketplace
  ) {}

  async loadSkills() {
    const skills = await this.marketplace.fetchSkills();
    // Use skills...
  }
}
```

### Service Registration
```typescript
// Already registered in communityMarketplace.ts:
registerSingleton(ICommunityMarketplace, CommunityMarketplace, InstantiationType.Delayed);
```

## Testing

Run unit tests:
```bash
npm run test-node -- --grep "CommunityMarketplace"
```

Expected output:
```
  CommunityMarketplace Service
    API Integration
      ✓ should construct correct API URLs
      ✓ should handle API response format
    Skill Transformation
      ✓ should transform API skill to MarketplaceSkill format
      ✓ should filter out non-approved skills
    Cache Management
      ✓ should calculate cache age correctly
      ✓ should construct correct cache file path
    [... more tests ...]

  All tests passed!
```

## Production Considerations

1. **Authentication:** Integrate with GitHub OAuth or AINative SSO
2. **CDN:** Skills hosted on global CDN for fast downloads
3. **Moderation:** All submissions reviewed before approval
4. **Rate Limiting:** 100 requests/minute per user
5. **Monitoring:** Track downloads, ratings, search queries
6. **Security:** Validate skill files for malicious content
7. **Versioning:** Support semantic versioning for updates
