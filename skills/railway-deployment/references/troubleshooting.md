# Railway Deployment Troubleshooting

Comprehensive troubleshooting guide for common Railway deployment issues.

## Build Failures

### nixpacks Build Failed

**Error Message:**
```
nixpacks build failed with exit code 1
```

**Common Causes:**

1. **Missing System Dependencies**

   **Solution:**
   ```toml
   [phases.setup]
   nixPkgs = ['python310', 'postgresql', 'gcc', 'pkg-config']
   nixLibs = ['libpq', 'openssl']
   ```

2. **Wrong Package Names**

   **Solution:**
   Search for correct package names at https://search.nixos.org/packages
   ```toml
   [phases.setup]
   # Wrong: postgres
   # Correct: postgresql
   nixPkgs = ['postgresql']
   ```

3. **Build Command Failures**

   **Debug:**
   ```toml
   [phases.install]
   cmds = [
     'echo "Installing dependencies..."',
     'pip install -r requirements.txt',
     'echo "Installation complete"'
   ]
   ```

### Dependency Installation Failures

**Error: "Package not found" (Python)**

**Solution:**
```bash
# Check requirements.txt for typos
pip install -r requirements.txt

# Pin versions
Django==4.2.0  # Not Django>=4.0
```

**Error: "npm ERR! code ERESOLVE" (Node.js)**

**Solution:**
```bash
# Use exact versions in package.json
{
  "dependencies": {
    "react": "18.2.0",  // Not "^18.2.0"
  }
}

# Or use --legacy-peer-deps
```

```toml
[phases.install]
cmds = ['npm install --legacy-peer-deps']
```

### Compilation Errors

**Error: "Cannot find module" (TypeScript)**

**Solution:**
```toml
[phases.install]
cmds = ['npm ci']

[phases.build]
cmds = [
  'npm run build',
  'ls -la dist/'  # Verify build output
]
```

**Check tsconfig.json:**
```json
{
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

### Database Migration Failures

**Error: "Migration failed"**

**Solution:**
```toml
[phases.build]
cmds = [
  # Check database connection first
  'python -c "import psycopg2; psycopg2.connect(os.environ[\"DATABASE_URL\"])"',
  # Then run migrations
  'alembic upgrade head'
]
```

**Alternative: Run migrations separately**
```bash
# Don't run migrations in build phase
# Instead, run after deployment
railway run alembic upgrade head
```

## Runtime Failures

### Application Failed to Respond

**Error Message:**
```
Application failed to respond on port 3000
```

**Common Causes:**

1. **Not Binding to PORT Environment Variable**

   **Solution:**
   ```python
   import os
   import uvicorn

   port = int(os.environ.get('PORT', 8000))
   uvicorn.run(app, host='0.0.0.0', port=port)
   ```

   ```javascript
   const port = process.env.PORT || 3000;
   app.listen(port, '0.0.0.0');
   ```

2. **Binding to localhost Instead of 0.0.0.0**

   ❌ **Wrong:**
   ```python
   uvicorn.run(app, host='localhost', port=port)
   ```

   ✅ **Correct:**
   ```python
   uvicorn.run(app, host='0.0.0.0', port=port)
   ```

3. **Application Crashing on Startup**

   **Debug:**
   ```bash
   railway logs
   ```

   **Check for:**
   - Missing environment variables
   - Database connection failures
   - Syntax errors
   - Missing dependencies

### Port Binding Errors

**Error: "Port already in use"**

**Solution:**
Ensure you're using Railway's PORT variable:
```python
import os
port = int(os.environ.get('PORT', 8000))
```

**Error: "Permission denied to bind port 80"**

**Solution:**
Never hardcode port 80 or 443. Use Railway's PORT variable.

### Health Check Failures

**Error: "Health check timeout"**

**Solution:**
1. Implement health check endpoint:
   ```python
   @app.get("/health")
   async def health():
       return {"status": "healthy"}
   ```

2. Ensure endpoint responds quickly:
   ```python
   @app.get("/health")
   async def health():
       try:
           # Simple DB ping
           await db.execute("SELECT 1")
           return {"status": "healthy"}
       except Exception as e:
           return {"status": "unhealthy", "error": str(e)}
   ```

## Database Connection Issues

### Cannot Connect to Database

**Error: "FATAL: password authentication failed"**

**Check:**
```bash
# Verify DATABASE_URL is set
railway variables | grep DATABASE_URL

# Test connection
railway run python -c "import psycopg2; psycopg2.connect(os.environ['DATABASE_URL'])"
```

**Solution:**
```python
import os
from sqlalchemy import create_engine

