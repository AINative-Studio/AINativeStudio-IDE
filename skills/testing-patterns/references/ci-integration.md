# CI/CD Integration for Testing

Complete guide to integrating testing into GitHub Actions CI/CD pipelines with coverage reporting and quality gates.

## GitHub Actions Test Workflow

### Basic Test Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  backend-tests:
    name: Backend Tests (Python)
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: testuser
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install -r requirements-dev.txt

      - name: Run linting
        run: |
          cd backend
          ruff check .
          black --check .

      - name: Run type checking
        run: |
          cd backend
          mypy src

      - name: Run tests with coverage
        env:
          DATABASE_URL: postgresql://testuser:testpass@localhost:5432/testdb
        run: |
          cd backend
          pytest --cov=src --cov-report=xml --cov-report=term-missing --cov-fail-under=80

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage.xml
          flags: backend
          name: backend-coverage

  frontend-tests:
    name: Frontend Tests (React)
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: |
          cd frontend
          npm ci

      - name: Run linting
        run: |
          cd frontend
          npm run lint

      - name: Run type checking
        run: |
          cd frontend
          npm run type-check

      - name: Run tests with coverage
        run: |
          cd frontend
          npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./frontend/coverage/coverage-final.json
          flags: frontend
          name: frontend-coverage

  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-tests]

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: testuser
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: testdb
        ports:
          - 5432:5432

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install backend dependencies
        run: |
          cd backend
          pip install -r requirements.txt

      - name: Install frontend dependencies
        run: |
          cd frontend
          npm ci

      - name: Start backend server
        env:
          DATABASE_URL: postgresql://testuser:testpass@localhost:5432/testdb
        run: |
          cd backend
          uvicorn src.main:app --host 0.0.0.0 --port 8000 &
          sleep 5

      - name: Start frontend server
        run: |
          cd frontend
          npm run build
          npm run preview &
          sleep 5

      - name: Run integration tests
        run: |
          cd backend
          pytest -m integration

  e2e-tests:
    name: E2E Tests (Playwright)
    runs-on: ubuntu-latest
    needs: [integration-tests]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd frontend
          npm ci

      - name: Install Playwright browsers
        run: |
          cd frontend
          npx playwright install --with-deps

      - name: Run Playwright tests
        run: |
          cd frontend
          npm run test:e2e

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: frontend/playwright-report/
          retention-days: 30
```

## Advanced CI Patterns

### Matrix Testing (Multiple Versions)

```yaml
jobs:
  test-matrix:
    name: Test Python ${{ matrix.python-version }}
    runs-on: ubuntu-latest

    strategy:
      matrix:
        python-version: ['3.9', '3.10', '3.11', '3.12']
      fail-fast: false

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python ${{ matrix.python-version }}
        uses: actions/setup-python@v4
        with:
          python-version: ${{ matrix.python-version }}

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install -r requirements-dev.txt

      - name: Run tests
        run: pytest --cov=src --cov-fail-under=80
