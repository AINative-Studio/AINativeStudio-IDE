# quaid-scanner Report: /Users/karstenwade/Projects/AINative-Studio/src/AINativeStudio-IDE

**Score:** 🔴 2.3/10 — CRITICAL risk
**Maturity:** sandbox | **Depth:** standard | **Duration:** 0.2s
**Scanned:** 2026-06-01T20:58:55.052Z

## Pillar Scores

| Pillar | Score | Weight | Findings |
|--------|-------|--------|----------|
| Security | 2.0 | 25% | 0C 5W 1I |
| Governance | 3.0 | 20% | 0C 1W 11I |
| Community | 3.0 | 15% | 0C 2W 8I |
| AI Readiness | 2.5 | 15% | 0C 5W 0I |
| Inclusive Language | 1.0 | 15% | 0C 4W 6I |
| Technical Rigor | 2.5 | 10% | 1C 3W 0I |

## Critical Findings

### test-coverage-1
**Pillar:** Technical Rigor | **Category:** test-coverage

No test files detected in the repository

_(source: local file check)_

**Suggestion:** Add a test suite to improve code reliability and enable coverage tracking

**Reference:** https://chaoss.community/metric-test-coverage/

## Warnings

- **[TIMEOUT-binary-artifacts]** Scanner "binary-artifacts" timed out after undefinedms *(Increase scannerTimeout in configuration or check network connectivity)*
- **[TIMEOUT-dep-pinning-docker]** Scanner "dep-pinning-docker" timed out after undefinedms *(Increase scannerTimeout in configuration or check network connectivity)*
- **[TIMEOUT-openssf-local-checks]** Scanner "openssf-local-checks" timed out after undefinedms *(Increase scannerTimeout in configuration or check network connectivity)*
- **[TIMEOUT-openssf-scorecard]** Scanner "openssf-scorecard" timed out after undefinedms *(Increase scannerTimeout in configuration or check network connectivity)*
- **[TIMEOUT-token-permissions]** Scanner "token-permissions" timed out after undefinedms *(Increase scannerTimeout in configuration or check network connectivity)*
- **[TIMEOUT-license-header-scanner]** Scanner "license-header-scanner" timed out after undefinedms *(Increase scannerTimeout in configuration or check network connectivity)*
- **[psych-safety-1]** No Code of Conduct found *(Add a CODE_OF_CONDUCT.md — see https://www.contributor-covenant.org/)*
- **[support-channels-1]** No SUPPORT.md or .github/SUPPORT.md found *(Add a SUPPORT.md documenting how users can get help)*
- **[agentic-rules-2]** CLAUDE.md lacks recognized structural sections *(Add sections like "Critical Rules", "Project Structure", "Common Tasks" to improve agent guidance.)*
- **[TIMEOUT-ai-repo-detection]** Scanner "ai-repo-detection" timed out after undefinedms *(Increase scannerTimeout in configuration or check network connectivity)*
- **[TIMEOUT-dataset-provenance]** Scanner "dataset-provenance" timed out after undefinedms *(Increase scannerTimeout in configuration or check network connectivity)*
- **[TIMEOUT-model-card-detection]** Scanner "model-card-detection" timed out after undefinedms *(Increase scannerTimeout in configuration or check network connectivity)*
- **[TIMEOUT-model-card-scoring]** Scanner "model-card-scoring" timed out after undefinedms *(Increase scannerTimeout in configuration or check network connectivity)*
- **[TIMEOUT-diminishing-language-scanner]** Scanner "diminishing-language-scanner" timed out after undefinedms *(Increase scannerTimeout in configuration or check network connectivity)*
- **[TIMEOUT-inclusive-code-scanner]** Scanner "inclusive-code-scanner" failed: Cannot read properties of undefined (reading 'termListUrl') *(Check scanner implementation for errors)*
- **[TIMEOUT-inclusive-doc-scanner]** Scanner "inclusive-doc-scanner" failed: Cannot read properties of undefined (reading 'termListUrl') *(Check scanner implementation for errors)*
- **[TIMEOUT-inclusive-naming-scanner]** Scanner "inclusive-naming-scanner" failed: Cannot read properties of undefined (reading 'termListUrl') *(Check scanner implementation for errors)*
- **[interaction-templates-1]** No issue templates configured *(Add .github/ISSUE_TEMPLATE/ with bug report and feature request templates)*
- **[linter-config-1]** No linter configuration found *(Add a linter (ESLint, Prettier, Ruff, golangci-lint, etc.) and configure it to run in CI)*
- **[semver-validation-2]** 4 versioned tags found but no CHANGELOG detected *(Add a CHANGELOG.md documenting changes per release (see keepachangelog.com))*

## Info

- **[branch-protection-1]** GitHub token not provided. Cannot check branch protection settings.
- **[asset-protection-1]** No trademark policy found (optional)
- **[asset-protection-2]** No export control documentation found (optional)
- **[asset-protection-3]** No CLA or DCO requirement detected
- **[asset-protection-4]** Contributor friction level: Low
- **[bus-factor-1]** Bus factor: 1, Elephant factor: 64% (10 contributors, 313 commits in last 12 months)
- **[dep-license-scanning-1]** No dependency manifest files found
- **[governance-classification-1]** No governance model detected — governance files exist but no recognizable model pattern found
- **[governance-detection-1]** No governance documentation found
- **[license-compatibility-1]** Project license is MIT — no installed dependencies to check compatibility
- **[vendor-neutrality-domain-count]** Found 6 unique email domain(s) across 313 commits
- **[vendor-neutrality-no-succession]** No succession planning documentation found
- **[burnout-detection-1]** Burnout detection requires a GitHub token
- **[contributor-data-2]** Contributor emails span 6 domains
- **[contributor-funnel-1]** Contributor funnel: 2 core, 2 regular, 6 casual (10 total)
- **[funding-1]** No funding infrastructure detected
- **[issue-closure-1]** Issue closure analysis requires a GitHub token
- **[response-classification-1]** Response classification requires a GitHub token
- **[response-time-1]** Response time analysis requires a GitHub token
- **[stale-bot-1]** No stale bot configured
- **[AK-GIT-CLONE-README.md:71]** Assumed knowledge: "clone" operation used without explanation
- **[AK-GIT-CLONE-README.md:72]** Assumed knowledge: "clone" operation used without explanation
- **[AK-GIT-CLONE-README.md:94]** Assumed knowledge: "clone" operation used without explanation
- **[AK-GIT-CLONE-README.md:110]** Assumed knowledge: "clone" operation used without explanation
- **[AK-ACRONYM-README-README.md:43]** Undefined acronym "README" may confuse newcomers
- **[AK-ACRONYM-LICENSE-README.md:123]** Undefined acronym "LICENSE" may confuse newcomers

## Recommendations

- **[HIGH impact / medium effort]** Add a test suite to improve code reliability and enable coverage tracking
  - https://chaoss.community/metric-test-coverage/
- **[MEDIUM impact / low effort]** Increase scannerTimeout in configuration or check network connectivity
- **[MEDIUM impact / low effort]** Increase scannerTimeout in configuration or check network connectivity
- **[MEDIUM impact / low effort]** Add a CODE_OF_CONDUCT.md — see https://www.contributor-covenant.org/
- **[MEDIUM impact / low effort]** Add a SUPPORT.md documenting how users can get help
- **[MEDIUM impact / low effort]** Add sections like "Critical Rules", "Project Structure", "Common Tasks" to improve agent guidance.
- **[MEDIUM impact / low effort]** Increase scannerTimeout in configuration or check network connectivity
- **[MEDIUM impact / low effort]** Increase scannerTimeout in configuration or check network connectivity
- **[MEDIUM impact / low effort]** Check scanner implementation for errors
- **[MEDIUM impact / low effort]** Add .github/ISSUE_TEMPLATE/ with bug report and feature request templates
- **[MEDIUM impact / low effort]** Add a linter (ESLint, Prettier, Ruff, golangci-lint, etc.) and configure it to run in CI
- **[MEDIUM impact / low effort]** Add a CHANGELOG.md documenting changes per release (see keepachangelog.com)

## Score Rationale

Overall score is a weighted sum of six pillar scores (each scored 0–10).

| Pillar | Weight | Raw Score | Contribution |
|--------|--------|-----------|-------------|
| Security | 25% | 2.0 | 0.50 |
| Governance | 20% | 3.0 | 0.60 |
| Community | 15% | 3.0 | 0.45 |
| AI Readiness | 15% | 2.5 | 0.38 |
| Inclusive Language | 15% | 1.0 | 0.15 |
| Technical Rigor | 10% | 2.5 | 0.25 |
| **Overall** | **100%** | | **2.30** |

---
*quaid-scanner v0.1.2 | 2026-06-01T20:58:55.052Z*
*Commit: a1623fcb97675cfd1bacdfacc86864924671370a*