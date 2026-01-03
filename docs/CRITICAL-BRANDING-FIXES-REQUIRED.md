# CRITICAL BRANDING FIXES REQUIRED

**Status**: ❌ BLOCKING PRODUCTION RELEASE
**Severity**: CRITICAL
**Estimated Fix Time**: 30 minutes
**Issue Reference**: #15 - Platform Build Verification

---

## Issue Summary

The `product.json` file contains **7 critical branding issues** where Void Editor references remain. These will cause:
- User confusion (app stores data in `.void-editor/` folder)
- OS-level misbranding (taskbar, activity monitor show "Void")
- Potential conflicts with actual Void Editor installations
- Professional credibility damage

---

## Required Changes to product.json

**File**: `/Users/aideveloper/AINativeStudio-IDE/ainative-studio/product.json`

### Change #1: Data Folder Name
```json
// BEFORE:
"dataFolderName": ".void-editor",

// AFTER:
"dataFolderName": ".ainativestudio",
```

### Change #2: Windows Mutex Name
```json
// BEFORE:
"win32MutexName": "voideditor",

// AFTER:
"win32MutexName": "ainativestudio",
```

### Change #3: Windows Registry Value
```json
// BEFORE:
"win32RegValueName": "VoidEditor",

// AFTER:
"win32RegValueName": "AINativeStudio",
```

### Change #4: Windows App User Model ID
```json
// BEFORE:
"win32AppUserModelId": "Void.Editor",

// AFTER:
"win32AppUserModelId": "AINativeStudio.IDE",
```

### Change #5: macOS Bundle Identifier
```json
// BEFORE:
"darwinBundleIdentifier": "com.voideditor.code",

// AFTER:
"darwinBundleIdentifier": "com.ainativestudio.code",
```

### Change #6: Linux Icon Name
```json
// BEFORE:
"linuxIconName": "void-editor",

// AFTER:
"linuxIconName": "ainativestudio",
```

### Change #7: URL Protocol Handler
```json
// BEFORE:
"urlProtocol": "void",

// AFTER:
"urlProtocol": "ainativestudio",
```

---

## Complete Fixed Section

Replace lines 6-34 in product.json with:

```json
	"applicationName": "void",
	"dataFolderName": ".ainativestudio",
	"win32MutexName": "ainativestudio",
	"licenseName": "MIT",
	"licenseUrl": "https://github.com/AINative-Studio/AINativeStudio-IDE/blob/main/LICENSE.txt",
	"serverLicenseUrl": "https://github.com/AINative-Studio/AINativeStudio-IDE/blob/main/LICENSE.txt",
	"serverGreeting": [],
	"serverLicense": [],
	"serverLicensePrompt": "",
	"serverApplicationName": "void-server",
	"serverDataFolderName": ".void-server",
	"tunnelApplicationName": "void-tunnel",
	"win32DirName": "AINative Studio",
	"win32NameVersion": "AINative Studio",
	"win32RegValueName": "AINativeStudio",
	"win32x64AppId": "{{9D394D01-1728-45A7-B997-A6C82C5452C3}",
	"win32arm64AppId": "{{0668DD58-2BDE-4101-8CDA-40252DF8875D}",
	"win32x64UserAppId": "{{8BED5DC1-6C55-46E6-9FE6-18F7E6F7C7F1}",
	"win32arm64UserAppId": "{{F6C87466-BC82-4A8F-B0FF-18CA366BA4D8}",
	"win32AppUserModelId": "AINativeStudio.IDE",
	"win32ShellNameShort": "AINative &Studio",
	"win32TunnelServiceMutex": "void-tunnelservice",
	"win32TunnelMutex": "void-tunnel",
	"darwinBundleIdentifier": "com.ainativestudio.code",
	"linuxIconName": "ainativestudio",
	"licenseFileName": "LICENSE.txt",
	"reportIssueUrl": "https://github.com/AINative-Studio/AINativeStudio-IDE/issues/new",
	"nodejsRepository": "https://nodejs.org",
	"urlProtocol": "ainativestudio",
```

---

## Additional Extension Fixes

### File: `extensions/open-remote-ssh/package.json`

**Line 4** - Change publisher:
```json
// BEFORE:
"publisher": "voideditor",

// AFTER:
"publisher": "ainativestudio",
```

**Line 74** - Change binary URL (requires hosting infrastructure):
```json
// BEFORE:
"default": "https://github.com/voideditor/binaries/releases/download/${version}/void-reh-${os}-${arch}-${version}.tar.gz"

// AFTER:
"default": "https://github.com/AINative-Studio/binaries/releases/download/${version}/ainative-reh-${os}-${arch}-${version}.tar.gz"
```

### File: `extensions/open-remote-wsl/package.json`

**Line 41** - Change binary URL:
```json
// BEFORE:
"default": "https://github.com/voideditor/binaries/releases/download/${version}/void-reh-${os}-${arch}-${version}.tar.gz"

// AFTER:
"default": "https://github.com/AINative-Studio/binaries/releases/download/${version}/ainative-reh-${os}-${arch}-${version}.tar.gz"
```

---

## Verification Steps

After making changes:

1. **Verify Changes**:
   ```bash
   cd ainative-studio
   grep -n "void-editor\|voideditor\|VoidEditor\|Void.Editor" product.json
   # Should return NO results
   ```

2. **Run Branding Tests**:
   ```bash
   npm run compile
   npm run test-node
   # All tests should pass
   ```

3. **Test Build**:
   ```bash
   # Pick one platform to test
   npm run gulp vscode-darwin-arm64  # macOS
   # OR
   npm run gulp vscode-win32-x64     # Windows
   # OR
   npm run gulp vscode-linux-x64     # Linux
   ```

4. **Verify Build Output**:
   - Check application name in build output
   - Verify no "Void" references in packaged files
   - Test application launches

---

## Migration Considerations

⚠️ **IMPORTANT**: Changing `dataFolderName` will affect existing users:

**Old**: `~/.void-editor/` (or `%APPDATA%\.void-editor` on Windows)
**New**: `~/.ainativestudio/`

**Options**:
1. **Clean Break**: Users start fresh (lose settings)
2. **Migration Script**: Automatically copy settings on first launch
3. **Manual Migration**: Document how users can copy settings

**Recommendation**: Implement migration script that:
- Detects old `.void-editor` folder
- Asks user permission to migrate
- Copies settings and extensions
- Marks migration complete

---

## Impact Analysis

### Without Fix:
- ❌ Users will see "Void.Editor" in Windows taskbar
- ❌ macOS Activity Monitor shows "com.voideditor.code"
- ❌ Settings stored in confusing `.void-editor` folder
- ❌ May conflict with actual Void Editor installations
- ❌ URL protocol uses `void://` scheme
- ❌ Professional branding inconsistency

### With Fix:
- ✅ Consistent "AINativeStudio" branding everywhere
- ✅ Unique application identifiers
- ✅ No conflicts with Void Editor
- ✅ Professional, polished user experience
- ✅ Correct protocol handler `ainativestudio://`

---

## Timeline

- **Fix Implementation**: 30 minutes
- **Testing**: 2 hours
- **Full Build & Verification**: 4 hours
- **Total**: ~6-7 hours

**Recommendation**: Fix immediately before any production release.

---

**Created**: 2026-01-02
**Priority**: CRITICAL
**Blocking**: Production release
