# Environment Variable Management

Complete guide to managing environment variables in Railway deployments.

## Railway Variable Types

### 1. Environment Variables
Standard environment variables available to your application.

### 2. Service References
Reference other Railway services using `${{ServiceName.VARIABLE}}` syntax.

### 3. Railway Secrets
Encrypted secrets for sensitive data (preferred over regular env vars).

### 4. System Variables
Railway provides these automatically:
- `PORT` - Port your application should listen on
- `RAILWAY_ENVIRONMENT` - Current environment (production, staging, etc.)
- `RAILWAY_PUBLIC_DOMAIN` - Public domain for the service
- `RAILWAY_PRIVATE_DOMAIN` - Private domain for internal communication
- `RAILWAY_PROJECT_ID` - Project identifier
- `RAILWAY_SERVICE_ID` - Service identifier
- `RAILWAY_DEPLOYMENT_ID` - Deployment identifier

## Database Configuration

### PostgreSQL

```bash
# Automatic from Railway Postgres service
DATABASE_URL=${{Postgres.DATABASE_URL}}
DATABASE_PRIVATE_URL=${{Postgres.DATABASE_PRIVATE_URL}}

# Manual configuration
DATABASE_URL=postgresql://user:password@host:5432/dbname

# SQLAlchemy format (if needed)
SQLALCHEMY_DATABASE_URI=${{Postgres.DATABASE_URL}}
```

**Usage in Python:**
```python
import os
from sqlalchemy import create_engine

DATABASE_URL = os.environ.get('DATABASE_URL')

# Handle postgres:// vs postgresql:// prefix
if DATABASE_URL and DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

engine = create_engine(DATABASE_URL)
```

**Usage in Node.js:**
```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
```

### Redis

```bash
# Automatic from Railway Redis service
REDIS_URL=${{Redis.REDIS_URL}}
REDIS_PRIVATE_URL=${{Redis.REDIS_PRIVATE_URL}}

# Manual configuration
REDIS_URL=redis://default:password@host:6379
```

**Usage in Python:**
```python
import os
import redis

REDIS_URL = os.environ.get('REDIS_URL')
redis_client = redis.from_url(REDIS_URL)
```

**Usage in Node.js:**
```javascript
const redis = require('redis');

const client = redis.createClient({
  url: process.env.REDIS_URL
});
```

### MongoDB

```bash
# Manual configuration
MONGODB_URI=mongodb://user:password@host:27017/dbname
MONGODB_PRIVATE_URI=mongodb://user:password@internal-host:27017/dbname
```

## Service-to-Service Communication

### Frontend to Backend

**Frontend Environment:**
```bash
# Public URL (for client-side requests)
VITE_API_URL=https://${{backend.RAILWAY_PUBLIC_DOMAIN}}
NEXT_PUBLIC_API_URL=https://${{backend.RAILWAY_PUBLIC_DOMAIN}}
REACT_APP_API_URL=https://${{backend.RAILWAY_PUBLIC_DOMAIN}}

# Private URL (for SSR requests)
API_PRIVATE_URL=http://${{backend.RAILWAY_PRIVATE_DOMAIN}}
```

**Backend Environment:**
```bash
# Frontend URL for CORS
FRONTEND_URL=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}
CORS_ORIGINS=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}

# Multiple origins
CORS_ORIGINS=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}},https://custom-domain.com
```

### Backend to Backend

```bash
# Use private domains for faster, more secure communication
AUTH_SERVICE_URL=http://${{auth-service.RAILWAY_PRIVATE_DOMAIN}}
PAYMENT_SERVICE_URL=http://${{payment-service.RAILWAY_PRIVATE_DOMAIN}}
NOTIFICATION_SERVICE_URL=http://${{notification-service.RAILWAY_PRIVATE_DOMAIN}}
```

## Application Configuration

### Python Applications

**Flask/FastAPI:**
```bash
# Environment
ENVIRONMENT=production
DEBUG=false

# Server
HOST=0.0.0.0
PORT=$PORT
WORKERS=4

# Security
SECRET_KEY=${{secrets.SECRET_KEY}}
JWT_SECRET_KEY=${{secrets.JWT_SECRET}}
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=30

# CORS
ALLOWED_ORIGINS=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}
ALLOWED_HOSTS=${{RAILWAY_PUBLIC_DOMAIN}}

# Database
DATABASE_URL=${{Postgres.DATABASE_URL}}
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=20

# Redis
REDIS_URL=${{Redis.REDIS_URL}}
CACHE_TTL=3600

# External APIs
OPENAI_API_KEY=${{secrets.OPENAI_API_KEY}}
STRIPE_API_KEY=${{secrets.STRIPE_API_KEY}}
SENDGRID_API_KEY=${{secrets.SENDGRID_API_KEY}}
```

