# Cody CLI → AINative Studio Integration Plan

**Purpose:** a grounded plan for integrating the Cody CLI (`/Users/aideveloper/Desktop/cody-cli`) into AINative Studio more deeply than it is today — read directly from both codebases, not inferred from marketing material. Covers what's real in the CLI, what's real in the IDE, where they should actually couple, and what's genuinely missing. The companion design brief, `CODY_CLI_DESIGN_HANDOFF.md`, is the artifact to actually hand to Claude Design.

## 1. What "Cody" means in each codebase today — they don't know about each other

This matters because it reframes the whole integration question: **this isn't "connect two products," it's "these are the same product under two different roofs that have never spoken."**

- **In AINative Studio**: "Cody" is purely a mascot/illustration name — `EmptyState.tsx`'s `MascotRole = 'visitor' | 'blob' | 'cody'`, used in empty states across Settings, tool logs, etc. One incidental string in `hooksService.ts`'s commit-message hook ("Cody: suggested summary..."). Zero process integration, zero awareness that a CLI binary named `cody` exists.
- **In Cody CLI**: a complete, independently-shipping terminal product — `npm install -g @ainative/cody-cli`, its own OAuth 2.1+PKCE flow against `api.ainative.studio`, its own tool-call loop (file read/write/edit, bash, grep/glob, sub-agent spawning), its own MCP client, its own settings sync. Confirmed via `docs/ARCHITECTURE.md` and direct source reading (`src/entrypoints/cli.tsx`, `src/commands/`, `src/tools/`). The OAuth scope list even includes `user:sessions:claude_code` — this is built on Claude Code's own architecture, rebranded.

Neither codebase imports, shells out to, or references the other's actual code anywhere (confirmed via grep in both directories). The "integration" asked for here is a genuine new coupling, not surfacing something half-built.

## 2. The concrete capability gap this closes: multi-session management

This is the finding that directly answers the "managing multiple terminal sessions is cumbersome" problem.

**Cody CLI already has a real, working answer**, confirmed by reading `src/components/tasks/BackgroundTasksDialog.tsx` (736 lines) directly:

- A single, unified dialog lists every concurrent background item regardless of type — shell commands (`local_bash`), spawned sub-agents (`local_agent`), remote agent sessions (`remote_agent`), in-process "teammate" tasks, scheduled workflow tasks, MCP monitors — as one tagged-union list, each with an `id`, `label`, and `status`.
- Real keyboard model: **↑/↓ select, Enter opens a type-specific detail dialog** (`ShellDetailDialog`, `AsyncAgentDetailDialog`, `RemoteSessionDetailDialog`, etc.), **`x` kills the selected item**, **`f` brings an in-process task to the foreground**, a global **"kill all agents" shortcut**, **←/Esc closes**.
- Two distinct backgrounding mechanisms feed this list: `Ctrl+B` twice backgrounds the *current* conversation (UI clears to a fresh prompt, notifies on completion — `LocalMainSessionTask.ts`), and `/bg <task>` explicitly spawns a *new* sub-agent for a specific task (`src/commands/bg/bg.ts`).

**One honest caveat, found by reading the actual source rather than trusting the architecture doc's prose:** the architecture doc describes `cody ps|logs|attach|kill` as working process-level session management. The actual implementation (`src/entrypoints/cli/bg.ts`) is a 13-line stub — every handler throws `"Not available in external builds"`, gated behind a `BG_SESSIONS` feature flag marked internal-only. The `/bg` slash command and `BackgroundTasksDialog` UI (in-process backgrounding) are real and working; the cross-process `ps`/`attach`/`kill` CLI surface is not present in what's available here. Do not present the stubbed surface as a working reference pattern to Claude Design — only the real `BackgroundTasksDialog` list/detail/kill model.

**AINative Studio already has the matching backend primitive, unused.** Confirmed in `terminalToolService.ts`: `createPersistentTerminal()`/`killPersistentTerminal()`, backed by a `persistentTerminalInstanceOfId` map keyed by terminal ID — the agent can already create and track multiple named persistent terminals. There is no UI anywhere in the IDE that lists them, lets a user switch between them, or shows what's running in each. This is the exact same "real capability, zero visibility" pattern already found in the competitive gap analysis for codebase indexing.

**The integration, concretely:** build a session-list panel in the IDE (sidebar panel or a VS Code `Terminal` tab-group-adjacent surface) that enumerates every active `persistentTerminalId` the agent has created, shows its live status (running/idle/completed), and lets the user switch focus between them — modeled directly on `BackgroundTasksDialog`'s real list→detail→kill interaction pattern, not invented from scratch. This is backend-ready today; it's a UI-and-thin-service-layer project, not a new subsystem.

## 3. Where else the CLI and IDE should couple

Beyond the multi-session gap, three more real integration points, each grounded in what actually exists in both codebases:

### a. Shared authentication, not two separate logins
Cody CLI has its own OAuth flow (`cody login`, browser-based, token stored locally per the architecture doc's "Session storage" section). AINative Studio has its own Cloud sign-in (`AINativeLoginModal.tsx`, confirmed working this session). Today a developer using both would authenticate twice, against the same `api.ainative.studio` backend, for no reason. Worth investigating: can the IDE either (a) detect an existing Cody CLI token on disk and offer to reuse it, or (b) the reverse — the IDE's own auth session makes itself available to a CLI invoked from its integrated terminal via an environment variable or a local socket, the same way `gh auth` or `aws sso` make credentials available to subprocesses. This needs backend/auth-team input on whether token scopes are even compatible (`user:sessions:claude_code` vs. whatever scope the IDE's own OAuth requests) before committing to an approach — flagged as an open question in the design brief, not decided here.

### b. The IDE's integrated terminal becomes a first-class place to run `cody`
Right now, if a developer runs `cody` inside AINative Studio's built-in terminal panel, it's just an opaque external process — the IDE has no idea a Cody CLI session is running there, same as any other shell command. Given the multi-session work in §2 already builds a panel that's aware of persistent terminal state, there's a natural extension: detect when a terminal's running process is `cody` (or launch one explicitly via a "New Cody CLI Session" action) and give that terminal a richer, Cody-aware entry in the session list — distinct from a plain shell, surfaced with the CLI's own branding/status rather than generic terminal chrome.

### c. Shared skills/MCP configuration, not two separate config files
Both products have a skills/MCP system: the CLI's `src/skills/` + `.mcp.json`, the IDE's own `skillsRegistry.ts` + MCP service (closed issue #176). If a developer configures an MCP server or installs a skill in one, should it be visible/usable in the other? This is a real product question (do they share a config file, or do they stay deliberately separate per-tool configs?) — not answered here, flagged for the design brief's open questions.

## 4. What NOT to do

- Do not attempt to literally embed the Cody CLI binary inside the IDE's own process, or vice versa — they're separate products with separate release cadences (confirmed: CLI has its own `build.sh`/`compile.sh`/versioning scheme entirely independent of AINativeStudio-IDE's). The integration is at the level of shared session visibility, shared auth, and consistent terminal UX — not a merge.
- Do not present the stubbed `ps`/`logs`/`attach`/`kill` surface as a reference implementation (see §2's caveat) — only the real, working `BackgroundTasksDialog` component.
- Do not assume token/auth scope compatibility between the CLI and IDE's OAuth flows without confirming with whoever owns `api.ainative.studio`'s auth service — this could be a quick confirmation or a real backend change, and guessing wrong here risks a broken, half-working SSO claim in the UI.
