# Hooks: Event-Driven Agent Automation — Design

Issue: [#162](https://github.com/AINative-Studio/AINativeStudio-IDE/issues/162)

## 0. Scope for this pass

Per the issue's own suggested scope, this design covers a **generic hook
plumbing layer plus exactly one built-in hook** — "generate commit message on
commit" — and explicitly defers generic hook-authoring (arbitrary
user-defined triggers/actions, a hook scripting language, Kiro-style
`hooks.openUI` authoring surface) to a later phase. A second built-in,
on-save, is designed here but not implemented in this pass (see §5).

## 1. How a hook actually fires an agent turn (the mechanism this plugs into)

Investigated `chatThreadService.ts` and `toolsService.ts`:

- `IChatThreadService.openNewThread()` creates (or reuses an empty) thread
  and sets it as `currentThreadId`. It has no UI/mount dependency.
- `IChatThreadService.addUserMessageAndStreamResponse({ userMessage, threadId })`
  appends a user-role message and runs the full agent loop
  (`_runChatAgent` → tool calls → `_runToolCall` → final message), entirely
  independent of whether the chat panel is open or focused. The only
  UI-coupling is an optional `mountedInfo?.whenMounted.then(scrollToBottom)`
  no-op when unmounted.
- `toolsService.ts` has **no dynamic tool registry** — `BuiltinToolName` is a
  closed union with hardcoded `validateParams`/`callTool` maps. A hook's
  "action" therefore cannot register a new tool; it must be expressed as a
  **prompt string** fed into the existing agent loop, which then picks from
  existing built-in/MCP tools as normal.

**Conclusion: a hook is just code that calls `openNewThread()` +
`addUserMessageAndStreamResponse()` with a synthesized prompt, on a timer or
event callback instead of a keystroke.** No new agent-invocation primitive is
needed — this is the single most important design simplification.

## 2. Execution model — reusing the approval gate

`toolsServiceTypes.ts` defines:

```ts
export const approvalTypeOfBuiltinToolName: Partial<{ [T in BuiltinToolName]?: 'edits' | 'terminal' | 'MCP tools' }> = { ... }
```

`chatThreadService.ts#_runToolCall` consults
`this._settingsService.state.globalSettings.autoApprove[approvalType]` before
running a gated tool; if not auto-approved it returns
`{ awaitingUserApproval: true }` and the turn pauses until
`approveLatestToolRequest`/`rejectLatestToolRequest`.

**Decision: do not build a separate hook-approval system.** A hook-triggered
turn runs through this exact same per-tool gate for free — e.g. if a hook's
prompt causes an `edit_file` call, the user's existing `autoApprove.edits`
setting governs it exactly as if they'd typed the request themselves. This
also means a badly-configured hook can't silently rewrite files if the user
has edits approval-gated.

What **is** new is a single trigger-level switch per hook (not per tool):

| Hook setting | Behavior |
|---|---|
| `silent: true` | Thread opens headlessly, turn runs, tool-level gates still apply as above. On completion, a non-modal status-bar/notification toast appears ("Cody generated a commit message") with an action to view/undo. No toast if nothing changed. |
| `silent: false` (default) | A lightweight confirmation notification appears *before* the turn starts ("Generate a commit message for this commit?" Yes/Dismiss), so the user isn't surprised by background LLM activity/cost. Declining is a no-op, not a rejection recorded anywhere. |

This two-state switch, plus the pre-existing per-tool gate, covers the
"silent / approve / notify-with-undo" question from the issue without
inventing a third approval subsystem.

For "undo": since the built-in hook's only built-in tool effect
(`repo.input.setValue`) only populates the SCM input box — it does not commit
anything — "undo" is simply that the user can edit or clear the generated
text before committing. No special undo plumbing needed for this hook type;
a future file-editing hook (e.g. on-save auto-format) would ride the existing
checkpoint/edit-diff system already used by `edit_file`/`rewrite_file`
(`_addToolEditCheckpoint`), which already gives undo for free.

## 3. Hook registration & storage format

Precedent survey: `ainativeSettingsService.ts` stores user settings via
`IStorageService` + `StorageScope.APPLICATION` (global key-value, not a
file). `mcpService.ts` instead stores `mcp.json` as a real file at
`URI.joinPath(userHome, productService.dataFolderName, 'mcp.json')`, watched
with `IFileService.watch(uri)` + `onDidFilesChange` filtered by
`e.contains(uri)`.

Hooks are workspace behavior (e.g. "format on save in *this* repo"), so they
should be **shareable across a team via the repo**, unlike global MCP
server config. Decision:

