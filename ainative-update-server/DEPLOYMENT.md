# AINative Update Server - Production Deployment Guide

This guide covers deploying the update server to production at `https://api.ainative.studio/api/update`.

## Prerequisites

- Vercel account with CLI access
- GitHub Personal Access Token with `repo:public_repo` scope
- DNS access to `ainative.studio` domain
- Node.js 18+ installed locally

## Deployment Options

### Option 1: Vercel (Recommended)

Vercel provides:
- Free tier: 100GB bandwidth, 100k requests/month
- Auto-SSL via Let's Encrypt
- GitHub integration for auto-deploy
- Global edge network for low latency
- Simple deployment process

### Option 2: Cloudflare Workers

Cloudflare Workers provides:
- Free tier: 100k requests/day
- Global edge network
- Slightly more complex setup
- Better for high-volume traffic

## Vercel Deployment Steps

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

Follow the authentication flow in your browser.

### 3. Deploy to Production

```bash
# Navigate to update server directory
cd ainative-update-server

# Deploy to production
vercel --prod

# Follow prompts:
# - Set up and deploy: Y
# - Which scope: [Select your account/team]
# - Link to existing project: N (first time) or Y (subsequent deploys)
# - Project name: ainative-update-server
# - Directory: ./ (current directory)
# - Override settings: N
```

### 4. Configure Custom Domain

```bash
# Add custom domain
vercel domains add api.ainative.studio

# Create alias for production deployment
vercel alias <deployment-url> api.ainative.studio
```

Example:
```bash
vercel alias ainative-update-server-abc123.vercel.app api.ainative.studio
```

### 5. Configure Environment Variables

```bash
# Add GitHub token secret
vercel secrets add github-token <YOUR_GITHUB_TOKEN>

# Add cache TTL (optional, defaults to 300 seconds)
vercel env add CACHE_TTL
# When prompted, enter: 300
# Select: Production
```

**GitHub Token Creation:**
1. Go to https://github.com/settings/tokens
2. Generate new token (classic)
3. Select scopes: `repo:public_repo`
4. Copy token and use in command above

### 6. Verify Deployment

```bash
# Test endpoint availability
curl -I https://api.ainative.studio/api/update/darwin-arm64/stable/test123

# Should return either 200 (update available) or 204 (no update)
```

### 7. DNS Configuration

If `api.ainative.studio` is not resolving:

**For Vercel:**
1. Go to Vercel Dashboard > Project > Domains
2. Add `api.ainative.studio`
3. Vercel will provide DNS records
4. Add to your DNS provider:
   - Type: CNAME
   - Name: api
   - Value: cname.vercel-dns.com
   - TTL: 300 (or automatic)

**Alternative (A Record):**
- Type: A
- Name: api
- Value: 76.76.21.21 (Vercel IP)
- TTL: 300

Wait 5-60 minutes for DNS propagation.

### 8. Test Production Endpoints

```bash
# macOS ARM64
curl https://api.ainative.studio/api/update/darwin-arm64/stable/OLD_COMMIT

# Windows x64
curl https://api.ainative.studio/api/update/win32-x64/stable/OLD_COMMIT

# Linux x64
curl https://api.ainative.studio/api/update/linux-x64/stable/OLD_COMMIT
```

Expected response (if update available):
```json
{
  "version": "v1.5.0",
  "productVersion": "1.5.0",
  "timestamp": 1704067200000,
  "url": "https://github.com/AINative-Studio/AINativeStudio-IDE/releases/download/v1.5.0/ainative-studio-darwin-arm64.zip",
  "sha256hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```

Expected response (if no update):
```
HTTP/1.1 204 No Content
```

## Cloudflare Workers Deployment (Alternative)

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Update wrangler.toml

Ensure `ainative-update-server/wrangler.toml` has correct settings:

```toml
name = "ainative-update-server"
main = "index.js"
compatibility_date = "2024-01-01"

[env.production]
vars = { CACHE_TTL = "300" }

[[env.production.routes]]
pattern = "api.ainative.studio/api/update/*"
zone_name = "ainative.studio"
```

### 4. Deploy to Cloudflare

```bash
cd ainative-update-server
wrangler deploy
```

### 5. Configure Secrets

```bash
wrangler secret put GITHUB_TOKEN
# Paste your GitHub token when prompted
```

### 6. Configure DNS (Cloudflare)

1. Go to Cloudflare Dashboard > Domains > ainative.studio > DNS
2. Add CNAME record:
   - Type: CNAME
   - Name: api
   - Target: ainative-update-server.yourname.workers.dev
   - Proxy status: Proxied (orange cloud)
   - TTL: Auto

## Monitoring & Maintenance

### Vercel Monitoring

1. **Logs**: https://vercel.com/dashboard/logs
2. **Analytics**: https://vercel.com/dashboard/analytics
3. **Alerts**: Set up in Vercel Dashboard > Settings > Alerts

### Key Metrics to Monitor

- **Request count per hour**: Baseline normal traffic
- **Response time (p95)**: Should be < 500ms
- **Error rate**: Should be < 1%
- **Cache hit rate**: Should be > 80%
- **Bandwidth usage**: Track against quota
- **GitHub API rate limit**: Should remain > 1000/hour

