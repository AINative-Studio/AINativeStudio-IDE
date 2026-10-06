# Steering: Persistent Project-Context Docs — Design (Phase 1)

Issue: #161. Relationship to #167 noted at the end.

## 1. What this phase is, and is not

**In scope (this document, Phase 1):** a standing, always-loaded, per-workspace
Markdown context file (or small set of files) that gets folded into every chat
request automatically — the same role `CLAUDE.md`/`AGENTS.md` play for this very
tool. "Always consulted," not "invoked by name."

**Explicitly out of scope for this phase:** Kiro's fuller spec workflow
(`requirements.md` → `design.md` → `tasks.md`, "run all tasks" automation,
bugfix documents). That is a distinct, much larger feature — a task/planning
system layered on top of steering, not steering itself. It should be scoped as
its own issue once Phase 1 ships and the team has real usage signal on what
project-level context actually gets written. Attempting both at once is exactly
the overreach the original issue warned against ("recommend scoping this as
'standing project context doc' first").

## 2. Research findings that shaped this design

### 2.1 The Skills system (`common/skills/`) is the wrong foundation

Skills (`SKILL.md` + frontmatter, `SkillLoader`, `SkillsRegistry`) are built
entirely around **progressive disclosure**: a metadata-only catalog the model
can browse, and full content fetched only on invocation, LRU-cached to 5. That
architecture exists specifically to *avoid* unconditional injection — the
opposite of what "standing context" needs. Concretely:

- Skills are installed into a **global** registry (`~/.ainative/skills/<name>/`,
  tracked in `~/.ainative/skills/registry.json`), not held purely
  workspace-local.
- `ISkillLoader` is **not currently wired into any prompt-building code path**
  — `grep` across `browser/` finds zero callers of `loadFullSkill`,
  `loadMetadataOnly`, or `getAllMetadata()` outside unit tests. It's a complete,
  tested, but disconnected subsystem today.
- Bolting an "always-active skill" flag onto `SkillMetadata` would special-case
  the one tier (`loadFullSkill`) every other part of the design assumes is
  selective, and would have to bypass the LRU cache and the catalog-selection
  model entirely.

**Decision: Steering is a separate, parallel mechanism**, not an extension of
Skills. Skills = on-demand capabilities the agent chooses to invoke. Steering =
always-on context the agent never chooses — it's just there, the way open
files and workspace folders already are.

### 2.2 There is already a close precedent in this exact codebase: `.ainativerules`

This was the most important finding. `convertToLLMMessageService.ts` already
implements almost exactly this feature, just under a different name and with a
flat/single-purpose shape:

```ts
// Read .ainativerules files from workspace folders
private _getGlobalRulesFileContents(): string {
	try {
		const workspaceFolders = this.workspaceContextService.getWorkspace().folders;
		let globalRules = '';
		for (const folder of workspaceFolders) {
			const uri = URI.joinPath(folder.uri, '.ainativerules')
			const { model } = this.ainativeModelService.getModel(uri)
			if (!model) continue
			globalRules += model.getValue(EndOfLinePreference.LF) + '\n\n';
		}
		return globalRules.trim();
	}
	catch (e) { return '' }
}

private _getCombinedGlobalRules(): string {
	const globalAIInstructions = this.ainativeSettingsService.state.globalSettings.aiInstructions;
	const globalRulesFileContent = this._getGlobalRulesFileContents();
	const ans: string[] = []
	if (globalAIInstructions) ans.push(globalAIInstructions)
	if (globalRulesFileContent) ans.push(globalRulesFileContent)
	return ans.join('\n\n')
}
```

...which feeds into `prepareLLMChatMessages` → `prepareOpenAIOrAnthropicMessages`,
where it's concatenated into the final system message:

```ts
const sysMsgParts: string[] = []
if (aiInstructions) sysMsgParts.push(`GLOBAL RULES (from the user's .ainativerules file):\n${aiInstructions}`)
if (systemMessage) sysMsgParts.push(systemMessage)
const combinedSystemMessage = sysMsgParts.join('\n\n')
```

So the IDE already has a single-flat-file, always-loaded, per-workspace rules
mechanism, read live via `IAINativeModelService` (which rides on VS Code's
standard text-model/file-watcher infra — edits are picked up on the next
message with no new caching or watching needed).

**This changes the scope of "Phase 1" from "build a new loading mechanism" to
"extend an existing one."** `.ainativerules` is steering in embryonic form: one
unstructured blob, no file-not-found UX, no editor affordance, no multi-file
story. Kiro-style steering wants multiple named documents (e.g. "product
context," "tech stack," "structure," arbitrary custom docs) that are easier to
author and maintain incrementally than one growing file. Phase 1 should
formalize that shape without breaking `.ainativerules`, which stays supported
as-is (it's almost certainly already in use by early adopters).

### 2.3 `.ainative/CODY.md` is not the right file to wire up

The issue asks to check whether `.ainative/CODY.md` (restored this session)
should be the file this feature loads. It should not be. Inspection shows it's
a generic, cross-project "AINative Core" persona/ops document — it hardcodes
paths like `/Users/aideveloper/core/`, a Python/FastAPI backend stack, and
commit-attribution rules. It's authored for a *different* repository (the
AINative backend monorepo) and, per #167's own audit, is "confirmed completely
disconnected from the IDE's own code." It is prior art for *the convention this
org uses with Claude Code*, not a file the IDE should auto-load for arbitrary
end-user projects opened in AINativeStudio. The new steering file(s) must be
workspace-relative and content-neutral — authored per-project by whoever opens
that project in the IDE, not inherited from AINative's own dev tooling.

## 3. Design

### 3.a File format and location

Directory-based, Kiro-flavored, but deliberately minimal:

```
<workspace-root>/.ainative/steering/
  product.md       # what this project is, who it's for
  tech-stack.md     # languages, frameworks, infra constraints
  structure.md      # repo layout, module boundaries
  <anything>.md     # free-form additional steering docs
```

- Plain Markdown, no required frontmatter (unlike Skills' `SKILL.md`). A
  document is just prose the agent reads as-is. This matches `CLAUDE.md`'s own
  shape and keeps authoring friction near zero — no schema to learn for v1.
- All `.md` files directly under `.ainative/steering/` are loaded; subdirectories
  are ignored for now (room to add categorization later without a breaking
  change).
- `.ainativerules` keeps working exactly as today, unchanged. It is treated as
  an implicit extra steering source (effectively `.ainativerules` is "the
  default/legacy steering file"), concatenated alongside the new directory's
  contents so nobody's existing setup breaks.
- No frontmatter-driven "always include vs. conditionally include" modes in
  Phase 1 (Kiro has this — file-match conditional inclusion). Everything found
  is included, always. That's the entire point of "standing" context; adding
  conditional inclusion is a Phase 2 refinement once there's a real need (e.g.
  a project outgrows what fits comfortably in the prompt).

### 3.b Automatic inclusion in chat context

Hook point: `convertToLLMMessageService.ts`, mirroring the existing
`.ainativerules` pattern exactly, so it inherits the same live-reload behavior
for free:

1. Add `_getSteeringFileContents()`: for each workspace folder, enumerate `.md`
   files directly under `.ainative/steering/` via `IFileService` (listing a
   directory is not something `_getGlobalRulesFileContents` needed since it
   targets one fixed filename; steering needs a directory read first, then the
   same `getModel`/`getModelSafe`-based read per file). Concatenate with a
   `### <filename>` header per file so multiple docs stay visually distinct in
   the prompt, matching how Kiro and CLAUDE.md-style tools present multi-file
   context.
2. Extend `_getCombinedGlobalRules()` to push `_getSteeringFileContents()`
   into the same `ans` array as `globalAIInstructions` and
   `globalRulesFileContent` — no changes needed downstream;
   `prepareOpenAIOrAnthropicMessages` already treats this combined string as
   one opaque `aiInstructions` blob under the `GLOBAL RULES` header. (A later
   refinement could give steering its own header, e.g. `PROJECT STEERING
   (from .ainative/steering/)`, if user feedback says the two should read as
   distinct; Phase 1 defaults to the smaller, lower-risk diff of reusing the
   existing section.)
3. Missing directory, empty directory, or unreadable files must all resolve to
   `''` silently (matching the existing try/catch convention) — a project with
   no steering docs must behave identically to today.

Estimated diff size: well under 50 lines in one file, no new DI registration
(the class already has `IWorkspaceContextService` and `IAINativeModelService`
injected), no IPC changes, no risk to the main/renderer security boundary since
this is pure workspace-file reading, already a pattern this exact service uses.

### 3.c UI for creating/editing/refining steering docs

Out of scope for the first commit of this phase (see §4), but the intended
shape, for a follow-up PR within this same phase:

- A command-palette action, `AINative: Create Steering Document`, that
  scaffolds `.ainative/steering/` with starter files (`product.md`,
  `tech-stack.md`, `structure.md`) pre-filled with prompts/headings, then opens
  them in the editor — not a custom webview. Steering docs are just Markdown
  files; editing them with the IDE's own text editor is correct and avoids
  building a bespoke editing surface Kiro needs (it has `refineSteeringFile`,
  a custom panel) but this IDE does not need to copy wholesale.
- A lighter "AINative: Add Steering Note from Selection/Chat" action that lets
  a user promote something the agent said, or a highlighted block, straight
  into a steering file — this is the practical on-ramp (Windsurf's memories
  flow and Kiro's `createInitialSteering` both exist because users rarely
  write these documents cold; they capture them opportunistically out of an
  existing conversation).
- A small status-bar or sidebar affordance showing "N steering docs active"
  with a quick-open shortcut, so the standing context isn't invisible — one of
  the real risks of "always on, never surfaced" context is the user forgetting
  it exists and being confused why the agent behaves a certain way.
- No AI-assisted "refine this steering doc for me" generation in Phase 1's UI
  slice — that's a nice-to-have, not required to deliver the core value, and
  easy to bolt on later as a chat-mode-adjacent action once the base loading
  mechanism has shipped and been used for a bit.

## 4. Recommended delivery split

1. **This pass (implemented below):** detection + loading only.
   `.ainative/steering/*.md` is read and folded into chat context. No UI for
   creating/editing — users hand-author the directory and files with the
   editor they already have open, exactly as early `.ainativerules` adopters
   do today. This is the safe, high-value, low-blast-radius slice the issue
   itself asked to scope down to.
2. **Follow-up PR, same phase:** the scaffolding command + "promote to
   steering" chat action from §3.c.
3. **Later, separate issue:** Kiro's requirements/design/tasks spec workflow,
   explicitly not attempted now.

## 5. Relationship to #167 (Cody identity)

No implementation work exists yet in the `fix/167-cody-identity` worktree — its
branch has no commits beyond the same shared merge history as this branch, so
there was nothing to reconcile with or avoid duplicating.

That said, #167 explicitly names this exact mechanism as a dependency: "Wire
[persona identity] to standing project context — this is the same underlying
need as #161 ... these two issues likely share an implementation, not two
separate systems." Having now implemented the loading mechanism, I think that's
half right:

- The **loading plumbing** (read workspace files, fold into
  `_getCombinedGlobalRules()`, inject into the system message) is single,
  shared infrastructure — #167 should not build a second file-reading path.
  Any "what does Cody know about this project" concept should read through the
  same `_getSteeringFileContents()` this phase adds.
- The **content** is different in kind. Steering (`.ainative/steering/*.md`) is
  project-scoped and portable with the repo — coding conventions, "never touch
  the legacy auth module," team-specific context. A persona-identity layer per
  #167 is agent-scoped and almost certainly needs to live partly outside the
  repo (cross-session memory, user preferences that should follow the person,
  not the project) — mixing the two into one file would make steering docs
  stop being safely committable/shareable project artifacts.

Recommendation for whoever picks up #167: treat `.ainative/steering/` as one
input `_generateChatMessagesSystemMessage` already assembles (workspace
folders, open files, directory structure, MCP tools, and now steering), and
build identity/persona state as its own orthogonal concept that can reference
steering content but isn't stored inside it.