- **Storage**: `<workspaceRoot>/.ainative/hooks.json`, committed to the repo
  (team-shareable, like `.vscode/settings.json`). Shape:

```jsonc
{
  "hooks": [
    {
      "id": "builtin.generateCommitMessage",   // built-in hook identifier
      "enabled": true,
      "silent": false
    },
    {
      "id": "builtin.formatOnSave",
      "enabled": false,
      "silent": true,
      "glob": "**/*.{ts,tsx}"                  // built-in-specific option
    }
  ]
}
```

  This pass only ever writes/reads entries whose `id` matches a hardcoded
  built-in hook identifier — the file format is forward-compatible with a
  future generic `{ "id", "trigger": {...}, "prompt": "..." }` shape, but
  nothing in this pass parses or executes arbitrary user-authored triggers.
- A small **per-user override** for `silent` lives in
  `IStorageService`/`StorageScope.WORKSPACE` (e.g. "I personally want this
  silent even though the team default is confirm") — mirrors the
  existing settings-service idiom and avoids forcing a personal preference
  into a committed file.
- New service `IHooksService` (`src/vs/workbench/contrib/ainative/common/hooksService.ts`,
  browser + possibly electron-main split only if a hook ever needs
  main-process-only APIs — not needed for the two built-ins here) owns:
  - Loading/parsing `.ainative/hooks.json` via `IFileService`, watched the
    same way `mcpService.ts` watches `mcp.json`, so toggling a hook via the
    file (or a future UI) takes effect live.
  - Exposing `onDidChangeHooks`, `getHook(id)`, `setHookEnabled(id, bool)`.
  - Owning the actual event wiring (§4) and calling into
    `IChatThreadService` to fire turns.

## 4. Event-to-trigger wiring for the two built-ins

### 4a. on-commit → "generate commit message"

**Feasibility finding — this is the crux of the research**: VS Code's git
extension API (`extensions/git/src/api/git.d.ts`) declares
`Repository.onDidCommit: Event<void>`, and it is genuinely **implemented**
(`extensions/git/src/api/api1.ts:93`, derived from the repository's commit
operation result) — not just a type-only stub. However this event lives on
the **git extension's own exported API**, reachable only via
`vscode.extensions.getExtension('vscode.git')!.exports.getAPI(1)` from
*inside an extension host context*. AINative's existing SCM integration
(`ainativeSCMService.ts`, `IGenerateCommitMessageService`) instead goes
through the workbench-level `ISCMService`/`ISCMRepository` model
(`src/vs/workbench/contrib/scm/common/scm.ts`), which is provider-agnostic
(works for git, SVN, Perforce extensions alike) and deliberately exposes only
generic events — `onDidChangeResources`, `onDidChangeResourceGroups`,
`onDidChange` on the input box — **no commit-completed event**.

So: **the richer git-specific `onDidCommit` event is not reachable from the
workbench/browser-side code this feature needs to live in, without going
through an extension host bridge.** Two options:
1. Bridge it: have a tiny addition in `extensions/git`'s own activation (or a
   new thin internal extension) that listens to `onDidCommit` and forwards
   through an existing IPC channel (the same `ainative-channel-scm` main
   process channel `ainativeSCMService.ts` already proxies through) to the
   workbench. This is plumbing, not research-blocked, but is a second
   process hop and non-trivial for this pass.
2. **Approximate it from the workbench side** (recommended for this pass):
   `ISCMRepository.provider.onDidChangeResources` already fires whenever
   working-tree/index state changes, which reliably fires immediately after
   a commit completes (the commit clears the staged changes, which is a
   resource-group change). Combine with a HEAD check: read
   `ISCMProvider`'s displayed revision (or shell out via the existing
   `IAINativeSCMService` main-process channel's `gitLog`/`gitBranch`, which
   `GenerateCommitMessageService` already calls) before/after to confirm
   HEAD advanced, distinguishing "commit happened" from "files staged."

**Decision for this pass**: use option 2. It requires no new IPC channel,
reuses 100% of `IAINativeSCMService`'s existing `gitLog` call, and is good
enough for "fire at most once per actual commit." A future pass can swap in
option 1 for lower latency/more precision without changing the hook's public
shape.

