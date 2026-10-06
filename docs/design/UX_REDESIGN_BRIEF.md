# AINative Studio — UX/UI Redesign Brief

**Purpose of this document:** hand to Claude (chat, not code) to reimagine the visual/UX design of AINative Studio's AI-native surfaces, then bring the resulting design decisions back to Claude Code to implement against the real codebase. This doc is the grounding — what exists today, what the real constraints are, what's worth rethinking — so the design pass isn't working from a blank slate or inventing a fictional product.

## What AINative Studio is

A VS Code fork (via the open-source "Void" editor) with a custom AI layer bolted on: chat sidebar, inline quick-edit, autocomplete, an agent mode with tool-calling (file edit/read/terminal/MCP), a provider-agnostic BYOK settings system, and — as of tonight — a managed "AINative Cloud" account path alongside BYOK. It is NOT a from-scratch app; every screen below is a React island rendered inside a real VS Code window (title bar, activity bar, native panels all still present). Most of this brief is about restyling those React islands, which can't touch VS Code's native chrome — the one exception is the new "Vibe Coder Mode" concept below, which is explicitly about *hiding* native chrome, not restyling it, using a real layout API described there.

## Real technical constraints (read before designing)

1. **Theming is VS Code's, not ours.** Every color is a CSS variable bound to the user's active VS Code theme (`var(--vscode-editor-background)`, etc.), remapped through a small set of semantic tokens: `ainative-bg-1/2/3`, `ainative-fg-0/1/2/3/4`, `ainative-border-1/2/3/4`, plus a hardcoded accent `#0e70c0` (blue) used ad-hoc across primary buttons/active-tab states. A redesign can restructure *how* these tokens are used and propose new semantic tokens, but cannot assume a fixed brand palette — it must work in both a user's light theme and dark theme, and should propose how existing tokens map cleanly rather than introduce raw hex colors everywhere.
2. **Tailwind, prefixed.** `prefix: 'ainative-'`, a custom `fontSize` scale (xs=10px … 9xl=72px, notably *small* for a dense IDE sidebar), `@tailwindcss/typography` for markdown rendering. See `ainative-studio/src/vs/workbench/contrib/ainative/browser/react/tailwind.config.js`.
3. **These are real screens with real state, not mockup opportunities.** Every component listed below has working data, loading states, error states, and existing interaction logic already wired to live services. A redesign proposes new *visual/interaction* treatment of real states — not new features or fictional data.
4. **React 19, no router.** Each surface is its own isolated React entry point/bundle (esbuild), mounted into a VS Code `EditorPane` or `Webview`. There's no client-side routing between these surfaces — navigation between them happens through VS Code's own tab/editor-group system or explicit open-this-panel actions.

## Current surfaces (the real inventory)

All under `ainative-studio/src/vs/workbench/contrib/ainative/browser/react/src/`:

| Folder | What it is | Current state |
|---|---|---|
| `ainative-onboarding/` | First-run wizard: Welcome → Add a Provider (Free/Paid/Local/Cloud-Other tabs) → Shell setup → Settings import | Functional but dense — BYOK provider list is 9 cards in one tab; just got a "Sign In to AINative Cloud" CTA added to the Welcome page tonight, feels bolted-on rather than designed in |
| `ainative-settings-tsx/` | Main Settings pane: AINative Cloud account, provider configs, feature toggles, MCP servers list | Large single-page form, a lot of scrolling, MCP server cards are information-dense (status dot, name, toggle, tool checkboxes, command badge, error box all stacked) |
| `sidebar-tsx/` | The primary chat sidebar — chat thread, mode picker (agent/gather/normal), tool-call display | The main surface users live in; works well functionally per tonight's audit (real tool loop, real checkpoints) but visual hierarchy between "me", "assistant text", and "tool call" blocks could be sharper |
| `usage-dashboard/` | Credits status, usage chart, model breakdown, cost projection | Real data, dashboard-style cards; currently has no path to actually buy more credits (being added now) |
| `tool-logs/` | Table + filter + detail view of every tool call the agent has made | Functional audit-log UI, could read as more "trustworthy/transparent" with better visual treatment |
| `model-browser/` | Browse/select AI models | — |
| `quick-edit-tsx/` | Inline Cmd+K edit popup | Small, tightly-constrained widget — limited redesign surface |
| `auth-components/` | Login form used inside the login modal | Small, currently plain |
| `diff/`, `markdown/`, `tool-results/`, `ainative-editor-widgets-tsx/`, `ainative-tooltip/` | Supporting rendering components | — |

## New concept: "Vibe Coder Mode"

A toggleable simplified mode that strips away developer-centric chrome and presents a single, chat-first, natural-language-driven surface — closer to Replit Agent or a terminal-first assistant than a traditional IDE. The target user is someone who wants to describe what they want built and watch it happen, not someone who wants a file tree, multi-pane editor grid, and a terminal they drive by hand.

