/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import * as os from 'os';
import * as cp from 'child_process';
import * as path from 'path';
let hasWSLFeaturePromise;
export async function hasWSLFeatureInstalled(refresh = false) {
    if (hasWSLFeaturePromise === undefined || refresh) {
        hasWSLFeaturePromise = testWSLFeatureInstalled();
    }
    return hasWSLFeaturePromise;
}
async function testWSLFeatureInstalled() {
    const windowsBuildNumber = getWindowsBuildNumber();
    if (windowsBuildNumber === undefined) {
        return false;
    }
    if (windowsBuildNumber >= 22000) {
        const wslExePath = getWSLExecutablePath();
        if (wslExePath) {
            return new Promise(s => {
                try {
                    cp.execFile(wslExePath, ['--status'], err => s(!err));
                }
                catch (e) {
                    s(false);
                }
            });
        }
    }
    else {
        const dllPath = getLxssManagerDllPath();
        if (dllPath) {
            try {
                if ((await fs.promises.stat(dllPath)).isFile()) {
                    return true;
                }
            }
            catch (e) {
            }
        }
    }
    return false;
}
function getWindowsBuildNumber() {
    const osVersion = (/(\d+)\.(\d+)\.(\d+)/g).exec(os.release());
    if (osVersion) {
        return parseInt(osVersion[3]);
    }
    return undefined;
}
function getSystem32Path(subPath) {
    const systemRoot = process.env['SystemRoot'];
    if (systemRoot) {
        const is32ProcessOn64Windows = process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432');
        return path.join(systemRoot, is32ProcessOn64Windows ? 'Sysnative' : 'System32', subPath);
    }
    return undefined;
}
function getWSLExecutablePath() {
    return getSystem32Path('wsl.exe');
}
/**
 * In builds < 22000 this dll inidcates that WSL is installed
 */
function getLxssManagerDllPath() {
    return getSystem32Path('lxss\\LxssManager.dll');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid3NsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3JlbW90ZS9ub2RlL3dzbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQztBQUN6QixPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQztBQUN6QixPQUFPLEtBQUssRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUNwQyxPQUFPLEtBQUssSUFBSSxNQUFNLE1BQU0sQ0FBQztBQUU3QixJQUFJLG9CQUFrRCxDQUFDO0FBRXZELE1BQU0sQ0FBQyxLQUFLLFVBQVUsc0JBQXNCLENBQUMsT0FBTyxHQUFHLEtBQUs7SUFDM0QsSUFBSSxvQkFBb0IsS0FBSyxTQUFTLElBQUksT0FBTyxFQUFFLENBQUM7UUFDbkQsb0JBQW9CLEdBQUcsdUJBQXVCLEVBQUUsQ0FBQztJQUNsRCxDQUFDO0lBQ0QsT0FBTyxvQkFBb0IsQ0FBQztBQUM3QixDQUFDO0FBRUQsS0FBSyxVQUFVLHVCQUF1QjtJQUNyQyxNQUFNLGtCQUFrQixHQUFHLHFCQUFxQixFQUFFLENBQUM7SUFDbkQsSUFBSSxrQkFBa0IsS0FBSyxTQUFTLEVBQUUsQ0FBQztRQUN0QyxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFDRCxJQUFJLGtCQUFrQixJQUFJLEtBQUssRUFBRSxDQUFDO1FBQ2pDLE1BQU0sVUFBVSxHQUFHLG9CQUFvQixFQUFFLENBQUM7UUFDMUMsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNoQixPQUFPLElBQUksT0FBTyxDQUFVLENBQUMsQ0FBQyxFQUFFO2dCQUMvQixJQUFJLENBQUM7b0JBQ0osRUFBRSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZELENBQUM7Z0JBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztvQkFDWixDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ1YsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQztJQUNGLENBQUM7U0FBTSxDQUFDO1FBQ1AsTUFBTSxPQUFPLEdBQUcscUJBQXFCLEVBQUUsQ0FBQztRQUN4QyxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsSUFBSSxDQUFDO2dCQUNKLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztvQkFDaEQsT0FBTyxJQUFJLENBQUM7Z0JBQ2IsQ0FBQztZQUNGLENBQUM7WUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2IsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBQ0QsT0FBTyxLQUFLLENBQUM7QUFDZCxDQUFDO0FBRUQsU0FBUyxxQkFBcUI7SUFDN0IsTUFBTSxTQUFTLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztJQUM5RCxJQUFJLFNBQVMsRUFBRSxDQUFDO1FBQ2YsT0FBTyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUNELE9BQU8sU0FBUyxDQUFDO0FBQ2xCLENBQUM7QUFFRCxTQUFTLGVBQWUsQ0FBQyxPQUFlO0lBQ3ZDLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDN0MsSUFBSSxVQUFVLEVBQUUsQ0FBQztRQUNoQixNQUFNLHNCQUFzQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLHdCQUF3QixDQUFDLENBQUM7UUFDcEYsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDMUYsQ0FBQztJQUNELE9BQU8sU0FBUyxDQUFDO0FBQ2xCLENBQUM7QUFFRCxTQUFTLG9CQUFvQjtJQUM1QixPQUFPLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNuQyxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFTLHFCQUFxQjtJQUM3QixPQUFPLGVBQWUsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0FBQ2pELENBQUMifQ==