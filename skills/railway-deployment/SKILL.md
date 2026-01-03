---
name: railway-deployment
version: 1.0.0
description: Railway deployment workflows, nixpacks configuration, environment management, and production troubleshooting
references:
  - nixpacks-config.md
  - env-management.md
  - troubleshooting.md
  - production-checklist.md
tags:
  - deployment
  - railway
  - nixpacks
  - devops
  - production
---

# Railway Deployment Skill

## When to Use This Skill

Use this skill when:
1. Deploying applications to Railway platform
2. Configuring nixpacks.toml for custom builds
3. Managing environment variables across services
4. Debugging deployment failures
5. Setting up multi-service Railway projects
6. Troubleshooting production issues
7. Configuring database migrations on Railway
8. Setting up health checks and monitoring

## Core Principles

### 1. Build Configuration First
Always start with proper nixpacks configuration:
- Specify all system dependencies in `nixPkgs`
- Define build phases explicitly
- Test locally with nixpacks CLI when possible

### 2. Environment Variable Management
- Use Railway's service references: `${{ServiceName.VARIABLE}}`
- Never hardcode secrets or URLs
- Use Railway secrets for sensitive data
- Configure all environment variables before deployment

### 3. Port Binding
Always bind to Railway's PORT environment variable:
```python
port = int(os.environ.get('PORT', 8000))
```

### 4. Health Checks
Implement health check endpoints for Railway to monitor:
```python
@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

## Common Deployment Workflows

### Initial Deployment

1. **Create nixpacks.toml** in project root
2. **Configure environment variables** in Railway dashboard
3. **Add Procfile or start command** (optional if using nixpacks)
4. **Deploy** via GitHub integration or CLI
5. **Monitor build logs** for errors
6. **Verify deployment** with health check

### Multi-Service Deployment

```
project/
├── backend/
│   ├── nixpacks.toml
│   └── requirements.txt
├── frontend/
│   ├── nixpacks.toml
│   └── package.json
└── railway.toml  # Optional: multi-service config
```

Configure service references:
```bash
# In frontend service
VITE_API_URL=https://${{backend.RAILWAY_PUBLIC_DOMAIN}}

# In backend service
FRONTEND_URL=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}
```

### Database Migration Strategy

```toml
# nixpacks.toml
[phases.build]
cmds = [
  'pip install -r requirements.txt',
  'alembic upgrade head'  # Run migrations during build
]
```

**Alternative: Separate migration service**
```bash
# Create one-off migration job
railway run alembic upgrade head
```

## nixpacks Configuration Patterns

### Python + PostgreSQL

```toml
[phases.setup]
nixPkgs = ['python310', 'postgresql']
nixLibs = ['libpq']

[phases.install]
cmds = ['pip install -r requirements.txt']

[start]
cmd = 'uvicorn main:app --host 0.0.0.0 --port $PORT'
```

### Node.js + TypeScript

```toml
[phases.setup]
nixPkgs = ['nodejs-18_x']

[phases.install]
cmds = ['npm ci']

[phases.build]
cmds = ['npm run build']

[start]
cmd = 'node dist/index.js'
```

### Full-Stack (Python Backend + React Frontend)

```toml
[phases.setup]
nixPkgs = ['python310', 'nodejs-18_x', 'postgresql']
nixLibs = ['libpq']

[phases.install]
cmds = [
  'pip install -r requirements.txt',
  'cd frontend && npm ci'
]

[phases.build]
cmds = [
  'cd frontend && npm run build',
  'alembic upgrade head'
]

[start]
cmd = 'gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT'
```

## Environment Variable Patterns

### Database Connection
```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
DATABASE_PRIVATE_URL=${{Postgres.DATABASE_PRIVATE_URL}}
```

### Redis Connection
```bash
REDIS_URL=${{Redis.REDIS_URL}}
REDIS_PRIVATE_URL=${{Redis.REDIS_PRIVATE_URL}}
```

### Service-to-Service Communication
```bash
# Use private networking for internal communication
BACKEND_PRIVATE_URL=http://${{backend.RAILWAY_PRIVATE_DOMAIN}}
BACKEND_PUBLIC_URL=https://${{backend.RAILWAY_PUBLIC_DOMAIN}}
```

### Application Configuration
```bash
# Environment
ENVIRONMENT=production
DEBUG=false

# Security
JWT_SECRET_KEY=${{secrets.JWT_SECRET}}
ALLOWED_HOSTS=${{RAILWAY_PUBLIC_DOMAIN}}

