# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AINative Studio IDE is a rebranded fork of Void Editor (which itself is forked from VS Code), focused on AI-powered development. 

### Repository Structure
- **Root Directory**: `/AINativeStudio-IDE/` - Contains documentation and CI configuration
- **Main Codebase**: `/AINativeStudio-IDE/ainative-studio/` - The actual IDE source code (was previously called "void")
- **Working Directory**: All development commands should be run from `ainative-studio/` directory
- **Package Location**: `ainative-studio/package.json` and `ainative-studio/package-lock.json`

**IMPORTANT**: The codebase uses Electron + TypeScript with React components for AI features.

## Essential Commands

### Development Setup
```bash
cd ainative-studio
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
- **Main Process** (`ainative-studio/src/vs/main/`): Electron main process with Node.js access
- **Renderer Process** (`ainative-studio/src/vs/workbench/`): UI process, sandboxed from Node.js
- **AI Features** (`ainative-studio/src/vs/workbench/contrib/void/`): All Void/AINative-specific functionality
- **React Components** (`ainative-studio/src/vs/workbench/contrib/void/browser/react/`): AI UI components
- **CLI** (`ainative-studio/cli/`): Rust-based command-line interface

### File Organization Patterns
```
common/         # Shared between main and renderer processes
browser/        # Renderer process only (can use DOM APIs)
electron-main/  # Main process only (can use Node.js APIs)  
node/          # Node.js specific implementations
```

### AI Service Architecture
Key services in `ainative-studio/src/vs/workbench/contrib/void/browser/`:
- `sendLLMMessageService`: Core LLM communication
- `chatThreadService`: Chat thread management
- `autocompleteService`: AI code completion
- `editCodeService`: Apply/edit code functionality
- `contextGatheringService`: Context collection for AI
- `voidSettingsService`: Provider/model configuration

### React Build System
React components require separate building:
```bash
cd ainative-studio/src/vs/workbench/contrib/void/browser/react/
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
1. Create services in `ainative-studio/src/vs/workbench/contrib/void/browser/`
2. Add React components in the dedicated React folder
3. Register services with dependency injection
4. Use IPC channels for main/renderer communication
5. Follow existing TypeScript and React patterns

## Testing Strategy

### Test Locations
```
ainative-studio/test/automation/    # Automated UI tests
ainative-studio/test/integration/   # Integration tests
ainative-studio/test/smoke/        # Critical workflow tests
ainative-studio/test/unit/         # Unit tests
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
- `ainative-studio/product.json`: Product metadata and branding
- `ainative-studio/package.json`: Dependencies and build scripts
- `ainative-studio/src/vs/workbench/contrib/void/browser/react/package.json`: React dependencies

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

## GitHub Actions & CI/CD

### Automated Build Workflows
Located in `.github/workflows/`:
- `build-linux.yml`: Ubuntu builds for Linux x64
- `build-macos.yml`: macOS builds for both Intel and Apple Silicon
- `build-windows.yml`: Windows builds for x64
- `release.yml`: Multi-platform release workflow

### CI/CD Configuration
**CRITICAL**: All GitHub Actions workflows must use `ainative-studio/` as the working directory:
```yaml
working-directory: ainative-studio
cache-dependency-path: 'ainative-studio/package-lock.json'
```

### Build Triggers
- Push to `main` branch: Builds all platforms but no release
- Tags starting with `v*`: Builds all platforms AND creates GitHub release
- Pull requests: Builds for testing
- Manual dispatch: Can be triggered via GitHub Actions UI

### Release Process
1. Create version tag: `git tag v1.0.0 && git push origin v1.0.0`
2. GitHub Actions automatically builds all platforms
3. Creates GitHub release with downloadable artifacts
4. Supports prerelease detection (alpha/beta/rc in tag name)

### Memory Requirements
- TypeScript compilation requires Node.js heap limit of 8192MB
- All build scripts include `--max-old-space-size=8192` for large codebase compilation