**Django:**
```bash
# Django settings
DJANGO_SETTINGS_MODULE=myproject.settings.production
SECRET_KEY=${{secrets.DJANGO_SECRET_KEY}}
DEBUG=False
ALLOWED_HOSTS=${{RAILWAY_PUBLIC_DOMAIN}}

# Database
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Static files
STATIC_ROOT=/app/staticfiles
STATIC_URL=/static/

# Media files
MEDIA_ROOT=/app/media
MEDIA_URL=/media/

# Email
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=${{secrets.SENDGRID_API_KEY}}
```

### Node.js Applications

**Express/Fastify:**
```bash
# Environment
NODE_ENV=production

# Server
PORT=$PORT
HOST=0.0.0.0

# Security
SESSION_SECRET=${{secrets.SESSION_SECRET}}
JWT_SECRET=${{secrets.JWT_SECRET}}
ENCRYPTION_KEY=${{secrets.ENCRYPTION_KEY}}

# CORS
CORS_ORIGIN=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}

# Database
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Redis
REDIS_URL=${{Redis.REDIS_URL}}

# External APIs
STRIPE_SECRET_KEY=${{secrets.STRIPE_SECRET_KEY}}
AWS_ACCESS_KEY_ID=${{secrets.AWS_ACCESS_KEY_ID}}
AWS_SECRET_ACCESS_KEY=${{secrets.AWS_SECRET_ACCESS_KEY}}
```

**Next.js:**
```bash
# Build-time variables (NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_API_URL=https://${{backend.RAILWAY_PUBLIC_DOMAIN}}
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${{secrets.STRIPE_PUBLISHABLE_KEY}}

# Runtime variables (server-side only)
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=${{secrets.JWT_SECRET}}
STRIPE_SECRET_KEY=${{secrets.STRIPE_SECRET_KEY}}

# Next.js configuration
NEXTAUTH_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
NEXTAUTH_SECRET=${{secrets.NEXTAUTH_SECRET}}
```

## Secret Management

### Using Railway Secrets

**Set secrets via CLI:**
```bash
railway variables set SECRET_KEY=$(openssl rand -hex 32)
railway variables set JWT_SECRET=$(openssl rand -hex 32)
```

**Set secrets via dashboard:**
1. Go to project settings
2. Navigate to "Variables" tab
3. Click "Add Variable"
4. Select "Secret" type
5. Enter name and value

**Reference secrets:**
```bash
JWT_SECRET=${{secrets.JWT_SECRET}}
API_KEY=${{secrets.API_KEY}}
```

### Secret Rotation

```bash
# Generate new secret
NEW_SECRET=$(openssl rand -hex 32)

# Update in Railway
railway variables set JWT_SECRET=$NEW_SECRET

# Redeploy services
railway up --detach
```

## External API Integration

### OpenAI
```bash
OPENAI_API_KEY=${{secrets.OPENAI_API_KEY}}
OPENAI_ORG_ID=${{secrets.OPENAI_ORG_ID}}
OPENAI_MODEL=gpt-4
```

### Stripe
```bash
STRIPE_SECRET_KEY=${{secrets.STRIPE_SECRET_KEY}}
STRIPE_PUBLISHABLE_KEY=${{secrets.STRIPE_PUBLISHABLE_KEY}}
STRIPE_WEBHOOK_SECRET=${{secrets.STRIPE_WEBHOOK_SECRET}}
```

### AWS
```bash
AWS_ACCESS_KEY_ID=${{secrets.AWS_ACCESS_KEY_ID}}
AWS_SECRET_ACCESS_KEY=${{secrets.AWS_SECRET_ACCESS_KEY}}
AWS_REGION=us-east-1
AWS_S3_BUCKET=my-bucket
```

### SendGrid
```bash
SENDGRID_API_KEY=${{secrets.SENDGRID_API_KEY}}
FROM_EMAIL=noreply@example.com
```

### Google Cloud
```bash
GOOGLE_APPLICATION_CREDENTIALS=/app/credentials.json
GOOGLE_CLOUD_PROJECT=my-project
```

## Environment-Specific Configuration

### Production
```bash
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=info
ALLOWED_ORIGINS=https://app.example.com
DATABASE_POOL_SIZE=20
CACHE_ENABLED=true
RATE_LIMIT_ENABLED=true
```

### Staging
```bash
ENVIRONMENT=staging
DEBUG=false
LOG_LEVEL=debug
ALLOWED_ORIGINS=https://staging.example.com
DATABASE_POOL_SIZE=5
CACHE_ENABLED=true
RATE_LIMIT_ENABLED=false
```

