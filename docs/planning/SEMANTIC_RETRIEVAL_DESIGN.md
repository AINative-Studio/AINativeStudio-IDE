# Semantic Retrieval / Codebase Indexing — Design

Issue: [#160](https://github.com/AINative-Studio/AINativeStudio-IDE/issues/160)
Status: design only — no indexing/storage implemented yet (see "What exists today" and "Phased plan")

## 0. What exists today (corrects two assumptions in the issue)

1. **`contextGatheringService.ts`** (`ainative-studio/src/vs/workbench/contrib/ainative/browser/contextGatheringService.ts`)
   gathers *symbol-graph* context (nearby lines + definitions/references reached
   via the language service, walking outward from the cursor), not literal
   open-file/selection text. It is a reasonable "local neighborhood" context
   source, but it is **currently dead code**: its import in
   `ainative.contribution.ts` is commented out (`// import
   './contextGatheringService.js'`), and its only intended consumer,
   `autocompleteService.ts`, also has the service commented out of its
   constructor injection. `getCachedSnippets()` has no live caller. It is not
   wired into chat/agent context at all today.

2. The actual, live context payload sent to the model is built in
   `convertToLLMMessageService.ts`, via `chat_systemMessage({ workspaceFolders,
   openedURIs, directoryStr, activeURI, persistentTerminalIDs, chatMode,
   mcpTools, includeXMLToolDefinitions })` (`prompts.ts`). This is just a list
   of open file *paths* and the workspace directory tree string — no file
   *content*, no symbol context, no retrieval. This, not
   `contextGatheringService.ts`, is the real seam this feature must plug into.

So this feature has two integration points, not one: reviving/repurposing
`contextGatheringService.ts`'s local-neighborhood signal is optional and
separable from the new semantic-retrieval signal, and both ultimately feed the
same place — the system message assembled in `convertToLLMMessageService.ts`.

## 1. Backend research: does AINative already offer this?

Yes — found by walking the live OpenAPI document
(`https://api.ainative.studio/openapi.json`, 3200+ paths) rather than guessing.
`docs/api/BACKEND_CONTRACT_NOTES.md` (from #143) doesn't mention embeddings at
all, so this is new ground for that document and worth folding back in.

There are three overlapping embedding/vector surfaces on the backend. Only one
is purpose-built for this feature:

### 1a. Code Context Engine — the right primitive (recommended)

```
POST /api/v1/public/code-context-engine/chunk/file                         { file_path, content, language? }
POST /api/v1/public/code-context-engine/{project_id}/chunk/directory        { directory_path, include_patterns?, exclude_patterns? }
POST /api/v1/public/code-context-engine/embed/chunk                         { chunk_id }
POST /api/v1/public/code-context-engine/embed/file                         { file_path }
POST /api/v1/public/code-context-engine/{project_id}/search/similarity      { query_text, limit=10, threshold=0.7 }
GET  /api/v1/public/code-context-engine/chunks/file/{project_id}
GET  /api/v1/public/code-context-engine/chunks/project/{project_id}
GET  /api/v1/public/code-context-engine/embeddings/{project_id}/{chunk_id}
```

(Path parameter placement for `project_id` varies by route — confirmed from
the spec's own `parameters` arrays, not inferred — check the live spec before
wiring each call.)

This is purpose-built for exactly this use case: "chunk a code file into
semantically meaningful segments," then embed, then similarity-search, all
scoped to a `project_id`. Chunking is **server-side** — the client sends raw
file content and a chunking strategy is applied on the backend, so the IDE
does not need to implement AST-aware chunking itself to use this path.

Verified live: all three core routes (`chunk/file`, `embed/file`,
`search/similarity`) return `401` unauthenticated (exist, auth-gated), not
`404`. Auth is `HTTPBearer` (JWT), **not** `X-API-Key` — consistent with
section 2b of `BACKEND_CONTRACT_NOTES.md` (the JWT-authed surface used for
`/managed/*` and `/users/me`), so this reuses the existing login session
rather than needing the separate AINative Cloud API key flow.

**Caveat found during research, not theoretical:** `GET
/api/v1/public/embeddings/health` (the general embedding health probe,
shared infrastructure) currently returns:

```json
{"status":"degraded","message":"Embedding service not responding","url":"https://inference.do-ai.run"}
```

i.e., the backend's own embedding model host is unhealthy *right now*. This
doesn't block designing against this API, but it means the design must not
assume the remote embedding path is always available, and the MVP should not
take a hard dependency on it being up — see §4 (local fallback) and §7
(risks).

### 1b. Generic ZeroDB embeddings/vectors — not the right fit here

```
POST /api/v1/projects/{project_id}/embeddings/generate
POST /api/v1/projects/{project_id}/embeddings/embed-and-store
POST /api/v1/projects/{project_id}/embeddings/search
POST /api/v1/projects/{project_id}/database/vectors/upsert[-batch]
POST /api/v1/projects/{project_id}/database/vectors/search
```

This is ZeroDB's general-purpose vector store (also exposed via the
`zerodb-mcp-guide` MCP tools — `zerodb_semantic_search`,
`mcp__zerodb-memory__zerodb_embed_text`, `zerodb-vector-upsert`,
`zerodb-vector-search`, etc.). It's a fine generic vector database, but using
it directly would mean reimplementing code-aware chunking, chunk metadata
(file path, byte range, symbol name), and incremental-update bookkeeping from
scratch in the IDE. The Code Context Engine (§1a) is this same ZeroDB vector
infrastructure *with code-specific chunking and metadata already built on
top*, so it's strictly the better fit unless 1a turns out to be
abandoned/unmaintained internally (worth a quick Slack check before Phase 2,
not blocking the design).

### 1c. `/api/v1/codebase/index` and `/api/v1/code-chunks/` — unclear overlap

```
POST   /api/v1/codebase/index
GET    /api/v1/codebase/index/status
DELETE /api/v1/codebase/index
GET/POST /api/v1/code-chunks/
```

These look like they might be an older or parallel implementation of the same
idea (no `project_id` scoping visible in the top-level paths, unlike 1a's
consistently project-scoped routes). Not explored further for this design —
flagged here so whoever picks up Phase 2 checks with backend whether these
are legacy, a different scope (e.g. account-wide vs. per-project), or in fact
the intended public entry point instead of 1a. Do not assume 1a is correct
without a 5-minute confirmation.

### Recommendation

**Use the Code Context Engine (§1a) as the embedding + vector-store backend**,
not a separate local embedding model (no bundled ONNX/sentence-transformers
model, no new native dependency, no model download step for users) and not
raw ZeroDB vectors (would require reimplementing what 1a already provides).
Treat the remote dependency as optional/degradable, not required, per the
health-check finding above.

## 2. Chunking strategy

Two options, and the recommendation does not require the IDE to pick one by
itself:

- **Naive fixed-size chunks** (e.g. sliding window of N lines with overlap).
  Trivial to implement, language-agnostic, but frequently splits a function
  signature from its body or separates a class from the method that matters,
  which measurably hurts retrieval precision for code.
- **AST/symbol-aware chunking** (by function/class, using the same
  `ILanguageFeaturesService.documentSymbolProvider` that
  `contextGatheringService.ts` already calls into for
  `_getSymbolsInRange`/`_flattenSymbols`). Produces semantically coherent
  chunks (a whole function, a whole class) at the cost of being
  per-language-server-dependent and more code to maintain.

**Recommendation: rely on the Code Context Engine's server-side chunking
(§1a) for Phase 1, and do not build local chunking at all initially.** The
`chunk/file` endpoint takes raw `content` and `language` and returns
"semantically meaningful segments" — chunking logic lives and evolves on the
backend, shared across every AINative client, instead of being duplicated
and drifting in the IDE. This also sidesteps the fixed-size-vs-AST tradeoff
entirely for v1.

If the backend's chunking later proves inadequate (wrong granularity, poor
language coverage) or the degraded-service risk in §1a materializes
persistently, the fallback is local AST-aware chunking reusing
`ILanguageFeaturesService.documentSymbolProvider`, exactly as
`contextGatheringService.ts` already does — so that fallback path is not a
blank sheet if it's ever needed; it is an extension of existing, working
code.

