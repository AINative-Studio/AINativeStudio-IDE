# Troubleshooting Guide

Solutions to common issues with AINative Studio's Managed API, including authentication problems, credit warnings, tool failures, and network connectivity.

## Table of Contents

1. [Authentication Issues](#authentication-issues)
2. [Low Credits Warnings](#low-credits-warnings)
3. [Tool Execution Failures](#tool-execution-failures)
4. [Network & Connectivity](#network--connectivity)
5. [Performance Issues](#performance-issues)
6. [Settings & Configuration](#settings--configuration)
7. [Getting Help](#getting-help)

---

## Authentication Issues

### Problem: Cannot Login

**Symptoms**:
```
Error: Authentication failed
Invalid email or password
```

**Solutions**:

1. **Verify your credentials**:
   - Check email for typos
   - Ensure password is correct (case-sensitive)
   - Try resetting your password

2. **Clear cached credentials**:
   - Logout completely
   - Clear VS Code storage:
     ```
     Settings > Application > Clear all data
     ```
   - Restart AINative Studio
   - Login again

3. **Check account status**:
   - Verify your email (check inbox)
   - Ensure account is not suspended
   - Contact support if account locked

**Prevention**:
- Use a password manager
- Enable 2FA (when available)

---

### Problem: Session Expired

**Symptoms**:
```
Error: Session expired
Please log in again
```

**Solutions**:

1. **Refresh session automatically**:
   - The system should auto-refresh
   - If it fails, logout and login again

2. **Check system clock**:
   - Ensure your system clock is accurate
   - Incorrect time causes JWT validation failures

3. **Clear token cache**:
   ```
   Command Palette > AINative: Clear Authentication Cache
   ```

**Prevention**:
- Keep AINative Studio updated
- Ensure stable internet connection

---

### Problem: "Invalid Token" Error

**Symptoms**:
```
Error: Invalid token
Token validation failed
```

**Solutions**:

1. **Force re-authentication**:
   ```
   1. Logout (Cmd/Ctrl + Shift + P > AINative: Logout)
   2. Clear cache
   3. Restart IDE
   4. Login again
   ```

2. **Check for corrupted storage**:
   - Delete VS Code storage folder:
     - macOS: `~/Library/Application Support/AINative Studio/`
     - Linux: `~/.config/ainative-studio/`
     - Windows: `%APPDATA%\AINative Studio\`

3. **Verify network connection**:
   - Check if you're behind a firewall
   - Verify proxy settings if applicable

**Prevention**:
- Don't manually edit authentication files
- Keep the IDE open during updates

---

### Problem: Email Verification Required

**Symptoms**:
```
Error: Email not verified
Please verify your email to continue
```

**Solutions**:

1. **Check your inbox**:
   - Look for email from `noreply@ainative.studio`
   - Check spam/junk folder
   - Verify it's not blocked by email filters

2. **Resend verification email**:
   ```
   Command Palette > AINative: Resend Verification Email
   ```

3. **Contact support**:
   - If no email received after 24 hours
   - Email: support@ainative.studio
   - Include: account email, registration date

**Prevention**:
- Add `ainative.studio` to email whitelist
- Use a reliable email provider

---

## Low Credits Warnings

### Problem: Credits Running Low

**Symptoms**:
```
Warning: Credit usage at 85%
You've used 42,500 of 50,000 credits this month
```

**Solutions**:

1. **Review usage patterns**:
   - Open Usage Dashboard
   - Identify high-cost activities
   - Switch to cheaper models for simple tasks

2. **Optimize model selection**:
   ```json
   {
     "ainative.managedAPI.preferredModels.chat": "claude-3-haiku"
   }
   ```

3. **Disable unused tools**:
   ```json
   {
     "ainative.managedAPI.tools.codeIntelligence.enabled": false
   }
   ```

4. **Upgrade plan**:
   - Visit [app.ainative.studio/billing](https://app.ainative.studio/billing)
   - Choose a higher tier
   - Changes take effect immediately

**Prevention**:
- Monitor dashboard weekly
- Set budget alerts
- Use cost-optimized models for routine tasks

---

### Problem: Service Paused Due to No Credits

**Symptoms**:
```
Error: Insufficient credits
You've used 100% of your monthly credits
Service is paused until next reset
```

**Solutions**:

1. **Purchase additional credits**:
   - Go to Billing page
   - Buy credit pack (5,000, 10,000, or 25,000 credits)
   - Credits are added immediately

2. **Upgrade plan**:
   - Switch to higher tier
   - New credits available instantly
   - Old plan credits are prorated

3. **Wait for reset**:
   - Check reset date in dashboard
   - Set a reminder
   - Credits reset automatically on billing date

**Prevention**:
- Don't wait until 100%
- Upgrade at 80% usage
- Set up auto-upgrade (when available)

---

### Problem: Incorrect Credit Usage Shown

**Symptoms**:
```
Dashboard shows 25,000 credits used, but I only sent 10 messages
```

**Solutions**:

1. **Check tool usage**:
   - Tools consume significant credits
   - Review "Usage by Feature" in dashboard
   - Look for code_intelligence or web_fetch entries

2. **Verify model selection**:
   - Premium models cost 10-50x more than budget models
   - Check chat history for model used
   - Example: Claude 3 Opus vs. Gemini 1.5 Flash

3. **Export and review usage data**:
   ```
   Dashboard > Export Usage Data > CSV
   ```
   - Sort by credits descending
   - Identify expensive requests

4. **Report discrepancy**:
   - If still unexplained, contact support
   - Include: date range, expected vs. actual usage
   - Attach exported usage data

**Prevention**:
- Enable per-message cost display
- Review dashboard weekly
- Use cost calculator before long requests

---

## Tool Execution Failures

### Problem: Code Intelligence Tool Fails

**Symptoms**:
```
Error: code_intelligence tool failed
Failed to parse code: Syntax error at line 42
```

**Solutions**:

1. **Fix syntax errors**:
   - Ensure code is syntactically valid
   - Check for missing brackets, quotes, etc.
   - Test code locally first

2. **Check language support**:
   - Only Python, JavaScript, TypeScript supported
   - Verify file extension matches content
   - Use correct language identifier

3. **Reduce code size**:
   - Large files may timeout
   - Extract relevant function instead of entire file
   - Split into smaller chunks

4. **Retry with different model**:
   ```json
   {
     "ainative.managedAPI.preferredModels.codeIntelligence": "claude-3.5-sonnet"
   }
   ```

**Prevention**:
- Validate code before analysis
- Use supported languages
- Keep code snippets under 1000 lines

---

### Problem: Web Fetch Tool Fails

**Symptoms**:
```
Error: web_fetch failed
Domain not whitelisted: example.com
```

**Solutions**:

1. **Verify domain is whitelisted**:
   - Check [whitelisted domains list](./web-fetch.md#whitelisted-domains)
   - Use official documentation sites
   - Avoid third-party blogs/tutorials

2. **Check URL format**:
   - Use complete URL: `https://docs.python.org/3/library/asyncio.html`
   - Don't use shortened URLs
   - Ensure no typos

3. **Test URL accessibility**:
   - Open URL in browser
   - Verify page loads correctly
   - Check if site is down: [downdetector.com](https://downdetector.com)

4. **Request domain whitelist**:
   - If it's a legitimate documentation source
   - Submit request: [GitHub Issues](https://github.com/ainative-studio/issues)
   - Provide justification

**Prevention**:
- Bookmark commonly used documentation
- Use official sites only
- Check domain before requesting

---

### Problem: Tool Rate Limit Exceeded

**Symptoms**:
```
Error: Rate limit exceeded
You've used 50 code intelligence requests this hour
Wait 23 minutes or adjust settings
```

**Solutions**:

1. **Wait for reset**:
   - Rate limits reset every hour
   - Check error message for time remaining

2. **Increase rate limit**:
   ```json
   {
     "ainative.managedAPI.tools.codeIntelligence.maxRequestsPerHour": 100
   }
   ```

3. **Optimize usage**:
   - Batch similar requests
   - Use caching for repeated queries
   - Avoid analyzing same code multiple times

4. **Disable rate limiting** (not recommended):
   ```json
   {
     "ainative.managedAPI.tools.codeIntelligence.maxRequestsPerHour": 10000
   }
   ```

**Prevention**:
- Plan analysis batches
- Use rate limits appropriate to your workflow
- Monitor usage in dashboard

---

## Network & Connectivity

### Problem: Connection Timeout

**Symptoms**:
```
Error: Request timeout
The request to api.ainative.studio timed out after 60 seconds
```

**Solutions**:

1. **Check internet connection**:
   - Verify you're online
   - Test with other websites
   - Restart router if needed

2. **Increase timeout**:
   ```json
   {
     "ainative.managedAPI.requestTimeout": 120000
   }
   ```

3. **Retry request**:
   - Temporary network issues are common
   - The system auto-retries 3 times
   - Manual retry often succeeds

4. **Check firewall settings**:
   - Whitelist `api.ainative.studio`
   - Allow HTTPS outbound connections
   - Disable VPN if causing issues

**Prevention**:
- Use stable internet connection
- Increase timeout for large requests
- Enable auto-retry in settings

---

### Problem: Cannot Reach API Server

**Symptoms**:
```
Error: Network error
Failed to connect to api.ainative.studio
```

**Solutions**:

1. **Verify API status**:
   - Check [status.ainative.studio](https://status.ainative.studio)
   - Look for announced outages
   - Follow [@AINativeStatus](https://twitter.com/ainativestatus) on Twitter

2. **Check DNS resolution**:
   ```bash
   nslookup api.ainative.studio
   ```
   - Should resolve to an IP address
   - If not, try different DNS (8.8.8.8, 1.1.1.1)

3. **Test with proxy**:
   - Configure proxy in settings if behind corporate firewall
   ```json
   {
     "http.proxy": "http://proxy.company.com:8080"
   }
   ```

4. **Disable IPv6** (if applicable):
   - Some networks have IPv6 routing issues
   - Force IPv4 in network settings

**Prevention**:
- Subscribe to status updates
- Have backup internet connection
- Configure proxy proactively

---

### Problem: SSL/TLS Certificate Error

**Symptoms**:
```
Error: SSL verification failed
Certificate verification failed for api.ainative.studio
```

**Solutions**:

1. **Update system time**:
   - Incorrect clock causes certificate validation failures
   - Sync with NTP server

2. **Update CA certificates**:
   - Update operating system
   - Refresh certificate store
   - macOS: `brew upgrade ca-certificates`
   - Linux: `sudo apt-get install ca-certificates`

3. **Check antivirus/firewall**:
   - Some security software intercepts HTTPS
   - Whitelist AINative Studio
   - Temporarily disable to test

4. **Last resort - disable SSL verification** (NOT RECOMMENDED):
   ```json
   {
     "http.proxyStrictSSL": false
   }
   ```
   - Only for debugging
   - Re-enable immediately after

**Prevention**:
- Keep OS updated
- Use accurate system time
- Don't disable SSL verification permanently

---

## Performance Issues

### Problem: Slow Response Times

**Symptoms**:
- Responses take 20+ seconds
- UI feels laggy
- Tool calls timeout frequently

**Solutions**:

1. **Use faster models**:
   ```json
   {
     "ainative.managedAPI.preferredModels.chat": "gemini-1.5-flash"
   }
   ```

2. **Reduce max iterations**:
   ```json
   {
     "ainative.managedAPI.maxIterations": 3
   }
   ```

3. **Disable expensive tools**:
   ```json
   {
     "ainative.managedAPI.tools.codeIntelligence.enabled": false
   }
   ```

4. **Check network speed**:
   - Run speed test
   - Ensure minimum 5 Mbps download
   - Consider network upgrade if consistently slow

**Prevention**:
- Choose models appropriate to task
- Limit tool usage for simple queries
- Use stable, fast internet

---

### Problem: High Memory Usage

**Symptoms**:
- IDE becomes sluggish
- System memory at 90%+
- Frequent crashes

**Solutions**:

1. **Clear cache**:
   ```typescript
   Command Palette > AINative: Clear All Caches
   ```

2. **Reduce cache size**:
   ```json
   {
     "ainative.managedAPI.cache.maxSize": 50000000
   }
   ```

3. **Disable cache** (temporary):
   ```json
   {
     "ainative.managedAPI.cache.enabled": false
   }
   ```

4. **Restart IDE**:
   - Close and reopen AINative Studio
   - Clears memory leaks

**Prevention**:
- Clear cache monthly
- Close unused projects
- Upgrade system RAM if needed

---

## Settings & Configuration

### Problem: Settings Not Saving

**Symptoms**:
- Changes revert on restart
- `settings.json` looks correct but not applied

**Solutions**:

1. **Check file permissions**:
   ```bash
   chmod 644 ~/.config/Code/User/settings.json
   ```

2. **Verify JSON syntax**:
   - Use a JSON validator
   - Check for missing commas, brackets
   - Ensure no trailing commas

3. **Check workspace vs. user settings**:
   - Workspace settings override user settings
   - Remove conflicting workspace settings

4. **Reset settings**:
   ```
   Command Palette > Preferences: Open User Settings (JSON)
   ```
   - Backup current settings
   - Delete all `ainative.*` entries
   - Reconfigure manually

**Prevention**:
- Use Settings UI instead of JSON editing
- Validate JSON before saving
- Keep backups of working configurations

---

### Problem: Invalid Setting Value

**Symptoms**:
```
Warning: Invalid value for ainative.managedAPI.maxIterations
Using default: 5
```

**Solutions**:

1. **Check allowed ranges**:
   - Refer to [Settings Guide](./settings.md)
   - Use values within specified ranges
   - Example: `maxIterations` must be 1-20

2. **Fix data type**:
   - Ensure numbers aren't strings
   - Use booleans (true/false) not strings ("true"/"false")
   - Example:
     ```json
     // Wrong
     "ainative.managedAPI.maxIterations": "10"

     // Correct
     "ainative.managedAPI.maxIterations": 10
     ```

3. **Reset to default**:
   - Settings UI > Gear icon > Reset Setting
   - Or delete the setting from JSON

**Prevention**:
- Use Settings UI for type safety
- Refer to documentation for valid values
- Test settings incrementally

---

## Getting Help

### Self-Service Resources

1. **Documentation**:
   - [Getting Started Guide](./getting-started.md)
   - [Code Intelligence](./code-intelligence.md)
   - [Web Fetch](./web-fetch.md)
   - [Usage & Credits](./usage-and-credits.md)
   - [Settings](./settings.md)

2. **Community**:
   - [Community Forum](https://community.ainative.studio)
   - [Discord Server](https://discord.gg/ainative)
   - [Reddit: r/AINativeStudio](https://reddit.com/r/ainativestudio)

3. **Knowledge Base**:
   - [FAQ](https://ainative.studio/faq)
   - [Known Issues](https://github.com/ainative-studio/issues/labels/known-issue)

### Contacting Support

**When to contact support**:
- Billing issues
- Account problems
- Persistent technical issues
- Feature requests

**How to submit a support ticket**:

1. **Email**: support@ainative.studio

2. **Include this information**:
   - Account email
   - AINative Studio version
   - Operating system
   - Detailed description of the issue
   - Steps to reproduce
   - Screenshots/error messages
   - Relevant logs (Help > Toggle Developer Tools > Console)

3. **Expected response time**:
   - Critical issues: 4-8 hours
   - High priority: 24 hours
   - Normal: 48-72 hours
   - Low priority: 1 week

**Example Support Email**:

```
Subject: Unable to authenticate - "Invalid Token" error

Account: user@example.com
Version: AINative Studio 1.85.0
OS: macOS 14.2

Description:
After updating to 1.85.0, I receive "Invalid Token" error when trying to
login. I've tried logging out and clearing cache, but the issue persists.

Steps to Reproduce:
1. Open AINative Studio
2. Command Palette > AINative: Login
3. Enter credentials
4. Click Login
5. Error appears: "Invalid Token"

Attached:
- Screenshot of error
- Console logs from Developer Tools

Expected: Should login successfully
Actual: Invalid Token error
```

---

### Reporting Bugs

**GitHub Issues**: [github.com/ainative-studio/issues](https://github.com/ainative-studio/issues)

**Before reporting**:
1. Search existing issues
2. Verify it's reproducible
3. Gather diagnostic information

**Bug Report Template**:

```markdown
### Bug Description
[Clear, concise description]

### Steps to Reproduce
1. [First step]
2. [Second step]
3. [...]

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens]

### Environment
- AINative Studio version:
- OS:
- Node.js version:

### Additional Context
[Screenshots, logs, configuration]
```

---

## Quick Reference

### Common Commands

| Issue | Command |
|-------|---------|
| Clear cache | `AINative: Clear All Caches` |
| Reset auth | `AINative: Logout` then `AINative: Login` |
| View logs | `Help > Toggle Developer Tools > Console` |
| Reload window | `Developer: Reload Window` |
| Reset settings | Delete from `settings.json` |

### Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| `DOMAIN_NOT_WHITELISTED` | URL not allowed | Use official docs |
| `INSUFFICIENT_CREDITS` | Out of credits | Upgrade or wait for reset |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Wait or increase limit |
| `INVALID_TOKEN` | Auth token invalid | Logout and login |
| `TIMEOUT` | Request took too long | Increase timeout setting |
| `NETWORK_ERROR` | Connection failed | Check internet |

### Diagnostic Checklist

Before contacting support, check:

- [ ] Internet connection working?
- [ ] Logged in to AINative Cloud?
- [ ] Credits remaining?
- [ ] Settings valid?
- [ ] Cache cleared?
- [ ] IDE restarted?
- [ ] OS and IDE up to date?
- [ ] Error reproducible?

---

**Still need help?** Contact support@ainative.studio with your issue details and diagnostic information!
