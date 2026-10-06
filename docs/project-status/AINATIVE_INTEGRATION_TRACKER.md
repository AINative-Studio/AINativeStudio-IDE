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

All 20 agents finished (one session restart mid-flight recovered without losing work — see note below). Merged to `main`, closed on GitHub:

| Issue | Title | Commit |
|---|---|---|
| #150 | Stranded Tool Logs/Model Browser/Usage Dashboard panels shipped | `dda60b81` |
| #153 | ainativeConfig.ts wired in for shared host string | `cfe8a15d` |
| #155 | Duplicate GitOperations class removed | `79af6b3d` |
| #156 | Duplicate stub skillsRegistry test replaced with real coverage | `d364eab2` |
| #157 | Duplicate IAINativeAuthService interfaces renamed | `29d3ff97` |
| #158 | Stale AINative model IDs corrected (dash, not dot) | `d4e4cb1e` |
| #166 | Settings-import overwrite replaced with safe filtered merge | `af406641` |
| #169 | Windows + Linux shell-install support added | `df184e8e` |

Merged to `main`, left open (design/first-slice done, follow-on phases remain):

| Issue | Title | Commit |
|---|---|---|
| #159 | Shadow workspace design + phase-0 primitive (unwired) | `1429de1c` |
| #160 | Semantic retrieval design (no implementation yet) | `fa362434` |
| #161 | Steering-doc design + real implementation slice (standing context now in chat) | `c03fd6f6` |
| #162 | Hooks design + first built-in hook (commit-message suggestion, default off) | `4c87b57a` |
| #168 | Cerebras/Fireworks/DigitalOcean added as BYOK providers (managed-vs-BYOK messaging still undecided) | `5eb90042` |

Closed, research/decision only, no code (comment posted on each issue with the recommendation):
- **#151** — ZeroDB OAuth: recommend delete
- **#152** — secureTokenStorage.ts: recommend delete; surfaced **#170**
- **#154** — _markerCheckService.ts: recommend delete; surfaced **#171**
- **#163** — MCP lifecycle: audited, corrected scope
- **#164** — billing top-up: confirmed real URL, left blocked on #150 (now unblocked)
- **#165** — remote dev environments: no code blocker found
- **#167** — Cody identity: design doc posted, corrected a wrong assumption about `.ainative/CODY.md`

New issues filed from findings along the way:
- **#170** — Linux silently defaults to plaintext-equivalent credential storage — real security bug, still open
- **#171** — `_markerCheckService` is a live unthrottled 5s poller doing nothing but logging — still open
- **#172** — `AINativeAuthService` may have no `registerSingleton` anywhere — real runtime-crash risk, still open

### Recovery note (2026-10-06)
The session restarted mid-flight with 7 agents' final commit/report step interrupted. All 7 had real, substantial uncommitted work on disk — none were lost. Each was manually re-reviewed before committing: two had out-of-scope artifacts reverted (a stray unrelated test deletion and package-lock.json version drift on #156; a scratch node_modules/tsconfig on #150), and one real security issue was found and fixed during review — #169's Windows PATH write used string-interpolated `exec` with insufficient escaping for a value that includes the user's full existing PATH; hardened to `execFile` with an argument array before merging.

## Not yet started
- #109 (Flatpak) — deferred, large new packaging work
- #127 (CLAUDE.md structure) — deferred, needs careful handling given this file's operational role

## Pipeline status
1. ✅ All mergeable fixes reviewed and merged to `main`
2. ⏳ Local dev build + smoke test — next
3. ⏳ Push to `origin/main`, GitHub Actions
4. ⏳ Download and install the actual packaged build, verify it launches and works
