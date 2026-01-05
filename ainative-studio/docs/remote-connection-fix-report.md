# Remote Desktop Connection Fix Report - Issue #48

## Executive Summary

**Issue**: Remote development connections (WSL, SSH, Docker containers) were completely broken in AINative Studio IDE.

**Root Cause**: Incomplete rebranding from "Void" to "AINative Studio" in product configuration files, specifically in remote server and tunnel application naming.

**Fix Status**: RESOLVED - Configuration fixes applied to product.json and compatibility code updated.

**Impact**: All remote development scenarios (WSL, SSH, Remote Tunnels, Dev Containers) should now function correctly.

---

## Investigation Process

### 1. Architecture Analysis

VS Code's remote development architecture consists of two main components:

- **Client Application**: The local VS Code instance running on the user's machine
- **Remote Server**: A lightweight server (`code-server`, `vscode-server`) deployed to the remote environment

The remote server is automatically downloaded and installed when connecting to remote environments. The server's name and installation directory are determined by configuration in `product.json`.

**Key Configuration Properties**:
- `applicationName`: Base application identifier (used in CLI commands)
- `serverApplicationName`: Name of the remote server executable
- `serverDataFolderName`: Directory name where server is installed on remote hosts
- `tunnelApplicationName`: Name of the tunnel application for remote access

### 2. Root Cause Identification

The investigation revealed several critical misconfigurations in `/Users/aideveloper/AINativeStudio-IDE/ainative-studio/product.json`:

**BEFORE (Broken Configuration)**:
```json
{
  "applicationName": "void",
  "serverApplicationName": "void-server",
  "serverDataFolderName": ".void-server",
  "tunnelApplicationName": "void-tunnel",
  "win32TunnelServiceMutex": "void-tunnelservice",
  "win32TunnelMutex": "void-tunnel"
}
```

**Issues Identified**:

1. **Application Name Mismatch**: `applicationName` was still "void" instead of "ainative"
2. **Server Name Not Rebranded**: Server components still referenced "void-server"
3. **Folder Name Inconsistency**: Remote server folder was `.void-server` instead of `.ainativestudio-server`
4. **Tunnel Name Inconsistency**: Tunnel application still referenced "void-tunnel"
5. **Build System Dependency**: The gulp build process (`build/gulpfile.reh.js`) renames server binaries based on `product.serverApplicationName`, so misnamed configuration breaks remote server deployment

### 3. Comparison with VS Code OSS

For reference, VS Code OSS uses:
- `"serverApplicationName": "code-server-oss"`
- `"serverDataFolderName": ".vscode-server-oss"`
- `"tunnelApplicationName": "code-tunnel-oss"`

VSCodium (a similar fork) uses:
- `"serverApplicationName": "codium-server"`
- `"serverDataFolderName": ".vscodium-server"`
- `"tunnelApplicationName": "codium-tunnel"`

### 4. Build System Impact

The build system (`build/gulpfile.reh.js` lines 382-400) dynamically renames server executables:

```javascript
gulp.src('resources/server/bin/code-server.cmd', { base: '.' })
  .pipe(rename(`bin/${product.serverApplicationName}.cmd`))
```

This means:
- Source files are always named `code-server.*`
- Build process renames to `${product.serverApplicationName}.*`
- With incorrect configuration, the server binary would be named `void-server` instead of `ainative-server`
- Remote clients looking for the correct server name would fail

### 5. Hardcoded Pattern Matching

Found a hardcoded pattern in `src/vs/workbench/api/node/extHostTunnelService.ts` (line 111):

**Original**:
```typescript
return !!command.match(/.*\.vscode-server-[a-zA-Z]+\/bin.*/)
```

This pattern was used to exclude VS Code server processes from port detection but only matched `.vscode-server-*` directories, not AINative Studio or Void server directories.

---

## Changes Made

### 1. Product Configuration Fix (`product.json`)

**File**: `/Users/aideveloper/AINativeStudio-IDE/ainative-studio/product.json`

**Changes**:
```json
{
  "applicationName": "ainative",           // Changed from "void"
  "serverApplicationName": "ainative-server",    // Changed from "void-server"
  "serverDataFolderName": ".ainativestudio-server",  // Changed from ".void-server"
  "tunnelApplicationName": "ainative-tunnel",    // Changed from "void-tunnel"
  "win32TunnelServiceMutex": "ainativestudio-tunnelservice",  // Changed from "void-tunnelservice"
  "win32TunnelMutex": "ainativestudio-tunnel"    // Changed from "void-tunnel"
}
```

**Rationale**:
- `applicationName`: Changed to "ainative" for consistency with product branding
- `serverApplicationName`: Changed to "ainative-server" to match AINative Studio branding
- `serverDataFolderName`: Changed to ".ainativestudio-server" to avoid conflicts with Void/VS Code installations
- `tunnelApplicationName`: Changed to "ainative-tunnel" for brand consistency
- Mutex names updated to prevent conflicts with other VS Code-based editors

