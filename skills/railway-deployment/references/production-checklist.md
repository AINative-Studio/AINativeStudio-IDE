# Production Deployment Checklist

Complete pre-deployment, deployment, and post-deployment verification checklist for Railway.

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing locally
- [ ] Code reviewed and approved
- [ ] No debug statements or console.logs in production code
- [ ] Error handling implemented for all external dependencies
- [ ] Input validation on all endpoints
- [ ] No hardcoded secrets or credentials

### Configuration

#### nixpacks.toml
- [ ] All system dependencies specified in nixPkgs
- [ ] Build commands tested locally
- [ ] Start command correctly formatted
- [ ] Port binding uses $PORT variable

#### Environment Variables
- [ ] All required variables configured in Railway
- [ ] Database URLs using service references
- [ ] CORS origins set to production domain
- [ ] JWT secrets generated and stored securely
- [ ] External API keys configured
- [ ] DEBUG=false in production
- [ ] LOG_LEVEL appropriate for production

#### Security
- [ ] Secrets stored in Railway secrets (not regular env vars)
- [ ] HTTPS enforced for all endpoints
- [ ] CORS configured restrictively
- [ ] Rate limiting configured
- [ ] SQL injection prevention implemented
- [ ] XSS protection enabled
- [ ] CSRF protection enabled (for forms)
- [ ] Security headers configured
- [ ] Dependency vulnerabilities checked (npm audit / pip-audit)

### Database

#### Schema
- [ ] Migrations tested locally
- [ ] Migrations tested on staging
- [ ] Database backup created before migration
- [ ] Rollback plan documented
- [ ] Indexes created for frequently queried columns
- [ ] Foreign key constraints defined

#### Data
- [ ] Seed data prepared (if needed)
- [ ] Data migration scripts tested
- [ ] Large data migrations planned for low-traffic period

### Application Features

#### Health Checks
- [ ] Health check endpoint implemented
- [ ] Health check tests database connectivity
- [ ] Health check tests external API connectivity
- [ ] Response time < 1 second

#### Logging
- [ ] Structured logging implemented
- [ ] Log level configurable via environment variable
- [ ] Sensitive data not logged
- [ ] Error tracking configured (Sentry, etc.)

#### Performance
- [ ] Database query optimization completed
- [ ] N+1 queries eliminated
- [ ] Caching implemented for expensive operations
- [ ] Connection pooling configured
- [ ] Static assets optimized and minified

### External Services

#### APIs
- [ ] All API keys configured
- [ ] API rate limits understood
- [ ] Retry logic implemented
- [ ] Timeout values configured
- [ ] Webhook endpoints secured

#### Third-Party Services
- [ ] Email service configured (SendGrid, etc.)
- [ ] File storage configured (S3, etc.)
- [ ] Payment gateway configured (Stripe, etc.)
- [ ] Analytics configured (if applicable)

### Documentation
- [ ] README updated with deployment instructions
- [ ] Environment variables documented
- [ ] API documentation current
- [ ] Runbook created for common issues

## Deployment Process Checklist

### Pre-Flight Checks
- [ ] Staging environment tested and verified
- [ ] Deployment time scheduled (low-traffic period if possible)
- [ ] Team notified of deployment
- [ ] Monitoring dashboard open and ready
- [ ] Rollback plan reviewed

### Railway Configuration
- [ ] Correct Railway project selected
- [ ] Correct environment selected (production)
- [ ] Service configuration reviewed
- [ ] Domain configuration verified
- [ ] SSL certificate status confirmed

### Deployment Steps

#### 1. Database Migrations (if needed)
- [ ] Backup current database
   ```bash
   railway run pg_dump $DATABASE_URL > backup.sql
   ```
- [ ] Test migration on copy of production data
- [ ] Run migration
   ```bash
   railway run alembic upgrade head
   ```
- [ ] Verify migration completed successfully
- [ ] Check database integrity

#### 2. Deploy Application
- [ ] Push code to main branch (if using GitHub integration)
   ```bash
   git push origin main
   ```
   Or deploy via CLI:
   ```bash
   railway up
   ```
- [ ] Monitor build logs in real-time
   ```bash
   railway logs --follow
   ```