### Development (local)
```bash
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=debug
ALLOWED_ORIGINS=http://localhost:3000
DATABASE_POOL_SIZE=2
CACHE_ENABLED=false
RATE_LIMIT_ENABLED=false
```

## Validation and Defaults

### Python (using Pydantic)

```python
from pydantic import BaseSettings, validator

class Settings(BaseSettings):
    # Required variables
    DATABASE_URL: str
    JWT_SECRET: str

    # Optional with defaults
    ENVIRONMENT: str = 'production'
    DEBUG: bool = False
    LOG_LEVEL: str = 'info'
    PORT: int = 8000
    WORKERS: int = 4

    # CORS
    CORS_ORIGINS: list[str] = []

    @validator('CORS_ORIGINS', pre=True)
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(',')]
        return v

    @validator('DATABASE_URL')
    def validate_database_url(cls, v):
        if v.startswith('postgres://'):
            v = v.replace('postgres://', 'postgresql://', 1)
        return v

    class Config:
        env_file = '.env'
        case_sensitive = True

settings = Settings()
```

### Node.js (using dotenv and joi)

```javascript
const dotenv = require('dotenv');
const Joi = require('joi');

dotenv.config();

const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'staging')
    .default('production'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  REDIS_URL: Joi.string().required(),
  CORS_ORIGIN: Joi.string().required(),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),
}).unknown();

const { error, value: env } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = env;
```

## Best Practices

### 1. Never Hardcode Secrets
❌ **Bad:**
```python
JWT_SECRET = "my-secret-key-123"
```

✅ **Good:**
```python
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    raise ValueError('JWT_SECRET must be set')
```

### 2. Use Service References
❌ **Bad:**
```bash
DATABASE_URL=postgresql://user:pass@postgres.railway.internal:5432/db
```

✅ **Good:**
```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

### 3. Validate on Startup
```python
import os

REQUIRED_VARS = [
    'DATABASE_URL',
    'JWT_SECRET',
    'REDIS_URL'
]

missing = [var for var in REQUIRED_VARS if not os.environ.get(var)]
if missing:
    raise ValueError(f'Missing required environment variables: {missing}')
```

### 4. Use Private Domains for Internal Communication
❌ **Bad:**
```bash
AUTH_SERVICE_URL=https://${{auth.RAILWAY_PUBLIC_DOMAIN}}
```

✅ **Good:**
```bash
AUTH_SERVICE_URL=http://${{auth.RAILWAY_PRIVATE_DOMAIN}}
```

### 5. Document All Variables
Create `.env.example` file:
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Redis
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-jwt-secret-here
SECRET_KEY=your-secret-key-here

# External APIs
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_test_...

# Frontend
CORS_ORIGINS=http://localhost:3000
```

## Troubleshooting

### Variable Not Found

**Problem:** Application can't find environment variable

**Check:**
```bash
# Verify variable is set
railway variables

# Check in deployment logs
railway logs | grep "VARIABLE_NAME"
```

### Variable Not Updated

**Problem:** Changed variable but app still uses old value

**Solution:**
```bash
# Trigger new deployment
railway up --detach

# Or redeploy from dashboard
```

### Service Reference Not Working

**Problem:** `${{ServiceName.VARIABLE}}` not resolving

**Check:**
1. Service name matches exactly (case-sensitive)
2. Referenced service is in same project
3. Variable exists in referenced service
4. Both services are deployed

### Database Connection Issues

**Problem:** Can't connect to database

**Check:**
```python
import os

DATABASE_URL = os.environ.get('DATABASE_URL')
print(f"Database URL: {DATABASE_URL}")

# Check prefix
if DATABASE_URL.startswith('postgres://'):
    print("Warning: Using postgres:// prefix, should be postgresql://")
```

## Railway CLI Commands

```bash
# List all variables
railway variables

# Set variable
railway variables set KEY=value

# Set secret
railway variables set SECRET_KEY=$(openssl rand -hex 32)

# Delete variable
railway variables delete KEY

# Export variables to .env file
railway variables > .env

# Set variables from file
railway variables set < .env
```

## Environment File Management

### Local Development
```bash
# .env.local
DATABASE_URL=postgresql://localhost:5432/myapp
REDIS_URL=redis://localhost:6379
JWT_SECRET=local-dev-secret
```

### Docker Compose
```yaml
version: '3.8'
services:
  app:
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
    env_file:
      - .env.local
```

### Loading in Application

**Python:**
```python
from dotenv import load_dotenv
import os

# Load .env file in development
if os.getenv('ENVIRONMENT') != 'production':
    load_dotenv()
```

**Node.js:**
```javascript
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
```
