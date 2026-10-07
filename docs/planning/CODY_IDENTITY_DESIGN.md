# Cody Identity Layer — Design Proposal

Draft for issue #167. This is a proposal, not an implementation plan — the open questions in
§5 need a product decision before any code gets written.

## 1. Correcting a premise in #167

#167 describes `.ainative/CODY.md` as "a separate CLI persona document" that the IDE's identity
layer might relate to. Read it directly: **it is not a persona document at all.** It's a
project-memory/conventions file for a different codebase entirely — `/Users/aideveloper/core/`,
a Python/FastAPI/PostgreSQL backend (AINative's own backend, not this IDE) — written for a
coding agent working on *that* repo. It covers things like "no third-party AI attribution in
commit messages," pytest coverage requirements, and that project's API route structure. "Cody"
does not appear anywhere in its content as a name, voice, or identity; it's simply the filename
this particular memory file happened to be given.

This means there is no existing identity content to migrate or relate to. The identity layer
#167 asks for starts from zero, not from reconciling two documents.

## 2. What already exists to build on

Two sibling features already ship real, working pieces of what a standing identity would need:

- **Steering docs** (#161, closed) — `.ainative/steering/*.md` files are read into every chat
  turn automatically (`steeringDocs.ts`'s `formatSteeringFileSections`, wired through
  `convertToLLMMessageService.ts`). This is the "standing project context" #167 says it needs,
  already built and already shipping. An identity layer should sit on top of this, not duplicate
  it with a second config file format.
- **Hooks** (#162, open, first slice merged) — `docs/planning/HOOKS_DESIGN.md` plus a working
  commit-message-suggestion hook (`hooksService.ts`). #167 names "Cody reacts to the IDE" as a
  natural identity-layer feature; that reaction mechanism is already being built as its own
  tracked effort. The identity layer's job here is narrower than #167 implies: give Hooks a name
  and a voice to speak through when they fire, not reimplement triggering.

So the genuinely new scope, after subtracting what #161/#162 already cover, is smaller than
#167's bullet list suggests: **a standing name/voice, and whatever state makes that voice feel
continuous across sessions** — not a new context-injection system and not a new automation
system.

## 3. What "Cody" would actually be

Concretely, three layers, each independently shippable:

**Layer 1 — Naming the existing thing (no new data model).** The chat sidebar's AI is
rebranded from "assistant" to "Cody" in copy only: system prompt framing, the sidebar header,
hook notification text. Zero new storage. This alone addresses #167's UI bullet about the chat
experience not feeling like a standing presence — a name change plus consistent self-reference
("I'll run that now" → "Cody's running that now" in hook-triggered notifications specifically,
where the user didn't just type a prompt and needs to know *why* something is happening).

**Layer 2 — Session continuity (new state, existing storage pattern).** A single JSON file at
`.ainative/cody-memory.json` (or reuse steering docs' directory convention —
`.ainative/steering/_cody-memory.md` if plain-text-editable memory is preferred over structured
JSON) holding a short rolling log: last N significant actions taken, open threads/TODOs the
agent noted but didn't finish, preferences the user stated ("always use pnpm, never npm" style
corrections). Read into context the same way steering docs are, appended by the agent itself
(not the user) after significant turns. This is the actual "what does Cody remember across
sessions" question #167 asks — answered with the same file-based, git-visible pattern this
codebase already uses for steering docs and MCP config, not a database or telemetry pipeline.

**Layer 3 — Routing identity (deferred, has its own dependency chain).** #167's UI bullet asks
whether the model/provider picker should be demoted to a setting "Cody manages internally."
This is the highest-risk, highest-effort piece and should NOT be bundled into the same release
as Layers 1-2:
- It requires trustworthy per-task-type model routing logic that does not exist yet (there is
  no "pick the right model for this task" heuristic anywhere in `aiModelRegistryService.ts`
  today — this would be new routing logic, not a wiring change).
- It is a bigger behavior change for existing users (today's provider picker is a concrete
  mental model users already rely on) than adding a name is.
- #167 itself flags this depends on live-catalog work; confirm that's actually stable before
  routing decisions are made on top of it.

## 4. Where this would live (following existing patterns, not inventing new ones)

- A new `ICodyIdentityService` (or fold into `ainativeSettingsService.ts` if the state is small
  enough — judgment call, see open questions) following the same DI/`registerSingleton` pattern
  every other service in this directory uses.
- Memory file read/write follows `steeringDocsService.ts`'s exact shape: list/create/open, plus
  one new `appendMemoryEntry()` the agent calls at end-of-turn (candidate hook point: the same
  place `chatThreadService.ts` already finalizes a turn and could call
  `getPendingShadowDiffs`-style aggregation for shadow workspace, per #159 — end-of-turn is
  already a real seam in this codebase, not a new one).
- No new IPC channel needed — this is browser-side state like steering docs, not something the
  main process needs to own.

## 5. Open questions a human needs to answer before implementation

These are the actual blockers, not engineering unknowns:

1. **Does "Cody" replace "AINative" as the user-facing name everywhere, or is it a secondary
   persona layered on top (e.g. "AINative Studio, powered by Cody")?** This is branding, not
   architecture — affects every string in Layer 1.
2. **Opt-in or default-on?** Steering docs and Hooks both default to requiring the user to
   create the file / enable the flag. Should Layer 2's memory file follow that same
   conservative default, or is "Cody remembers things" meant to be always-on from first launch?
3. **Does the memory file get surfaced to the user at all** (visible/editable like steering
   docs), or is it meant to be an invisible implementation detail? This changes whether it's a
   trust feature ("you can see and correct what Cody remembers") or a liability (silent state
   the user didn't know existed and can't audit).
4. **Scope of Layer 3**, if pursued at all: should it ship as part of this effort or be spun
   into its own tracked issue once live-catalog/routing-heuristic work is further along? (Draft
   recommendation: spin it off — it has a real dependency this issue's own text already flags.)

## 6. Recommendation

Ship Layer 1 + Layer 2 as the first real slice of #167, matching the same incremental pattern
#162 (Hooks) already used for its own first slice. Do not start on Layer 3 until the open
questions above have real answers and the model-routing heuristic exists as its own piece of
work.
