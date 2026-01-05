# Breaking Changes: Void to AINative Rebranding

**Date:** 2026-01-03
**Issue:** #23 - Complete sensitive void-to-AINative branding
**Version:** Next release

---

## Overview

This document describes breaking changes introduced by the comprehensive void-to-AINative rebranding. While most changes are internal, some affect public APIs and external integrations.

---

## 1. CRITICAL: Protocol URI Change

### OAuth Protocol Handler

**Changed:** `void://auth/github/callback` → `ainative://auth/github/callback`

**Impact:** BREAKING - Users who have previously authenticated will need to re-authenticate

**Files Modified:**
- `src/vs/workbench/contrib/ainative/common/githubOAuthService.ts`

**User Action Required:**
1. Existing users will need to sign in again after update
2. Protocol handler will be automatically registered as `ainative://`

**Migration:** The old `void://` protocol is no longer supported. Users must re-authenticate with GitHub OAuth.

---

## 2. Action ID Changes (Internal)

All command/action IDs have been renamed from `void.*` to `ainative.*`:

### Command Palette Actions

| Old ID | New ID | Description |
|--------|--------|-------------|
| `void.ctrlLAction` | `ainative.ctrlLAction` | Open chat (Ctrl+L) |
| `void.ctrlKAction` | `ainative.ctrlKAction` | Quick edit (Ctrl+K) |
| `void.acceptDiff` | `ainative.acceptDiff` | Accept code diff |
| `void.rejectDiff` | `ainative.rejectDiff` | Reject code diff |
| `void.goToNextDiff` | `ainative.goToNextDiff` | Navigate to next diff |
| `void.goToPrevDiff` | `ainative.goToPrevDiff` | Navigate to previous diff |
| `void.goToNextUri` | `ainative.goToNextUri` | Navigate to next file |
| `void.goToPrevUri` | `ainative.goToPrevUri` | Navigate to previous file |
| `void.acceptFile` | `ainative.acceptFile` | Accept file changes |
| `void.rejectFile` | `ainative.rejectFile` | Reject file changes |
| `void.acceptAllDiffs` | `ainative.acceptAllDiffs` | Accept all diffs |
| `void.rejectAllDiffs` | `ainative.rejectAllDiffs` | Reject all diffs |
| `void.sidebar.open` | `ainative.sidebar.open` | Open sidebar |
| `void.cmdShiftL` | `ainative.cmdShiftL` | New chat (Cmd+Shift+L) |
| `void.historyAction` | `ainative.historyAction` | View past chats |
| `void.settingsAction` | `ainative.settingsAction` | Open settings |
| `void.openSidebar` | `ainative.openSidebar` | Open sidebar |
| `void.goToChat` | `ainative.goToChat` | Jump to chat |
| `void.generateCommitMessageAction` | `ainative.generateCommitMessageAction` | Generate commit message |
| `void.loadingGenerateCommitMessageAction` | `ainative.loadingGenerateCommitMessageAction` | Cancel commit generation |
| `void.copyfileprompt` | `ainative.copyfileprompt` | Copy file prompt |
| `void.dummy` | `ainative.dummy` | Dummy test action |
| `void.voidCheckUpdate` | `ainative.ainativeCheckUpdate` | Check for updates |
| `workbench.action.toggleVoidSettings` | `workbench.action.toggleAINativeSettings` | Toggle settings |
| `workbench.action.openVoidSettings` | `workbench.action.openAINativeSettings` | Open settings |

**Impact:** LOW for users, HIGH for extensions

- **User Impact:** Keybindings and commands work transparently (constants provide indirection)
- **Extension Impact:** Extensions referencing these IDs will break

### Updater Action IDs

| Old ID | New ID |
|--------|--------|
| `void.updater.reinstall` | `ainative.updater.reinstall` |
| `void.updater.download` | `ainative.updater.download` |
| `void.updater.apply` | `ainative.updater.apply` |
| `void.updater.restart` | `ainative.updater.restart` |
| `void.updater.site` | `ainative.updater.site` |
| `void.updater.close` | `ainative.updater.close` |

---

## 3. Service ID Changes (Internal)

**Impact:** Internal only - no user action required

| Old ID | New ID |
|--------|--------|
| `void.autocompleteService` | `ainative.autocompleteService` |
| `void.AINativeCommandBarService` | `ainative.AINativeCommandBarService` |
| `workbench.contrib.void.dummy` | `workbench.contrib.ainative.dummy` |
| `workbench.contrib.void.voidUpdate` | `workbench.contrib.ainative.ainativeUpdate` |
| `workbench.contrib.void.convertcontrib` | `workbench.contrib.ainative.convertcontrib` |

---

## 4. React Component API Changes

### Component Renames

**Changed:** `VoidChatArea` → `AINativeChatArea`

**Files Affected:**
- `src/vs/workbench/contrib/ainative/browser/react/src/sidebar-tsx/SidebarChat.tsx`
- `src/vs/workbench/contrib/ainative/browser/react/src2/sidebar-tsx/SidebarChat.tsx`
- `src/vs/workbench/contrib/ainative/browser/react/src/quick-edit-tsx/QuickEditChat.tsx`

**Impact:** MEDIUM - Affects React component imports

