# Semantic Standards Migration Report

**Date:** 2026-01-03
**Issue:** #27
**Task:** Update semantic standards and file naming conventions

## Summary

This migration updates the AINative Studio codebase to use consistent terminology and file naming conventions that align with the AINative brand. The changes replace "Void" terminology with "AINative" terminology for rules files and UI labels.

## Changes Completed

### 1. File Renaming

**Rules Files (.voidrules → .ainativerules)**

| Old Path | New Path | Status |
|----------|----------|--------|
| `/ainative-studio/.voidrules` | `/ainative-studio/.ainativerules` | ✅ Renamed |

### 2. Code References Updated

**Source Files Modified:**

1. **Settings.tsx**
   - File: `/src/vs/workbench/contrib/ainative/browser/react/src/ainative-settings-tsx/Settings.tsx`
   - Line 1544: Changed comment from `{/* AI Instructions section */}` to `{/* Global Rules section */}`
   - Line 1546: Changed heading from `AI Instructions` to `Global Rules`
   - Line 1550: Updated file reference from `.voidrules` to `.ainativerules`

2. **SidebarChat.tsx**
   - File: `/src/vs/workbench/contrib/ainative/browser/react/src/sidebar-tsx/SidebarChat.tsx`
   - Line 3100: Updated suggested prompt from `'Create a .voidrules file for me'` to `'Create a .ainativerules file for me'`

3. **convertToLLMMessageWorkbenchContrib.ts**
   - File: `/src/vs/workbench/contrib/ainative/browser/convertToLLMMessageWorkbenchContrib.ts`
   - Line 24: Updated file path from `.voidrules` to `.ainativerules`

4. **convertToLLMMessageService.ts**
   - File: `/src/vs/workbench/contrib/ainative/browser/convertToLLMMessageService.ts`
   - Line 274: Updated system message text from `GUIDELINES (from the user's .voidrules file)` to `GUIDELINES (from the user's .ainativerules file)`
   - Line 548: Updated comment from `Read .voidrules files` to `Read .ainativerules files`
   - Line 554: Updated file path from `.voidrules` to `.ainativerules`
   - Line 566: Updated comment from `Get combined AI instructions from settings and .voidrules files` to `Get combined AI instructions from settings and .ainativerules files`

### 3. Terminology Updates

**"AI Instructions" → "Global Rules"**

All instances of "AI Instructions" in user-facing UI elements have been updated to "Global Rules":

- Settings page heading
- Settings page descriptions
- UI comments

### 4. Build Artifacts

**Note:** The following compiled files in the `/out` directory contain references to `.voidrules`:
- `/out/vs/workbench/contrib/ainative/browser/react/out/sidebar-tsx/index.js`
- `/out/vs/workbench/contrib/ainative/browser/react/out/ainative-settings-tsx/index.js`
- `/out/vs/workbench/contrib/ainative/browser/react/src/sidebar-tsx/SidebarChat.tsx`
- `/out/vs/workbench/contrib/ainative/browser/react/src/ainative-settings-tsx/Settings.tsx`
- `/out/vs/workbench/contrib/ainative/browser/react/src2/sidebar-tsx/SidebarChat.tsx`
- `/out/vs/workbench/contrib/ainative/browser/react/src2/ainative-settings-tsx/Settings.tsx`

**These files will be automatically regenerated** when running:
```bash
npm run buildreact
```

## Breaking Changes

### User Impact

**Migration Required for Users:**

Users with existing `.voidrules` files in their workspaces will need to rename them to `.ainativerules`. The IDE will no longer automatically detect `.voidrules` files.

**Migration Steps for End Users:**
1. Locate any `.voidrules` files in your workspace root directories
2. Rename them to `.ainativerules`
3. The content remains the same - only the filename changes

### Developer Impact

**For Contributors:**

Any code that references `.voidrules` files should now use `.ainativerules`. This includes:
- File watchers
- File creation utilities
- Documentation
- Example code

## Verification Checklist

- [✅] All `.voidrules` files renamed to `.ainativerules`
- [✅] All source code references updated
- [✅] All "AI Instructions" labels changed to "Global Rules"
- [✅] Migration report created
- [⏳] React build artifacts regenerated (requires `npm run buildreact`)
- [⏳] Full compilation test (requires `npm run compile`)
- [⏳] Manual UI verification
- [⏳] End-to-end testing

## Next Steps

### For Development Team:

1. **Rebuild React Components:**
   ```bash
   cd ainative-studio
   npm run buildreact
   ```

2. **Full Compilation:**
   ```bash
   npm run compile
   ```

3. **Test the Changes:**
   ```bash
   ./scripts/code.sh
   ```
   - Open Settings (verify "Global Rules" heading appears)
   - Create a new `.ainativerules` file in a workspace
   - Verify the file is detected and loaded
   - Check suggested prompts in chat sidebar

4. **User Communication:**
   - Add migration notice to release notes
   - Update documentation to reference `.ainativerules`
   - Consider adding deprecation warning for old `.voidrules` files

## Files Summary

**Total Files Modified:** 4 source files
**Total Files Renamed:** 1 rules file
**Total Text Replacements:** ~10 instances

### Files Modified (Source):
1. `/src/vs/workbench/contrib/ainative/browser/react/src/ainative-settings-tsx/Settings.tsx`
2. `/src/vs/workbench/contrib/ainative/browser/react/src/sidebar-tsx/SidebarChat.tsx`
3. `/src/vs/workbench/contrib/ainative/browser/convertToLLMMessageWorkbenchContrib.ts`
4. `/src/vs/workbench/contrib/ainative/browser/convertToLLMMessageService.ts`

### Files to be Regenerated (Build):
1. `/out/vs/workbench/contrib/ainative/browser/react/out/sidebar-tsx/index.js`
2. `/out/vs/workbench/contrib/ainative/browser/react/out/ainative-settings-tsx/index.js`
3. Other compiled artifacts in `/out` directory

## Rollback Plan

If rollback is needed:

1. **Rename files back:**
   ```bash
   mv .ainativerules .voidrules
   ```

2. **Revert code changes:**
   ```bash
   git checkout HEAD -- src/vs/workbench/contrib/ainative/browser/
   ```

3. **Rebuild:**
   ```bash
   npm run buildreact && npm run compile
   ```

## Notes

- The internal function name `_getVoidRulesFileContents()` was kept unchanged to minimize refactoring scope
- All user-facing text and file references have been updated
- The change is backward-incompatible for users with existing `.voidrules` files
- No database migrations or data transformations required
- No API changes affecting external integrations

---

**Report Generated:** 2026-01-03
**Migration Status:** Complete - Pending Build & Testing