### Logging

Vercel automatically logs:
- Request timestamps
- Response status codes
- Response times
- Error messages

Access logs via:
```bash
vercel logs <deployment-url>
```

Or in Vercel Dashboard > Logs

### Alerting

Set up alerts for:
- Error rate > 5%
- Response time > 1s (p95)
- Rate limit < 500 remaining
- Bandwidth > 80% of quota

## Security Best Practices

### 1. HTTPS Only

Vercel automatically enforces HTTPS and redirects HTTP to HTTPS.

### 2. Rate Limiting

Implement rate limiting to prevent abuse:

```javascript
// Add to index.js
const rateLimiter = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const requests = rateLimiter.get(ip) || [];
  const recentRequests = requests.filter(time => now - time < 60000); // Last minute

  if (recentRequests.length >= 60) {
    return false; // Too many requests
  }

  recentRequests.push(now);
  rateLimiter.set(ip, recentRequests);
  return true;
}
```

### 3. CORS Headers

Current implementation sets:
```javascript
'Access-Control-Allow-Origin': '*'
```

For production, consider restricting to specific domains:
```javascript
'Access-Control-Allow-Origin': 'https://ainative.studio'
```

### 4. GitHub Token Security

- Never commit GitHub token to repository
- Use Vercel Secrets for storage
- Rotate token every 90 days
- Use minimal required scopes

### 5. DDoS Protection

Vercel provides:
- Built-in DDoS protection
- Automatic traffic filtering
- Global edge network distribution

## Rollback Procedure

If deployment fails or has issues:

### Vercel Rollback

1. Go to Vercel Dashboard > Deployments
2. Find previous working deployment
3. Click "..." menu > "Promote to Production"
4. Confirm promotion

Or via CLI:
```bash
vercel rollback <previous-deployment-url>
```

### DNS Rollback

If DNS change causes issues:
1. Update DNS record to point to previous deployment
2. Wait for DNS propagation (5-60 minutes)

### Emergency Contact

Keep these details for emergencies:
- Vercel support: https://vercel.com/support
- GitHub status: https://www.githubstatus.com/
- DNS provider support contact

## Performance Optimization

### 1. Caching Strategy

Current implementation:
- 5-minute in-memory cache for GitHub API responses
- Reduces API calls by ~80%

To adjust cache TTL:
```bash
vercel env add CACHE_TTL production
# Enter new value (seconds)
```

### 2. Geographic Distribution

Vercel automatically deploys to edge locations worldwide:
- US East, US West
- Europe (London, Frankfurt)
- Asia (Singapore, Tokyo)
- Australia (Sydney)

### 3. Response Optimization

- Minimize response payload
- Use HTTP/2 for multiplexing
- Enable compression (automatic in Vercel)

## Troubleshooting

### Issue: 404 Not Found

**Cause**: Incorrect URL or routing configuration

**Solution**:
```bash
# Verify vercel.json routes configuration
cat vercel.json

# Test with full path
curl -I https://api.ainative.studio/api/update/darwin-arm64/stable/test
```

### Issue: 500 Internal Server Error

**Cause**: Missing environment variables or GitHub API issues

**Solution**:
```bash
# Check environment variables
vercel env ls

# Check logs
vercel logs

# Verify GitHub token
curl -H "Authorization: Bearer YOUR_TOKEN" https://api.github.com/user
```

### Issue: High Latency

**Cause**: GitHub API delays or cold starts

**Solution**:
- Increase cache TTL
- Implement warming requests
- Use Vercel Pro for guaranteed performance

### Issue: Rate Limit Exceeded

**Cause**: Too many requests to GitHub API

**Solution**:
- Verify GITHUB_TOKEN is configured
- Increase cache TTL
- Implement request coalescing

## Cost Estimation

### Vercel Free Tier Limits

- 100GB bandwidth/month
- 100k serverless function invocations/month
- 100 hours serverless execution/month

**Estimated Usage:**
- Average request: ~5KB response
- 100GB bandwidth = ~20 million requests/month
- Well within free tier limits

### When to Upgrade

Upgrade to Vercel Pro ($20/month) when:
- Bandwidth > 80GB/month
- Requests > 80k/month
- Need guaranteed performance SLA
- Require advanced analytics

## Maintenance Schedule

### Weekly
- Review error logs
- Check rate limit usage
- Monitor bandwidth consumption

### Monthly
- Review analytics trends
- Update dependencies
- Rotate GitHub token (every 90 days)

### Quarterly
- Review security best practices
- Test rollback procedures
- Update documentation

## Documentation Links

- Vercel Documentation: https://vercel.com/docs
- Vercel CLI Reference: https://vercel.com/docs/cli
- GitHub Releases API: https://docs.github.com/en/rest/releases
- Update Server README: ./README.md

## Support

For deployment issues:
- Vercel Support: https://vercel.com/support
- GitHub Issues: https://github.com/AINative-Studio/AINativeStudio-IDE/issues
- Internal Team: Slack #engineering-support
