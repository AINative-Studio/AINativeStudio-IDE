# nixpacks Configuration Reference

Complete guide to nixpacks configuration for Railway deployments.

## Basic Structure

```toml
[phases.setup]
nixPkgs = []      # System packages to install
nixLibs = []      # System libraries to link
nixOverlays = []  # Nix overlays to apply

[phases.install]
cmds = []         # Commands to install dependencies

[phases.build]
cmds = []         # Commands to build the application

[start]
cmd = ""          # Command to start the application
```

## Language-Specific Configurations

### Python Applications

#### Basic Python App
```toml
[phases.setup]
nixPkgs = ['python310']

[phases.install]
cmds = ['pip install -r requirements.txt']

[start]
cmd = 'python main.py'
```

#### Python with PostgreSQL
```toml
[phases.setup]
nixPkgs = ['python310', 'postgresql']
nixLibs = ['libpq']

[phases.install]
cmds = [
  'pip install --upgrade pip',
  'pip install -r requirements.txt'
]

[start]
cmd = 'uvicorn main:app --host 0.0.0.0 --port $PORT'
```

#### FastAPI with Gunicorn
```toml
[phases.setup]
nixPkgs = ['python310', 'postgresql']
nixLibs = ['libpq']

[phases.install]
cmds = ['pip install -r requirements.txt']

[phases.build]
cmds = [
  'alembic upgrade head',
  'python -m compileall .'
]

[start]
cmd = 'gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120'
```

#### Django Application
```toml
[phases.setup]
nixPkgs = ['python310', 'postgresql']
nixLibs = ['libpq']

[phases.install]
cmds = ['pip install -r requirements.txt']

[phases.build]
cmds = [
  'python manage.py collectstatic --noinput',
  'python manage.py migrate'
]

[start]
cmd = 'gunicorn myproject.wsgi:application --bind 0.0.0.0:$PORT --workers 4'
```

### Node.js Applications

#### Basic Node.js App
```toml
[phases.setup]
nixPkgs = ['nodejs-18_x']

[phases.install]
cmds = ['npm ci']

[start]
cmd = 'node index.js'
```

#### TypeScript Node.js App
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

#### Next.js Application
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

#### Express.js API
```toml
[phases.setup]
nixPkgs = ['nodejs-18_x']

[phases.install]
cmds = ['npm ci --production=false']

[phases.build]
cmds = ['npm run build']

[start]
cmd = 'NODE_ENV=production node dist/server.js'
```

### Full-Stack Applications

#### Python Backend + React Frontend
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
cmd = 'uvicorn main:app --host 0.0.0.0 --port $PORT'
```

#### Node.js Backend + Vue.js Frontend
```toml
[phases.setup]
nixPkgs = ['nodejs-18_x', 'postgresql']

[phases.install]
cmds = [
  'npm ci',
  'cd client && npm ci'
]

[phases.build]
cmds = [
  'npm run build',
  'cd client && npm run build'
]

[start]
cmd = 'node dist/server.js'
```

## Common System Dependencies

### Database Clients

#### PostgreSQL
```toml
[phases.setup]
nixPkgs = ['postgresql']
nixLibs = ['libpq']
```

#### MySQL
```toml
[phases.setup]
nixPkgs = ['mysql80']
nixLibs = ['libmysqlclient']
```

#### MongoDB
```toml
[phases.setup]
nixPkgs = ['mongodb']
```

### Image Processing

#### ImageMagick
```toml
[phases.setup]
nixPkgs = ['imagemagick']
```

#### GraphicsMagick
```toml
[phases.setup]
nixPkgs = ['graphicsmagick']
```

#### Pillow/PIL (Python)
```toml
[phases.setup]
nixPkgs = ['python310', 'libjpeg', 'zlib', 'libtiff', 'freetype', 'lcms2', 'libwebp']
nixLibs = ['libjpeg', 'zlib']
```

### Cryptography

#### OpenSSL
```toml
[phases.setup]
nixPkgs = ['openssl', 'pkg-config']
nixLibs = ['openssl']
```

### Compression

#### Various formats
```toml
[phases.setup]
nixPkgs = ['gzip', 'bzip2', 'xz']
```

### Build Tools

#### C/C++ Compilation
```toml
[phases.setup]
nixPkgs = ['gcc', 'gnumake', 'pkg-config']
```

#### Python Development
```toml
[phases.setup]
nixPkgs = ['python310', 'python310Packages.pip', 'python310Packages.setuptools']
```

## Advanced Patterns

### Multi-Stage Builds

```toml
[phases.setup]
nixPkgs = ['python310', 'nodejs-18_x', 'postgresql', 'gcc']
nixLibs = ['libpq']

[phases.install]
cmds = [
  # Install Python dependencies
  'pip install --upgrade pip setuptools wheel',
  'pip install -r requirements.txt',

  # Install Node.js dependencies
  'cd frontend && npm ci'
]

[phases.build]
cmds = [
  # Build frontend
  'cd frontend && npm run build',

  # Run database migrations
  'alembic upgrade head',

  # Compile Python code
  'python -m compileall -b .',

  # Clean up
  'rm -rf frontend/node_modules frontend/src'
]

[start]
cmd = 'gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT'
```

### Conditional Builds

```toml
[phases.setup]
nixPkgs = ['python310', 'postgresql']
nixLibs = ['libpq']