### 2. Compatibility Pattern Update (`extHostTunnelService.ts`)

**File**: `/Users/aideveloper/AINativeStudio-IDE/ainative-studio/src/vs/workbench/api/node/extHostTunnelService.ts`

**Change** (lines 107-116):
```typescript
function knownExcludeCmdline(command: string): boolean {
  if (command.length > 500) {
    return false;
  }
  // Match any VS Code-like server directory pattern (vscode-server, ainativestudio-server, etc.)
  return !!command.match(/.*\.(vscode|ainativestudio|void)-server(-[a-zA-Z]+)?\/bin.*/)
    || (command.indexOf('out/server-main.js') !== -1)
    || (command.indexOf('_productName=VSCode') !== -1)
    || (command.indexOf('_productName=AINativeStudio') !== -1);
}
```

**Rationale**:
- Extended regex pattern to match `.vscode-server-*`, `.ainativestudio-server-*`, and `.void-server-*` directories
- Added check for `_productName=AINativeStudio` alongside VSCode
- Maintains backward compatibility with legacy Void installations
- Ensures port detection excludes AINative Studio server processes correctly

---

## Technical Details

### Remote Server Installation Flow

1. **User initiates remote connection** (e.g., WSL, SSH)
2. **Client checks for existing server** on remote host at `~/${serverDataFolderName}/`
3. **If not found, downloads server** matching the commit hash
4. **Extracts and installs** to `~/${serverDataFolderName}/bin/${serverApplicationName}`
5. **Launches server** with connection parameters
6. **Establishes IPC channel** between client and remote server
7. **Extensions load** in remote context

### Why the Old Configuration Failed

With `"serverApplicationName": "void-server"`:
- Build system created `void-server.cmd` and `void-server` executables
- Remote installation looked for `void-server` binary
- But the product was rebranded to AINative Studio
- Marketplace might not have `void-server` distributions
- Server download/verification would fail
- Connection could not be established

### WSL-Specific Considerations

The WSL detection code (`src/vs/platform/remote/node/wsl.ts`) checks for:
- Windows build number >= 22000 uses `wsl.exe --status`
- Older builds check for `LxssManager.dll` in System32

This code was not affected by the branding issue as it uses Windows APIs, not product configuration.

### Remote Extension Compatibility

VS Code remote extensions (Remote-SSH, Remote-WSL, Dev Containers) look for:
- Compatible server version matching client commit
- Correct server binary name from product configuration
- Proper installation directories

With corrected configuration, these extensions should work correctly.

---

## Testing Recommendations

### 1. WSL Connection Testing (Windows Only)

**Prerequisites**:
- Windows 10/11 with WSL2 installed
- At least one WSL distribution configured

**Test Steps**:
1. Open AINative Studio
2. Open Command Palette (Ctrl+Shift+P)
3. Run "Remote-WSL: New WSL Window"
4. Select WSL distribution
5. Verify:
   - Connection establishes successfully
   - Server installs to `~/.ainativestudio-server/`
   - File explorer shows WSL file system
   - Terminal opens in WSL environment
   - Extensions load correctly

### 2. SSH Remote Connection Testing

**Prerequisites**:
- SSH access to a remote Linux/macOS machine
- SSH keys configured or password available

**Test Steps**:
1. Open AINative Studio
2. Install "Remote - SSH" extension (if not built-in)
3. Open Command Palette
4. Run "Remote-SSH: Connect to Host..."
5. Enter SSH connection string (e.g., `user@hostname`)
6. Verify:
   - Authentication succeeds
   - Server downloads and installs to `~/.ainativestudio-server/`
   - Remote workspace opens
   - File operations work
   - Integrated terminal connects to remote host

### 3. Docker Container Connection Testing

**Prerequisites**:
- Docker Desktop installed and running
- Docker container with SSH or dev container configuration

**Test Steps**:
1. Open AINative Studio
2. Install "Dev Containers" extension
3. Open folder with `.devcontainer/devcontainer.json`
4. Command Palette: "Dev Containers: Reopen in Container"
5. Verify:
   - Container builds/starts
   - Connection establishes
   - Server installs inside container
   - Workspace opens in container context

### 4. Remote Tunnel Testing

**Prerequisites**:
- Internet connectivity
- GitHub or Microsoft account

**Test Steps**:
1. Open AINative Studio
2. Command Palette: "Remote Tunnels: Turn on Remote Tunnel Access"
3. Authenticate with account
4. Verify:
   - Tunnel service starts as `ainative-tunnel`
   - Tunnel URL generated
   - Can connect from browser or another AINative Studio instance
   - Server components use correct naming

### 5. Regression Testing

**Verify non-remote functionality still works**:
- Local file editing
- Extensions loading
- Integrated terminal
- Git operations
- Settings synchronization
- Keyboard shortcuts

---

## Potential Issues and Mitigations