Wiring: `IHooksService`, when `builtin.generateCommitMessage` is enabled,
subscribes to `ISCMService.onDidAddRepository` for each git-provider repo's
`provider.onDidChangeResources`, debounces (≈500ms, resources settle in
bursts), reads `gitLog` HEAD sha, and only proceeds if HEAD changed since the
last observed value for that repo. On a genuine new HEAD, it does **not**
call `repo.input.setValue` (that's the manual action); instead per §2 it
either shows the confirm toast or runs silently, and the *action* is: open a
hook-owned side thread and call `addUserMessageAndStreamResponse` with a
prompt built the same way `gitCommitMessage_userMessage` already is — but
writing the result to a changelog/notes file or just a notification, since
the commit already happened (there's no input box left to usefully fill
— see §6 "what this hook actually produces").

### 4b. on-save → (designed, not implemented this pass)

`ITextFileService.onDidSave` (core VS Code, `IFileService.onDidFilesChange`
as the lower-level alternative already used by `mcpService.ts`) is a stable,
directly-observable event from the workbench side — no extension-host hop
needed, confirmed no existing blocker. `IHooksService` would subscribe,
filter by the hook's configured glob, debounce per-file, and call
`addUserMessageAndStreamResponse` with a prompt referencing the saved file's
URI (e.g. "lint/format this file: {uri}"). Deferred only because the issue
asks to start with 1-2 built-ins and on-commit is the more novel/valuable one
to validate the plumbing against; on-save is lower-risk to add once
`IHooksService` exists.

## 5. Minimal UI

Out of scope: any hook-authoring UI (Kiro's `hooks.openUI` equivalent).

In scope for this pass: a plain settings-pane toggle, inline in the existing
`ainativeSettingsPane.ts` surface (new "Hooks (beta)" section, following the
existing pattern of other feature toggles there), with:
- One checkbox: "Generate commit message after each commit" (bound to
  `builtin.generateCommitMessage.enabled`).
- A radio/select next to it: "Ask before running" / "Run silently" (bound to
  `silent`).
- A link/button "Edit hooks.json" (mirrors `revealMCPConfigFile()` in
  `mcpService.ts`) for anyone who wants to hand-edit the workspace file
  directly, rather than building a bespoke list/detail hook-management UI.

No command-palette "delete from context menu" UX is built this pass — a
single built-in hook doesn't need a management list; `enabled: false` in the
settings pane or the JSON file is sufficient.

## 6. What "generate commit message on commit" actually produces, given it's post-hoc

Kiro/the issue's phrasing suggests this fires *before* commit (filling the
message box, like AINative's existing manual action). But a workbench-level
`onDidCommit`-equivalent (per §4a) only reliably fires *after* HEAD has
already moved — the message box for that commit is gone. Rather than fight
this, this pass's built-in hook is reframed slightly from "fill the commit
box" to **"append a generated one-line summary of the just-made commit to
`CHANGELOG.local.md`"** (or, more conservatively for v1, just a notification
with the suggested message text and a one-click "copy" action) — genuinely
post-commit-appropriate, and still demonstrates the full trigger → approval →
agent-turn → user-visible-result pipeline the issue is asking to validate.
The pre-commit "fill the box" behavior already exists as the manual
`ainative.generateCommitMessageAction` and does not need a hook at all (it's
already proactive-adjacent via its inline SCM button).

## 7. Non-goals / explicitly deferred

- Generic hook authoring (arbitrary trigger + arbitrary prompt template,
  user-defined via UI or hand-written JSON beyond toggling built-ins).
- Branch-switch and test-failure triggers (issue mentions "maybe") — same
  `IHooksService` shape would host them, no new primitives needed, deferred
  for scope.
- The IPC-bridged, extension-host-sourced `onDidCommit` (option 1 in §4a) —
  worth revisiting if the HEAD-diff approximation proves too laggy or
  false-positive-prone in practice.
- Hook execution history/audit log UI.

## 8. Summary of key decisions

1. A hook = scheduled/event-driven call to `openNewThread()` +
   `addUserMessageAndStreamResponse()`. No new agent-invocation primitive.
2. Tool-level safety reuses `approvalTypeOfBuiltinToolName` /
   `autoApprove` as-is; hooks only add one trigger-level `silent` switch.
3. Storage: `.ainative/hooks.json` (workspace, team-shared), watched via
   `IFileService` exactly like `mcpService.ts` watches `mcp.json`; personal
   `silent` override in workspace-scoped `IStorageService`.
4. On-commit is **not** cleanly observable from the workbench side in this
   architecture (the real `onDidCommit` event lives in the git extension
   host, unreachable without a new IPC bridge) — approximated via SCM
   resource-change + HEAD-diff polling through the existing
   `IAINativeSCMService` channel. On-save has no such blocker.
5. UI for this pass is a two-control settings-pane toggle, not a hook
   management surface.