DATABASE_URL = os.environ.get('DATABASE_URL')

# Handle postgres:// vs postgresql://
if DATABASE_URL and DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

engine = create_engine(DATABASE_URL)
```

### SSL Connection Required

**Error: "SSL connection required"**

**Solution:**
```python
engine = create_engine(
    DATABASE_URL,
    connect_args={
        'sslmode': 'require'
    }
)
```

```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
```

### Connection Pool Exhausted

**Error: "Too many connections"**

**Solution:**
```python
from sqlalchemy import create_engine

engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=3600
)
```

### Database Timeout

**Error: "Connection timeout"**

**Solution:**
```python
engine = create_engine(
    DATABASE_URL,
    connect_args={
        'connect_timeout': 10
    }
)
```

## Environment Variable Issues

### Variable Not Found

**Error: "KeyError: 'DATABASE_URL'"**

**Solution:**
```python
import os

DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    raise ValueError('DATABASE_URL environment variable is required')
```

**Check in Railway:**
```bash
railway variables
```

### Service Reference Not Resolving

**Error: "${{Postgres.DATABASE_URL}}" appearing as literal string**

**Solution:**
1. Check service name is correct (case-sensitive)
2. Ensure service is deployed
3. Verify variable exists in referenced service
4. Redeploy to pick up changes

### Environment Variable Not Updating

**Problem:** Changed variable but app still uses old value

**Solution:**
```bash
# Trigger new deployment
railway up --detach
```

## CORS Errors

### CORS Policy Blocking Requests

**Error in browser:**
```
Access to fetch at 'https://api.railway.app' from origin 'https://frontend.railway.app'
has been blocked by CORS policy
```

**Solution (Python FastAPI):**
```python
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI()

origins = os.environ.get('CORS_ORIGINS', '').split(',')

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Solution (Express.js):**
```javascript
const cors = require('cors');

const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
};

app.use(cors(corsOptions));
```

**Set environment variable:**
```bash
CORS_ORIGINS=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}
```

## Static File Issues

### Static Files Not Found (404)

**Problem:** CSS, JS, images not loading

**Solution (Django):**
```python
# settings.py
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATIC_URL = '/static/'

# Run in build phase
python manage.py collectstatic --noinput
```

**Solution (Express):**
```javascript
app.use(express.static('public'));
app.use('/static', express.static('dist'));
```

### Incorrect Static File Paths

**Problem:** Assets loading from wrong domain

**Solution (React/Vite):**
```javascript
// vite.config.js
export default defineConfig({
  base: '/',  // Use root path
  build: {
    outDir: 'dist',
  },
});
```

**Solution (Next.js):**
```javascript
// next.config.js
module.exports = {
  assetPrefix: process.env.NODE_ENV === 'production'
    ? 'https://cdn.example.com'
    : '',
};
```

## Memory Issues

### Out of Memory During Build

**Error: "JavaScript heap out of memory"**

**Solution:**
```toml
[phases.build]
cmds = [
  'NODE_OPTIONS=--max-old-space-size=4096 npm run build'
]
```

### Application Crashing Due to Memory

**Error: "Killed" or "Out of memory"**

**Solution:**
1. Upgrade Railway plan for more memory
2. Optimize application memory usage
3. Use streaming for large data processing
4. Implement pagination for database queries

**Monitor memory:**
```python
import psutil
import logging

process = psutil.Process()
memory_mb = process.memory_info().rss / 1024 / 1024
logging.info(f"Memory usage: {memory_mb:.2f} MB")
```

## Performance Issues

### Slow Response Times

**Diagnosis:**
```bash
# Check logs for slow queries
railway logs | grep "slow"

# Monitor response times
curl -w "@curl-format.txt" -o /dev/null -s https://your-app.railway.app
```

**curl-format.txt:**
```
time_namelookup:  %{time_namelookup}\n
time_connect:  %{time_connect}\n
time_appconnect:  %{time_appconnect}\n
time_pretransfer:  %{time_pretransfer}\n
time_redirect:  %{time_redirect}\n
time_starttransfer:  %{time_starttransfer}\n
----------\n
time_total:  %{time_total}\n
```

**Solutions:**

1. **Add Database Indexing:**
   ```sql
   CREATE INDEX idx_users_email ON users(email);
   ```

2. **Implement Caching:**
   ```python
   from functools import lru_cache

   @lru_cache(maxsize=100)
   def get_expensive_data(key):
       # Expensive operation
       return data
   ```