# CORS
CORS_ORIGINS=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}
```

## Troubleshooting Guide

### Build Failures

**Error: "Package not found"**
- Add missing package to nixPkgs in nixpacks.toml
- Check nixpkgs search: https://search.nixos.org/packages

**Error: "Command failed"**
- Check build logs for specific error
- Verify commands work locally
- Ensure correct working directory

### Runtime Failures

**Error: "Application failed to respond"**
- Verify binding to `0.0.0.0` not `localhost`
- Check PORT environment variable usage
- Ensure health check endpoint exists

**Error: "Database connection failed"**
- Verify DATABASE_URL is set
- Check database service is running
- Use private URL for better performance

### Deployment Best Practices

1. **Always test locally first**
   ```bash
   nixpacks build . --name myapp
   docker run -p 8000:8000 myapp
   ```

2. **Use railway.toml for monorepos**
   ```toml
   [build]
   builder = "nixpacks"
   buildCommand = "cd backend && pip install -r requirements.txt"

   [deploy]
   startCommand = "cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT"
   restartPolicyType = "on-failure"
   ```

3. **Set up health checks**
   ```python
   @app.get("/health")
   async def health():
       # Check database connection
       try:
           await db.execute("SELECT 1")
           return {"status": "healthy", "database": "connected"}
       except:
           return {"status": "unhealthy", "database": "disconnected"}
   ```

4. **Configure logging**
   ```python
   import logging
   logging.basicConfig(
       level=logging.INFO,
       format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
   )
   ```

5. **Use Railway CLI for debugging**
   ```bash
   railway login
   railway link  # Link to your project
   railway logs  # View logs
   railway run python manage.py shell  # Run commands
   ```

## Production Deployment Checklist

### Pre-Deployment
- [ ] All environment variables configured in Railway
- [ ] Database migrations tested locally
- [ ] nixpacks.toml configured and tested
- [ ] Health check endpoint implemented
- [ ] CORS configured for production domains
- [ ] Secrets stored in Railway secrets (not env vars)
- [ ] Logging configured
- [ ] Error tracking configured (Sentry, etc.)

### During Deployment
- [ ] Monitor build logs in Railway dashboard
- [ ] Watch for build phase completion
- [ ] Verify deployment status shows "Active"
- [ ] Check health endpoint responds

### Post-Deployment
- [ ] Test critical user flows
- [ ] Verify database connectivity
- [ ] Check external API integrations
- [ ] Monitor error rates in logs
- [ ] Test authentication flows
- [ ] Verify static assets loading
- [ ] Check performance metrics

### Rollback Procedure
1. Go to Railway dashboard
2. Navigate to deployments tab
3. Click "Redeploy" on previous working deployment
4. Monitor rollback completion
5. Verify application health

## Advanced Patterns

### Zero-Downtime Deployments
Railway handles this automatically with:
- Health check monitoring
- Gradual traffic shifting
- Automatic rollback on health check failures

### Custom Domains
```bash
# Add custom domain in Railway dashboard
# Configure DNS:
CNAME record: your-domain.com -> your-app.up.railway.app
```

### Private Networking
Use Railway's private networking for service-to-service communication:
```bash
# Faster and more secure than public URLs
INTERNAL_API_URL=http://${{backend.RAILWAY_PRIVATE_DOMAIN}}
```

### Environment-Specific Configuration
```bash
# Use Railway environments (production, staging)
# Configure different variables per environment
ENVIRONMENT=${{RAILWAY_ENVIRONMENT}}
```

## Common Integration Patterns

### PostgreSQL
```python
from sqlalchemy import create_engine
import os

DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL and DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://')

engine = create_engine(DATABASE_URL)
```

### Redis
```python
import os
import redis

REDIS_URL = os.environ.get('REDIS_URL')
redis_client = redis.from_url(REDIS_URL)
```

### File Storage (Railway Volumes)
```toml
# railway.toml
[deploy]
volumes = [
  { name = "data", mountPath = "/app/data" }
]
```

## Monitoring and Observability

### Logging Best Practices
```python
import logging
import sys

logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format='{"time": "%(asctime)s", "level": "%(levelname)s", "message": "%(message)s"}'
)
```

### Metrics Collection
```python
from prometheus_client import Counter, Histogram, generate_latest

request_count = Counter('http_requests_total', 'Total HTTP requests')
request_duration = Histogram('http_request_duration_seconds', 'HTTP request duration')

@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type="text/plain")
```

## Railway CLI Commands

```bash
# Login and setup
railway login
railway link

# Deployment
railway up  # Deploy current directory
railway up --detach  # Deploy without streaming logs

# Environment management
railway variables set KEY=value
railway variables delete KEY

# Logs and debugging
railway logs
railway logs --deployment <id>
railway shell  # Open shell in deployment

# Service management
railway service  # List services
railway domain  # Manage domains
```

## Security Considerations

1. **Never commit secrets** - Use Railway secrets
2. **Use HTTPS only** - Railway provides automatic SSL
3. **Configure CORS properly** - Restrict to known domains
4. **Validate environment variables** - Check all required vars on startup
5. **Use private networking** - For service-to-service communication
6. **Enable Railway's Web Application Firewall** - If available
7. **Rotate secrets regularly** - Update JWT keys, API keys, etc.

## Performance Optimization

### Build Time Optimization
```toml
[phases.install]
# Use caching for faster rebuilds
cmds = [
  'pip install --cache-dir /root/.cache/pip -r requirements.txt'
]
```

### Runtime Optimization
```python
# Use production-grade servers
# Gunicorn with Uvicorn workers for async Python
import multiprocessing

workers = multiprocessing.cpu_count() * 2 + 1
worker_class = 'uvicorn.workers.UvicornWorker'
```

### Database Connection Pooling
```python
from sqlalchemy import create_engine

engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True  # Verify connections before use
)
```

## Skill Output Format

When using this skill, provide:

1. **nixpacks.toml configuration** - Customized for the project
2. **Environment variable list** - All required variables with Railway references
3. **Deployment command** - Exact commands to run
4. **Health check implementation** - Code for monitoring
5. **Troubleshooting steps** - For any potential issues
6. **Rollback procedure** - How to revert if needed

## References

See the `references/` directory for detailed documentation on:
- nixpacks configuration patterns
- Environment variable management
- Troubleshooting guides
- Production deployment checklists