- [ ] Verify build completes successfully
- [ ] Watch for any error messages

#### 3. Monitor Deployment
- [ ] Build phase completes without errors
- [ ] Install phase completes without errors
- [ ] Application starts successfully
- [ ] Health check returns 200 OK
- [ ] Deployment status shows "Active"

### Initial Verification

#### Smoke Tests
- [ ] Homepage loads correctly
- [ ] API health endpoint responds
   ```bash
   curl https://your-app.railway.app/health
   ```
- [ ] Database connectivity verified
- [ ] Authentication flow works
- [ ] Critical user paths tested

#### Service Connectivity
- [ ] Frontend can reach backend
- [ ] Backend can reach database
- [ ] Backend can reach Redis (if applicable)
- [ ] External API calls successful

#### Security Checks
- [ ] HTTPS certificate valid
- [ ] HTTP redirects to HTTPS
- [ ] Security headers present
   ```bash
   curl -I https://your-app.railway.app
   ```
- [ ] CORS properly configured

## Post-Deployment Checklist

### Immediate Verification (0-15 minutes)

#### Application Health
- [ ] Health check endpoint responding
- [ ] Application logs show no errors
   ```bash
   railway logs | grep ERROR
   ```
- [ ] Response times within acceptable range
- [ ] No 5xx errors in logs

#### User Flows
- [ ] User registration works
- [ ] User login works
- [ ] Password reset works
- [ ] Core features functional
- [ ] Payment processing works (if applicable)

#### Performance
- [ ] Page load times acceptable
- [ ] API response times < 500ms
- [ ] Database query performance good
- [ ] No memory leaks detected

#### Monitoring
- [ ] Error tracking receiving data
- [ ] Application metrics being collected
- [ ] Log aggregation working
- [ ] Alert rules configured

### Extended Verification (15-60 minutes)

#### User Acceptance
- [ ] Test accounts verified working
- [ ] Real user traffic monitored
- [ ] User-reported issues tracked
- [ ] Support team notified and ready

#### Performance Monitoring
- [ ] CPU usage within limits
- [ ] Memory usage stable
- [ ] Database connection pool not exhausted
- [ ] No unusual error rates

#### External Integrations
- [ ] Email notifications sending
- [ ] Webhook deliveries successful
- [ ] Third-party API calls working
- [ ] File uploads/downloads working

### Long-Term Verification (1-24 hours)

#### Stability
- [ ] No memory leaks after extended runtime
- [ ] Error rates remain low
- [ ] Performance metrics stable
- [ ] No unexpected restarts

#### Business Metrics
- [ ] User signups functioning
- [ ] Transactions processing
- [ ] Key business metrics tracked
- [ ] No drop in user engagement

## Rollback Procedures

### When to Rollback
Rollback immediately if:
- Critical functionality broken
- Security vulnerability exposed
- Data corruption detected
- Error rate > 5%
- System completely unresponsive

### Rollback Steps

#### 1. Identify Issue
- [ ] Determine root cause
- [ ] Assess impact on users
- [ ] Decide if rollback necessary

#### 2. Communicate
- [ ] Notify team of rollback decision
- [ ] Prepare user communication (if needed)
- [ ] Document reason for rollback

#### 3. Execute Rollback
- [ ] Via Railway Dashboard:
  1. Go to Deployments tab
  2. Find last working deployment
  3. Click "Redeploy"

- [ ] Via CLI:
  ```bash
  railway deployments
  railway redeploy <previous-deployment-id>
  ```

#### 4. Verify Rollback
- [ ] Application responding normally
- [ ] Error rates returned to baseline
- [ ] Critical features working
- [ ] Users can access system

#### 5. Database Rollback (if needed)
- [ ] Restore from backup
  ```bash
  railway run psql $DATABASE_URL < backup.sql
  ```
- [ ] Verify data integrity
- [ ] Test application with restored data

#### 6. Post-Rollback
- [ ] Analyze what went wrong
- [ ] Fix issues locally
- [ ] Test thoroughly
- [ ] Plan re-deployment

## Monitoring and Alerts

### Essential Metrics to Monitor

