# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed
- Upgraded Electron from 34.3.2 to 43.7.7 to fix a black-screen crash on macOS 26 caused by Metal/CoreAnimation GPU-process incompatibilities (issue #140)
- Fixed Linux `.deb`/`.rpm`/`.tar.gz` packaging: corrected `chrome-sandbox` permissions and root ownership (issue #142)
- Added shell integration step to the onboarding wizard (issue #116)
- Corrected the AINative backend contract (endpoints, auth model, API key wiring) and fixed several stubbed-out integrations that followed from it: `sendAINativeCloudChat`, the settings crash, the auth webview, usage tracking, the tool logs mock panel, and the skill loader (issues #143-#149)
- Removed orphaned demo/example files and dead stubs from the AINative contrib code

## [2.0.0] - 2026-01-16

Major release: the complete rebranding from Void Editor to AINative Studio, plus a full TypeScript compilation cleanup and macOS build pipeline repairs.

### Added
- Completed the full transition from Void Editor to AINative Studio branding

### Changed
- CI/CD workflows now use Node.js 20

### Fixed
- Resolved all outstanding TypeScript compilation errors blocking the v2.0.0 build
- Fixed critical FS module imports in browser code
- Resolved Google-auth-library minification issues
- Fixed React component TypeScript declarations and React mount function signatures
- Fixed Skills CLI import paths and exports
- Fixed service interface imports in test files
- Added proper null safety and type annotations
- Fixed the macOS build pipeline by adding compatibility exports for test files
- Fixed macOS build failures by switching to supported GitHub Actions runners, resolving a week-long issue that had blocked macOS installer builds

### Known Issues
- macOS builds in this release are code-signed but not notarized, pending renewal of the Apple Developer Portal agreement; on first launch, right-click the app and select "Open" to bypass Gatekeeper

## [1.5.0] - 2026-01-08

### Added
- AINative Cloud authentication and model registry UI (issue #47), including a login modal, `AINativeAuthService`, JWT-authenticated LLM provider, and an AINative Cloud account section in Settings
- GitHub OAuth integration for the login modal, with protocol handler and service registration
- ZeroDB OAuth 2.0 authentication flow with PKCE support, plus token and session management
- `AgentMemoryService` for long-term conversation memory
- Phase 2 Managed API integration (Weeks 1-3), including a Tool Logs UI and integration tests
- Official skill packages: `@ainative/skill-mcp-development`, `@ainative/skill-zerodb-workflows`, an api-design skill, and a Railway deployment skill
- Marketplace integrations for NPM registry and GitHub-based (Anthropic) skill distribution, plus a unified marketplace search service and `.mcp.json` skills configuration
- SHA256 checksum generation for Linux, Windows, and macOS release artifacts
- Windows ARM64 signed build workflow
- Cross-platform user data migration script and backward-compatible storage key migration from `void.*` to `ainative.*`

### Changed
- Renamed all Void files, directories, and CSS classes to AINative as part of the ongoing rebranding
- Updated TypeScript imports and references from void to ainative
- Improved release artifact naming format and extended artifact retention to 30 days across workflows

### Fixed
- Resolved 228 TypeScript compilation errors blocking the build (issue #80, tracked across issues #81-#88)
- Fixed critical branding issues in `product.json`
- Fixed remote desktop connections by adding SSH and WSL extensions to the build
- Fixed the macOS installer build system, including version injection and `product.json` fixes
- Fixed the M4 MacBook crash and subsequent Code 5 error by adding and correcting Apple Silicon entitlements
- Fixed Windows ARM64 build by excluding the Microsoft Authentication extension and using x64 emulation
- Fixed rcedit-related Windows icon embedding failures (exit code handling, executable naming, module resolution)
- Fixed macOS ARM64 artifact naming and release workflow build selection
- Fixed the Windows installer naming conflict in the release workflow

### Removed
- Removed unused and disabled workflow files
- Removed `.cursor/` directory from version control (now ignored) and `chat_history.txt` from tracking

## [1.1.0] - 2025-09-30

### Added
- Complete builds for all major platforms: Linux (x64, ARM64, ARMhf — DEB, RPM, TAR.GZ, AppImage), Windows (x64 and ARM64 — ZIP, User Installer, System Installer), and macOS (Intel and Apple Silicon — DMG, ZIP), 20 platform-specific builds in total
- Signed and notarized macOS builds
- Digitally signed Windows executables
- Native ARM support (ARM64 and ARMhf)

### Changed
- Improved artifact naming for easier identification
- Enhanced build stability across all platforms
- Cleaned up build workflows
- Updated the release workflow to use signed builds for Windows and macOS

## [1.0.0] - 2025-09-22

Initial release of AINative Studio IDE, with the latest working builds from all platform workflows (14 platform-specific builds: Linux x64, Windows x64/ARM64, and macOS Intel/Apple Silicon).

### Added
- Linux x64 builds (AppImage, DEB, RPM, TAR.GZ)
- Windows x64 and ARM64 builds (ZIP, User Installer, System Installer)
- macOS Intel and Apple Silicon builds (signed DMG and ZIP)

[Unreleased]: https://github.com/AINative-Studio/AINativeStudio-IDE/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/AINative-Studio/AINativeStudio-IDE/compare/v1.1.0...v2.0.0
[1.5.0]: https://github.com/AINative-Studio/AINativeStudio-IDE/compare/v1.1.0...v1.5.0
[1.1.0]: https://github.com/AINative-Studio/AINativeStudio-IDE/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/AINative-Studio/AINativeStudio-IDE/releases/tag/v1.0.0
