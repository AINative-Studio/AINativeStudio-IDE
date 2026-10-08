# Cody CLI Integration — Design Brief (Phase 4)

**Purpose of this document:** hand to Claude (chat, not code) to design the IDE-side UI for integrating AINative's Cody CLI more deeply into AINative Studio. This is the fourth hand-off in this series — see `HANDOFF_FRAMING_NOTE.md` for how it fits with the other three. Pair this with `docs/planning/CODY_CLI_INTEGRATION_PLAN.md` (the engineering-grounded plan this brief is based on) if more technical detail is needed; this brief distills it to what a design pass needs.

## What's being asked for

AINative ships two separate AI coding products today: AINative Studio (this IDE) and Cody CLI (a terminal-based agent with its own OAuth, tool-call loop, MCP support, and — critically — a well-designed multi-session management UI). They don't know about each other. This brief is about designing the IDE-side surfaces that make them feel like one coupled product, starting with the single most concrete, user-requested gap: **the IDE has no good way to manage multiple concurrent terminal/agent sessions, and Cody CLI already solved this problem in its own terminal UI.**

## The reference pattern — read this before designing

Cody CLI's `BackgroundTasksDialog` (confirmed real, working code, not a mockup) is the model to design toward, adapted for the IDE's own visual language, not copied verbatim:

- **One list, every session type, one place.** Running shell commands, spawned sub-agents, remote sessions — shown together as one list, each row showing a label and a live status.
- **List → detail, not list → everything at once.** Selecting a row opens a focused detail view for that specific session (its type determines what the detail view shows — a shell session's detail differs from an agent session's).
- **A small, consistent action set attached to the selection**, not scattered icons: view, kill (stop the selected session), bring-to-foreground (for sessions that support it), and a "kill all" for when things pile up.
- **Status is always visible without opening anything** — a developer should be able to glance at the list and know what's running, what's idle, what's done.

## What AINative Studio already has to build this on

This is not a from-scratch feature — confirmed via direct code reading:

- `terminalToolService.ts` already creates and tracks multiple named persistent terminals (`createPersistentTerminal`/`killPersistentTerminal`, keyed by ID) — the agent can already run several background terminal sessions. There is currently **no UI anywhere that lists them.**
- The chat sidebar (`sidebar-tsx/`) already has a formal tool-call taxonomy and status-dot vocabulary (from the existing UX redesign) — whatever visual language a session-list panel uses should borrow this rather than invent new iconography/status colors.
- VS Code's own terminal panel (native chrome, not ours to restyle — see the original `UX_REDESIGN_BRIEF.md`'s constraints) already supports multiple terminal tabs; this new surface is specifically about **agent-managed** background sessions, which is a distinct concept from "I manually opened 4 terminal tabs" — the design needs to make that distinction legible, not duplicate VS Code's own terminal tab bar.

## Design questions to actually decide

1. **Where does this live?** A new panel (sidebar-adjacent, like the existing chat sidebar), a tab within the existing terminal panel, or a command-palette-triggered overlay (closer to Cody CLI's own modal-dialog-over-terminal pattern)? Each has a different weight and discoverability tradeoff — this needs a real decision, not a default.
2. **How does a session get into this list in the first place?** Only sessions the AI agent itself creates (via `run_command`/persistent terminal tools), or should a user be able to explicitly promote a manually-opened terminal into a "tracked" session too? This determines whether the feature reads as "AI activity monitor" or "general session manager."
3. **What does status actually mean for each session type**, visually? A running shell command's status (exit code pending) is different in kind from a long-running agent task's status (which might have its own internal progress, like the already-shipped Shadow Workspace diff/promotion flow) — don't flatten these into one generic "running/done" pill if the underlying states are genuinely richer.
4. **Does killing a session need confirmation?** The existing round-2 UI audit already flagged that AINative Studio's checkpoint-restore action has zero destructive-action confirmation anywhere in the product — don't repeat that gap here if killing a session can lose in-progress agent work.

## Two further, smaller integration surfaces worth a design opinion (lower priority than the session manager above)

- **Shared sign-in.** Cody CLI and AINative Studio both authenticate against the same backend today, separately. If engineering confirms token-sharing is feasible (an open backend question, not decided yet — see the integration plan), what should the IDE show when it detects an existing Cody CLI session vs. prompting a fresh sign-in?
- **A visible "this terminal is running Cody CLI" state.** If a developer runs `cody` inside the IDE's built-in terminal, should that terminal get any special treatment (branding, a richer status entry in the session list from the point above) versus being an opaque shell process like any other?

## One naming note

AINative Studio's own settings-import logic already blacklists a real, unrelated product called "Sourcegraph Cody" as a competing AI copilot extension (confirmed in `extensionTransferService.ts`). Worth keeping in mind for any UI copy or marketing language in this work — "Cody" is a shared name with a real competitor product in the same space, not just an internal naming coincidence.

## What to hand back

A description of the session-list surface (where it lives, what a row looks like, what the detail view shows per session type, the action set), expressed in the existing `ainative-` semantic token system, plus answers to the four numbered questions above. This is a real product surface, not a visual-only pass — treat the open questions as things to decide, the same way the platform vision brief's own open questions were treated.
