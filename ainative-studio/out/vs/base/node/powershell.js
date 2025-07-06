/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as os from 'os';
import * as path from '../common/path.js';
import * as pfs from './pfs.js';
// This is required, since parseInt("7-preview") will return 7.
const IntRegex = /^\d+$/;
const PwshMsixRegex = /^Microsoft.PowerShell_.*/;
const PwshPreviewMsixRegex = /^Microsoft.PowerShellPreview_.*/;
var Arch;
(function (Arch) {
    Arch[Arch["x64"] = 0] = "x64";
    Arch[Arch["x86"] = 1] = "x86";
    Arch[Arch["ARM"] = 2] = "ARM";
})(Arch || (Arch = {}));
let processArch;
switch (process.arch) {
    case 'ia32':
        processArch = 1 /* Arch.x86 */;
        break;
    case 'arm':
    case 'arm64':
        processArch = 2 /* Arch.ARM */;
        break;
    default:
        processArch = 0 /* Arch.x64 */;
        break;
}
/*
Currently, here are the values for these environment variables on their respective archs:

On x86 process on x86:
PROCESSOR_ARCHITECTURE is X86
PROCESSOR_ARCHITEW6432 is undefined

On x86 process on x64:
PROCESSOR_ARCHITECTURE is X86
PROCESSOR_ARCHITEW6432 is AMD64

On x64 process on x64:
PROCESSOR_ARCHITECTURE is AMD64
PROCESSOR_ARCHITEW6432 is undefined

On ARM process on ARM:
PROCESSOR_ARCHITECTURE is ARM64
PROCESSOR_ARCHITEW6432 is undefined

On x86 process on ARM:
PROCESSOR_ARCHITECTURE is X86
PROCESSOR_ARCHITEW6432 is ARM64

On x64 process on ARM:
PROCESSOR_ARCHITECTURE is ARM64
PROCESSOR_ARCHITEW6432 is undefined
*/
let osArch;
if (process.env['PROCESSOR_ARCHITEW6432']) {
    osArch = process.env['PROCESSOR_ARCHITEW6432'] === 'ARM64'
        ? 2 /* Arch.ARM */
        : 0 /* Arch.x64 */;
}
else if (process.env['PROCESSOR_ARCHITECTURE'] === 'ARM64') {
    osArch = 2 /* Arch.ARM */;
}
else if (process.env['PROCESSOR_ARCHITECTURE'] === 'X86') {
    osArch = 1 /* Arch.x86 */;
}
else {
    osArch = 0 /* Arch.x64 */;
}
class PossiblePowerShellExe {
    constructor(exePath, displayName, knownToExist) {
        this.exePath = exePath;
        this.displayName = displayName;
        this.knownToExist = knownToExist;
    }
    async exists() {
        if (this.knownToExist === undefined) {
            this.knownToExist = await pfs.SymlinkSupport.existsFile(this.exePath);
        }
        return this.knownToExist;
    }
}
function getProgramFilesPath({ useAlternateBitness = false } = {}) {
    if (!useAlternateBitness) {
        // Just use the native system bitness
        return process.env.ProgramFiles || null;
    }
    // We might be a 64-bit process looking for 32-bit program files
    if (processArch === 0 /* Arch.x64 */) {
        return process.env['ProgramFiles(x86)'] || null;
    }
    // We might be a 32-bit process looking for 64-bit program files
    if (osArch === 0 /* Arch.x64 */) {
        return process.env.ProgramW6432 || null;
    }
    // We're a 32-bit process on 32-bit Windows, there is no other Program Files dir
    return null;
}
async function findPSCoreWindowsInstallation({ useAlternateBitness = false, findPreview = false } = {}) {
    const programFilesPath = getProgramFilesPath({ useAlternateBitness });
    if (!programFilesPath) {
        return null;
    }
    const powerShellInstallBaseDir = path.join(programFilesPath, 'PowerShell');
    // Ensure the base directory exists
    if (!await pfs.SymlinkSupport.existsDirectory(powerShellInstallBaseDir)) {
        return null;
    }
    let highestSeenVersion = -1;
    let pwshExePath = null;
    for (const item of await pfs.Promises.readdir(powerShellInstallBaseDir)) {
        let currentVersion = -1;
        if (findPreview) {
            // We are looking for something like "7-preview"
            // Preview dirs all have dashes in them
            const dashIndex = item.indexOf('-');
            if (dashIndex < 0) {
                continue;
            }
            // Verify that the part before the dash is an integer
            // and that the part after the dash is "preview"
            const intPart = item.substring(0, dashIndex);
            if (!IntRegex.test(intPart) || item.substring(dashIndex + 1) !== 'preview') {
                continue;
            }
            currentVersion = parseInt(intPart, 10);
        }
        else {
            // Search for a directory like "6" or "7"
            if (!IntRegex.test(item)) {
                continue;
            }
            currentVersion = parseInt(item, 10);
        }
        // Ensure we haven't already seen a higher version
        if (currentVersion <= highestSeenVersion) {
            continue;
        }
        // Now look for the file
        const exePath = path.join(powerShellInstallBaseDir, item, 'pwsh.exe');
        if (!await pfs.SymlinkSupport.existsFile(exePath)) {
            continue;
        }
        pwshExePath = exePath;
        highestSeenVersion = currentVersion;
    }
    if (!pwshExePath) {
        return null;
    }
    const bitness = programFilesPath.includes('x86') ? ' (x86)' : '';
    const preview = findPreview ? ' Preview' : '';
    return new PossiblePowerShellExe(pwshExePath, `PowerShell${preview}${bitness}`, true);
}
async function findPSCoreMsix({ findPreview } = {}) {
    // We can't proceed if there's no LOCALAPPDATA path
    if (!process.env.LOCALAPPDATA) {
        return null;
    }
    // Find the base directory for MSIX application exe shortcuts
    const msixAppDir = path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WindowsApps');
    if (!await pfs.SymlinkSupport.existsDirectory(msixAppDir)) {
        return null;
    }
    // Define whether we're looking for the preview or the stable
    const { pwshMsixDirRegex, pwshMsixName } = findPreview
        ? { pwshMsixDirRegex: PwshPreviewMsixRegex, pwshMsixName: 'PowerShell Preview (Store)' }
        : { pwshMsixDirRegex: PwshMsixRegex, pwshMsixName: 'PowerShell (Store)' };
    // We should find only one such application, so return on the first one
    for (const subdir of await pfs.Promises.readdir(msixAppDir)) {
        if (pwshMsixDirRegex.test(subdir)) {
            const pwshMsixPath = path.join(msixAppDir, subdir, 'pwsh.exe');
            return new PossiblePowerShellExe(pwshMsixPath, pwshMsixName);
        }
    }
    // If we find nothing, return null
    return null;
}
function findPSCoreDotnetGlobalTool() {
    const dotnetGlobalToolExePath = path.join(os.homedir(), '.dotnet', 'tools', 'pwsh.exe');
    return new PossiblePowerShellExe(dotnetGlobalToolExePath, '.NET Core PowerShell Global Tool');
}
function findPSCoreScoopInstallation() {
    const scoopAppsDir = path.join(os.homedir(), 'scoop', 'apps');
    const scoopPwsh = path.join(scoopAppsDir, 'pwsh', 'current', 'pwsh.exe');
    return new PossiblePowerShellExe(scoopPwsh, 'PowerShell (Scoop)');
}
function findWinPS() {
    const winPSPath = path.join(process.env.windir, processArch === 1 /* Arch.x86 */ && osArch !== 1 /* Arch.x86 */ ? 'SysNative' : 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    return new PossiblePowerShellExe(winPSPath, 'Windows PowerShell', true);
}
/**
 * Iterates through all the possible well-known PowerShell installations on a machine.
 * Returned values may not exist, but come with an .exists property
 * which will check whether the executable exists.
 */
async function* enumerateDefaultPowerShellInstallations() {
    // Find PSCore stable first
    let pwshExe = await findPSCoreWindowsInstallation();
    if (pwshExe) {
        yield pwshExe;
    }
    // Windows may have a 32-bit pwsh.exe
    pwshExe = await findPSCoreWindowsInstallation({ useAlternateBitness: true });
    if (pwshExe) {
        yield pwshExe;
    }
    // Also look for the MSIX/UWP installation
    pwshExe = await findPSCoreMsix();
    if (pwshExe) {
        yield pwshExe;
    }
    // Look for the .NET global tool
    // Some older versions of PowerShell have a bug in this where startup will fail,
    // but this is fixed in newer versions
    pwshExe = findPSCoreDotnetGlobalTool();
    if (pwshExe) {
        yield pwshExe;
    }
    // Look for PSCore preview
    pwshExe = await findPSCoreWindowsInstallation({ findPreview: true });
    if (pwshExe) {
        yield pwshExe;
    }
    // Find a preview MSIX
    pwshExe = await findPSCoreMsix({ findPreview: true });
    if (pwshExe) {
        yield pwshExe;
    }
    // Look for pwsh-preview with the opposite bitness
    pwshExe = await findPSCoreWindowsInstallation({ useAlternateBitness: true, findPreview: true });
    if (pwshExe) {
        yield pwshExe;
    }
    pwshExe = await findPSCoreScoopInstallation();
    if (pwshExe) {
        yield pwshExe;
    }
    // Finally, get Windows PowerShell
    pwshExe = findWinPS();
    if (pwshExe) {
        yield pwshExe;
    }
}
/**
 * Iterates through PowerShell installations on the machine according
 * to configuration passed in through the constructor.
 * PowerShell items returned by this object are verified
 * to exist on the filesystem.
 */
export async function* enumeratePowerShellInstallations() {
    // Get the default PowerShell installations first
    for await (const defaultPwsh of enumerateDefaultPowerShellInstallations()) {
        if (await defaultPwsh.exists()) {
            yield defaultPwsh;
        }
    }
}
/**
* Returns the first available PowerShell executable found in the search order.
*/
export async function getFirstAvailablePowerShellInstallation() {
    for await (const pwsh of enumeratePowerShellInstallations()) {
        return pwsh;
    }
    return null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG93ZXJzaGVsbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9ub2RlL3Bvd2Vyc2hlbGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQztBQUMxQyxPQUFPLEtBQUssR0FBRyxNQUFNLFVBQVUsQ0FBQztBQUVoQywrREFBK0Q7QUFDL0QsTUFBTSxRQUFRLEdBQVcsT0FBTyxDQUFDO0FBRWpDLE1BQU0sYUFBYSxHQUFXLDBCQUEwQixDQUFDO0FBQ3pELE1BQU0sb0JBQW9CLEdBQVcsaUNBQWlDLENBQUM7QUFFdkUsSUFBVyxJQUlWO0FBSkQsV0FBVyxJQUFJO0lBQ2QsNkJBQUcsQ0FBQTtJQUNILDZCQUFHLENBQUE7SUFDSCw2QkFBRyxDQUFBO0FBQ0osQ0FBQyxFQUpVLElBQUksS0FBSixJQUFJLFFBSWQ7QUFFRCxJQUFJLFdBQWlCLENBQUM7QUFDdEIsUUFBUSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDdEIsS0FBSyxNQUFNO1FBQ1YsV0FBVyxtQkFBVyxDQUFDO1FBQ3ZCLE1BQU07SUFDUCxLQUFLLEtBQUssQ0FBQztJQUNYLEtBQUssT0FBTztRQUNYLFdBQVcsbUJBQVcsQ0FBQztRQUN2QixNQUFNO0lBQ1A7UUFDQyxXQUFXLG1CQUFXLENBQUM7UUFDdkIsTUFBTTtBQUNSLENBQUM7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7RUEwQkU7QUFDRixJQUFJLE1BQVksQ0FBQztBQUNqQixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsRUFBRSxDQUFDO0lBQzNDLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLHdC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