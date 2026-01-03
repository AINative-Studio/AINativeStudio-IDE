# Railway Deployment Skill

Official AINative Studio skill for Railway deployment workflows, nixpacks configuration, environment management, and production troubleshooting.

## Overview

This skill provides comprehensive guidance for deploying applications to Railway, including build configuration, environment variable management, troubleshooting, and production deployment best practices.

## Installation

### Using AINative Studio CLI

```bash
ainative skill install @ainative/skill-railway-deployment
```

### Manual Installation

1. Clone or download this skill directory
2. Place it in your AINative Studio skills folder:
   ```bash
   cp -r railway-deployment ~/.ainative/skills/
   ```

## When to Use This Skill

Use this skill when you need help with:

- Deploying applications to Railway platform
- Configuring nixpacks.toml for custom builds
- Managing environment variables across services
- Debugging deployment failures
- Setting up multi-service Railway projects
- Troubleshooting production issues
- Configuring database migrations on Railway
- Setting up health checks and monitoring

## Quick Start

### Basic Python Deployment

Create `nixpacks.toml` in your project root:

```toml
[phases.setup]
nixPkgs = ['python310', 'postgresql']
nixLibs = ['libpq']

[phases.install]
cmds = ['pip install -r requirements.txt']

[start]
cmd = 'uvicorn main:app --host 0.0.0.0 --port $PORT'
```

Configure environment variables:
```bash
railway variables set DATABASE_URL=${{Postgres.DATABASE_URL}}
railway variables set ENVIRONMENT=production
railway variables set DEBUG=false
```

Deploy:
```bash
railway up
```

### Basic Node.js Deployment

Create `nixpacks.toml`:

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

Deploy:
```bash
railway up
```

## Skill Contents

### Main Documentation

- **SKILL.md** - Complete skill guide with:
  - Core deployment principles
  - Common workflows
  - nixpacks configuration patterns
  - Environment variable management
  - Troubleshooting guide
  - Best practices

### Reference Documentation

- **nixpacks-config.md** - Comprehensive nixpacks configuration patterns
  - Language-specific configurations (Python, Node.js, etc.)
  - Common system dependencies
  - Multi-stage builds
  - Caching strategies
  - Version compatibility

- **env-management.md** - Environment variable management
  - Railway variable types
  - Database configuration
  - Service-to-service communication
  - Secret management
  - External API integration
  - Validation and defaults

- **troubleshooting.md** - Common deployment issues and solutions
  - Build failures
  - Runtime failures
  - Database connection issues
  - CORS errors
  - Performance issues
  - Rollback procedures

- **production-checklist.md** - Complete deployment checklist
  - Pre-deployment verification
  - Deployment process
  - Post-deployment monitoring
  - Security audit
  - Rollback procedures

## Common Use Cases

### Multi-Service Deployment

Deploy frontend and backend separately with service references:

**Backend (FastAPI):**
```bash
# Environment variables
CORS_ORIGINS=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

**Frontend (React):**
```bash
# Environment variables
VITE_API_URL=https://${{backend.RAILWAY_PUBLIC_DOMAIN}}
```

### Database Migration on Deploy

```toml
[phases.build]
cmds = [
  'pip install -r requirements.txt',
  'alembic upgrade head'
]
```

### Production-Ready Configuration

```toml
[phases.setup]
nixPkgs = ['python310', 'postgresql']
nixLibs = ['libpq']

[phases.install]
cmds = [
  'pip install --upgrade pip',
  'pip install -r requirements.txt'
]

[phases.build]
cmds = [
  'alembic upgrade head',
  'python -m compileall .'
]

[start]
cmd = 'gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120'
```

## Key Concepts

### nixpacks Build Phases

1. **Setup** - Install system packages
2. **Install** - Install application dependencies
3. **Build** - Build application (compile, bundle, etc.)
4. **Start** - Command to start the application

### Railway Environment Variables

- **Service References**: `${{ServiceName.VARIABLE}}`
- **Railway Secrets**: Encrypted storage for sensitive data
- **System Variables**: `PORT`, `RAILWAY_ENVIRONMENT`, `RAILWAY_PUBLIC_DOMAIN`

### Health Checks

Always implement a health check endpoint:

```python
@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

### Port Binding

Always bind to Railway's PORT variable and 0.0.0.0:

```python
import os
port = int(os.environ.get('PORT', 8000))
uvicorn.run(app, host='0.0.0.0', port=port)
```

## Troubleshooting Quick Reference

### Build Failed
1. Check nixpacks.toml syntax
2. Verify all nixPkgs are spelled correctly
3. Review build logs: `railway logs | grep build`

### Application Not Responding
1. Verify binding to `0.0.0.0:$PORT`
2. Check health endpoint exists
3. Review application logs: `railway logs`

### Database Connection Failed
1. Verify DATABASE_URL is set: `railway variables`
2. Check database service is running
3. Use private URL for better performance

### Environment Variable Not Found
1. List all variables: `railway variables`
2. Redeploy to pick up changes: `railway up`

## Railway CLI Reference

```bash
# Login and setup
railway login
railway link

# Deployment
railway up                    # Deploy current directory
railway up --detach          # Deploy without streaming logs

# Environment management
railway variables            # List all variables
railway variables set KEY=value
railway variables delete KEY

# Debugging
railway logs                 # View logs
railway logs --follow        # Stream logs
railway run <command>        # Run command in deployment
railway shell               # Open shell

# Service management
railway status              # Check service status
railway domain             # Manage custom domains
```

## Best Practices

1. **Always test locally** with nixpacks before deploying
2. **Use Railway secrets** for sensitive data
3. **Implement health checks** for monitoring
4. **Use private domains** for service-to-service communication
5. **Enable logging** for debugging and monitoring
6. **Document environment variables** in `.env.example`
7. **Test migrations** before running in production
8. **Implement rollback procedures** for critical deployments

## Examples

### FastAPI + PostgreSQL + Redis

```toml
[phases.setup]
nixPkgs = ['python310', 'postgresql']
nixLibs = ['libpq']

[phases.install]
cmds = ['pip install -r requirements.txt']

[phases.build]
cmds = ['alembic upgrade head']

[start]
cmd = 'uvicorn main:app --host 0.0.0.0 --port $PORT --workers 4'
```

Environment:
```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
JWT_SECRET=${{secrets.JWT_SECRET}}
CORS_ORIGINS=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}
```

### Next.js Full-Stack

```toml
[phases.setup]
nixPkgs = ['nodejs-18_x']

[phases.install]
cmds = ['npm ci']

[phases.build]
cmds = ['npm run build']

[start]
cmd = 'npm start'
```

Environment:
```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
NEXTAUTH_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
NEXTAUTH_SECRET=${{secrets.NEXTAUTH_SECRET}}
```

## Contributing

Found an issue or have a suggestion? Please contribute:

1. Open an issue with deployment scenario
2. Submit pull request with improvements
3. Share your Railway configuration patterns

## Support

- Railway Documentation: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- AINative Studio Discord: [Your Discord link]

## License

MIT License - see LICENSE file for details

## Version History

### 1.0.0 (2026-01-03)
- Initial release
- Complete nixpacks configuration guide
- Environment variable management patterns
- Comprehensive troubleshooting guide
- Production deployment checklist
- Railway CLI reference
- Multi-service deployment examples

## Related Skills

- `@ainative/skill-postgresql-data-modeling` - Database design and optimization
- `@ainative/skill-fastapi-development` - FastAPI application development
- `@ainative/skill-github-oauth` - OAuth integration patterns

## Acknowledgments

Built with expertise from real-world Railway deployments and best practices from the Railway community.
