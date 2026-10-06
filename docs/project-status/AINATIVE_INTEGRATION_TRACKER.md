# AINative Integration — Backlog Tracker

Live tracking doc for the AINative backend integration audit, dead-code purge, and competitive-gap backlog started 2026-10-04/05. Updated as work lands. Companion artifact: https://claude.ai/code/artifact/be23a9e4-866c-4b7f-9702-977748051f78

## Merged to `main`

| Issue | Title | Commit |
|---|---|---|
| #143 | Backend contract drift (blocker) | `2fcd362e` |
| #144 | sendAINativeCloudChat stub | `261e4a65` |
| #145 | Settings UI crash for ainativeCloud | `ea0128fa` |
| #146 | Auth webview placeholder | `0a2e1d95` |
| #147 | Usage tracking never calls backend | `44e1da0c` |
| #148 | Tool logs fake data | `ac67ccfe` |
| #149 | skillLoader orphaned placeholders | `204ba731` |
| — | Code-review fixes on the above (mount.tsx leak, tool-log timestamps, skillLoader logging) | `be5e4666` |
| — | 11 orphaned demo/example files removed (2,615 lines) | `bb723514` |
| #116 | Shell integration onboarding | `fa8567a7` → `ea0128fa` |
| #142 | Linux .deb/.rpm/.tar.gz packaging | `dddba641` → `19368d44` |
| #140 | Electron 34→43.7.7 upgrade | `ed2c74ba` → `1339891a` (CI/hardware verification still pending) |
| #125 | CODE_OF_CONDUCT.md | `78d7c6f7` |
| #126 | SUPPORT.md | `8635909b` |
| #136 | GitHub issue templates | `a72de20a`, `e32f4cad` |
| #139 | CHANGELOG.md | `1f3ad9b7` |
| #155 | Duplicate GitOperations class removed | `79af6b3d` (closed) |

## In progress — overnight loop (started 2026-10-05 night)

19 agents dispatched across issues #150–169 in isolated worktrees under `/Users/aideveloper/AINativeStudio-IDE-worktrees/`. Status as of last update:

### Done, awaiting merge review
- **#158** — stale model IDs fixed; corrected a wrong dotted-ID assumption in `BACKEND_CONTRACT_NOTES.md` via live unauthenticated API probing (dashes, not dots)
- **#157** — duplicate `IAINativeAuthService` renamed to `IAINativeSessionAuthService` / `IAINativeAuthTokenProvider`; surfaced **#172** (unregistered DI service, real runtime bug)
- **#153** — `ainativeConfig.ts` wired in for the shared host string only (paths stay local, correctly scoped narrower than the issue assumed)
- **#168** — Cerebras/Fireworks/DigitalOcean added as first-class BYOK providers; caught a gap in the issue's own checklist (`defaultSettingsOfProvider`)

### Done, closed (research/decision, no code)
- **#151** — ZeroDB OAuth: recommend delete (ZeroDB's real auth is API key, not OAuth)
- **#152** — secureTokenStorage.ts: recommend delete (same underlying encryption as production path, not an upgrade); surfaced **#170** (real Linux plaintext-credential security bug)
- **#154** — _markerCheckService.ts: recommend delete (superseded by existing agent tool-call capability); surfaced **#171** (live 5s unthrottled poller running in every window today)
- **#155** — duplicate GitOperations class: confirmed dead via git archaeology, deleted, closed
- **#163** — MCP lifecycle: audited, corrected scope (most capability genuinely missing, not just UI — unlike #116)
- **#164** — billing top-up: confirmed real URL (`app.ainative.studio/billing`), correctly left blocked on #150
- **#165** — remote dev environments: no code-level blocker found, recommend deprioritizing live-test work
- **#167** — Cody identity: design doc posted; corrected assumption that `.ainative/CODY.md` is a persona doc (it's actually an ops/compliance checklist)

### New issues filed from this round's findings
- **#170** — Linux defaults to plaintext-equivalent credential storage silently (no consent, no libsecret attempt) — real security bug
- **#171** — `_markerCheckService` is a live, unthrottled 5s poller running in every window, doing nothing but logging
- **#172** — `AINativeAuthService` appears to have no `registerSingleton` call anywhere — `accessor.get()` call sites may throw at runtime

### Still running as of last check
#150, #156, #159, #160, #161, #162, #166, #169 — statuses to be filled in as they land.

## Not yet started
- #109 (Flatpak) — deferred, large new packaging work
- #127 (CLAUDE.md structure) — deferred, needs careful handling given this file's operational role

## Next steps (once the 19 finish)
1. Review and merge all mergeable fixes to `main`
2. Run local dev build (`npm run watch` + `./scripts/code.sh`), smoke-test
3. Push to `origin/main`, let GitHub Actions run
4. Download and install the actual packaged build, verify it launches and works
