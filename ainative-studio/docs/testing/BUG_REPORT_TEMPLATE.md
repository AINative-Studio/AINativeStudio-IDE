# Bug Report Template - Skills Manager

**Use this template when reporting bugs in the Skills Manager system.**

---

## Bug Information

### Issue ID
**Bug ID**: #[number]
**Created**: [YYYY-MM-DD]
**Reporter**: [Your Name]
**Assignee**: [Team Member or leave blank]

---

## Classification

**Severity**: [ ] Critical | [ ] High | [ ] Medium | [ ] Low

**Component**:
- [ ] Skill Parser
- [ ] Skill Registry
- [ ] Skills Manager Service
- [ ] CLI Commands
- [ ] Marketplace Integration
- [ ] Official Skills
- [ ] Other: ___________

**Priority**: [ ] P0 (Immediate) | [ ] P1 (High) | [ ] P2 (Medium) | [ ] P3 (Low)

---

## Summary

**One-line description of the issue:**

[Provide a clear, concise summary in one sentence]

---

## Environment

**Operating System**:
- [ ] macOS (version: _______)
- [ ] Windows (version: _______)
- [ ] Linux (distribution: ______, version: _______)

**AINative Studio Version**: [e.g., 1.99.3]

**Node.js Version**: [e.g., 20.10.0]

**Installation Type**:
- [ ] Development build (npm run watch)
- [ ] Production build
- [ ] Downloaded release

**Additional Environment Details**:
```
[Include any relevant environment variables, configuration, etc.]
```

---

## Steps to Reproduce

**Preconditions**:
[Any setup or state required before reproducing]

**Detailed Steps**:
1. [First step]
2. [Second step]
3. [Third step]
4. [Continue...]

**Frequency**:
- [ ] Always (100%)
- [ ] Often (>75%)
- [ ] Sometimes (25-75%)
- [ ] Rarely (<25%)

---

## Expected Behavior

**What should happen:**

[Describe the correct/expected behavior in detail]

---

## Actual Behavior

**What actually happens:**

[Describe what's happening instead]

**Visual Evidence** (if applicable):
- [ ] Screenshot attached
- [ ] Video recording attached
- [ ] GIF attached

---

## Error Messages

**Console Output**:
```
[Paste any relevant console logs, error messages, or stack traces]
```

**Error Dialog** (if shown to user):
```
[Paste exact error message shown to user]
```

**Log Files** (if available):
```
[Paste relevant excerpts from log files]
Location: [path to log file]
```

---

## Impact Assessment

**User Impact**:
- [ ] Blocks all users from using Skills Manager
- [ ] Blocks specific workflows
- [ ] Causes data loss
- [ ] Causes incorrect behavior
- [ ] Cosmetic issue only

**Number of Users Affected**: [Estimate or "Unknown"]

**Workaround Available**:
- [ ] Yes (describe below)
- [ ] No

**Workaround Description**:
```
[If workaround exists, describe it here]
```

---

## Additional Context

**Related Issues**:
- #[issue number]
- #[issue number]

**Related PRs**:
- #[PR number]
- #PR number]

**First Occurred**:
- [ ] In version: _______
- [ ] After change: [describe change]
- [ ] Unknown

**Regression**:
- [ ] Yes - This used to work in version: _______
- [ ] No - This never worked
- [ ] Unknown

**Additional Notes**:
```
[Any other context, observations, or information that might be helpful]
```

---

## Debug Information

**Skill Configuration** (if relevant):
```yaml
# Paste relevant skill configuration here
```

**Registry State** (if relevant):
```
Number of skills: ___
Problematic skill: ___
Dependencies: ___
```

**Network Conditions** (if relevant to marketplace):
- [ ] Online
- [ ] Offline
- [ ] Slow connection
- [ ] Behind proxy/firewall

---

## Investigation Notes

**Root Cause** (if known):
```
[Describe root cause if identified]
```

**Affected Code Locations**:
- File: [path/to/file.ts]
- Function: [functionName]
- Line: [line number]

**Similar Issues**:
- [Link to similar issue or note if none found]

---

## Proposed Fix

**Suggested Solution** (optional):
```
[If you have ideas for how to fix this, describe them here]
```

**Code Snippet** (if applicable):
```typescript
// Proposed fix
```

---

## Verification Criteria

**Fix Verification Steps**:
1. [Step to verify fix]
2. [Step to verify fix]
3. [Step to verify fix]

**Regression Testing Required**:
- [ ] Test dependency resolution
- [ ] Test file watching
- [ ] Test marketplace integration
- [ ] Test CLI commands
- [ ] Other: ___________

---

## Severity Guidelines

### Critical (P0)
- System crash or freeze
- Data loss or corruption
- Security vulnerability
- Complete feature failure blocking all users

### High (P1)
- Major feature broken for most users
- Significant performance degradation
- Incorrect behavior with serious consequences
- No reasonable workaround

### Medium (P2)
- Feature partially works
- Affects subset of users
- Workaround available but inconvenient
- Performance issue in non-critical path

### Low (P3)
- Minor cosmetic issue
- Edge case that rarely occurs
- Easy workaround available
- Enhancement rather than bug

---

## Bug Lifecycle

1. **New**: Bug reported, awaiting triage
2. **Confirmed**: Reproduced and severity assigned
3. **In Progress**: Developer working on fix
4. **Fixed**: Fix implemented and committed
5. **Verified**: QA verified fix works
6. **Closed**: Issue resolved and released

---

**Reporter Signature**: [Your Name]
**Date**: [YYYY-MM-DD]
