# Sensitive Void-to-AINative Branding Audit

**Date:** 2026-01-03
**Issue:** #23 - Complete sensitive void-to-AINative branding
**Status:** In Progress

## Executive Summary

This document catalogs all remaining 'void' references in the codebase that require renaming for the AINative Studio rebrand. References are categorized by risk level to guide implementation priority.

**Total void references found:** ~150+ (excluding TypeScript return type `void`)

**Categories:**
- High-Risk: Action IDs, Protocol URIs, Service IDs (BREAKING CHANGES)
- Medium-Risk: React interfaces, function exports (May affect external integrations)
- Low-Risk: Comments, internal variable names

---

## 1. HIGH-RISK IDENTIFIERS (BREAKING CHANGES)

These identifiers are externally referenced and changing them will break functionality without migration.

### 1.1 Action IDs (13 items)
**File:** `src/vs/workbench/contrib/ainative/browser/actionIDs.ts`

| Current ID | Proposed ID | References |
|------------|-------------|------------|
| `void.ctrlLAction` | `ainative.ctrlLAction` | 31 files |
| `void.ctrlKAction` | `ainative.ctrlKAction` | 31 files |
| `void.acceptDiff` | `ainative.acceptDiff` | Multiple |
| `void.rejectDiff` | `ainative.rejectDiff` | Multiple |
| `void.goToNextDiff` | `ainative.goToNextDiff` | Multiple |
| `void.goToPrevDiff` | `ainative.goToPrevDiff` | Multiple |
| `void.goToNextUri` | `ainative.goToNextUri` | Multiple |
| `void.goToPrevUri` | `ainative.goToPrevUri` | Multiple |
| `void.acceptFile` | `ainative.acceptFile` | Multiple |
| `void.rejectFile` | `ainative.rejectFile` | Multiple |
| `void.acceptAllDiffs` | `ainative.acceptAllDiffs` | Multiple |
| `void.rejectAllDiffs` | `ainative.rejectAllDiffs` | Multiple |
| `void.sidebar.open` | `ainative.sidebar.open` | Multiple |

**Impact:** HIGH - These are registered command IDs used throughout the application. Changing requires updating all references.

**Migration Strategy:**
1. Keep constant names (e.g., `VOID_CTRL_L_ACTION_ID`) for backward compatibility
2. Update string values (e.g., `'void.ctrlLAction'` → `'ainative.ctrlLAction'`)
3. No alias needed as constants handle indirection

---

### 1.2 Protocol URI Scheme (CRITICAL)
**File:** `src/vs/workbench/contrib/ainative/common/githubOAuthService.ts:89`

| Current | Proposed | Impact |
|---------|----------|--------|
| `void://auth/github/callback` | `ainative://auth/github/callback` | CRITICAL |

**Impact:** CRITICAL - This is registered with the OS as a protocol handler. Changing breaks OAuth flow.

**Migration Strategy:**
1. Register BOTH protocol handlers: `void://` AND `ainative://`
2. Handle both in protocol registration
3. Deprecate `void://` in future version
4. Document protocol change for users

**Files to update:**
- `src/vs/workbench/contrib/ainative/common/githubOAuthService.ts`
- OS protocol handler registration (platform-specific)

---

### 1.3 Service IDs and Contribution IDs (8 items)

| File | Current ID | Proposed ID |
|------|------------|-------------|
| `browser/autocompleteService.ts:620` | `void.autocompleteService` | `ainative.autocompleteService` |
| `browser/ainativeCommandBarService.ts:81` | `void.AINativeCommandBarService` | `ainative.AINativeCommandBarService` |
| `browser/_dummyContrib.ts:48` | `workbench.contrib.void.dummy` | `workbench.contrib.ainative.dummy` |
| `browser/ainativeUpdateActions.ts:202` | `workbench.contrib.void.voidUpdate` | `workbench.contrib.ainative.ainativeUpdate` |
| `browser/convertToLLMMessageWorkbenchContrib.ts:13` | `workbench.contrib.void.convertcontrib` | `workbench.contrib.ainative.convertcontrib` |
| `browser/fileService.ts:15` | `void.copyfileprompt` | `ainative.copyfileprompt` |
| `browser/ainativeSettingsPane.ts:121` | `workbench.action.toggleVoidSettings` | `workbench.action.toggleAINativeSettings` |
| `browser/ainativeSettingsPane.ts:170` | `workbench.action.openVoidSettings` | `workbench.action.openAINativeSettings` |

**Impact:** HIGH - Service registration IDs used by dependency injection system

**Migration Strategy:**
1. Update string values in static ID fields
2. Keep constant names if they don't cause confusion
3. Update all registration references

---

### 1.4 Additional Action IDs (10 items)

