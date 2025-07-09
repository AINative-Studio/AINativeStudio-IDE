/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isMacintosh, isWindows } from './platform.js';
let safeProcess;
// Native sandbox environment
const vscodeGlobal = globalThis.vscode;
if (typeof vscodeGlobal !== 'undefined' && typeof vscodeGlobal.process !== 'undefined') {
    const sandboxProcess = vscodeGlobal.process;
    safeProcess = {
        get platform() { return sandboxProcess.platform; },
        get arch() { return sandboxProcess.arch; },
        get env() { return sandboxProcess.env; },
        cwd() { return sandboxProcess.cwd(); }
    };
}
// Native node.js environment
else if (typeof process !== 'undefined' && typeof process?.versions?.node === 'string') {
    safeProcess = {
        get platform() { return process.platform; },
        get arch() { return process.arch; },
        get env() { return process.env; },
        cwd() { return process.env['VSCODE_CWD'] || process.cwd(); }
    };
}
// Web environment
else {
    safeProcess = {
        // Supported
        get platform() { return isWindows ? 'win32' : isMacintosh ? 'darwin' : 'linux'; },
        get arch() { return undefined; /* arch is undefined in web */ },
        // Unsupported
        get env() { return {}; },
        cwd() { return '/'; }
    };
}
/**
 * Provides safe access to the `cwd` property in node.js, sandboxed or web
 * environments.
 *
 * Note: in web, this property is hardcoded to be `/`.
 *
 * @skipMangle
 */
export const cwd = safeProcess.cwd;
/**
 * Provides safe access to the `env` property in node.js, sandboxed or web
 * environments.
 *
 * Note: in web, this property is hardcoded to be `{}`.
 */
export const env = safeProcess.env;
/**
 * Provides safe access to the `platform` property in node.js, sandboxed or web
 * environments.
 */
export const platform = safeProcess.platform;
/**
 * Provides safe access to the `arch` method in node.js, sandboxed or web
 * environments.
 * Note: `arch` is `undefined` in web
 */
export const arch = safeProcess.arch;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9wcm9jZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBZ0IsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUVyRSxJQUFJLFdBQXNFLENBQUM7QUFHM0UsNkJBQTZCO0FBQzdCLE1BQU0sWUFBWSxHQUFJLFVBQWtCLENBQUMsTUFBTSxDQUFDO0FBQ2hELElBQUksT0FBTyxZQUFZLEtBQUssV0FBVyxJQUFJLE9BQU8sWUFBWSxDQUFDLE9BQU8sS0FBSyxXQUFXLEVBQUUsQ0FBQztJQUN4RixNQUFNLGNBQWMsR0FBaUIsWUFBWSxDQUFDLE9BQU8sQ0FBQztJQUMxRCxXQUFXLEdBQUc7UUFDYixJQUFJLFFBQVEsS0FBSyxPQUFPLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQ2xELElBQUksSUFBSSxLQUFLLE9BQU8sY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDMUMsSUFBSSxHQUFHLEtBQUssT0FBTyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN4QyxHQUFHLEtBQUssT0FBTyxjQUFjLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0tBQ3RDLENBQUM7QUFDSCxDQUFDO0FBRUQsNkJBQTZCO0tBQ3hCLElBQUksT0FBTyxPQUFPLEtBQUssV0FBVyxJQUFJLE9BQU8sT0FBTyxFQUFFLFFBQVEsRUFBRSxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7SUFDeEYsV0FBVyxHQUFHO1FBQ2IsSUFBSSxRQUFRLEtBQUssT0FBTyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUMzQyxJQUFJLElBQUksS0FBSyxPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ25DLElBQUksR0FBRyxLQUFLLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDakMsR0FBRyxLQUFLLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsSUFBSSxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0tBQzVELENBQUM7QUFDSCxDQUFDO0FBRUQsa0JBQWtCO0tBQ2IsQ0FBQztJQUNMLFdBQVcsR0FBRztRQUViLFlBQVk7UUFDWixJQUFJLFFBQVEsS0FBSyxPQUFPLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUNqRixJQUFJLElBQUksS0FBSyxPQUFPLFNBQVMsQ0FBQyxDQUFDLDhCQUE4QixDQUFDLENBQUM7UUFFL0QsY0FBYztRQUNkLElBQUksR0FBRyxLQUFLLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN4QixHQUFHLEtBQUssT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDO0tBQ3JCLENBQUM7QUFDSCxDQUFDO0FBRUQ7Ozs7Ozs7R0FPRztBQUNILE1BQU0sQ0FBQyxNQUFNLEdBQUcsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDO0FBRW5DOzs7OztHQUtHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sR0FBRyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUM7QUFFbkM7OztHQUdHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUM7QUFFN0M7Ozs7R0FJRztBQUNILE1BQU0sQ0FBQyxNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDIn0=