## 3. Where the vector index lives

**Recommendation: ZeroDB-backed (remote), scoped per-project, with a
degraded/offline mode — not a local on-disk vector index.**

Reasoning:
- Local (e.g. embedded sqlite+vec, or a flat-file HNSW index) avoids the
  network dependency and works fully offline, but means building and
  maintaining embedding generation, storage, compaction, and similarity
  search inside the IDE itself — exactly the surface area the Code Context
  Engine already owns.
- Remote (ZeroDB-backed via §1a) means the index survives across machines for
  the same account/project, multiple IDE windows on the same project share
  one index instead of each paying the embedding cost separately, and
  "upgrade the embedding model" is a backend change with no client update.
  The tradeoff is a hard dependency on network + the backend being healthy,
  and on the user being authenticated (JWT, not just an API key).
- Given it's already confirmed degraded at least once during this research,
  the design must **not** make retrieval a hard blocker for chat/agent
  functioning. Concretely: if a remote search call fails or times out,
  context assembly must proceed without the retrieval chunks rather than
  blocking or erroring the whole request. This is a straightforward
  try/catch-with-timeout around the retrieval call in
  `convertToLLMMessageService.ts`, not a structural challenge — called out
  explicitly because it's easy to skip under time pressure and would turn a
  backend hiccup into a broken chat experience.