#### Application Health
- Uptime percentage
- Error rate (target: < 1%)
- Response time (target: < 500ms)
- Request rate

#### System Resources
- CPU usage (alert if > 80%)
- Memory usage (alert if > 80%)
- Disk usage (alert if > 80%)

#### Database
- Connection pool usage
- Query performance
- Slow query count
- Database size

#### External Services
- API call success rate
- Third-party service uptime
- Webhook delivery rate

### Setting Up Alerts

**Recommended alert thresholds:**
```yaml
alerts:
  - name: High Error Rate
    condition: error_rate > 5%
    severity: critical

  - name: Slow Response Time
    condition: p95_response_time > 1000ms
    severity: warning

  - name: High Memory Usage
    condition: memory_usage > 80%
    severity: warning

  - name: Database Connection Issues
    condition: db_connection_failures > 10
    severity: critical

  - name: Health Check Failure
    condition: health_check_failure
    severity: critical
```

## Security Audit

### Pre-Deployment Security Review
- [ ] No secrets in code or logs
- [ ] Environment variables properly scoped
- [ ] Database credentials rotated
- [ ] API keys have appropriate permissions
- [ ] User input sanitized
- [ ] SQL queries use parameterization
- [ ] File uploads validated
- [ ] Rate limiting configured

### Security Headers
Verify these headers are present:
```bash
curl -I https://your-app.railway.app
```

Required headers:
- [ ] `Strict-Transport-Security`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY`
- [ ] `X-XSS-Protection: 1; mode=block`
- [ ] `Content-Security-Policy`

**Implementation (Python/FastAPI):**
```python
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware

app.add_middleware(HTTPSRedirectMiddleware)
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["your-app.railway.app", "www.yourdomain.com"]
)

@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response
```

## Performance Optimization

### Before Deployment
- [ ] Bundle size optimized (< 500kb initial load)
- [ ] Images optimized and compressed
- [ ] Code splitting implemented
- [ ] Lazy loading configured
- [ ] Database indexes created
- [ ] Caching strategy implemented
- [ ] CDN configured (if applicable)

### After Deployment
- [ ] Lighthouse score > 90
- [ ] First Contentful Paint < 1.8s
- [ ] Time to Interactive < 3.8s
- [ ] Largest Contentful Paint < 2.5s

## Compliance and Legal

### Data Protection
- [ ] GDPR compliance verified (if applicable)
- [ ] User data encrypted at rest
- [ ] User data encrypted in transit
- [ ] Data retention policies implemented
- [ ] Privacy policy updated
- [ ] Cookie consent implemented (if applicable)

### Accessibility
- [ ] WCAG 2.1 Level AA compliance
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast ratios meet standards

## Communication Plan

### Internal Communication
- [ ] Deployment scheduled in team calendar
- [ ] Team notified 24 hours in advance
- [ ] Stakeholders informed
- [ ] Support team briefed on changes

### External Communication
- [ ] Maintenance window announced (if downtime expected)
- [ ] Release notes prepared
- [ ] User documentation updated
- [ ] Status page updated

### Post-Deployment Communication
- [ ] Team notified of successful deployment
- [ ] Stakeholders updated
- [ ] Known issues communicated
- [ ] Support team given troubleshooting guide

## Documentation Updates

### Before Deployment
- [ ] Deployment runbook updated
- [ ] Environment variable documentation current
- [ ] API documentation updated
- [ ] Architecture diagrams current

### After Deployment
- [ ] Deployment notes documented
- [ ] Issues encountered logged
- [ ] Lessons learned recorded
- [ ] Next deployment improvements identified

## Success Criteria

Deployment is considered successful when:
- [ ] All automated tests passing
- [ ] Zero critical errors in first hour
- [ ] Error rate < 1%
- [ ] Response times within SLA
- [ ] All critical user flows working
- [ ] No database issues
- [ ] External integrations functioning
- [ ] No security vulnerabilities
- [ ] User feedback positive
- [ ] Business metrics trending normally

## Final Sign-Off

- [ ] Technical lead approval
- [ ] Product owner approval
- [ ] Security team approval (for sensitive changes)
- [ ] Documentation complete
- [ ] Team notified of completion
- [ ] Post-deployment review scheduled
