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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG93ZXJzaGVsbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL25vZGUvcG93ZXJzaGVsbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQztBQUN6QixPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFDO0FBQzFDLE9BQU8sS0FBSyxHQUFHLE1BQU0sVUFBVSxDQUFDO0FBRWhDLCtEQUErRDtBQUMvRCxNQUFNLFFBQVEsR0FBVyxPQUFPLENBQUM7QUFFakMsTUFBTSxhQUFhLEdBQVcsMEJBQTBCLENBQUM7QUFDekQsTUFBTSxvQkFBb0IsR0FBVyxpQ0FBaUMsQ0FBQztBQUV2RSxJQUFXLElBSVY7QUFKRCxXQUFXLElBQUk7SUFDZCw2QkFBRyxDQUFBO0lBQ0gsNkJBQUcsQ0FBQTtJQUNILDZCQUFHLENBQUE7QUFDSixDQUFDLEVBSlUsSUFBSSxLQUFKLElBQUksUUFJZDtBQUVELElBQUksV0FBaUIsQ0FBQztBQUN0QixRQUFRLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUN0QixLQUFLLE1BQU07UUFDVixXQUFXLG1CQUFXLENBQUM7UUFDdkIsTUFBTTtJQUNQLEtBQUssS0FBSyxDQUFDO0lBQ1gsS0FBSyxPQUFPO1FBQ1gsV0FBVyxtQkFBVyxDQUFDO1FBQ3ZCLE1BQU07SUFDUDtRQUNDLFdBQVcsbUJBQVcsQ0FBQztRQUN2QixNQUFNO0FBQ1IsQ0FBQztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztFQTBCRTtBQUNGLElBQUksTUFBWSxDQUFDO0FBQ2pCLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLENBQUM7SUFDM0MsTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsS0FBSyxPQUFPO1FBQ3pELENBQUM7UUFDRCxDQUFDLGlCQUFTLENBQUM7QUFDYixDQUFDO0tBQU0sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLEtBQUssT0FBTyxFQUFFLENBQUM7SUFDOUQsTUFBTSxtQkFBVyxDQUFDO0FBQ25CLENBQUM7S0FBTSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsS0FBSyxLQUFLLEVBQUUsQ0FBQztJQUM1RCxNQUFNLG1CQUFXLENBQUM7QUFDbkIsQ0FBQztLQUFNLENBQUM7SUFDUCxNQUFNLG1CQUFXLENBQUM7QUFDbkIsQ0FBQztBQVdELE1BQU0scUJBQXFCO0lBQzFCLFlBQ2lCLE9BQWUsRUFDZixXQUFtQixFQUMzQixZQUFzQjtRQUZkLFlBQU8sR0FBUCxPQUFPLENBQVE7UUFDZixnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUMzQixpQkFBWSxHQUFaLFlBQVksQ0FBVTtJQUFJLENBQUM7SUFFN0IsS0FBSyxDQUFDLE1BQU07UUFDbEIsSUFBSSxJQUFJLENBQUMsWUFBWSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3JDLElBQUksQ0FBQyxZQUFZLEdBQUcsTUFBTSxHQUFHLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdkUsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztJQUMxQixDQUFDO0NBQ0Q7QUFFRCxTQUFTLG1CQUFtQixDQUMzQixFQUFFLG1CQUFtQixHQUFHLEtBQUssS0FBd0MsRUFBRTtJQUV2RSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUMxQixxQ0FBcUM7UUFDckMsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksSUFBSSxJQUFJLENBQUM7SUFDekMsQ0FBQztJQUVELGdFQUFnRTtJQUNoRSxJQUFJLFdBQVcscUJBQWEsRUFBRSxDQUFDO1FBQzlCLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLElBQUksQ0FBQztJQUNqRCxDQUFDO0lBRUQsZ0VBQWdFO0lBQ2hFLElBQUksTUFBTSxxQkFBYSxFQUFFLENBQUM7UUFDekIsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksSUFBSSxJQUFJLENBQUM7SUFDekMsQ0FBQztJQUVELGdGQUFnRjtJQUNoRixPQUFPLElBQUksQ0FBQztBQUNiLENBQUM7QUFFRCxLQUFLLFVBQVUsNkJBQTZCLENBQzNDLEVBQUUsbUJBQW1CLEdBQUcsS0FBSyxFQUFFLFdBQVcsR0FBRyxLQUFLLEtBQ1UsRUFBRTtJQUU5RCxNQUFNLGdCQUFnQixHQUFHLG1CQUFtQixDQUFDLEVBQUUsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDO0lBQ3RFLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELE1BQU0sd0JBQXdCLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUUzRSxtQ0FBbUM7SUFDbkMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUMsd0JBQXdCLENBQUMsRUFBRSxDQUFDO1FBQ3pFLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELElBQUksa0JBQWtCLEdBQVcsQ0FBQyxDQUFDLENBQUM7SUFDcEMsSUFBSSxXQUFXLEdBQWtCLElBQUksQ0FBQztJQUN0QyxLQUFLLE1BQU0sSUFBSSxJQUFJLE1BQU0sR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsd0JBQXdCLENBQUMsRUFBRSxDQUFDO1FBRXpFLElBQUksY0FBYyxHQUFXLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLElBQUksV0FBVyxFQUFFLENBQUM7WUFDakIsZ0RBQWdEO1lBRWhELHVDQUF1QztZQUN2QyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3BDLElBQUksU0FBUyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNuQixTQUFTO1lBQ1YsQ0FBQztZQUVELHFEQUFxRDtZQUNyRCxnREFBZ0Q7WUFDaEQsTUFBTSxPQUFPLEdBQVcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDckQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQzVFLFNBQVM7WUFDVixDQUFDO1lBRUQsY0FBYyxHQUFHLFFBQVEsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDeEMsQ0FBQzthQUFNLENBQUM7WUFDUCx5Q0FBeUM7WUFDekMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDMUIsU0FBUztZQUNWLENBQUM7WUFFRCxjQUFjLEdBQUcsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNyQyxDQUFDO1FBRUQsa0RBQWtEO1FBQ2xELElBQUksY0FBYyxJQUFJLGtCQUFrQixFQUFFLENBQUM7WUFDMUMsU0FBUztRQUNWLENBQUM7UUFFRCx3QkFBd0I7UUFDeEIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDdEUsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNuRCxTQUFTO1FBQ1YsQ0FBQztRQUVELFdBQVcsR0FBRyxPQUFPLENBQUM7UUFDdEIsa0JBQWtCLEdBQUcsY0FBYyxDQUFDO0lBQ3JDLENBQUM7SUFFRCxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDbEIsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsTUFBTSxPQUFPLEdBQVcsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUN6RSxNQUFNLE9BQU8sR0FBVyxXQUFXLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBRXRELE9BQU8sSUFBSSxxQkFBcUIsQ0FBQyxXQUFXLEVBQUUsYUFBYSxPQUFPLEdBQUcsT0FBTyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDdkYsQ0FBQztBQUVELEtBQUssVUFBVSxjQUFjLENBQUMsRUFBRSxXQUFXLEtBQWdDLEVBQUU7SUFDNUUsbURBQW1EO0lBQ25ELElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQy9CLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELDZEQUE2RDtJQUM3RCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLFdBQVcsRUFBRSxhQUFhLENBQUMsQ0FBQztJQUVuRixJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1FBQzNELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELDZEQUE2RDtJQUM3RCxNQUFNLEVBQUUsZ0JBQWdCLEVBQUUsWUFBWSxFQUFFLEdBQUcsV0FBVztRQUNyRCxDQUFDLENBQUMsRUFBRSxnQkFBZ0IsRUFBRSxvQkFBb0IsRUFBRSxZQUFZLEVBQUUsNEJBQTRCLEVBQUU7UUFDeEYsQ0FBQyxDQUFDLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxvQkFBb0IsRUFBRSxDQUFDO0lBRTNFLHVFQUF1RTtJQUN2RSxLQUFLLE1BQU0sTUFBTSxJQUFJLE1BQU0sR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztRQUM3RCxJQUFJLGdCQUFnQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ25DLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQztZQUMvRCxPQUFPLElBQUkscUJBQXFCLENBQUMsWUFBWSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQzlELENBQUM7SUFDRixDQUFDO0lBRUQsa0NBQWtDO0lBQ2xDLE9BQU8sSUFBSSxDQUFDO0FBQ2IsQ0FBQztBQUVELFNBQVMsMEJBQTBCO0lBQ2xDLE1BQU0sdUJBQXVCLEdBQVcsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQztJQUVoRyxPQUFPLElBQUkscUJBQXFCLENBQUMsdUJBQXVCLEVBQUUsa0NBQWtDLENBQUMsQ0FBQztBQUMvRixDQUFDO0FBRUQsU0FBUywyQkFBMkI7SUFDbkMsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzlELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFFekUsT0FBTyxJQUFJLHFCQUFxQixDQUFDLFNBQVMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO0FBQ25FLENBQUM7QUFFRCxTQUFTLFNBQVM7SUFDakIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FDMUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFPLEVBQ25CLFdBQVcscUJBQWEsSUFBSSxNQUFNLHFCQUFhLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUMxRSxtQkFBbUIsRUFBRSxNQUFNLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztJQUVoRCxPQUFPLElBQUkscUJBQXFCLENBQUMsU0FBUyxFQUFFLG9CQUFvQixFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ3pFLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsS0FBSyxTQUFTLENBQUMsQ0FBQyx1Q0FBdUM7SUFDdEQsMkJBQTJCO0lBQzNCLElBQUksT0FBTyxHQUFHLE1BQU0sNkJBQTZCLEVBQUUsQ0FBQztJQUNwRCxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ2IsTUFBTSxPQUFPLENBQUM7SUFDZixDQUFDO0lBRUQscUNBQXFDO0lBQ3JDLE9BQU8sR0FBRyxNQUFNLDZCQUE2QixDQUFDLEVBQUUsbUJBQW1CLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUM3RSxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ2IsTUFBTSxPQUFPLENBQUM7SUFDZixDQUFDO0lBRUQsMENBQTBDO0lBQzFDLE9BQU8sR0FBRyxNQUFNLGNBQWMsRUFBRSxDQUFDO0lBQ2pDLElBQUksT0FBTyxFQUFFLENBQUM7UUFDYixNQUFNLE9BQU8sQ0FBQztJQUNmLENBQUM7SUFFRCxnQ0FBZ0M7SUFDaEMsZ0ZBQWdGO0lBQ2hGLHNDQUFzQztJQUN0QyxPQUFPLEdBQUcsMEJBQTBCLEVBQUUsQ0FBQztJQUN2QyxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ2IsTUFBTSxPQUFPLENBQUM7SUFDZixDQUFDO0lBRUQsMEJBQTBCO0lBQzFCLE9BQU8sR0FBRyxNQUFNLDZCQUE2QixDQUFDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7SUFDckUsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUNiLE1BQU0sT0FBTyxDQUFDO0lBQ2YsQ0FBQztJQUVELHNCQUFzQjtJQUN0QixPQUFPLEdBQUcsTUFBTSxjQUFjLENBQUMsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUN0RCxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ2IsTUFBTSxPQUFPLENBQUM7SUFDZixDQUFDO0lBRUQsa0RBQWtEO0lBQ2xELE9BQU8sR0FBRyxNQUFNLDZCQUE2QixDQUFDLEVBQUUsbUJBQW1CLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ2hHLElBQUksT0FBTyxFQUFFLENBQUM7UUFDYixNQUFNLE9BQU8sQ0FBQztJQUNmLENBQUM7SUFFRCxPQUFPLEdBQUcsTUFBTSwyQkFBMkIsRUFBRSxDQUFDO0lBQzlDLElBQUksT0FBTyxFQUFFLENBQUM7UUFDYixNQUFNLE9BQU8sQ0FBQztJQUNmLENBQUM7SUFFRCxrQ0FBa0M7SUFDbEMsT0FBTyxHQUFHLFNBQVMsRUFBRSxDQUFDO0lBQ3RCLElBQUksT0FBTyxFQUFFLENBQUM7UUFDYixNQUFNLE9BQU8sQ0FBQztJQUNmLENBQUM7QUFDRixDQUFDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxNQUFNLENBQUMsS0FBSyxTQUFTLENBQUMsQ0FBQyxnQ0FBZ0M7SUFDdEQsaURBQWlEO0lBQ2pELElBQUksS0FBSyxFQUFFLE1BQU0sV0FBVyxJQUFJLHVDQUF1QyxFQUFFLEVBQUUsQ0FBQztRQUMzRSxJQUFJLE1BQU0sV0FBVyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7WUFDaEMsTUFBTSxXQUFXLENBQUM7UUFDbkIsQ0FBQztJQUNGLENBQUM7QUFDRixDQUFDO0FBRUQ7O0VBRUU7QUFDRixNQUFNLENBQUMsS0FBSyxVQUFVLHVDQUF1QztJQUM1RCxJQUFJLEtBQUssRUFBRSxNQUFNLElBQUksSUFBSSxnQ0FBZ0MsRUFBRSxFQUFFLENBQUM7UUFDN0QsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDYixDQUFDIn0=