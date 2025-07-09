/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as os from 'os';
import * as path from 'path';
const cwd = process.env['VSCODE_CWD'] || process.cwd();
/**
 * Returns the user data path to use with some rules:
 * - respect portable mode
 * - respect VSCODE_APPDATA environment variable
 * - respect --user-data-dir CLI argument
 */
export function getUserDataPath(cliArgs, productName) {
    const userDataPath = doGetUserDataPath(cliArgs, productName);
    const pathsToResolve = [userDataPath];
    // If the user-data-path is not absolute, make
    // sure to resolve it against the passed in
    // current working directory. We cannot use the
    // node.js `path.resolve()` logic because it will
    // not pick up our `VSCODE_CWD` environment variable
    // (https://github.com/microsoft/vscode/issues/120269)
    if (!path.isAbsolute(userDataPath)) {
        pathsToResolve.unshift(cwd);
    }
    return path.resolve(...pathsToResolve);
}
function doGetUserDataPath(cliArgs, productName) {
    // 0. Running out of sources has a fixed productName
    if (process.env['VSCODE_DEV']) {
        productName = 'code-oss-dev';
    }
    // 1. Support portable mode
    const portablePath = process.env['VSCODE_PORTABLE'];
    if (portablePath) {
        return path.join(portablePath, 'user-data');
    }
    // 2. Support global VSCODE_APPDATA environment variable
    let appDataPath = process.env['VSCODE_APPDATA'];
    if (appDataPath) {
        return path.join(appDataPath, productName);
    }
    // With Electron>=13 --user-data-dir switch will be propagated to
    // all processes https://github.com/electron/electron/blob/1897b14af36a02e9aa7e4d814159303441548251/shell/browser/electron_browser_client.cc#L546-L553
    // Check VSCODE_PORTABLE and VSCODE_APPDATA before this case to get correct values.
    // 3. Support explicit --user-data-dir
    const cliPath = cliArgs['user-data-dir'];
    if (cliPath) {
        return cliPath;
    }
    // 4. Otherwise check per platform
    switch (process.platform) {
        case 'win32':
            appDataPath = process.env['APPDATA'];
            if (!appDataPath) {
                const userProfile = process.env['USERPROFILE'];
                if (typeof userProfile !== 'string') {
                    throw new Error('Windows: Unexpected undefined %USERPROFILE% environment variable');
                }
                appDataPath = path.join(userProfile, 'AppData', 'Roaming');
            }
            break;
        case 'darwin':
            appDataPath = path.join(os.homedir(), 'Library', 'Application Support');
            break;
        case 'linux':
            appDataPath = process.env['XDG_CONFIG_HOME'] || path.join(os.homedir(), '.config');
            break;
        default:
            throw new Error('Platform not supported');
    }
    return path.join(appDataPath, productName);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQYXRoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2Vudmlyb25tZW50L25vZGUvdXNlckRhdGFQYXRoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3pCLE9BQU8sS0FBSyxJQUFJLE1BQU0sTUFBTSxDQUFDO0FBRzdCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLElBQUksT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBRXZEOzs7OztHQUtHO0FBQ0gsTUFBTSxVQUFVLGVBQWUsQ0FBQyxPQUF5QixFQUFFLFdBQW1CO0lBQzdFLE1BQU0sWUFBWSxHQUFHLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQztJQUM3RCxNQUFNLGNBQWMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBRXRDLDhDQUE4QztJQUM5QywyQ0FBMkM7SUFDM0MsK0NBQStDO0lBQy9DLGlEQUFpRDtJQUNqRCxvREFBb0Q7SUFDcEQsc0RBQXNEO0lBQ3RELElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7UUFDcEMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBRUQsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsY0FBYyxDQUFDLENBQUM7QUFDeEMsQ0FBQztBQUVELFNBQVMsaUJBQWlCLENBQUMsT0FBeUIsRUFBRSxXQUFtQjtJQUV4RSxvREFBb0Q7SUFDcEQsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7UUFDL0IsV0FBVyxHQUFHLGNBQWMsQ0FBQztJQUM5QixDQUFDO0lBRUQsMkJBQTJCO0lBQzNCLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwRCxJQUFJLFlBQVksRUFBRSxDQUFDO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUVELHdEQUF3RDtJQUN4RCxJQUFJLFdBQVcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDaEQsSUFBSSxXQUFXLEVBQUUsQ0FBQztRQUNqQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFRCxpRUFBaUU7SUFDakUsc0pBQXNKO0lBQ3RKLG1GQUFtRjtJQUNuRixzQ0FBc0M7SUFDdEMsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ3pDLElBQUksT0FBTyxFQUFFLENBQUM7UUFDYixPQUFPLE9BQU8sQ0FBQztJQUNoQixDQUFDO0lBRUQsa0NBQWtDO0lBQ2xDLFFBQVEsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQzFCLEtBQUssT0FBTztZQUNYLFdBQVcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3JDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDbEIsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQztnQkFDL0MsSUFBSSxPQUFPLFdBQVcsS0FBSyxRQUFRLEVBQUUsQ0FBQztvQkFDckMsTUFBTSxJQUFJLEtBQUssQ0FBQyxrRUFBa0UsQ0FBQyxDQUFDO2dCQUNyRixDQUFDO2dCQUVELFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDNUQsQ0FBQztZQUNELE1BQU07UUFDUCxLQUFLLFFBQVE7WUFDWixXQUFXLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLEVBQUUsU0FBUyxFQUFFLHFCQUFxQixDQUFDLENBQUM7WUFDeEUsTUFBTTtRQUNQLEtBQUssT0FBTztZQUNYLFdBQVcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDbkYsTUFBTTtRQUNQO1lBQ0MsTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFRCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDO0FBQzVDLENBQUMifQ==