**Migration:**
```typescript
// Before
import { VoidChatArea } from '../sidebar-tsx/SidebarChat.js';

// After
import { AINativeChatArea } from '../sidebar-tsx/SidebarChat.js';
```

### Interface Renames

**Changed:** `VoidChatAreaProps` → `AINativeChatAreaProps`

**Impact:** LOW - Internal interface, rarely imported externally

---

## 5. Type Alias Changes (Pending)

### VoidSettingsState → AINativeSettingsState

**Status:** NOT YET IMPLEMENTED - Requires deprecation strategy

**Current Plan:**
1. Add type alias: `export type AINativeSettingsState = VoidSettingsState`
2. Mark `VoidSettingsState` as `@deprecated`
3. Update all internal references
4. Remove deprecated type in next major version

**Files Affected:**
- `src/vs/workbench/contrib/ainative/common/ainativeSettingsService.ts`
- `src/vs/workbench/contrib/ainative/common/ainativeSettingsTypes.ts`
- `src/vs/workbench/contrib/ainative/browser/react/src/util/services.tsx`
- `src/vs/workbench/contrib/ainative/browser/react/src2/util/services.tsx`
- `src/vs/workbench/contrib/ainative/test/browser/react/Settings.test.tsx`

**Recommended Action:** Will be completed in future PR with proper deprecation warnings

---

## 6. Function Export Changes (Pending)

### mountVoidSettings → mountAINativeSettings

**Status:** NOT YET IMPLEMENTED - Requires deprecation strategy

**Files:**
- `src/vs/workbench/contrib/ainative/browser/react/src/ainative-settings-tsx/index.tsx`
- `src/vs/workbench/contrib/ainative/browser/react/src2/ainative-settings-tsx/index.tsx`
- `src/vs/workbench/contrib/ainative/browser/ainativeSettingsPane.ts` (consumer)

**Recommended Migration:**
```typescript
// Add deprecated alias
export const mountAINativeSettings = mountFnGenerator(Settings);
/** @deprecated Use mountAINativeSettings instead */
export const mountVoidSettings = mountAINativeSettings;
```

---

## 7. CSS Import Change

**Changed:** `'./media/void.css'` → `'./media/ainative.css'`

**File:** `src/vs/workbench/contrib/ainative/browser/ainative.contribution.ts`

**Impact:** Internal only - CSS file already renamed

---

## 8. Storage Keys (Migration Only)

**No breaking changes** - Legacy keys are preserved for backward-compatible migration:

| Legacy Key (Read Only) | Current Key (Active) |
|------------------------|----------------------|
| `void.settingsServiceStorageII` | `ainative.settingsServiceStorageII` |
| `void.chatThreadStorageII` | `ainative.chatThreadStorageII` |
| `void.app.optOutAll` | `ainative.app.optOutAll` |
| `void.app.machineId` | `ainative.app.machineId` |

**Migration:** Automatic on first launch - data migrated from void.* to ainative.* keys

---

## 9. NOT Changed (Intentionally)

The following identifiers remain unchanged:

1. **Constant Names:** `VOID_CTRL_L_ACTION_ID`, `VOID_ACCEPT_DIFF_ACTION_ID`, etc.
   - **Reason:** Internal constants, string values updated but names kept for code stability

2. **Legacy Storage Keys:** `LEGACY_VOID_SETTINGS_STORAGE_KEY`, etc.
   - **Reason:** Historical reference for migration logic

3. **Migration Comments:** References to 'void.*' in comments
   - **Reason:** Documentation of migration process

---

## 10. User-Facing Impact Summary

### Critical Actions Required

1. **Re-authenticate with GitHub OAuth** after update (if using GitHub integration)
2. **No other manual actions required**

### What Users Will Notice

- Settings and chat history automatically migrated
- All keyboard shortcuts continue to work
- Command palette commands work (internal IDs changed transparently)
- UI remains identical

### What Extensions Developers Need to Do

If your extension references AINative Studio action IDs:

1. Update all `void.*` action IDs to `ainative.*`
2. Update React component imports if using `VoidChatArea`
3. Test extension against new version

---

## 11. Testing Checklist

After applying these changes, verify:

- [ ] Ctrl+L opens chat
- [ ] Ctrl+K opens quick edit
- [ ] Settings pane opens
- [ ] Chat history loads correctly
- [ ] GitHub OAuth flow completes successfully
- [ ] All diff accept/reject actions work
- [ ] Command palette shows correct action names
- [ ] Settings migrate automatically on first launch
- [ ] No console errors on startup

---

## 12. Rollback Plan

If issues occur:

1. Revert to previous version
2. User data remains safe (legacy keys preserved)
3. Report issue on GitHub

---

## 13. Timeline

| Date | Action |
|------|--------|
| 2026-01-03 | Phase 1: High-risk renames completed |
| 2026-01-03 | Phase 2: React component renames completed |
| Pending | Phase 3: Type aliases and function exports (requires deprecation strategy) |
| TBD | Release with breaking changes |

---

## 14. Questions or Issues?

If you encounter problems after updating:

1. Check this document for migration guidance
2. Review the [Branding Audit](./sensitive-branding-audit.md) for technical details
3. Open an issue on GitHub with:
   - Description of the problem
   - Console errors (if any)
   - Steps to reproduce

---

**Document Version:** 1.0
**Last Updated:** 2026-01-03
**Authored By:** Claude (System Architect)