**This is genuinely buildable, not a fictional request** — VS Code's own `IWorkbenchLayoutService` (`ainative-studio/src/vs/workbench/services/layout/browser/layoutService.ts`) already exposes `setPartHidden(hidden, part)` / `isVisible(part)` for every major workbench region (`Parts.SIDEBAR_PART`, `Parts.PANEL_PART`, `Parts.ACTIVITYBAR_PART`, `Parts.STATUSBAR_PART`, `Parts.EDITOR_PART`, etc.). A mode toggle is a real, scoped feature on top of an existing API, not new layout engineering from scratch. Confirmed via source tonight: nothing like this exists yet anywhere in the `ainative` contrib tree.

**Design questions for this pass** (functionality/wiring is a separate follow-up effort — this brief is asking for the *shape* of the mode):
- What's visible in Vibe Coder Mode? A reasonable starting guess: chat surface full-screen or near-full-screen, maybe a collapsed/peekable file tree for context, no visible terminal pane (the agent still runs commands, just doesn't surface a raw shell the user has to read), no multi-tab editor grid — but this is exactly the kind of call this design pass should make, not something to take as given.
- How does a user get in and out of the mode? A single persistent toggle (where — status bar? command center? a welcome-screen choice?) or is it chosen once at onboarding, or both?
- What happens to an in-progress Vibe-Coder-Mode session if the user needs to drop into "real" IDE mode to fix something the agent can't (e.g. resolve a merge conflict, debug visually)? Is switching modes mid-session a core supported path or an edge case?
- Does onboarding itself branch here — e.g. "I'm a developer" vs. "I just want to build something" as an early onboarding choice that sets the initial mode?
- Visual identity: should Vibe Coder Mode look meaningfully different (different type scale, different chrome, more conversational tone in copy) from the full IDE, or just be the same design system with less of it visible?

## What's worth redesigning (specific, not generic)

Pick what resonates — this is a menu, not a mandate:

1. **Onboarding, specifically the provider-setup screen.** 9 provider cards in one undifferentiated list inside a tab is a real usability problem for a new user who just wants one working model. Is there a better first-choice pattern (e.g., 2-3 "recommended path" cards up front, "more options" collapsed) than a flat tab bar?
2. **The AINative Cloud vs. BYOK framing throughout.** Right now these read as equally-weighted options everywhere (Settings, onboarding). If AINative Cloud is meant to be the primary path, the visual hierarchy should say so without hiding BYOK.
3. **MCP server cards in Settings.** Currently stack status/name/toggle/reconnect/tools-with-checkboxes/command/error vertically with no clear information hierarchy. Real candidate for a cleaner card or table-row treatment, especially as the number of connected servers grows.
4. **The credits/billing surface** (`usage-dashboard/CreditsDisplay.tsx` + a new top-up flow being built now with real Stripe Elements). An opportunity to design this properly from the start rather than retrofit — balance, usage trend, and "buy credits" should feel like one coherent money-related surface, not three bolted-together widgets.
5. **Tool-call visual language in the chat sidebar.** The agent can call 13+ distinct tools (file read/write/edit, terminal, MCP tools, etc.) — is there a clearer, more scannable visual system for "here's what the agent just did" than whatever exists today? (Load the actual component to see current treatment: `sidebar-tsx/`.)
6. **Empty/first-run states generally.** A brand-new workspace, a server with zero tools, a chat thread with zero messages — these moments currently likely fall back to plain "no X available" text. Worth a deliberate empty-state design language.

## What's explicitly out of scope for this pass

- *Restyling* VS Code's own chrome (title bar, menu bar, activity bar icons, native panels) — its colors/fonts/icons aren't ours to redesign. *Hiding* whole regions of it (Vibe Coder Mode, above) is explicitly in scope — that's a visibility/layout decision via a real API, not a theming one.
- New backend features / new data the backend doesn't already provide. Redesign what exists; don't invent new product surfaces as part of a visual pass — Vibe Coder Mode is the one exception already scoped above, since it's explicitly requested and uses only existing APIs/data.
- A full design-system rewrite in one shot. Prioritize the 2-3 highest-value items from the list above (plus Vibe Coder Mode, if it resonates) rather than touching everything.

## What to hand back

For each visual-redesign surface tackled: a description of the new layout/interaction (component-by-component is fine, doesn't need to be pixel specs), what semantic tokens it uses (reuse `ainative-bg-*`/`ainative-fg-*`/`ainative-border-*` where possible; propose new ones only if genuinely needed), and the reasoning for the change — what specific friction it resolves, tied back to the real current behavior described above.

For Vibe Coder Mode specifically: answers to the design questions above, plus what's visible/hidden in the mode and why, and a description of the toggle/entry-point UX. This one has real product-decision weight, not just visual styling — treat the open questions as things to actually decide, not rhetorical framing.

Claude Code will translate whatever comes back into the actual React/Tailwind implementation (and, for Vibe Coder Mode, the `IWorkbenchLayoutService` wiring) against the live components.
