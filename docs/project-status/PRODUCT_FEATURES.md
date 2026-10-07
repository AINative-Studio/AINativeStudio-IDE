# AINative Studio IDE — Product Features

Source material for a product sheet / design brief. Reflects the product as it exists in the codebase today (confirmed by direct code review, not marketing copy).

## What it is

AINative Studio is a full IDE — a rebranded, AI-native fork of Void Editor (itself forked from VS Code). It ships the complete VS Code editing experience (syntax highlighting, extensions, debugging, source control, terminal, settings sync) plus a deep, first-party AI agent layer built directly into the editor core rather than bolted on as an extension.

## Core AI features

- **Agentic chat sidebar** — a persistent chat panel where the AI can read, search, and edit the open workspace, run terminal commands, and call MCP tools, all inside one conversation thread with full context of the project.
- **Inline Quick Edit (Cmd/Ctrl+K)** — select code and describe a change in place, without leaving the file or opening the chat panel.
- **Tab autocomplete** — AI-driven next-edit and completion suggestions as you type, tuned to the surrounding code rather than generic snippet completion.
- **Apply system with diff preview** — AI-proposed edits render as a reviewable diff (fast or slow/streaming mode) before they land in a real file; nothing is written silently.
- **Agent Mode** — the AI can autonomously create, edit, search, and delete files across the project to complete a multi-step task, not just answer one question at a time.
- **Gather Mode** — context-aware retrieval that pulls in relevant files/folders automatically instead of requiring the user to manually attach context to every prompt.
- **Checkpoints** — save and restore the workspace to a prior state, so a multi-step agent run can be undone cleanly if it goes wrong.
- **Shadow Workspace** — higher-risk, multi-file agent edits can be made in an invisible shadow copy of the workspace first, then presented as a single clean diff for the user to accept or discard, instead of streaming directly into the real files the user is looking at.
- **Semantic codebase search** — the agent can search the project by meaning, not just by filename or exact string match, so it finds relevant code even when it doesn't know the right keyword.
- **Steering docs** — project-level standing instructions (conventions, architecture notes, do's/don'ts) that the agent automatically reads and follows on every turn, without the user having to repeat them.
- **MCP (Model Context Protocol) support** — connect external tool servers (databases, APIs, internal services) the agent can call directly, including a registry/discovery UI and OAuth-based authentication for remote MCP servers.
- **Skills** — installable, reusable agent capabilities (install/uninstall/sync from a marketplace or a git-based source), so teams can standardize and share agent behaviors across a codebase.
- **Usage dashboard** — visibility into AI spend: cost and token usage broken down by model, with historical tracking.
- **Live multi-provider model catalog** — model availability, pricing, and capabilities are fetched from a live registry rather than hardcoded, so new models show up without an IDE update.

## Supported AI providers

Anthropic (Claude), OpenAI (GPT), Google (Gemini), Mistral AI, Groq, and Ollama for fully local/offline models. Bring-your-own-API-key for any provider, plus an AINative-hosted managed option with centralized billing.

## Account & auth

- AINative Cloud sign-in (email/password, with password reset and email verification flows).
- GitHub OAuth sign-in.
- Automatic provider API key provisioning after cloud sign-in, so a signed-in user doesn't have to manually paste keys for every provider.
- Encrypted local storage of all credentials and tokens — never sent anywhere outside the main process.

## Editor foundation (inherited from VS Code / Void)

Full extension ecosystem compatibility, integrated terminal, built-in debugger, Git/source control integration, multi-root workspaces, remote development support, settings sync, and the complete standard editing experience (multi-cursor, command palette, themes, etc.) that VS Code users already expect.

## Platform availability

macOS (Intel + Apple Silicon), Windows (x64 + ARM64), and Linux (x64, ARM64, ARMHF — .tar.gz, .deb, .rpm, .AppImage).

## Security & architecture posture

- All LLM API calls and file-system access happen in the main process; the renderer (UI) process is sandboxed and never makes direct API calls or holds provider credentials.
- Every AI-proposed file or terminal change goes through one unified approval/checkpoint gate before it takes effect — the same safety model whether the AI is editing a file or running a shell command.
