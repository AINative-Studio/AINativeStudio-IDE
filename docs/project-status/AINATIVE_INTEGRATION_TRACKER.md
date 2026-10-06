# AINative Integration — Backlog Tracker

Live tracking doc for the AINative backend integration audit, dead-code purge, and competitive-gap backlog started 2026-10-04/05. Updated as work lands. Companion artifact: https://claude.ai/code/artifact/be23a9e4-866c-4b7f-9702-977748051f78

**#141 (the original umbrella issue) is closed.** All 7 original sub-issues, the #158 model-ID follow-up, and everything found along the way are resolved or tracked below.

## First real full-project type-check (2026-10-06)

`npm install` succeeded on this machine for the first time this session (previously blocked by `@vscode/spdlog@0.15.1` failing to compile against this machine's Clang 21 — fixed by bumping to `0.15.8`, same `^0.15.0` package.json range). This unlocked the first real `npx tsc -p src/tsconfig.json --noEmit` of the whole session — every prior check used a scratch standalone-TypeScript install that could only see the files directly pointed at, not the full dependency graph.

Found and fixed 4 real errors in the `ainative` tree (3 were expected — missing `react/out/*` modules before `npm run buildreact` ran; 1 was real — `ainativeReactPanels.ts` used `Codicon` as a type instead of `ThemeIcon`, now fixed). Also found 45 pre-existing errors in 17 core `src/vs/base/` files, unrelated to any `ainative` work — iterator-type incompatibilities in `ResourceMap`/`ResourceSet`/`LinkedMap`/`SetWithKey`, almost certainly surfaced by #140's `@types/node` 20.x→24.x bump (required for Electron 43) never having been checked against the full project before. Filed as **#173**.

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

Research/decision only, no code (comment posted with a recommendation on each):
- **#151** — ZeroDB OAuth: recommend delete. **Correction**: an earlier version of this doc said this was closed — it wasn't. It's a genuine product decision (delete working code), correctly left open for an actual decision-maker, not something I should close myself.
- **#152** — secureTokenStorage.ts: recommend delete; surfaced **#170** (fixed). Same correction as #151 — left open, not closed.
- **#154** — _markerCheckService.ts: recommend delete; surfaced **#171** (re-verified as currently-dead code, tied to this decision). Same correction — left open, not closed.
- **#163** — MCP lifecycle: audited, corrected scope, then **closed** in favor of 3 narrower follow-ups per its own recommendation: #174 (quick wins), #175 (per-tool enable/disable), #176 (registry/install/auth/logs — the large pieces)
- **#164** — billing top-up: confirmed real URL, left open and blocked on #150 (now unblocked — ready to resume)
- **#165** — remote dev environments: no code blocker found, left open (informational, no action needed unless a real user report surfaces)
- **#167** — Cody identity: design doc posted, corrected a wrong assumption about `.ainative/CODY.md`, left open pending product sign-off on the design

Issues filed from findings along the way:
- **#170** — Linux plaintext-equivalent credential default — fixed and closed (`7cb8c787`)
- **#171** — `_markerCheckService`'s 5s poller — re-verified as currently dead/unreachable code (never imported, so the registration never runs); left open, tied to #154's open finish-vs-delete decision rather than resolved unilaterally
- **#172** — `AINativeAuthService` missing `registerSingleton` — fixed and closed (`7cb8c787`)
- **#173** — `@types/node` 24.x / newer-TypeScript iterator-protocol break across 5 core base-library classes (`ResourceMap`, `ResourceSet`, `LinkedMap`, `SetWithKey`, `SkipList`) plus 5 unrelated errors elsewhere — **fixed and closed** (`fcbc8d72`). Full `npm run compile` now finishes with 0 errors.
- **#174, #175, #176** — split from #163's MCP lifecycle audit per its own recommendation (quick wins / per-tool toggles / large registry+auth+logs work respectively), all open
- **#177** — `extensions/tsconfig.base.json`'s lib list predates ES2022, breaking `Array.prototype.at()` in bundled extensions — **fixed and closed** (`78fea128`, folded into #173's fix)

### Recovery note (2026-10-06)
The session restarted mid-flight with 7 agents' final commit/report step interrupted. All 7 had real, substantial uncommitted work on disk — none were lost. Each was manually re-reviewed before committing: two had out-of-scope artifacts reverted (a stray unrelated test deletion and package-lock.json version drift on #156; a scratch node_modules/tsconfig on #150), and one real security issue was found and fixed during review — #169's Windows PATH write used string-interpolated `exec` with insufficient escaping for a value that includes the user's full existing PATH; hardened to `execFile` with an argument array before merging.

## Not yet started
- #109 (Flatpak) — deferred, large new packaging work
- #127 (CLAUDE.md structure) — deferred, needs careful handling given this file's operational role

## Remote history reconciliation (2026-10-06, before push)

Before pushing, `git fetch origin main` revealed local `main` had been working from a stale
base all session — `origin/main` was 8 commits ahead (dated Feb-June 2026, merged via real PRs
#115/#118), never pulled into this checkout. Two of those commits (`3971e357`, `37c3dd0e`)
independently fixed the exact same two bugs this session found tonight (#172's missing
`registerSingleton`, and the `usageTrackingService`/`aiModelRegistryService` circular import) —
confirming #172 was an unwitting re-discovery, not a new bug, and that the GitHub issue numbers
used throughout tonight (#143 onward) were assigned without knowledge of this real prior history
(issues #110-114 already covered this exact ground).

Merged `origin/main` into local `main` (`70654881`) rather than ignoring the divergence. 6 files
conflicted; each resolved by hand after comparing both sides' approach, not by blindly preferring
either branch:
- `usageTrackingService.ts`, `aiModelRegistryService.ts`, `aiModelRegistryTypes.ts`: kept origin's
  more thorough circular-dependency fix (lazy `IInstantiationService` resolution, not just a moved
  decorator) as the base, then re-applied tonight's independently-verified, more-specific fixes on
  top — the corrected live model-catalog endpoint (`/v1/public/models/available`, confirmed via
  live probing tonight; origin's version still pointed at the since-404ing `/api/v1/models/list`)
  and the `getAINativeConfig()`-sourced base URL.
- `ainativeAuthService.ts`: kept origin's tested `InstantiationType.Delayed` over tonight's untested
  `Eager` guess, keeping tonight's `IAINativeSessionAuthService` rename.
- `ainativeSettingsTypes.ts`, `services.tsx`: additive — both sides added different real things
  (tonight's Cerebras/Fireworks/DigitalOcean providers + detailed AINative key-prefix guidance;
  origin's `IGitHubOAuthService` React-accessor fix, closing a real settings-page crash tonight's
  session was never aware of) — combined rather than choosing one side.

Verified clean after merge: `npx tsc -p src/tsconfig.json --noEmit` → 0 errors (down from the
pre-merge 0-in-ainative/45-elsewhere split — the merge didn't reintroduce anything). Full
`npm run compile` re-run as a final check before push.

## Pipeline status
1. ✅ All mergeable fixes reviewed and merged to `main`
2. ✅ Local dev build + smoke test — **fully clean, real launch verified**
   - `npm install`: fixed (spdlog bump), succeeds cleanly (1875 packages, 0 build failures)
   - `npm run buildreact`: succeeds (11 entry points, including the 3 panels #150 shipped)
   - `npm run compile` (the real gulp production compile, not just a scoped `tsc`): **0 errors**,
     confirmed after fixing #173 (iterator protocol + 5 unrelated pre-existing errors) and #177
     (ES2022 lib gap in bundled extensions)
   - Electron download checksum file was still pinned to v34.3.2 after #140's v43.7.7 upgrade,
     blocking any actual launch — fixed with the official v43.7.7 SHASUMS256.txt
   - **Real app launch**: found and fixed two genuine runtime crashes neither `tsc` nor gulp's
     compile step could ever catch — a `process is not defined` crash in the renderer (#178) and
     a circular-import temporal-dead-zone crash between `usageTrackingService.ts` and
     `aiModelRegistryService.ts` (#179). After both fixes: **confirmed via live process
     inspection** (not just logs) that the app launches to a real, stable window with zero errors —
     the first clean launch of this build all session.
   - Found `out/`/`extensions/*/out/` compiled output is committed to git with no `.gitignore`
     entry — filed as tech debt (#180), not fixed tonight (large, separate decision)
   - CI's `macos-14` runner pins an older Xcode/Clang and should be unaffected by the spdlog issue
     either way; `macos-latest` (used only for remote-server builds) could float to a newer image
     over time — worth a follow-up check if that job ever starts failing the same way
3. ✅ Pushed to `origin/main` (`719b7fb0`, fast-forward from `4092d5ff`) — GitHub Actions triggered:
   "Skills Manager Tests" and "Windows ARM64 Signed Build" both running as of push time
4. ⏳ Download and install the actual packaged build, verify it launches and works — waiting on CI