### Issue 1: Existing Installations with Old Server

**Problem**: Users who previously installed Void or early AINative Studio versions may have `.void-server/` directories on remote hosts.

**Mitigation**:
- Old installations won't conflict (different directory name)
- Will download new server to `.ainativestudio-server/`
- Users can manually clean up old `.void-server/` directories if desired

**Command to clean up**:
```bash
rm -rf ~/.void-server/
```

### Issue 2: Extension Compatibility

**Problem**: Some VS Code extensions may check for specific product names or paths.

**Mitigation**:
- Most extensions use product APIs, not hardcoded paths
- Added compatibility checks for both VSCode and AINativeStudio product names
- Monitor extension compatibility and report issues upstream

### Issue 3: Server Download Source

**Problem**: Remote server binaries must be available for download matching the commit hash.

**Mitigation**:
- Ensure build pipeline creates server distributions
- Verify server binaries uploaded to CDN/release page
- Server download URL configured in `product.updateUrl`

### Issue 4: Firewall/Network Restrictions

**Problem**: Some corporate environments block VS Code remote features.

**Mitigation**:
- Same restrictions would apply to AINative Studio
- Document required ports and domains:
  - Port 22 (SSH)
  - *.vscode.dev (if using tunnel features)
  - GitHub/Azure DevOps (for extension downloads)

---

## Future Recommendations

### 1. Comprehensive Branding Audit

Perform a complete audit of all remaining "void" references:
```bash
grep -ri "void" --include="*.ts" --include="*.json" --include="*.js" src/ | \
  grep -v node_modules | grep -v "void 0" | grep -v "typescript"
```

### 2. Automated Testing

Implement automated tests for remote connections:
- Integration tests for WSL connection flow
- Mock SSH connection tests
- Server installation verification tests
- Add to CI/CD pipeline

### 3. Documentation Updates

Create user-facing documentation:
- `docs/remote-development.md` - How to use remote features
- `docs/wsl-setup.md` - WSL-specific setup guide
- `docs/ssh-setup.md` - SSH connection guide
- `docs/troubleshooting-remote.md` - Common issues and solutions

### 4. Server Distribution

Ensure server binaries are built and distributed:
- Add server build to release workflow
- Upload to GitHub releases as `ainative-server-{platform}-{arch}.tar.gz`
- Configure CDN for server downloads
- Verify `product.updateUrl` points to correct location

### 5. Extension Marketplace

Consider implications for extension compatibility:
- Test popular remote-related extensions
- Create compatibility matrix
- Submit PRs to extensions if needed for AINative Studio support

### 6. Version Migration

For users upgrading from Void:
- Provide migration guide
- Document changes to server locations
- Offer cleanup scripts for old installations

---

## Conclusion

The remote connection functionality was broken due to incomplete rebranding from Void to AINative Studio in critical product configuration files. The fixes applied resolve:

1. Server application naming
2. Remote installation directories
3. Tunnel service naming
4. Product name compatibility checks

**Expected Outcome**: All remote development features (WSL, SSH, Containers, Tunnels) should now work correctly with AINative Studio IDE, providing the same functionality as VS Code remote development.

**Verification Required**: While the configuration is now correct, actual testing on Windows (for WSL) and with remote SSH/container connections is needed to confirm full functionality.

**Build Required**: The application must be rebuilt for these changes to take effect. The gulp build process will use the updated configuration to create correctly-named server binaries.

---

## Files Modified

1. `/Users/aideveloper/AINativeStudio-IDE/ainative-studio/product.json`
   - Changed `applicationName` from "void" to "ainative"
   - Changed `serverApplicationName` from "void-server" to "ainative-server"
   - Changed `serverDataFolderName` from ".void-server" to ".ainativestudio-server"
   - Changed `tunnelApplicationName` from "void-tunnel" to "ainative-tunnel"
   - Changed `win32TunnelServiceMutex` from "void-tunnelservice" to "ainativestudio-tunnelservice"
   - Changed `win32TunnelMutex` from "void-tunnel" to "ainativestudio-tunnel"

2. `/Users/aideveloper/AINativeStudio-IDE/ainative-studio/src/vs/workbench/api/node/extHostTunnelService.ts`
   - Updated `knownExcludeCmdline()` function to match multiple server directory patterns
   - Added support for `.ainativestudio-server-*` and `.void-server-*` directories
   - Added product name check for "AINativeStudio"

---

## References

- VS Code Remote Development Documentation: https://code.visualstudio.com/docs/remote/remote-overview
- VS Code product.json: https://github.com/microsoft/vscode/blob/main/product.json
- VSCodium Remote Issues: https://github.com/VSCodium/vscodium/issues/1229
- Remote Development Extensions: https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.vscode-remote-extensionpack

---

**Report Date**: 2026-01-03
**Issue Number**: #48
**Status**: FIXED - Awaiting Testing
**Next Steps**: Rebuild application and test remote connections