```

### Parallel Test Execution

```yaml
jobs:
  test:
    name: Test Shard ${{ matrix.shard }}
    runs-on: ubuntu-latest

    strategy:
      matrix:
        shard: [1, 2, 3, 4]

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest-xdist

      - name: Run tests in parallel (shard ${{ matrix.shard }}/4)
        run: |
          pytest --cov=src --shard-id=${{ matrix.shard }} --num-shards=4

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          flags: shard-${{ matrix.shard }}
```

### Conditional Test Execution

```yaml
jobs:
  check-changes:
    name: Detect Changes
    runs-on: ubuntu-latest
    outputs:
      backend: ${{ steps.filter.outputs.backend }}
      frontend: ${{ steps.filter.outputs.frontend }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v2
        id: filter
        with:
          filters: |
            backend:
              - 'backend/**'
            frontend:
              - 'frontend/**'

  backend-tests:
    name: Backend Tests
    needs: check-changes
    if: needs.check-changes.outputs.backend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run backend tests
        run: |
          cd backend
          pytest

  frontend-tests:
    name: Frontend Tests
    needs: check-changes
    if: needs.check-changes.outputs.frontend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run frontend tests
        run: |
          cd frontend
          npm test
```

## Coverage Reporting

### Codecov Configuration

```yaml
# codecov.yml
coverage:
  status:
    project:
      default:
        target: 80%
        threshold: 2%
    patch:
      default:
        target: 80%

comment:
  layout: "reach, diff, flags, files"
  behavior: default

ignore:
  - "tests/"
  - "**/*.test.ts"
  - "**/*.spec.py"
```

### Coverage Badges

```markdown
# README.md
[![codecov](https://codecov.io/gh/username/repo/branch/main/graph/badge.svg)](https://codecov.io/gh/username/repo)
```

### Combined Coverage Report

```yaml
- name: Combine coverage reports
  run: |
    pip install coverage
    coverage combine backend/.coverage frontend/.coverage
    coverage xml -o combined-coverage.xml
    coverage report --fail-under=80

- name: Upload combined coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./combined-coverage.xml
    flags: combined
```

## Quality Gates

### Required Checks

```yaml
# .github/workflows/quality-gate.yml
name: Quality Gate

on:
  pull_request:
    branches: [main]

jobs:
  quality-checks:
    name: Quality Gate
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install -r requirements-dev.txt

      # Security checks
      - name: Run security scan
        run: |
          pip install bandit safety
          bandit -r src/
          safety check

      # Code quality
      - name: Run code quality checks
        run: |
          pip install radon
          radon cc src/ -a -nb
          radon mi src/ -nb

      # Test coverage
      - name: Check test coverage
        run: |
          pytest --cov=src --cov-fail-under=80

      # Documentation
      - name: Check docstring coverage
        run: |
          pip install interrogate
          interrogate -v src/ --fail-under=70

      # Type safety
      - name: Type checking
        run: |
          mypy src/ --strict
```

### Branch Protection Rules

```yaml
# Set in GitHub repository settings
# Settings > Branches > Branch protection rules

Required status checks:
  - Backend Tests (Python)
  - Frontend Tests (React)
  - Integration Tests
  - Quality Gate
  - codecov/project
  - codecov/patch

Required reviews:
  - 1 approval required
  - Dismiss stale reviews
  - Require review from code owners

Additional requirements:
  - Require branches to be up to date
  - Require conversation resolution
  - Require linear history
```

## Performance Testing in CI

```yaml
jobs:
  performance-tests:
    name: Performance Tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install locust

      - name: Start application
        run: |
          uvicorn src.main:app --host 0.0.0.0 --port 8000 &
          sleep 5

      - name: Run load tests
        run: |
          locust -f tests/performance/locustfile.py \
            --host http://localhost:8000 \
            --users 100 \
            --spawn-rate 10 \
            --run-time 60s \
            --headless

      - name: Check performance benchmarks
        run: |
          pytest tests/performance/test_benchmarks.py \
            --benchmark-only \
            --benchmark-max-time=1.0
```

## Test Reporting

### Publish Test Results

```yaml
- name: Publish test results
  uses: EnricoMi/publish-unit-test-result-action@v2
  if: always()
  with:
    files: |
      backend/test-results.xml
      frontend/test-results.xml

- name: Generate test summary
  if: always()
  run: |
    echo "## Test Results" >> $GITHUB_STEP_SUMMARY
    echo "" >> $GITHUB_STEP_SUMMARY
    echo "### Backend Tests" >> $GITHUB_STEP_SUMMARY
    cat backend/test-summary.txt >> $GITHUB_STEP_SUMMARY
    echo "" >> $GITHUB_STEP_SUMMARY
    echo "### Frontend Tests" >> $GITHUB_STEP_SUMMARY
    cat frontend/test-summary.txt >> $GITHUB_STEP_SUMMARY
```

## Caching Strategies

### Dependency Caching

```yaml
- name: Cache Python dependencies
  uses: actions/cache@v3
  with:
    path: ~/.cache/pip
    key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements.txt') }}
    restore-keys: |
      ${{ runner.os }}-pip-

- name: Cache Node modules
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

### Test Result Caching

```yaml
- name: Cache test results
  uses: actions/cache@v3
  with:
    path: |
      .pytest_cache
      .vitest_cache
    key: test-cache-${{ github.sha }}
    restore-keys: |
      test-cache-
```

## Scheduled Testing

```yaml
name: Nightly Tests

on:
  schedule:
    # Run at 2 AM UTC every day
    - cron: '0 2 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  comprehensive-tests:
    name: Comprehensive Test Suite
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Run all tests (including slow tests)
        run: |
          pytest -v --slow

      - name: Run security audit
        run: |
          pip install safety
          safety check --full-report

      - name: Notify on failure
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'Nightly test failure',
              body: 'Nightly tests failed. Check the workflow run for details.',
              labels: ['test-failure', 'automated']
            })
```

## Best Practices

### ✅ DO

- Run tests on every pull request
- Enforce coverage thresholds
- Use matrix testing for multiple versions
- Cache dependencies for faster builds
- Parallelize test execution
- Publish test reports
- Monitor test performance
- Set up branch protection

### ❌ DON'T

- Skip tests on main/production branches
- Ignore flaky tests
- Run tests without coverage
- Use production credentials
- Commit generated coverage files
- Run slow tests on every commit (use nightly builds)

## Troubleshooting

### Common CI Issues

**Issue**: Tests pass locally but fail in CI
**Solution**: Ensure environment parity, check for timing issues, verify database state

**Issue**: Slow CI builds
**Solution**: Use caching, parallelize tests, run only affected tests

**Issue**: Flaky tests
**Solution**: Identify and fix root cause, use retries as temporary fix, isolate tests

---

Proper CI/CD integration ensures code quality and prevents regressions.
