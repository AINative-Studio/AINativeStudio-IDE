# Shadow Workspace — Design Document

Status: DRAFT — design pass only, no implementation of the full feature yet.
Tracks: #159. Related: #141 (unrelated — billing integration, not architecture).

## 1. Problem statement

Today, when an agent calls `edit_file` or `rewrite_file`, `toolsService.ts` calls straight into
`editCodeService.instantlyApplySearchReplaceBlocks` / `instantlyRewriteFile`, which write directly
into the real, live `ITextModel` for that URI — the same model the user's editor is rendering. The
change is wrapped in a `DiffZone` (green/red decorations, accept/reject widgets) and an undo/redo
checkpoint, but there is no point before that write where the content exists anywhere else. There is
no "staging" layer. Approval (`approvalTypeOfBuiltinToolName['edit_file'] === 'edits'`) gates whether
the tool call is allowed to run at all — it does not gate a pre-computed, already-validated result.

Concretely, from reading `editCodeService.ts` (2475 lines) and `toolsService.ts`:

- `_writeURIText()` is the single low-level write path. It calls `model.applyEdits()` directly on the
  real `ITextModel` (guarded by a `weAreWriting` flag so the service's own content-change listener
  doesn't treat its own writes as user edits).
- `_initializeWriteoverStream` / `_initializeSearchAndReplaceStream` both stream LLM output
  token-by-token through `_writeURIText`, so partial/invalid intermediate states are visibly rendered
  in the real buffer while the model is still generating.
- `AINativeModelService.initializeModel(uri)` resolves the model via
  `ITextModelService.createModelReference(uri)` — this is the *same* model instance used by open
  editors; there's no separate "working copy" per caller.
- Lint/diagnostics feedback (`toolsService._getLintErrors`) is just `IMarkerService.read({resource: uri})`
  after an arbitrary `timeout(2000)` — i.e. "whatever the already-running TS/ESLint extension host
  happened to compute for this real-file URI by the time we checked." There is no explicit
  "run the type-checker and wait for it to finish" step, and no isolated run against speculative edits.
- Approval gate: `chatThreadService._runToolCall` checks `approvalTypeOfBuiltinToolName[toolName]`
  (`'edits' | 'terminal' | 'MCP tools'`) against `autoApprove` settings *before* calling the tool at
  all. It's a single global per-category toggle, not a per-change preview gate — there's no concept
  of "run the edit somewhere safe, then ask for approval on the validated outcome."
- Checkpoints (`_addToolEditCheckpoint`) snapshot `editCodeService.getAINativeFileSnapshot(uri)` —
  whole-file text + diff-area metadata — purely for VS Code's own `IUndoRedoService` stack. This is
  an undo mechanism, not a staging/validation mechanism, and it's per-file, not workspace-wide.

This matches the issue's framing exactly: AINativeStudio has no equivalent of Cursor's
`cursor-shadow-workspace` — there is no hidden copy of the workspace an agent can edit and validate
before any byte reaches the user's real buffers.

## 2. Research findings: what VS Code core already gives us

### 2.1 `IFileService` is scheme-pluggable

`IFileService` (`src/vs/platform/files/common/files.ts`) dispatches to a file system *provider*
registered per URI scheme (`registerProvider(scheme, provider)`). `file://` and `vscode-remote://`
are just two registrations among many — nothing is hardcoded to assume `file://` at the `IFileService`
level. Registering a new scheme (e.g. `ainative-shadow://`) with its own provider is a supported,
idiomatic extension point, not a hack.

### 2.2 `InMemoryFileSystemProvider` exists and is directly reusable

`src/vs/platform/files/common/inMemoryFilesystemProvider.ts` already implements a complete
`IFileSystemProviderWithFileReadWriteCapability` (stat, readdir/directory entries, readFile,
writeFile, delete, rename, mkdir, watch via emitted change events) entirely in memory, keyed by URI.
It is already used in-tree (e.g. test harnesses, `vscode-userdata://`-style internal schemes). This
is a serious candidate for the "shadow filesystem" itself: register it under a new scheme, and the
rest of the file-service/text-model stack (which only talks to `IFileService`/`ITextFileService`,
never to the disk directly) works against it unmodified.

### 2.3 `AINativeModelService` is already scheme-agnostic

`src/vs/workbench/contrib/ainative/common/ainativeModelService.ts` resolves models via
`ITextModelService.createModelReference(uri)`, which internally routes through `ITextFileService` /
`IFileService` based on `uri.scheme`. Nothing in `initializeModel`, `getModel`, or `saveModel` assumes
`file://`. Likewise `toolsService.ts` already injects `IFileService` directly for
`create_file_or_folder`/`delete_file_or_folder`, and `validateURI()` already accepts arbitrary
`scheme://` URIs from the LLM's tool-call params, falling back to `URI.file()` only when no scheme is
present. **This means the tool-call plumbing in this codebase is already largely URI/scheme-agnostic** —
a major simplification versus inventing scheme-redirection from scratch.

### 2.4 The practical blocker: language services assume disk-backed, project-rooted files

The built-in `extensions/typescript-language-features` extension runs `tsserver` as a child process
against real paths. `tsserver` (and ESLint, and most compilers/linters/test runners for any language)
resolve `tsconfig.json`, `package.json`, `node_modules`, path-mapped imports, etc. via real filesystem
traversal from the file's path upward. An in-memory-only shadow scheme would require either:
- Running a *second* language-server/tsserver instance configured with an in-memory "host" (TS's
  `LanguageServiceHost` interface does support this in principle — tsserver can be driven over
  in-memory file contents via its `open`/`change` protocol without real disk files, which is in fact
  how VS Code already handles **unsaved/dirty editor buffers** for the *real* workspace: tsserver gets
  told about in-memory edits for already-open files without a disk write). But project-wide resolution
  (new files, new imports reaching outside what's already open, `node_modules` resolution) is far more
  fragile without real paths on disk.
- Or: materializing the shadow copy as actual files in a real temp directory, so the *existing*
  `tsserver`/ESLint/compiler tooling works completely unmodified, pointed at a different root.

Diagnostics today (`toolsService._getLintErrors`) are just `IMarkerService.read()` for a URI — i.e.
whatever the extension host already computed. For a shadow copy, markers would need to be collected
for the *shadow* URIs specifically, which again is far more straightforward if the shadow copy is a
real path tsserver can `open()` like any other file than if it's a synthetic in-memory URI the
extension host's project-discovery logic doesn't know how to walk.

### 2.5 Decision

**Use a real temporary directory on disk as the shadow copy, not an in-memory FS provider.**

Rationale:
- It makes type-checking/linting/test-running "just work" with zero changes to the TS extension,
  ESLint, or any other disk-based tool — this is the single biggest win and avoids a second,
  custom-maintained language-service integration.
- `run_command`/`run_persistent_command` (via `terminalToolService.ts`) already shells out with a
  `cwd` parameter — pointing a `cwd` at the shadow directory to run `tsc --noEmit`, `pytest`, etc. is
  a one-line change to an existing, working mechanism; no in-memory FS can support this.
- The codebase already has an established, idiomatic pattern for this
  (`os.tmpdir()` + `path.join('ainative-<purpose>-' + id)`), used today in
  `communityMarketplace.ts` and `skills/cli/installCommand.ts` — this is not a new pattern to the
  team, just a new use of an existing one.
- `InMemoryFileSystemProvider` remains useful as a *fallback/fast-path* for files the agent creates
  from scratch and that never need language-server validation (e.g. README edits, config text edits)
  — but it should not be the primary mechanism, given (2.4).
- Downside accepted: disk I/O cost for sync, and temp-directory lifecycle/cleanup is now a real
  concern (crash-safety, orphaned directories) that an in-memory FS wouldn't have. This is addressed
  in §4.

## 3. Architecture

### 3.1 Where the shadow copy lives

- One shadow directory per chat thread (not per edit, not global): e.g.
  `<tmpdir>/ainative-shadow/<threadId>/`.
- Mirrors the structure of the real workspace folder(s) relative to each workspace root — i.e. the
  shadow root for workspace folder `/Users/me/project` is a 1:1 directory tree under
  `<tmpdir>/ainative-shadow/<threadId>/<workspaceFolderName>/`.
- A new service, `IShadowWorkspaceService` (new file:
  `src/vs/workbench/contrib/ainative/common/shadowWorkspaceService.ts`, browser-side orchestration in
  `.../browser/shadowWorkspaceService.ts` if main/renderer split is needed — file I/O can stay in the
  common layer since `IFileService` is already process-agnostic via its providers), owns:
  - `createShadowForThread(threadId): Promise<ShadowWorkspace>` — allocates the temp dir.
  - `syncFileIntoShadow(threadId, realUri): Promise<URI>` — lazily copies one real file's *current
    saved-or-model content* into the shadow tree the first time the agent touches it in that thread,
    returns the shadow URI. Lazy, on-demand copying (not a full workspace clone up front) keeps this
    cheap for small/targeted edits — large monorepos make an eager full clone impractical.
  - `shadowUriFor(realUri)` / `realUriFor(shadowUri)` — pure path-mapping helpers.
  - `diffShadowAgainstReal(threadId): Promise<FileDiff[]>` — walks only the files that were actually
    touched (tracked in a `Set<string>` as they're synced/written) and diffs shadow vs. real content.
  - `disposeShadow(threadId)` — deletes the temp dir; called on thread deletion, on explicit
    "discard" from the user, and defensively on IDE startup for any orphaned
    `ainative-shadow/*` directories older than, say, 24h (crash-safety cleanup).
- Node/disk access goes through the existing `IFileService` with the `file://` scheme, just rooted at
  the temp path — no new filesystem provider or scheme is strictly required for the MVP, which keeps
  the first phase small (see §6). A shadow *scheme* (`ainative-shadow://` mapped to the same temp
  directory via a thin provider) is a nice-to-have for editor-side "open the shadow file in a diff
  tab" UX later, not a requirement for the core mechanism.

### 3.2 How the agent's edit tools get redirected

This is the part that benefits most from the existing architecture already being URI-agnostic
(§2.3):

- In `toolsService.ts`, each file-mutating tool (`edit_file`, `rewrite_file`,
  `create_file_or_folder`, `delete_file_or_folder`) gets a new `targetUri` resolution step inserted
  before the existing body:
  ```
  const targetUri = shadowModeEnabled
      ? await shadowWorkspaceService.syncFileIntoShadow(threadId, uri)
      : uri
  ```
  Everything downstream (`editCodeService.instantlyApplySearchReplaceBlocks`,
  `voidModelService.initializeModel`, etc.) already operates on whatever `URI` it's given — this is
  precisely what §2.3 established. The diff-zone/streaming visualization in `editCodeService` keeps
  working unmodified, just rendering into a model for the shadow URI instead of the real one — which
  also means the user does NOT see these changes in their open editor tabs at all (the shadow URI
  isn't open in any visible editor), satisfying "hidden until validated."
- Read tools (`read_file`, `ls_dir`, `search_in_file`, etc.) need a parallel redirect: if a file has
  already been synced into the shadow for this thread, reads should serve the shadow version (so the
  agent sees its own prior edits), otherwise fall back to the real file transparently.
- `chatThreadService._runToolCall`'s approval gate (`approvalTypeOfBuiltinToolName`) moves from
  gating *tool execution* to gating *shadow-to-real promotion*: individual shadow edits can run
  without per-call approval (they're invisible/inert until promoted), and a single approval step
  happens once, at the end, over the whole accumulated diff (§3.4). This directly answers the issue's
  open question about UX in favor of Cursor's model — see §3.4 for why.
- Terminal tools (`run_command`) gain an implicit `cwd` override when shadow mode is active for a
  thread and no explicit `cwd` was given by the agent — commands default to running inside the
  shadow tree so `tsc`/`pytest`/`npm run build` naturally validate the staged state.

### 3.3 Type-checking against the shadow copy

Per §2.4/§2.5, since the shadow copy is real files on disk:

- **No second language-server process is required for the MVP.** The simplest, most robust mechanism
  is explicit, on-demand invocation: after a batch of shadow edits, run the project's existing
  type-checker as a plain subprocess via the existing `terminalToolService` (e.g. `tsc --noEmit -p
  <shadow-tsconfig>` / `pyright <shadow-dir>`), with its `cwd` set to the shadow root, and parse its
  textual/JSON output for the pre-apply validation result. This reuses 100% of existing
  infrastructure (`terminalToolService.runCommand`) and avoids depending on the extension host's
  live diagnostics timing (`timeout(2000)` guesswork), which is the real weakness worth fixing while
  we're here.
- This does mean the shadow `tsconfig.json`/project files need to resolve correctly from the shadow
  root — since the shadow tree mirrors the real tree's relative structure 1:1 under its own root,
  relative `extends`/`paths` in `tsconfig.json` resolve correctly as long as the *whole* project
  (not just touched files) is present. This pushes the "lazy per-file copy" model (§3.1) toward a
  **lazy "copy touched file + its closest config ancestors (tsconfig.json, package.json) + a
  symlink to the real `node_modules`"** compromise, rather than a literal full clone: symlinking
  `node_modules` (same technique `pnpm`/various scaffolding tools use) avoids the cost of copying
  potentially gigabytes of dependencies while keeping module resolution correct.
- **Phase 2 enhancement** (not MVP): drive the *existing* `tsserver` the extension host already has
  running, via its open/change protocol, telling it about the shadow files as additional
  in-memory-ish "open" documents rooted at the real project (same technique VS Code uses today for
  unsaved dirty buffers). This would give live, incremental diagnostics instead of batch subprocess
  calls, but requires reaching into `typescript-language-features`' internal APIs/commands, which is
  meaningfully more invasive and language-specific (would need an equivalent for Python/Go/etc.
  separately). Worth revisiting once the subprocess-based MVP proves the UX is wanted.

### 3.4 UX: single clean diff vs. streaming against the shadow copy

Recommendation: **hybrid, favoring Cursor's "single clean diff at the end" as the default, while
keeping streaming visible but clearly marked as provisional.**

- While the agent is actively editing, the chat panel (not the editor) shows a live, lightweight
  per-file status list ("editing `foo.ts`... ✓ synced, editing `bar.ts`...") — this reuses the
  existing tool-call timeline UI that already renders `running_now`/`tool_edit` checkpoint entries,
  just relabeled, so there's no "silent black box" feeling during a long multi-file agent turn.
  Critically, **none of this touches the user's real open editor tabs** — if `foo.ts` happens to be
  open, its visible content does not change mid-edit. This alone is the core trust win the issue asks
  for.
- Once the agent's turn finishes (or the agent explicitly signals "ready for review", e.g. after its
  own internal type-check subprocess call comes back clean), present **one** aggregate diff view
  covering every touched file — reusing the existing multi-file diff/accept-reject machinery
  `editCodeService` already has per-file (`DiffZone`, `acceptDiff`/`rejectDiff`,
  `acceptOrRejectAllDiffAreas`), just invoked once per file against (shadow content) vs. (real
  content) instead of against (LLM stream) vs. (pre-edit real content). This is the "promotion"
  step: accepting writes shadow→real via the normal `editCodeService`/`voidModelService` write path
  (so undo/redo, checkpoints, and existing diff UI all keep working untouched); rejecting just
  discards the shadow copy for that file.
- A user who wants Cursor's exact behavior gets it as the default. A user who wants to *watch* the
  agent work in real time can optionally open the shadow file directly (via a command/explorer entry,
  not an auto-focus) if the `ainative-shadow://` scheme/provider nice-to-have from §3.1 is built —
  deferred to phase 2.
- Approval settings (`autoApprove.edits`) apply to the *promotion* step, not to individual shadow
  writes — meaning "auto-approve edits" now means "auto-promote the agent's validated shadow diff,"
  which is actually closer to what users who enable that setting today expect, and is strictly safer
  than the current behavior (real buffer writes with no validation gate at all).

## 4. Lifecycle, failure modes, and safety

- **Crash/quit mid-edit**: shadow dirs are never the source of truth and are never auto-promoted;
  worst case on restart is an orphaned temp directory, swept by the startup cleanup sweep (§3.1).
  Real files are never at risk because they're untouched until explicit promotion.
- **Real file changes underneath a shadow copy** (user edits `foo.ts` while the agent is mid-edit in
  shadow): detect via `IFileService` `watch()`/mtime comparison at promotion time; if the real file's
  content has diverged from what was synced into the shadow, treat it like today's existing
  "Another LLM is currently making changes to this file" guard in `toolsService.rewrite_file`/
  `edit_file` — surface a conflict instead of silently clobbering the user's own edit.
- **Disk space / cleanup**: cap shadow dir lifetime to the owning thread; dispose on thread deletion;
  periodic sweep as above; consider a size/age cap for the whole `ainative-shadow/` root as a later
  hardening pass, not MVP-blocking.
- **Multi-root workspaces**: shadow root mirrors each workspace folder independently — no special
  handling needed beyond what `syncFileIntoShadow` already does per-URI.

## 5. What is explicitly out of scope for this design

- A second, persistent language-server process per shadow workspace (§3.3 phase 2, not MVP).
- A custom in-memory virtual filesystem as the primary shadow mechanism (§2.5 decision).
- Any change to the undo/redo or `AINativeFileSnapshot` checkpoint model — promotion reuses the
  exact existing write path, so checkpoints keep working as-is.
- Cross-thread shared shadow state — each thread's shadow is isolated.

## 6. Phased implementation plan

**Phase 0 (this pass)** — design only (this document), plus, if safe and small: the bare
shadow-copy creation/sync primitive with no UI and no tool wiring (see §7 — implemented).

**Phase 1 (MVP)**:
- `IShadowWorkspaceService` with `createShadowForThread`/`syncFileIntoShadow`/`diffShadowAgainstReal`/
  `disposeShadow` (this pass's primitive is the seed of this).
- Wire `edit_file`/`rewrite_file`/`create_file_or_folder`/`delete_file_or_folder` in `toolsService.ts`
  to redirect through the shadow service when a thread has shadow mode enabled (new thread-level
  setting/flag, default OFF while unproven).
- Read-tool redirect so the agent sees its own uncommitted shadow edits.
- End-of-turn aggregate diff + single promotion/discard action in the chat UI, reusing
  `editCodeService`'s existing per-file diff machinery.
- No automatic type-checking yet in phase 1 — ship the "hidden edits + single diff" trust win first,
  independent of validation.

**Phase 2**:
- Subprocess-based type-check/lint invocation against the shadow tree before presenting the diff
  (tsc/pyright/eslint — start with whatever's configured in the real workspace, detected the same
  way existing lint-error surfacing already assumes a configured toolchain).
- `node_modules` symlink strategy + config-ancestor copying for correct project resolution (§3.3).
- Conflict detection for concurrent real-file edits (§4).
- Startup orphan-sweep for crashed shadow directories.

**Phase 3 (stretch)**:
- `ainative-shadow://` URI scheme + provider so a user can optionally open/watch the live shadow file
  in a diff editor tab during streaming, instead of only seeing the chat-panel status list.
- Driving the existing extension host's `tsserver` directly for incremental diagnostics instead of
  batch subprocess calls (requires `typescript-language-features` internal API work, and would need
  a per-language equivalent — likely not worth it unless phase 1/2 usage data shows subprocess
  latency is a real UX problem).

## 7. What was implemented in this pass

See the commit on branch `fix/159-shadow-workspace`: the bare shadow-copy creation/sync primitive
(`IShadowWorkspaceService.createShadowForThread` / `syncFileIntoShadow` / `disposeShadow`), with unit
tests, and no wiring into `toolsService.ts` or any UI. This is deliberately inert — registered as a
singleton service but not called from anywhere yet — so it carries zero behavioral risk while giving
phase 1 a real, tested foundation to build on instead of starting from nothing.
