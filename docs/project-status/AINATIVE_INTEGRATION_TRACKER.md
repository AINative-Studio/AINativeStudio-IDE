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
     compile step could ever catch — a `process is not defined` crash in the renderer (#178,
     **closed**) and a circular-import temporal-dead-zone crash between `usageTrackingService.ts`
     and `aiModelRegistryService.ts` (#179, **closed**). After both fixes: **confirmed via live
     process inspection** (not just logs) that the app launches to a real, stable window with zero
     errors — the first clean launch of this build all session.
   - Found a third real crash during this same launch testing, fixed after the push below:
     `deleteBlacklistExtensions()` in `extensionTransferService.ts` threw an unhandled rejection
     calling `fileService.resolve()` on an extensions folder that simply doesn't exist on a fresh
     install (every CI/test environment, and this session's own test machine). Wrapped in
     try/catch — "folder doesn't exist" just means nothing to clean up. Commit `5e6722a8`.
   - Found `out/`/`extensions/*/out/` compiled output is committed to git with no `.gitignore`
     entry — filed as tech debt (#180), not fixed tonight (large, separate decision)
   - CI's `macos-14` runner pins an older Xcode/Clang and should be unaffected by the spdlog issue
     either way; `macos-latest` (used only for remote-server builds) could float to a newer image
     over time — worth a follow-up check if that job ever starts failing the same way
3. ✅ Pushed to `origin/main` (`719b7fb0`, fast-forward from `4092d5ff`) — GitHub Actions triggered:
   "Skills Manager Tests" and "Windows ARM64 Signed Build" both running as of push time
   - **New systemic bug found via live CI failure**: all 11 `.github/workflows/*.yml` files were
     pinned to Node 20, but Electron 43.7.7 (#140's upgrade) declares `"node": ">=22.12.0"` in its
     own `package.json` — `npm ci` failed rebuilding `native-keymap`'s node-gyp addon on every
     workflow. Confirmed via `gh run view --log-failed` on the "Skills Manager Tests" failure
     (run 37486335210) and the "Windows ARM64 Signed Build" failure (run 37486335106) — both
     failed the same way. Fixed by bumping every `node-version` pin from `20`/`20.x` to
     `22`/`22.x` across all 11 workflow files. Commit `b0dd569a`.
   - Pushed both fixes (`b0dd569a` Node version, `5e6722a8` extensionTransferService) to
     `origin/main` — new CI runs dispatched against the fix: Windows ARM64 (37487574697) and
     Skills Manager Tests (37487574912), plus a Windows ARM64 run against the Node fix alone
     (37486666952) and the still-running macOS ARM64 signed build dispatched before the Node fix
     landed (37486588189, headSha `719b7fb0` — may or may not hit the same wall depending on
     whether that runner's image ships Node ≥22 independent of our workflow pin).
4. All 4 of the above CI runs completed — 3 new real bugs found, 2 fixed and pushed, 1 filed:
   - **macOS ARM64 build failed** (run 37486588189) on a genuine bug, independent of Node/X11:
     `registerReactPanel()`'s generic factory (added for #150 tonight) called
     `nls.localize()`/`localize2()` with variable arguments (`options.titleKey`, `options.title`)
     instead of string literals. VS Code's NLS extraction tooling statically parses `localize()`
     call sites via AST and `eval()`s the extracted source text standalone — a bare identifier has
     no scope at eval time, so every production build target (`gulp vscode-*`) crashed with
     `ReferenceError: options is not defined` in `build/lib/nls.js`. Invisible to `tsc` and to dev
     builds, which skip the NLS patch step — only a real packaged build caught it. Fixed by moving
     the `localize()`/`localize2()` calls back to literal call sites (one per panel). Commit
     `06bd6e0c`.
   - **Skills Manager Tests failed again** even after the Node fix (run 37487574912) — different
     root cause this time: its `unit-tests`/`integration-tests`/`performance-tests`/`coverage`
     jobs run `npm ci` at the `ainative-studio` root on bare `ubuntu-latest`, pulling in
     `native-keymap`'s node-gyp build, which needs X11 dev headers (`libx11-dev`,
     `libxkbfile-dev`, etc.) that aren't installed by default. Every other Linux workflow in this
     repo only runs `npm ci` inside `build/` (a smaller, separate `package.json` without this
     dependency), so this was never hit before. Upstream VS Code's own Azure Pipelines config
     installs exactly this package set before any root `npm ci`; added the same `apt-get` step
     here. Commit `06bd6e0c` (same commit as the NLS fix above).
   - **Windows ARM64 Signed Build (Free Runner) failed** (runs 37486335106, 37487574697) on a
     third, unrelated root cause: `build/.npmrc` sets `build_from_source="true"` for the whole
     `build/` tooling tree, forcing `tree-sitter`'s native module to always compile from source via
     `node-gyp rebuild` even though it ships a working `win32-arm64` prebuild. The free-tier
     Windows ARM64 runner has no Visual Studio C++ Build Tools installed, so the forced compile
     fails. Investigated but **not fixed tonight** — `build_from_source` can't be blindly deleted
     since `keytar` (also in `build/`) ships no prebuilds at all and may need it; this is shared
     config affecting every platform build, inherited verbatim from upstream VS Code (whose own
     hosted CI images have the toolchain preinstalled) with no bespoke reasoning recorded. Filed as
     **#181** for a maintainer to scope the fix (per-package override, or install VS Build Tools in
     the workflow) rather than changing it unilaterally.
5. ✅ macOS ARM64 build (37491027548, `06bd6e0c`) succeeded — build, sign, and package all green.
   **Real milestone: the first-ever successfully packaged, signed build of this session.**
   Downloaded the signed DMG, verified its sha256 checksum, mounted it, verified the code
   signature (real Developer ID Application cert, Apple Root CA chain, hardened runtime) —
   signed but **not notarized** (Gatekeeper `spctl` rejects it as "Unnotarized Developer ID";
   expected, since this pipeline doesn't notarize, and not something to fix tonight). Installed
   to `/Applications`, dequarantined for local testing, and launched it.
   - ❌ Skills Manager Tests (37489624983, `06bd6e0c`) still failed, but progressed much further
     than before — the X11-headers fix worked (`native-keymap` built fine). New root cause: 4 of
     its jobs run `npm ci` at the `ainative-studio` root, which recurses into every extension via
     `build/npm/postinstall.js` — `extensions/open-remote-ssh` depends on `ssh2`/`simple-socks`
     forks pinned via `git+ssh://git@github.com/...` in its lockfile (npm always canonicalizes
     GitHub git deps to SSH form regardless of how the `package.json` spec is written). CI runners
     have no SSH key for arbitrary git+ssh npm installs, so the clone fails silently (npm's own
     error text goes only to a debug log file, never surfaced to CI's captured stdout). Fixed by
     adding a `git config --global url."https://github.com/".insteadOf "git@github.com:"` step
     before every `npm ci` in this workflow (standard anonymous-HTTPS rewrite for CI). Commit
     `06bd6e0c` (included with the NLS/X11 fixes). Not applied to the other 9 build workflows
     since they aren't currently broken by it (the macOS build above succeeded without this fix).
   - 🔴 **CRITICAL finding from the real launch**: the app opened to a completely blank window —
     no menu bar, no sidebar, no editor, just bare Electron chrome. Different from #140 (stable
     process, no GPU crash loop). Connected Chrome DevTools Protocol directly to the packaged
     renderer and found the real cause: `SkillSyncCommand` (registered from
     `common/skills/cli/skillCommands.contribution.ts`, reachable from the main workbench bundle)
     did a dynamic `await import('./syncCommand.js')`, which transitively imports
     `node/skills/symlinkUtils.ts` and `node/skills/gitOperations.ts` — both correctly placed in
     `node/` but containing direct `fs`/`path` Node imports. This build's esbuild config doesn't
     code-split the desktop workbench bundle, so the dynamic import got flattened into the single
     `workbench.desktop.main.js` exactly like a static import — the `fs` import threw at
     module-evaluation time on every single launch. Traced by grepping the actual 38MB packaged
     bundle for the thrown specifier and walking the import chain back to source. `syncCommand.ts`
     itself is unfinished/never-wired main-process-only logic (direct `process.cwd()` call,
     `INativeEnvironmentService` injected into `common/` code, zero non-test callers anywhere).
     Removed the broken `SkillSyncCommand` registration rather than attempting a full IPC redesign
     live (commit `fe42f63b`) — `syncCommand.ts`/`symlinkUtils.ts`/`gitOperations.ts` left
     untouched on disk for a future real IPC-based implementation. Filed as **#182**.
6. ✅ Fresh macOS ARM64 build (37508306265, `fe42f63b`) succeeded. Verified the blank-screen fix
   both locally (`npm run compile` → `./scripts/code.sh` → CDP connected to the running renderer →
   confirmed zero uncaught exceptions, real UI rendered) and against the actual packaged build
   (downloaded, checksum-verified, installed, launched — same result). **#182 closed.**
7. ✅ Testing the fixed build surfaced a real product gap the original audit missed: first-run
   onboarding had no path to sign into AINative Cloud at all, only BYOK provider setup — filed as
   **#183**. Fixed by adding a prominent "Sign In to AINative Cloud" button directly on the
   onboarding Welcome page (equal footing with "Get Started"), reusing the existing
   `AINativeLoginModal`/`useAINativeAuth` already wired into Settings.tsx. Correction to the
   original finding: "Add AINative Cloud" was already technically present as one of nine provider
   cards in the Paid tab (confirmed via live CDP inspection — `providerNames` isn't filtered to
   exclude it) — the real gap was discoverability, not total absence. Verified via local CDP
   (button text confirmed rendered, zero exceptions). Commit `cd3b1cfa`. **#183 closed.**
   Also found and filed, not fixed tonight: session login doesn't auto-provision a usable
   chat-completions API key (JWT session auth and the `sk_`/`tmp_`/`zdb_live_` API-key system are
   fully disconnected) — real backend-contract question, filed as **#184**, left open rather than
   guessed at.
8. ✅ Re-verified **#140** (black screen on macOS 26) using the exact diagnostic method from the
   original report — installed the real signed packaged build, launched the Electron binary
   directly with `--enable-logging --v=1`, confirmed the GPU process stays alive with zero
   occurrences of the original report's smoking-gun `GPUProcessTerminationStatus2` /
   `ABNORMAL_TERMINATION` signature. Root cause was the Electron 34→43.7.7 upgrade. **#140 closed.**
9. Backlog sweep after the pipeline reached a stable, verified state (user asked to keep iterating
   on the backlog rather than stop at the pipeline goal):
   - **#168** (Cerebras/Fireworks/DigitalOcean BYOK providers) — confirmed every item in its scope
     checklist already complete via direct source audit (`defaultProviderSettings`,
     `displayInfoOfProviderName`, real `OpenAI`-client wiring in `sendLLMMessage.impl.ts`, visible
     in onboarding's Paid tab). **Closed**, no code change needed.
   - **#180** (`out/` committed without `.gitignore`) — added `.gitignore` rules for `out/`,
     `out-build/`, `out-vscode*/`, `extensions/*/out/` to stop new drift (commit `5c07feaa`).
     Deliberately did **not** remove the ~6,820 already-tracked files under these paths —
     confirmed via `git ls-files` count; a repo-wide removal of that size needs its own reviewed
     commit, not something to fold into an autonomous pass. Left open for that follow-up.
   - **#171** (`_markerCheckService`'s unthrottled 5s poll) — this was more serious than earlier
     tracker entries characterized it: `InstantiationType.Eager` means it genuinely runs in every
     window for every user today, not just dormant/unreachable code. Fixed the active harm by
     switching to `InstantiationType.Delayed` (commit `f48a35b7`) — confirmed via repo-wide search
     that nothing injects `IMarkerCheckService`, so it now never instantiates in practice. Left
     open, still tied to #154's real finish-vs-delete product decision, which this doesn't
     preempt.
   - 19 issues remain open as of this update — almost entirely genuine product/design decisions
     (#109, #127, #151, #152, #154, #160, #164, #165, #167, #184) or real feature-build work
     (#159, #161, #162, #174–176), plus #181 (Windows ARM64 CI, deliberately deferred — shared
     build config, risk of breaking other platforms) and #180/#171 (now correctly tracked as
     partial, not silently resolved).