3. **Use Connection Pooling:**
   ```python
   engine = create_engine(
       DATABASE_URL,
       pool_size=20,
       max_overflow=0
   )
   ```

4. **Optimize Queries:**
   ```python
   # Bad: N+1 queries
   for user in users:
       posts = user.posts  # Separate query each time

   # Good: Eager loading
   users = db.query(User).options(joinedload(User.posts)).all()
   ```

### Cold Start Issues

**Problem:** First request is very slow

**Solution:**
1. Keep service warm with uptime monitoring (UptimeRobot, etc.)
2. Implement health check endpoint
3. Use Railway's always-on feature (paid plans)

## SSL/TLS Issues

### HTTPS Certificate Errors

**Problem:** SSL certificate warnings

**Solution:**
Railway provides automatic SSL. Ensure you're using:
- Railway-provided domain: `*.up.railway.app`
- Custom domain with proper DNS configuration

**Custom domain setup:**
1. Add custom domain in Railway dashboard
2. Update DNS:
   ```
   CNAME: your-domain.com -> your-app.up.railway.app
   ```
3. Wait for SSL certificate provisioning (automatic)

### Mixed Content Warnings

**Problem:** HTTPS page loading HTTP resources

**Solution:**
```javascript
// Use protocol-relative URLs or HTTPS
const API_URL = process.env.API_URL || 'https://api.example.com';

// Not: http://api.example.com
```

## Logging and Debugging

### Enable Detailed Logging

**Python:**
```python
import logging
import sys

logging.basicConfig(
    level=logging.DEBUG if os.getenv('DEBUG') == 'true' else logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)

logger = logging.getLogger(__name__)
logger.info("Application starting...")
```

**Node.js:**
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console()
  ]
});

logger.info('Application starting...');
```

### View Logs

```bash
# View recent logs
railway logs

# Follow logs in real-time
railway logs --follow

# View specific deployment
railway logs --deployment <deployment-id>
```

### Debug Build Failures

```bash
# View build logs
railway logs | grep "build"

# Check specific phase
railway logs | grep "install"
```

## Rollback Procedures

### Quick Rollback

1. **Via Railway Dashboard:**
   - Go to Deployments tab
   - Find last working deployment
   - Click "Redeploy"

2. **Via CLI:**
   ```bash
   # List deployments
   railway status

   # Redeploy specific version
   railway redeploy <deployment-id>
   ```

### Emergency Rollback

**If application is completely down:**
```bash
# Redeploy previous working version immediately
railway redeploy <previous-deployment-id>

# Fix issues locally
# Deploy fix when ready
railway up
```

## Service-Specific Issues

### Redis Connection Refused

**Error: "Connection refused to Redis"**

**Solution:**
```bash
# Verify Redis service is running
railway status

# Check REDIS_URL is set
railway variables | grep REDIS

# Test connection
railway run python -c "import redis; r = redis.from_url(os.environ['REDIS_URL']); print(r.ping())"
```

### File Upload Issues

**Problem:** File uploads failing

**Solution:**
Railway doesn't have persistent storage by default. Use:
1. Railway Volumes
2. External storage (S3, Cloudinary)

**S3 Example:**
```python
import boto3
import os

s3 = boto3.client(
    's3',
    aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY')
)

s3.upload_fileobj(file, bucket_name, object_name)
```

## Common Checklist for Failures

When deployment fails, check:

- [ ] All required environment variables are set
- [ ] nixpacks.toml is properly configured
- [ ] Application binds to `0.0.0.0:$PORT`
- [ ] Database service is running and accessible
- [ ] Health check endpoint exists and responds
- [ ] Build logs show successful completion
- [ ] Dependencies are properly installed
- [ ] No hardcoded localhost or port references
- [ ] CORS is configured for production domain
- [ ] Database migrations completed successfully

## Getting Help

### Railway Community
- Discord: https://discord.gg/railway
- GitHub Discussions: https://github.com/railwayapp/railway/discussions
- Documentation: https://docs.railway.app

### Debugging Commands
```bash
# Check service status
railway status

# View all variables
railway variables

# Test commands in deployment environment
railway run <command>

# Open shell in deployment
railway shell

# View recent deployments
railway deployments
```

### Collect Debugging Information

When asking for help, provide:
1. Build logs: `railway logs | grep build`
2. Runtime logs: `railway logs --follow`
3. nixpacks.toml configuration
4. Environment variables (without sensitive values)
5. Error messages (full stack trace)
6. Railway service status
