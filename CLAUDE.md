# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AINative Studio IDE is a rebranded fork of Void Editor (which itself is forked from VS Code), focused on AI-powered development. The codebase is primarily in the `void/` directory and uses Electron + TypeScript with React components for AI features.

## Essential Commands

### Development Setup
```bash
cd void
npm install
npm run watch          # Start development build (watch mode)
./scripts/code.sh      # Run the application (Linux/macOS)
./scripts/code.bat     # Run the application (Windows)
```

### Key Build Commands
```bash
npm run compile        # One-time compilation
npm run buildreact     # Build React AI components
npm run watchreact     # Watch React components
npm run test-node      # Run Node.js tests
npm run test-browser   # Run browser tests
npm run smoketest      # End-to-end smoke tests
```

### Production Builds (25+ minutes each)
```bash
npm run gulp vscode-darwin-arm64    # macOS Apple Silicon
npm run gulp vscode-win32-x64       # Windows x64
npm run gulp vscode-linux-x64       # Linux x64
```

## Architecture Overview

### Core Structure
- **Main Process** (`void/src/vs/main/`): Electron main process with Node.js access
- **Renderer Process** (`void/src/vs/workbench/`): UI process, sandboxed from Node.js
- **AI Features** (`void/src/vs/workbench/contrib/void/`): All Void/AINative-specific functionality
- **React Components** (`void/src/vs/workbench/contrib/void/browser/react/`): AI UI components
- **CLI** (`void/cli/`): Rust-based command-line interface

### File Organization Patterns
```
common/         # Shared between main and renderer processes
browser/        # Renderer process only (can use DOM APIs)
electron-main/  # Main process only (can use Node.js APIs)  
node/          # Node.js specific implementations
```

### AI Service Architecture
Key services in `void/src/vs/workbench/contrib/void/browser/`:
- `sendLLMMessageService`: Core LLM communication
- `chatThreadService`: Chat thread management
- `autocompleteService`: AI code completion
- `editCodeService`: Apply/edit code functionality
- `contextGatheringService`: Context collection for AI
- `voidSettingsService`: Provider/model configuration

### React Build System
React components require separate building:
```bash
cd void/src/vs/workbench/contrib/void/browser/react/
node build.js --watch    # Watch mode for React development
```

## Key AI Features

- **Chat Interface**: Interactive AI conversation in sidebar
- **Tab Autocomplete**: AI-powered code completion  
- **Quick Edit (Cmd+K)**: Inline code editing
- **Apply System**: Apply AI changes with diff preview (fast/slow modes)
- **Agent Mode**: AI can create, edit, search, delete files
- **Gather Mode**: Context-aware AI with file/folder understanding
- **Checkpoints**: Save and restore code states

### Supported AI Providers
Anthropic (Claude), OpenAI (GPT), Google (Gemini), Mistral AI, Groq, Ollama (local)

## Development Guidelines

### Service Registration Pattern
```typescript
// Services use dependency injection
@registerSingleton(IVoidSettingsService, VoidSettingsService)

// Access via constructor injection
constructor(@IVoidSettingsService private voidSettingsService: IVoidSettingsService)
```

### Branding Requirements
Per `.cursor/rules/ainative-branding.mdc`:
- Replace all "Void" references with "AINative Studio"
- Update visual assets and branding
- Maintain 100% functional parity
- No breaking changes to core functionality

### Adding New AI Features
1. Create services in `void/src/vs/workbench/contrib/void/browser/`
2. Add React components in the dedicated React folder
3. Register services with dependency injection
4. Use IPC channels for main/renderer communication
5. Follow existing TypeScript and React patterns

## Testing Strategy

### Test Locations
```
void/test/automation/    # Automated UI tests
void/test/integration/   # Integration tests
void/test/smoke/        # Critical workflow tests
void/test/unit/         # Unit tests
```

### Running Tests
```bash
npm run test-node        # Fast unit tests
npm run test-browser     # Browser-based tests
npm run smoketest       # Full end-to-end tests
npx playwright install  # Install test browsers (if needed)
```

## Configuration Files

### Product Configuration
- `void/product.json`: Product metadata and branding
- `void/package.json`: Dependencies and build scripts
- `void/src/vs/workbench/contrib/void/browser/react/package.json`: React dependencies

### Key Dependencies
- Electron 34.3.2, TypeScript, React 19.1.0
- AI SDKs: @anthropic-ai/sdk, openai, @google/genai, @mistralai/mistralai, groq-sdk, ollama
- Build: Gulp, Webpack, ESLint, Playwright

## Build System Understanding

### Development Workflow
1. `npm run watch` compiles TypeScript and starts file watching
2. React components need separate building with `npm run buildreact`
3. Use `./scripts/code.sh` to launch the application
4. Changes trigger automatic recompilation in watch mode

### Production Build Process
1. TypeScript compilation (`gulp compile`)
2. React component building
3. Extension bundling
4. Asset processing (icons, themes)
5. Platform-specific packaging (creates output in `../VSCode-{platform}-{arch}/`)

## Performance Considerations

- Large codebase (~40k+ files) requires efficient build processes
- AI features use streaming for better UX
- Memory optimization important due to LLM integration
- Extensions are lazy-loaded for startup performance

## Security Architecture

- Main process handles all LLM API calls and file system access
- Renderer process is sandboxed and communicates via secure IPC channels  
- AI provider keys stored securely in main process only
- No direct API calls from renderer for security isolation