- No local on-disk index is needed as a cache in Phase 1 either — see §4,
  which proposes a lightweight local *manifest* (hashes, not vectors) to
  drive incremental re-indexing decisions, which is a much smaller piece of
  local state than a vector index.

## 4. Incremental re-indexing strategy

Never re-embed the whole workspace on every edit. Proposed approach:

1. **Local manifest, not a vector cache.** Maintain a small local file (e.g.
   `.ainative/index-manifest.json` inside the workspace's state storage, or
   workbench storage service — not committed to the user's repo) mapping
   `filePath -> { contentHash, chunkIds[], lastIndexedAt }`. This is tiny
   (hashes and IDs, not embeddings) and lets the client decide what needs
   re-indexing without asking the backend.
2. **Debounced, hash-gated triggers.** Reuse the existing
   `IModelService.onModelAdded` / `model.onDidChangeContent` hooks (the exact
   pattern already in `contextGatheringService.ts`'s `_subscribeToModel`), but
   debounce aggressively (e.g. 2-5s of idle, not on every keystroke like the
   current `updateCache` does) and only proceed if the file's content hash
   actually changed from the manifest entry. Most keystrokes produce no
   re-index call at all.
3. **File-level granularity for re-chunking, chunk-level for re-embedding.**
   On a real change, re-chunk only the changed file (`chunk/file`), diff the
   new chunk set against the manifest's previous chunk IDs for that file, and
   only call `embed/chunk` for chunks that are new or whose content changed —
   not the whole file's chunk set, since most edits touch one function out of
   many in a file.
4. **Workspace-level events, not just open-editor events.** File
   creates/deletes/renames and changes made outside the editor (git checkout,
   external tool, agent-mode file edits via `editCodeService.ts`) must also
   invalidate manifest entries — subscribe to `IFileService` workspace
   watcher events in addition to model content-change events, since
   `contextGatheringService.ts`'s current approach (model-change-only) misses
   all of these.
5. **Bulk catch-up on workspace open**, reconciling the manifest against the
   backend's `chunks/project/{project_id}` listing (paginated) so a workspace
   opened on a different machine, or after being offline, converges without
   a full re-embed — only files whose hash differs from the manifest (or
   that are missing from the manifest) get re-indexed.

## 5. Merging retrieval into `contextGatheringService.ts`'s context payload

As established in §0, the real target is not
`contextGatheringService.ts`'s cache but the system message built in
`convertToLLMMessageService.ts` via `chat_systemMessage(...)`. Concretely:

1. Add a new service, e.g. `ISemanticRetrievalService`, with a method like
   `retrieveRelevant(queryText: string, opts: { limit, threshold,
   projectId }): Promise<RetrievedChunk[]>` wrapping the §1a
   `search/similarity` call (with the timeout/fallback behavior from §3).
2. In `convertToLLMMessageService.ts`, where `openedURIs` and `directoryStr`
   are currently gathered (around line 582-596), add a retrieval call keyed
   on the user's latest message / current task description, and fold the
   results into a new `chat_systemMessage` parameter (e.g. `relevantChunks:
   { filePath, range, content, score }[]`) formatted the same way existing
   file context is formatted (the prompt-building already has a convention
   for presenting file content; follow it rather than inventing a new
   format).
3. Treat `contextGatheringService.ts`'s local-neighborhood signal (§0.1) as a
   **separate, complementary** source, not something retrieval replaces. If
   it's revived, it answers "what's near the cursor" (precise, free, no
   network) while semantic retrieval answers "what's relevant elsewhere in
   the codebase the user hasn't opened" (approximate, has latency/cost). Both
   can land in the same system-message context section without conflating
   them. Reviving `contextGatheringService.ts` itself is explicitly **out of
   scope** for this feature — it's a separate, smaller fix (uncomment two
   imports, wire `getCachedSnippets()` into `autocompleteService.ts` or
   wherever it's actually wanted) that this issue should not block on.
4. De-duplicate against `openedURIs`: don't surface a retrieved chunk from a
   file the user already has open and that's already being sent in full/in
   part, to avoid wasting context budget on redundant content.

## 6. Phased implementation plan

**Phase 0 (this issue, delivered now):** this design document, plus — if
small and safe enough — a standalone chunking utility with no network/storage
dependency (see below).

**Phase 1 — MVP, index-on-demand, no background indexer:**
- `ISemanticRetrievalService` wrapping §1a's three core calls, used only when
  the user explicitly triggers it (e.g. a "index this workspace" command, or
  lazily on first chat message in a session) — not an always-on background
  process.
- Index scope: the currently open workspace folder only, not multi-root, not
  excluded/gitignored paths.
- No incremental updates yet: re-running the index command re-chunks/embeds
  everything in scope. Acceptable for MVP because it's user-triggered, not
  automatic.
- Hard requirement even at MVP: the degrade-gracefully behavior from §3 (a
  failed/slow retrieval call must never block or break chat).
- Merge into `convertToLLMMessageService.ts` per §5.

**Phase 2 — incremental background indexer:**
- Implement the manifest + debounced hash-gated re-indexing from §4.
- Subscribe to `IFileService` watcher events, not just open-editor model
  changes.
- Add the bulk catch-up/reconciliation pass on workspace open.
- Confirm with backend whether §1c's `/api/v1/codebase/index` surface should
  be used instead/in addition at this point, now that it's worth the
  5-minute check.

**Phase 3 — polish / parity with `cursor-retrieval`:**
- Multi-root workspace support, `.gitignore`-aware exclusion, configurable
  include/exclude globs.
- Local fallback chunking (§2) and/or a local embedding model if the remote
  degraded-service risk (§1a) proves recurring rather than one-off.
- Surfacing retrieval provenance in the UI (which chunks were pulled in,
  from where) for user trust/debuggability — Cursor shows this.
- Revisit reviving `contextGatheringService.ts` (§0.1) as a related but
  separate fix, now informed by how retrieval context and
  local-neighborhood context interact in practice.

## 7. Risks / open questions for whoever picks up Phase 1

- **Embedding service health is not guaranteed.** Confirmed degraded at time
  of writing (§1a). Build the timeout/fallback path first, not last.
- **§1c overlap is unresolved.** A quick question to backend before Phase 2
  avoids building against the wrong endpoint family.
- **Auth model mismatch risk.** This feature's calls are JWT-authed, while
  the IDE's primary AINative Cloud integration (`ainativeCloudProvider.ts`,
  per `BACKEND_CONTRACT_NOTES.md` §2a) is `X-API-Key`-first with a JWT
  fallback. Retrieval should gate on "has an active JWT session"
  (`cloudAuthService.isAuthenticated()`), which is a *different* precondition
  than the one `usageTrackingService.ts` had to fix for credits (API key, not
  JWT) — don't copy that gate by accident; this is the one case where the
  JWT check is actually correct.
- **`project_id` resolution.** Every §1a route is scoped by `project_id`.
  Phase 1 needs a clear answer for "what ZeroDB project does this IDE
  workspace map to" (one project per workspace? per user account globally?)
  before any call can be made — not addressed by this design and needs a
  product decision, not just an engineering one.