**Files with inline action IDs:**
- `browser/ainativeUpdateActions.ts`: `void.updater.*` (7 actions)
- `browser/ainativeSCMService.ts`: `void.generateCommitMessageAction`, `void.loadingGenerateCommitMessageAction`
- `browser/chatThreadService.ts`: `void.goToChat`
- `browser/sidebarActions.ts`: `void.cmdShiftL`, `void.historyAction`, `void.settingsAction`

**Migration:** Update inline string literals to use `ainative.*` prefix

---

### 1.5 CSS File Reference
**File:** `src/vs/workbench/contrib/ainative/browser/ainative.contribution.ts:29`

```typescript
import './media/void.css'
```

**Proposed:** Keep as `void.css` OR rename to `ainative.css`

**Decision needed:** Does this file exist? Check if it should be renamed.

---

## 2. MEDIUM-RISK IDENTIFIERS

These may affect external integrations or React component APIs.

### 2.1 React Interface Names (2 items)

**Files:**
- `src/vs/workbench/contrib/ainative/browser/react/src/sidebar-tsx/SidebarChat.tsx:292`
- `src/vs/workbench/contrib/ainative/browser/react/src2/sidebar-tsx/SidebarChat.tsx:292`

```typescript
interface VoidChatAreaProps {
  // ...
}

export const VoidChatArea: React.FC<VoidChatAreaProps> = ({
  // ...
})
```

**Proposed:**
```typescript
interface AINativeChatAreaProps {
  // ...
}

export const AINativeChatArea: React.FC<AINativeChatAreaProps> = ({
  // ...
})
```

**Impact:** MEDIUM - React component interface, may be imported externally

---

### 2.2 Type Aliases (6 items)

**File:** `src/vs/workbench/contrib/ainative/common/ainativeSettingsService.ts`

| Current | Proposed | References |
|---------|----------|------------|
| `VoidSettingsState` | `AINativeSettingsState` | ~20 files |
| `mountVoidSettings` | `mountAINativeSettings` | 2 files |

**Files using `VoidSettingsState`:**
- `common/ainativeSettingsService.ts` (primary definition)
- `common/ainativeSettingsTypes.ts` (imports)
- `browser/react/src/util/services.tsx` (imports, 2 copies)
- `browser/react/src2/util/services.tsx` (imports)
- `test/browser/react/Settings.test.tsx` (test mock)

**Impact:** MEDIUM - Core type used throughout settings system

**Migration Strategy:**
1. Create type alias: `export type AINativeSettingsState = VoidSettingsState`
2. Mark `VoidSettingsState` as deprecated
3. Update all imports to use `AINativeSettingsState`
4. Remove old type in next major version

---

### 2.3 Function Exports (1 item)

**Files:**
- `src/vs/workbench/contrib/ainative/browser/react/src/ainative-settings-tsx/index.tsx:9`
- `src/vs/workbench/contrib/ainative/browser/react/src2/ainative-settings-tsx/index.tsx:9`

```typescript
export const mountVoidSettings = mountFnGenerator(Settings)
```

**Proposed:**
```typescript
export const mountAINativeSettings = mountFnGenerator(Settings)
// Deprecated alias
export const mountVoidSettings = mountAINativeSettings
```

**Impact:** MEDIUM - Public API function, may be used by extensions

---

### 2.4 Import Path References

**File:** `browser/react/src/util/services.tsx:9` and `src2/util/services.tsx:9`

```typescript
import { VoidSettingsState } from '../../../../../../../workbench/contrib/void/common/voidSettingsService.js'
```

**Issue:** Import path references `void/common/voidSettingsService.js` which doesn't exist (should be `ainative/`)

**Action:** This appears to be a legacy path. Verify it's not causing import errors.

---

## 3. LOW-RISK IDENTIFIERS

### 3.1 Legacy Storage Keys (KEEP AS-IS)

**File:** `src/vs/workbench/contrib/ainative/common/storageKeys.ts`

```typescript
export const LEGACY_VOID_SETTINGS_STORAGE_KEY = 'void.settingsServiceStorageII';
export const LEGACY_THREAD_STORAGE_KEY = 'void.chatThreadStorageII';
export const LEGACY_OPT_OUT_KEY = 'void.app.optOutAll';
export const LEGACY_MACHINE_ID_KEY = 'void.app.machineId';
```

**Action:** KEEP - These are intentionally legacy for migration purposes

---

### 3.2 Migration Comments and Console Logs

Multiple files contain comments and console.log references to 'void.*' keys:
- These are documentation of migration from void to ainative
- **Action:** KEEP for historical context

---

### 3.3 Internal Variable Names

**File:** `electron-main/metricsMainService.ts`

```typescript
const newKey = 'void.app.oldMachineId'
const oldValue = this._appStorage.get('void.machineId', StorageScope.APPLICATION)
```

