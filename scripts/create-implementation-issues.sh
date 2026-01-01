#!/bin/bash
# Create GitHub Issues for AINative IDE Implementation
# Following ZERO TOLERANCE GitHub issue tracking rules

set -e

REPO="AINative-Studio/AINativeStudio-IDE"

echo "=================================="
echo "Creating GitHub Issues for IDE Implementation"
echo "Repository: $REPO"
echo "=================================="
echo ""

# Sprint 1: Void Branding Remediation

echo "[1/12] Creating TASK-001: Void → AINative File Renaming..."
gh issue create \
  --repo "$REPO" \
  --title "[REFACTOR] TASK-001: Void → AINative File Renaming" \
  --body "## Problem/Context
The IDE currently uses 'Void' branding throughout the codebase. We need to rename all source files, directories, and compiled outputs from 'Void' to 'AINative' to match the current product branding.

**Affected Files:** 92 source TypeScript/TSX files
**Compiled Output:** 135 JavaScript files (auto-regenerate after source changes)

## Proposed Solution
1. Rename all source files with \`void\` prefix to \`ainative\` prefix
2. Rename all directories containing \`void\` to \`ainative\`
3. Update module/class names in renamed files
4. Run build to regenerate compiled outputs

## Technical Details
- **Files affected:**
  - \`voidSettingsPane.ts\` → \`ainativeSettingsPane.ts\`
  - \`voidSettingsService.ts\` → \`ainativeSettingsService.ts\`
  - \`voidSettingsTypes.ts\` → \`ainativeSettingsTypes.ts\`
  - \`voidModelService.ts\` → \`ainativeModelService.ts\`
  - \`voidUpdateService.ts\` → \`ainativeUpdateService.ts\`
  - \`voidSCMService.ts\` → \`ainativeSCMService.ts\`
  - \`voidOnboardingService.ts\` → \`ainativeOnboardingService.ts\`
  - All 92+ source files in \`src/vs/workbench/contrib/void/\`

- **Directories affected:**
  - \`src/vs/workbench/contrib/void/\` → \`ainative/\`
  - \`void-settings-tsx/\` → \`ainative-settings-tsx/\`
  - \`void-tooltip/\` → \`ainative-tooltip/\`
  - \`void-editor-widgets-tsx/\` → \`ainative-editor-widgets-tsx/\`
  - \`void-onboarding/\` → \`ainative-onboarding/\`
  - \`void_icons/\` → \`ainative_icons/\`

- **Dependencies:** None
- **Breaking changes:** Yes - All import paths will change, but automated script handles updates

## Testing Plan
- [ ] Unit tests: File rename verification script passes
- [ ] Integration tests: TypeScript compilation succeeds with no errors
- [ ] Manual test: Verify all 92 files renamed correctly
- [ ] Coverage: N/A (refactoring task)

## Acceptance Criteria
- [ ] All 92 source files renamed from \`void*\` to \`ainative*\`
- [ ] All directories renamed appropriately
- [ ] TypeScript compilation produces zero errors
- [ ] Build generates 135 compiled output files in new paths
- [ ] No remaining references to old file names in source code

## Estimate
**Story Points:** 5

## Implementation Notes
Use automated script: \`scripts/rename-void-to-ainative.sh\` (see gap analysis report)

## Related Documentation
- Gap Analysis: \`docs/reports/AINATIVE_IDE_GAP_ANALYSIS.md\`" \
  --label "refactor,p0,sprint-1" \
  --assignee "@me"

echo "[2/12] Creating TASK-002: Update Imports and References..."
gh issue create \
  --repo "$REPO" \
  --title "[REFACTOR] TASK-002: Update Imports and References" \
  --body "## Problem/Context
After renaming files in TASK-001, all import statements and references throughout the codebase need to be updated to use the new \`ainative\` naming.

## Proposed Solution
1. Update all import statements from \`void\` paths to \`ainative\` paths
2. Update all class/interface references from \`IVoid*\` to \`IAINative*\`
3. Update all function calls and variable references
4. Run TypeScript compiler to verify all references resolved

## Technical Details
- **Files affected:** All files that import from \`contrib/void/\`
- **Pattern replacements:**
  - \`from 'vs/workbench/contrib/void/'\` → \`from 'vs/workbench/contrib/ainative/'\`
  - \`IVoidSettingsService\` → \`IAINativeSettingsService\`
  - \`VoidSettingsService\` → \`AINativeSettingsService\`
  - All interface/class name patterns

- **Dependencies:** TASK-001 must be completed first
- **Breaking changes:** Yes - All API consumers affected

## Testing Plan
- [ ] Unit tests: Import resolution tests pass
- [ ] Integration tests: Full TypeScript compilation with zero errors
- [ ] Manual test: Spot check 20 random files for correct imports
- [ ] Coverage: TypeScript type checker validates all references

## Acceptance Criteria
- [ ] Zero TypeScript compilation errors
- [ ] All imports use new \`ainative\` paths
- [ ] All interface/class references use \`IAINative*\` / \`AINative*\` naming
- [ ] Search for \`from.*void\` returns zero results in source files
- [ ] IDE intellisense works correctly with new names

## Estimate
**Story Points:** 3

## Related Issues
- Depends on: #TASK-001" \
  --label "refactor,p0,sprint-1" \
  --assignee "@me"

echo "[3/12] Creating TASK-003: CSS Class Renaming..."
gh issue create \
  --repo "$REPO" \
  --title "[REFACTOR] TASK-003: CSS Class Renaming" \
  --body "## Problem/Context
All CSS classes and theme variables currently use \`.void-\` and \`--vscode-void-\` prefixes. These need to be renamed to \`.ainative-\` and \`--vscode-ainative-\` for consistency.

## Proposed Solution
1. Rename all CSS classes from \`.void-*\` to \`.ainative-*\`
2. Rename all CSS theme variables from \`--vscode-void-*\` to \`--vscode-ainative-*\`
3. Update all React component classNames to use new classes
4. Verify visual regression tests pass

## Technical Details
- **Files affected:**
  - \`src/vs/workbench/contrib/ainative/browser/media/ainative.css\` (renamed from void.css)
  - All React components using className references

- **CSS Classes to rename:**
  - \`.void-sweepIdxBG\` → \`.ainative-sweepIdxBG\`
  - \`.void-sweepBG\` → \`.ainative-sweepBG\`
  - \`.void-highlightBG\` → \`.ainative-highlightBG\`
  - \`.void-greenBG\` → \`.ainative-greenBG\`
  - \`.void-redBG\` → \`.ainative-redBG\`
  - \`.void-tooltip-container\` → \`.ainative-tooltip-container\`
  - \`.void-onboarding-container\` → \`.ainative-onboarding-container\`
  - 8+ total classes

- **Theme Variables:**
  - \`--vscode-void-sweepIdxBG\` → \`--vscode-ainative-sweepIdxBG\`
  - \`--vscode-void-sweepBG\` → \`--vscode-ainative-sweepBG\`
  - All theme color variables

- **Dependencies:** TASK-001 (file renaming)
- **Breaking changes:** No - CSS is internal implementation

## Testing Plan
- [ ] Unit tests: CSS class name verification
- [ ] Visual regression tests: Compare screenshots before/after
- [ ] Manual test: Open settings pane, verify styling intact
- [ ] Manual test: Test tooltip, onboarding, command bar rendering
- [ ] Coverage: All UI components visually verified

## Acceptance Criteria
- [ ] All CSS classes renamed to \`.ainative-*\`
- [ ] All theme variables renamed to \`--vscode-ainative-*\`
- [ ] Visual regression tests pass
- [ ] No visual bugs in settings UI, tooltips, or widgets
- [ ] Search for \`.void-\` in CSS files returns zero results

## Estimate
**Story Points:** 2

## Related Issues
- Depends on: #TASK-001" \
  --label "refactor,p0,sprint-1,ui" \
  --assignee "@me"

echo "[4/12] Creating TASK-004: Storage Key Migration..."
gh issue create \
  --repo "$REPO" \
  --title "[FEATURE] TASK-004: Storage Key Migration" \
  --body "## Problem/Context
User settings are currently stored under \`void.*\` storage keys. We need to migrate these to \`ainative.*\` keys while preserving existing user data.

## Proposed Solution
1. Add migration code to read from old \`void.*\` keys
2. Write data to new \`ainative.*\` keys
3. Delete old keys after successful migration
4. Add logging for migration tracking

## Technical Details
- **Files affected:**
  - \`src/vs/workbench/contrib/ainative/common/storageKeys.ts\`
  - \`src/vs/workbench/contrib/ainative/common/ainativeSettingsService.ts\`

- **Storage Keys to migrate:**
  - \`void.settingsServiceStorageII\` → \`ainative.settingsServiceStorageII\`
  - \`void.chatThreadStorageII\` → \`ainative.chatThreadStorageII\`
  - \`void.app.optOutAll\` → \`ainative.app.optOutAll\`
  - \`void.app.machineId\` → \`ainative.app.machineId\`
  - \`void.app.userMachineId\` → \`ainative.app.userMachineId\`

- **Dependencies:** TASK-001, TASK-002
- **Breaking changes:** No - Backward compatible with migration

## Testing Plan
- [ ] Unit tests: Migration logic for each storage key
- [ ] Unit tests: Verify old keys deleted after migration
- [ ] Integration tests: End-to-end migration with sample data
- [ ] Manual test: Start IDE with old data, verify settings preserved
- [ ] Coverage: ≥80% of migration code

## Acceptance Criteria
- [ ] Migration code reads from old \`void.*\` keys if present
- [ ] Data successfully written to new \`ainative.*\` keys
- [ ] Old keys deleted after successful migration
- [ ] No data loss during migration
- [ ] Migration only runs once (idempotent)
- [ ] Console logs confirm successful migration
- [ ] Unit tests for migration pass with ≥80% coverage

## Estimate
**Story Points:** 3

## Related Issues
- Depends on: #TASK-001, #TASK-002" \
  --label "feature,p0,sprint-1,data-migration" \
  --assignee "@me"

echo "[5/12] Creating TASK-005: User Data Migration Script..."
gh issue create \
  --repo "$REPO" \
  --title "[FEATURE] TASK-005: User Data Migration Script" \
  --body "## Problem/Context
Users have extension data stored in \`~/.void-editor/\` directory. We need a script to migrate this to \`~/.ainative-editor/\` without data loss.

## Proposed Solution
1. Create migration script that detects \`~/.void-editor/\` directory
2. Copy all data to \`~/.ainative-editor/\`
3. Verify integrity of copied data
4. Optionally backup or remove old directory

## Technical Details
- **Files affected:**
  - Create new: \`scripts/migrate-user-data.sh\` (cross-platform)
  - Update: Extension transfer service to use new path

- **Directories to migrate:**
  - macOS/Linux: \`~/.void-editor/\` → \`~/.ainative-editor/\`
  - Windows: \`%USERPROFILE%\\.void-editor\\\` → \`%USERPROFILE%\\.ainative-editor\\\`

- **Data to migrate:**
  - Extension installations
  - User keybindings
  - Custom snippets
  - Workspace settings

- **Dependencies:** None (standalone script)
- **Breaking changes:** No - Backward compatible

## Testing Plan
- [ ] Unit tests: Directory copy logic
- [ ] Unit tests: Integrity verification
- [ ] Integration tests: Full migration on test systems (macOS, Linux, Windows)
- [ ] Manual test: Verify extensions work after migration
- [ ] Coverage: ≥80% of script logic

## Acceptance Criteria
- [ ] Script detects presence of \`~/.void-editor/\`
- [ ] All files copied to \`~/.ainative-editor/\` successfully
- [ ] File integrity verified (checksums match)
- [ ] Script works on macOS, Linux, and Windows
- [ ] User prompted before deleting old directory
- [ ] Error handling for permission issues
- [ ] Unit tests pass with ≥80% coverage

## Estimate
**Story Points:** 2

## Related Issues
- None (standalone implementation)" \
  --label "feature,p1,sprint-1,tooling" \
  --assignee "@me"

echo ""
echo "Sprint 1 issues created!"
echo ""

# Sprint 2: Authentication Foundation

echo "[6/12] Creating TASK-006: Implement AINativeAuthService..."
gh issue create \
  --repo "$REPO" \
  --title "[FEATURE] TASK-006: Implement AINativeAuthService" \
  --body "## Problem/Context
IDE needs to authenticate users with AINative cloud backend to enable cloud-based LLM access and agent memory features.

## Proposed Solution
Implement \`AINativeAuthService\` that provides:
1. Login with email/password
2. Logout with token blacklisting
3. Token refresh on expiry
4. Secure token storage using VSCode encryption
5. User profile retrieval
6. Authentication state management

## Technical Details
- **Files affected:**
  - Create new: \`src/vs/workbench/contrib/ainative/common/ainativeAuthService.ts\`
  - Create new: \`src/vs/workbench/contrib/ainative/common/ainativeAuthService.test.ts\`

- **Dependencies:**
  - \`IStorageService\` (VSCode DI)
  - \`IEncryptionService\` (VSCode DI)
  - Backend API: \`https://api.ainative.studio/v1/auth/*\`

- **API Endpoints:**
  - \`POST /v1/auth/login-json\` - Login
  - \`POST /v1/auth/logout\` - Logout
  - \`POST /v1/auth/refresh\` - Refresh token
  - \`GET /v1/auth/me\` - Get user info

- **Storage Keys:**
  - \`ainative.auth.jwt\` (encrypted)
  - \`ainative.auth.user\` (encrypted)

- **Breaking changes:** No - New feature

## Testing Plan (TDD Required)
- [ ] **RED:** Write failing test for login flow
- [ ] **GREEN:** Implement login to pass test
- [ ] **RED:** Write failing test for logout flow
- [ ] **GREEN:** Implement logout to pass test
- [ ] **RED:** Write failing test for token refresh
- [ ] **GREEN:** Implement token refresh to pass test
- [ ] **RED:** Write failing test for secure storage
- [ ] **GREEN:** Implement encrypted storage to pass test
- [ ] Unit tests: Mock HTTP responses for all endpoints
- [ ] Unit tests: Verify token encryption/decryption
- [ ] Integration tests: End-to-end auth flow with backend
- [ ] Coverage: ≥80% of auth service code

## Acceptance Criteria
- [ ] \`login(email, password)\` returns JWT token on success
- [ ] \`logout()\` blacklists token and clears storage
- [ ] \`refreshToken()\` exchanges old token for new one
- [ ] \`getUser()\` returns user profile from storage
- [ ] \`isAuthenticated()\` returns correct state
- [ ] JWT stored encrypted using \`IEncryptionService\`
- [ ] \`onDidChangeAuthState\` event fires on auth changes
- [ ] All unit tests pass with ≥80% coverage
- [ ] Integration tests pass with real backend

## Estimate
**Story Points:** 5

## Related Documentation
- Backend API Guide: \`docs/reports/AINATIVE_AUTH_API_GUIDE.md\`
- Gap Analysis: \`docs/reports/AINATIVE_IDE_GAP_ANALYSIS.md\`" \
  --label "feature,p0,sprint-2,authentication" \
  --assignee "@me"

echo "[7/12] Creating TASK-007: Implement AINativeCloudProvider..."
gh issue create \
  --repo "$REPO" \
  --title "[FEATURE] TASK-007: Implement AINativeCloudProvider" \
  --body "## Problem/Context
IDE needs LLM provider integration for AINative cloud backend that uses JWT authentication instead of API keys.

## Proposed Solution
Implement \`AINativeCloudProvider\` that:
1. Uses JWT from \`AINativeAuthService\`
2. Calls \`/v1/chat/completions\` for LLM inference
3. Handles streaming responses
4. Auto-refreshes expired tokens
5. Integrates with existing provider system

## Technical Details
- **Files affected:**
  - Create new: \`src/vs/workbench/contrib/ainative/electron-main/llmMessage/providers/ainativeCloudProvider.ts\`
  - Create new: \`src/vs/workbench/contrib/ainative/electron-main/llmMessage/providers/ainativeCloudProvider.test.ts\`
  - Update: \`modelCapabilities.ts\` (add AINative Cloud models)
  - Update: \`sendLLMMessage.impl.ts\` (add routing for ainativeCloud provider)

- **Dependencies:**
  - \`IAINativeAuthService\` (from TASK-006)
  - Backend API: \`https://api.ainative.studio/v1/chat/completions\`

- **Supported Models:**
  - Claude Sonnet 4.5
  - Claude Haiku 4
  - GPT-4o (via AINative)
  - Llama 3.3 (via AINative)

- **Breaking changes:** No - New provider addition

## Testing Plan (TDD Required)
- [ ] **RED:** Write failing test for chat completion
- [ ] **GREEN:** Implement chat completion to pass test
- [ ] **RED:** Write failing test for streaming responses
- [ ] **GREEN:** Implement streaming to pass test
- [ ] **RED:** Write failing test for 401 token refresh
- [ ] **GREEN:** Implement auto-refresh to pass test
- [ ] Unit tests: Mock HTTP responses
- [ ] Unit tests: Verify streaming parser
- [ ] Integration tests: End-to-end chat with backend
- [ ] Coverage: ≥80% of provider code

## Acceptance Criteria
- [ ] \`sendMessage()\` sends chat completion request with JWT
- [ ] Streaming responses parsed correctly
- [ ] 401 errors trigger automatic token refresh
- [ ] Retry logic works after token refresh
- [ ] Error messages displayed to user
- [ ] Provider appears in settings UI
- [ ] All unit tests pass with ≥80% coverage
- [ ] Integration tests pass with real backend

## Estimate
**Story Points:** 3

## Related Issues
- Depends on: #TASK-006" \
  --label "feature,p0,sprint-2,provider,llm" \
  --assignee "@me"

echo "[8/12] Creating TASK-008: Update Settings UI with Account Section..."
gh issue create \
  --repo "$REPO" \
  --title "[FEATURE] TASK-008: Update Settings UI with Account Section" \
  --body "## Problem/Context
Settings UI needs account section to display sign-in status and allow users to authenticate with AINative cloud.

## Proposed Solution
Update \`Settings.tsx\` component to add:
1. Account status section (signed in / signed out)
2. User profile display (avatar, name, email)
3. Sign in/out buttons
4. AINative Cloud provider card
5. Connection status indicator

## Technical Details
- **Files affected:**
  - Update: \`src/vs/workbench/contrib/ainative/browser/react/src/ainative-settings-tsx/Settings.tsx\`
  - Update: \`src/vs/workbench/contrib/ainative/browser/react/src/ainative-settings-tsx/Settings.test.tsx\`
  - Create: \`src/vs/workbench/contrib/ainative/browser/react/src/hooks/useAINativeAuth.ts\`
  - Update: \`ainativeSettingsTypes.ts\` (add ainativeCloud provider)

- **UI Components:**
  - Account section (top of settings)
  - User avatar + name display
  - Sign in button (when signed out)
  - Sign out button (when signed in)
  - Provider status indicator

- **Dependencies:** TASK-006 (auth service)
- **Breaking changes:** No - Additive UI change

## Testing Plan (TDD Required)
- [ ] **RED:** Write failing test for account section rendering
- [ ] **GREEN:** Implement account section to pass test
- [ ] **RED:** Write failing test for signed-in state
- [ ] **GREEN:** Implement user profile display to pass test
- [ ] **RED:** Write failing test for signed-out state
- [ ] **GREEN:** Implement sign-in button to pass test
- [ ] Unit tests: Component renders correctly (signed in/out)
- [ ] Unit tests: Sign in/out buttons trigger correct actions
- [ ] Snapshot tests: UI appearance for both states
- [ ] Manual test: Verify responsive design
- [ ] Coverage: ≥80% of Settings component

## Acceptance Criteria
- [ ] Account section displays at top of settings
- [ ] When signed in: shows avatar, name, email, sign out button
- [ ] When signed out: shows sign in button
- [ ] AINative Cloud appears in provider list
- [ ] Connection status updates in real-time
- [ ] UI is responsive (mobile/desktop)
- [ ] All unit tests pass with ≥80% coverage
- [ ] Snapshot tests pass

## Estimate
**Story Points:** 3

## Related Issues
- Depends on: #TASK-006" \
  --label "feature,p0,sprint-2,ui,react" \
  --assignee "@me"

echo "[9/12] Creating TASK-009: Create Login Modal Component..."
gh issue create \
  --repo "$REPO" \
  --title "[FEATURE] TASK-009: Create Login Modal Component" \
  --body "## Problem/Context
Users need a modal dialog to sign in to AINative cloud with email/password credentials.

## Proposed Solution
Create \`AINativeLoginModal\` React component with:
1. Email input field
2. Password input field
3. Sign in button
4. Error message display
5. Loading state
6. Link to sign up page
7. GitHub OAuth button placeholder

## Technical Details
- **Files affected:**
  - Create new: \`src/vs/workbench/contrib/ainative/browser/react/src/ainative-settings-tsx/AINativeLoginModal.tsx\`
  - Create new: \`src/vs/workbench/contrib/ainative/browser/react/src/ainative-settings-tsx/AINativeLoginModal.test.tsx\`
  - Create new: \`src/vs/workbench/contrib/ainative/browser/react/src/ainative-settings-tsx/AINativeLoginModal.css\`

- **Form Validation:**
  - Email: Valid email format
  - Password: Minimum 8 characters
  - Display validation errors inline

- **States:**
  - Idle (ready for input)
  - Loading (authentication in progress)
  - Error (display error message)
  - Success (close modal)

- **Dependencies:** TASK-006 (auth service)
- **Breaking changes:** No - New component

## Testing Plan (TDD Required)
- [ ] **RED:** Write failing test for modal rendering
- [ ] **GREEN:** Implement modal to pass test
- [ ] **RED:** Write failing test for form validation
- [ ] **GREEN:** Implement validation to pass test
- [ ] **RED:** Write failing test for successful login
- [ ] **GREEN:** Implement login flow to pass test
- [ ] **RED:** Write failing test for error handling
- [ ] **GREEN:** Implement error display to pass test
- [ ] Unit tests: Form validation (email format, password length)
- [ ] Unit tests: Submit button disabled during loading
- [ ] Unit tests: Error messages display correctly
- [ ] Unit tests: Modal closes on successful login
- [ ] Snapshot tests: Modal appearance
- [ ] Manual test: Keyboard navigation (tab, enter)
- [ ] Manual test: Accessibility (screen reader)
- [ ] Coverage: ≥80% of component code

## Acceptance Criteria
- [ ] Modal displays with email/password fields
- [ ] Form validates input before submission
- [ ] Loading state disables submit button
- [ ] Error messages display inline
- [ ] Successful login closes modal
- [ ] Sign up link opens in browser
- [ ] Keyboard accessible (tab, enter, escape)
- [ ] All unit tests pass with ≥80% coverage
- [ ] Snapshot tests pass

## Estimate
**Story Points:** 3

## Related Issues
- Depends on: #TASK-006" \
  --label "feature,p0,sprint-2,ui,react" \
  --assignee "@me"

echo ""
echo "Sprint 2 issues created!"
echo ""

# Sprint 3: Advanced Features & Testing

echo "[10/12] Creating TASK-010: Add GitHub OAuth Flow..."
gh issue create \
  --repo "$REPO" \
  --title "[FEATURE] TASK-010: Add GitHub OAuth Flow" \
  --body "## Problem/Context
Users should be able to sign in using their GitHub account via OAuth2 flow.

## Proposed Solution
Implement GitHub OAuth flow:
1. Open system browser to GitHub authorization URL
2. User authorizes on GitHub
3. GitHub redirects to localhost callback server
4. Exchange authorization code for JWT token
5. Store token and close browser

## Technical Details
- **Files affected:**
  - Update: \`src/vs/workbench/contrib/ainative/common/ainativeAuthService.ts\`
  - Create: \`src/vs/workbench/contrib/ainative/electron-main/oauthCallbackServer.ts\`
  - Update: \`AINativeLoginModal.tsx\` (add GitHub button)

- **OAuth Flow:**
  1. Start local server on \`http://localhost:PORT\`
  2. Open browser to \`https://api.ainative.studio/v1/auth/github?redirect_uri=http://localhost:PORT\`
  3. GitHub redirects to callback with \`code\`
  4. POST code to \`/v1/auth/github/callback\` → get JWT
  5. Close browser, stop server

- **Dependencies:** TASK-006 (auth service), TASK-009 (login modal)
- **Breaking changes:** No - Additional auth method

## Testing Plan (TDD Required)
- [ ] **RED:** Write failing test for OAuth flow
- [ ] **GREEN:** Implement OAuth flow to pass test
- [ ] **RED:** Write failing test for callback server
- [ ] **GREEN:** Implement callback server to pass test
- [ ] Unit tests: Mock OAuth responses
- [ ] Unit tests: Callback server starts/stops correctly
- [ ] Integration tests: Full OAuth flow (manual - requires GitHub)
- [ ] Manual test: Sign in with GitHub
- [ ] Coverage: ≥80% of OAuth code

## Acceptance Criteria
- [ ] GitHub button in login modal
- [ ] Clicking opens system browser to GitHub
- [ ] User authorizes on GitHub
- [ ] Browser redirects to localhost callback
- [ ] JWT token received and stored
- [ ] Browser tab closes automatically
- [ ] Error handling for declined authorization
- [ ] All unit tests pass with ≥80% coverage

## Estimate
**Story Points:** 2

## Related Issues
- Depends on: #TASK-006, #TASK-009" \
  --label "feature,p1,sprint-3,authentication,oauth" \
  --assignee "@me"

echo "[11/12] Creating TASK-011: Integrate Agent Memory APIs..."
gh issue create \
  --repo "$REPO" \
  --title "[FEATURE] TASK-011: Integrate Agent Memory APIs" \
  --body "## Problem/Context
IDE should store and retrieve conversation context using AINative agent memory APIs for improved continuity across sessions.

## Proposed Solution
Integrate agent memory APIs:
1. Store important conversation turns
2. Search memory before generating responses
3. Use retrieved context to enhance prompts
4. Implement memory pruning for token limits

## Technical Details
- **Files affected:**
  - Create: \`src/vs/workbench/contrib/ainative/common/ainativeMemoryService.ts\`
  - Create: \`src/vs/workbench/contrib/ainative/common/ainativeMemoryService.test.ts\`
  - Update: Chat handler to use memory service

- **API Endpoints:**
  - \`POST /v1/agent/memory/store\` - Store memory
  - \`POST /v1/agent/memory/search\` - Search memories

- **Memory Strategy:**
  - Store: User questions + AI responses (role: assistant)
  - Search: Query with current user message
  - Retrieve: Top 5 relevant memories
  - Enhance: Add retrieved context to system prompt

- **Dependencies:** TASK-006 (auth), TASK-007 (cloud provider)
- **Breaking changes:** No - Optional enhancement

## Testing Plan (TDD Required)
- [ ] **RED:** Write failing test for store memory
- [ ] **GREEN:** Implement store to pass test
- [ ] **RED:** Write failing test for search memory
- [ ] **GREEN:** Implement search to pass test
- [ ] **RED:** Write failing test for context enhancement
- [ ] **GREEN:** Implement enhancement to pass test
- [ ] Unit tests: Mock memory API responses
- [ ] Unit tests: Verify context enhancement logic
- [ ] Integration tests: Full memory flow with backend
- [ ] Manual test: Chat continuity across sessions
- [ ] Coverage: ≥80% of memory service code

## Acceptance Criteria
- [ ] Conversation turns stored in agent memory
- [ ] Relevant memories retrieved before generating response
- [ ] System prompt enhanced with retrieved context
- [ ] Memory search limited to authenticated users
- [ ] Error handling for API failures
- [ ] All unit tests pass with ≥80% coverage
- [ ] Integration tests pass with real backend

## Estimate
**Story Points:** 2

## Related Issues
- Depends on: #TASK-006, #TASK-007" \
  --label "feature,p1,sprint-3,agent,memory" \
  --assignee "@me"

echo "[12/12] Creating TASK-012: Testing & Verification..."
gh issue create \
  --repo "$REPO" \
  --title "[TEST] TASK-012: Testing & Verification" \
  --body "## Problem/Context
All features implemented in TASK-001 through TASK-011 must be thoroughly tested before production deployment.

## Proposed Solution
Execute comprehensive testing:
1. Run full unit test suite
2. Run integration test suite
3. Perform end-to-end testing
4. Conduct security audit
5. Performance benchmarking
6. Accessibility testing
7. Cross-platform verification (macOS, Windows, Linux)

## Technical Details
- **Test Coverage Requirements:**
  - Overall code coverage: ≥80%
  - Auth service coverage: ≥90% (critical path)
  - UI component coverage: ≥75%
  - Migration code coverage: ≥85%

- **Test Types:**
  - Unit tests: ~200 tests expected
  - Integration tests: ~50 tests expected
  - E2E tests: ~20 scenarios
  - Visual regression: ~15 screenshots

- **Dependencies:** ALL previous tasks (TASK-001 through TASK-011)
- **Breaking changes:** No - Testing only

## Testing Plan (Comprehensive)
### Unit Tests
- [ ] All unit tests pass (≥200 tests)
- [ ] Code coverage ≥80% overall
- [ ] Auth service ≥90% coverage
- [ ] Zero failing tests

### Integration Tests
- [ ] Auth flow: Login → Chat → Logout
- [ ] Memory flow: Store → Search → Enhance
- [ ] Migration: Void data → AINative data
- [ ] Provider switching: All 16 providers work
- [ ] Token refresh: Auto-refresh on expiry

### End-to-End Tests
- [ ] Fresh install → Sign in → Chat → Sign out
- [ ] Existing Void user → Migrate → Use AINative
- [ ] Network error handling
- [ ] Offline mode fallback
- [ ] Settings persistence

### Security Audit
- [ ] No API keys in logs
- [ ] JWT stored encrypted
- [ ] Password validation enforced
- [ ] HTTPS for all backend calls
- [ ] Token expiry enforced

### Performance Benchmarks
- [ ] Settings load time < 500ms
- [ ] Login flow < 2 seconds
- [ ] Chat response latency < 3 seconds
- [ ] Memory search < 1 second

### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] ARIA labels present
- [ ] Focus management correct

### Cross-Platform
- [ ] macOS: All features work
- [ ] Windows: All features work
- [ ] Linux: All features work

## Acceptance Criteria
- [ ] ≥80% overall code coverage
- [ ] All unit tests pass (≥200)
- [ ] All integration tests pass (≥50)
- [ ] All E2E scenarios pass (≥20)
- [ ] Security audit passes
- [ ] Performance benchmarks met
- [ ] Accessibility tests pass
- [ ] Cross-platform verification complete
- [ ] Zero critical bugs
- [ ] Zero security vulnerabilities

## Estimate
**Story Points:** 5

## Related Issues
- Depends on: ALL previous tasks (#TASK-001 through #TASK-011)" \
  --label "testing,p0,sprint-3,qa" \
  --assignee "@me"

echo ""
echo "=================================="
echo "All 12 GitHub Issues Created!"
echo "=================================="
echo ""
echo "Issues created in repository: $REPO"
echo ""
echo "Sprint Breakdown:"
echo "  Sprint 1 (Branding):       TASK-001 to TASK-005 (15 points)"
echo "  Sprint 2 (Authentication): TASK-006 to TASK-009 (14 points)"
echo "  Sprint 3 (Advanced + QA):  TASK-010 to TASK-012 (9 points)"
echo ""
echo "Total Story Points: 38"
echo ""
echo "View issues: gh issue list --repo $REPO"