[phases.install]
cmds = [
  'if [ "$ENVIRONMENT" = "production" ]; then pip install -r requirements-prod.txt; else pip install -r requirements.txt; fi'
]

[phases.build]
cmds = [
  'if [ "$RUN_MIGRATIONS" = "true" ]; then alembic upgrade head; fi'
]

[start]
cmd = 'uvicorn main:app --host 0.0.0.0 --port $PORT --workers ${WORKERS:-4}'
```

### Caching Strategies

```toml
[phases.setup]
nixPkgs = ['python310', 'postgresql']
nixLibs = ['libpq']

[phases.install]
# Use pip cache for faster rebuilds
cmds = [
  'pip install --cache-dir /root/.cache/pip --upgrade pip',
  'pip install --cache-dir /root/.cache/pip -r requirements.txt'
]

[phases.build]
cmds = [
  'python -m compileall -b .',
  'find . -name "*.py" -delete'  # Remove .py files, keep .pyc
]

[start]
cmd = 'uvicorn main:app --host 0.0.0.0 --port $PORT'
```

## Environment-Specific Configurations

### Development vs Production

```toml
[phases.setup]
nixPkgs = ['python310', 'postgresql']
nixLibs = ['libpq']

[phases.install]
cmds = [
  'pip install -r requirements.txt',
  # Install dev dependencies only in non-production
  'if [ "$ENVIRONMENT" != "production" ]; then pip install -r requirements-dev.txt; fi'
]

[phases.build]
cmds = [
  'alembic upgrade head',
  # Skip compilation in development for faster rebuilds
  'if [ "$ENVIRONMENT" = "production" ]; then python -m compileall .; fi'
]

[start]
# Use different worker counts based on environment
cmd = 'uvicorn main:app --host 0.0.0.0 --port $PORT --workers ${WORKERS:-1} --reload ${HOT_RELOAD:-false}'
```

## Troubleshooting Common Issues

### Missing Libraries

**Problem:** `ImportError: libpq.so.5: cannot open shared object file`

**Solution:**
```toml
[phases.setup]
nixPkgs = ['postgresql']
nixLibs = ['libpq']  # Add this line
```

### Python Version Issues

**Problem:** `ERROR: This package requires Python 3.10+`

**Solution:**
```toml
[phases.setup]
nixPkgs = ['python310']  # Specify exact version, not 'python3'
```

### Build Timeouts

**Problem:** Build exceeds time limit

**Solution:**
```toml
[phases.install]
cmds = [
  # Use faster package manager options
  'pip install --no-cache-dir -r requirements.txt',
  'npm ci --prefer-offline'
]

[phases.build]
cmds = [
  # Parallelize builds
  'npm run build -- --max-workers=2'
]
```

### Node Version Conflicts

**Problem:** `The engine "node" is incompatible`

**Solution:**
```toml
[phases.setup]
nixPkgs = ['nodejs-18_x']  # Match required Node version
```

### Memory Issues During Build

**Problem:** Build runs out of memory

**Solution:**
```toml
[phases.build]
cmds = [
  # Limit concurrent operations
  'NODE_OPTIONS=--max-old-space-size=2048 npm run build',
  # Or use lighter build tools
  'vite build --mode production'
]
```

## Best Practices

### 1. Pin Specific Versions
```toml
[phases.setup]
nixPkgs = ['python310']  # Not 'python3'
nixPkgs = ['nodejs-18_x']  # Not 'nodejs'
```

### 2. Separate Install and Build
```toml
[phases.install]
cmds = ['pip install -r requirements.txt']  # Dependencies only

[phases.build]
cmds = ['alembic upgrade head']  # Application-specific builds
```

### 3. Clean Up After Build
```toml
[phases.build]
cmds = [
  'npm run build',
  'rm -rf node_modules',  # Remove if not needed at runtime
  'npm ci --production'   # Reinstall only production deps
]
```

### 4. Use Build Caching
```toml
[phases.install]
cmds = [
  'pip install --cache-dir /root/.cache/pip -r requirements.txt',
  'npm ci --cache /root/.npm'
]
```

### 5. Validate Before Start
```toml
[phases.build]
cmds = [
  'npm run build',
  'npm run test:build',  # Validate build output
  'python -m compileall -q .'  # Check for syntax errors
]
```

## nixpacks CLI Testing

Test your configuration locally before deploying:

```bash
# Install nixpacks
curl -sSL https://nixpacks.com/install.sh | bash

# Build your application
nixpacks build . --name myapp

# Run the built image
docker run -p 8000:8000 -e PORT=8000 myapp

# Test with environment variables
docker run -p 8000:8000 \
  -e PORT=8000 \
  -e DATABASE_URL=postgresql://localhost/mydb \
  myapp

# View generated Dockerfile
nixpacks plan .
```

## Version Compatibility

### Python Versions
- `python38` - Python 3.8
- `python39` - Python 3.9
- `python310` - Python 3.10
- `python311` - Python 3.11
- `python312` - Python 3.12

### Node.js Versions
- `nodejs-16_x` - Node.js 16
- `nodejs-18_x` - Node.js 18 (LTS)
- `nodejs-20_x` - Node.js 20 (LTS)

### PostgreSQL Versions
- `postgresql` - Latest stable
- `postgresql_15` - PostgreSQL 15
- `postgresql_14` - PostgreSQL 14

Search for packages: https://search.nixos.org/packages