**Action:** These reference actual legacy storage. KEEP as-is since they're reading old data.

---

## 4. FILES REQUIRING NO CHANGE

### 4.1 TypeScript Return Type `void`
All instances of `function foo(): void` are TypeScript syntax, not branding.

### 4.2 Test Files
- `test/common/storageKeyMigration.test.ts` - Tests migration from void to ainative (KEEP)

---

## 5. IMPLEMENTATION PLAN

### Phase 1: HIGH-RISK (Breaking Changes)
1. Update action ID constants in `actionIDs.ts`
2. Update protocol URI with dual registration
3. Update service IDs
4. Update CSS import reference
5. Test all commands and services

### Phase 2: MEDIUM-RISK (API Changes)
1. Rename React interfaces with deprecation aliases
2. Rename `VoidSettingsState` type with alias
3. Rename `mountVoidSettings` function with alias
4. Update all imports
5. Test React components

### Phase 3: VERIFICATION
1. Run full test suite
2. Manual testing of OAuth flow
3. Verify all commands work
4. Check for runtime errors

### Phase 4: DOCUMENTATION
1. Document breaking changes
2. Create migration guide
3. Update CHANGELOG

---

## 6. RISK ASSESSMENT

### High-Risk Items Requiring Careful Testing
1. **Protocol URI change** - Could break OAuth for existing users
2. **Action ID changes** - Could break keybindings and command palette
3. **Service ID changes** - Could break dependency injection

### Mitigation Strategies
1. **Protocol URI:** Support both `void://` and `ainative://` indefinitely
2. **Action IDs:** Constants provide indirection, only string values change
3. **Service IDs:** Ensure all registrations are updated simultaneously
4. **React APIs:** Provide deprecated aliases for one release cycle

---

## 7. FILES TO MODIFY

### High Priority
1. `src/vs/workbench/contrib/ainative/browser/actionIDs.ts`
2. `src/vs/workbench/contrib/ainative/common/githubOAuthService.ts`
3. `src/vs/workbench/contrib/ainative/browser/autocompleteService.ts`
4. `src/vs/workbench/contrib/ainative/browser/ainativeCommandBarService.ts`
5. `src/vs/workbench/contrib/ainative/browser/_dummyContrib.ts`
6. `src/vs/workbench/contrib/ainative/browser/ainativeUpdateActions.ts`
7. `src/vs/workbench/contrib/ainative/browser/convertToLLMMessageWorkbenchContrib.ts`
8. `src/vs/workbench/contrib/ainative/browser/fileService.ts`
9. `src/vs/workbench/contrib/ainative/browser/ainativeSettingsPane.ts`
10. `src/vs/workbench/contrib/ainative/browser/ainativeSCMService.ts`
11. `src/vs/workbench/contrib/ainative/browser/chatThreadService.ts`
12. `src/vs/workbench/contrib/ainative/browser/sidebarActions.ts`
13. `src/vs/workbench/contrib/ainative/browser/sidebarPane.ts`
14. Protocol handler registration files (platform-specific)

### Medium Priority
15. `src/vs/workbench/contrib/ainative/browser/react/src/sidebar-tsx/SidebarChat.tsx`
16. `src/vs/workbench/contrib/ainative/browser/react/src2/sidebar-tsx/SidebarChat.tsx`
17. `src/vs/workbench/contrib/ainative/common/ainativeSettingsService.ts`
18. `src/vs/workbench/contrib/ainative/common/ainativeSettingsTypes.ts`
19. `src/vs/workbench/contrib/ainative/browser/react/src/util/services.tsx`
20. `src/vs/workbench/contrib/ainative/browser/react/src2/util/services.tsx`
21. `src/vs/workbench/contrib/ainative/browser/react/src/ainative-settings-tsx/index.tsx`
22. `src/vs/workbench/contrib/ainative/browser/react/src2/ainative-settings-tsx/index.tsx`

---

## 8. VERIFICATION CHECKLIST

After implementation, verify:

- [ ] All action IDs work in command palette
- [ ] Ctrl+L and Ctrl+K shortcuts work
- [ ] Diff accept/reject actions work
- [ ] GitHub OAuth flow completes successfully
- [ ] Settings pane opens and functions
- [ ] Sidebar opens and renders correctly
- [ ] Chat interface works
- [ ] Autocomplete service functions
- [ ] SCM commit message generation works
- [ ] All services register correctly on startup
- [ ] No console errors on launch
- [ ] Test suite passes
- [ ] React components render without errors

---

## 9. NEXT STEPS

1. Review this audit with team
2. Decide on protocol URI migration strategy
3. Begin Phase 1 implementation
4. Create breaking-changes.md
5. Update CHANGELOG.md
6. Test thoroughly before merge

---

**Last Updated:** 2026-01-03
**Audit Performed By:** Claude (System Architect)
