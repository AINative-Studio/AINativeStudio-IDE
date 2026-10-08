# How to hand these off to Claude Design — two passes, not one

Four documents live in this folder. They answer two different questions, and mixing them in one prompt will produce muddled output — so run this as two separate design conversations, not one combined dump.

---

## Pass 1: "Polish what exists"

**Send together:** `UX_REDESIGN_BRIEF.md` + `UX_REDESIGN_BRIEF_ROUND_2.md`

**Open with something like:**

> This is AINative Studio, an AI-native IDE. `UX_REDESIGN_BRIEF.md` is a round-1 design brief — its 6 target items are already implemented and live; it's here for context on the product and its real technical constraints, not as open work. `UX_REDESIGN_BRIEF_ROUND_2.md` is a follow-up audit that found what's still inconsistent or unresolved after round 1 — that's the actual ask. Focus on round 2's findings (the design-system fracture is the headline one) and the 5-screenshot shot list at the bottom of it. Don't re-propose anything from round 1's 6 items — they're done.

**Why these two together:** they're the same conversation — same product surfaces, same "what exists today" grounding, round 2 literally builds on round 1's result. No hierarchy confusion because round 1 is explicitly marked as closed/contextual, not active.

---

## Pass 2: "Design something new" — separate conversation, after Pass 1 is done

**Send together:** `AINATIVE_PLATFORM_VISION_BRIEF.md` + `COMPETITIVE_GAP_ANALYSIS.md`

**Open with something like:**

> This is a second, separate design pass for AINative Studio — not a continuation of any prior round. `AINATIVE_PLATFORM_VISION_BRIEF.md` is the primary ask: design a genuinely new surface (workspace/project/ZeroDB service management) that doesn't exist in the IDE today at all, grounded in the real backend hierarchy. `COMPETITIVE_GAP_ANALYSIS.md` is supporting research — a specific competitor's (Trae) shipped UI patterns, used as evidence for what's worth considering, not a second set of requirements to design against independently. Treat the vision brief's "what to hand back" section as the actual deliverable spec; use the gap analysis to inform specific moments (its §9 OAuth handoff pattern, §5 custom-agent authoring, §6 named autonomy controls) where it's directly relevant.

**Why these two together, and why separate from Pass 1:** both are forward-looking and additive — new product surface, not restyling. Running them after Pass 1 means Claude Design isn't trying to hold "fix this" and "invent that" in its head at the same time, and the vision brief's own open questions (§ "Design questions worth deciding") get real attention instead of being skimmed past while also parsing an audit doc.

---

## Pass 3: "Integrate the CLI" — separate conversation, after Pass 2

**Send:** `CODY_CLI_DESIGN_HANDOFF.md` alone (the companion `docs/planning/CODY_CLI_INTEGRATION_PLAN.md` is engineering-level detail — only attach it if Claude Design asks for more depth than the hand-off doc gives).

**Open with something like:**

> This is a third, separate design pass for AINative Studio, following the same product. This one is about integrating a second AINative product — Cody CLI, a terminal-based AI agent — more deeply into the IDE. The primary concrete ask is a multi-session management UI (the IDE can already run multiple background agent terminals but has no way to show or manage them as a list — Cody CLI already solved this exact problem in its own terminal UI, described in the brief as the reference pattern). Treat the "Design questions to actually decide" section as real open decisions, not rhetorical framing.

**Why this is its own pass:** it's a different kind of ask again — not restyling (Pass 1), not inventing a brand-new platform surface from the backend up (Pass 2), but designing IDE UI that has to feel coherent with a *second, separate product's* existing interaction pattern. Keeping it isolated means Claude Design can hold "match this CLI's reference pattern" as the one organizing constraint, instead of juggling it alongside Pass 1/2's different concerns.

---

## If you genuinely want one pass instead

It's possible, but only if you add an explicit priority line yourself before pasting all 5 in — something like "Treat `AINATIVE_PLATFORM_VISION_BRIEF.md` as the primary brief; the rest are supporting context in priority order: gap analysis, Cody CLI hand-off, round 2, round 1." Without that one sentence, five co-equal documents with different scopes is exactly the "will this confuse the model" risk you flagged — don't skip the framing even in a single-pass send.
