/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { userInfo } from 'os';
import * as platform from '../common/platform.js';
import { getFirstAvailablePowerShellInstallation } from './powershell.js';
import * as processes from './processes.js';
/**
 * Gets the detected default shell for the _system_, not to be confused with VS Code's _default_
 * shell that the terminal uses by default.
 * @param os The platform to detect the shell of.
 */
export async function getSystemShell(os, env) {
    if (os === 1 /* platform.OperatingSystem.Windows */) {
        if (platform.isWindows) {
            return getSystemShellWindows();
        }
        // Don't detect Windows shell when not on Windows
        return processes.getWindowsShell(env);
    }
    return getSystemShellUnixLike(os, env);
}
let _TERMINAL_DEFAULT_SHELL_UNIX_LIKE = null;
function getSystemShellUnixLike(os, env) {
    // Only use $SHELL for the current OS
    if (platform.isLinux && os === 2 /* platform.OperatingSystem.Macintosh */ || platform.isMacintosh && os === 3 /* platform.OperatingSystem.Linux */) {
        return '/bin/bash';
    }
    if (!_TERMINAL_DEFAULT_SHELL_UNIX_LIKE) {
        let unixLikeTerminal;
        if (platform.isWindows) {
            unixLikeTerminal = '/bin/bash'; // for WSL
        }
        else {
            unixLikeTerminal = env['SHELL'];
            if (!unixLikeTerminal) {
                try {
                    // It's possible for $SHELL to be unset, this API reads /etc/passwd. See https://github.com/github/codespaces/issues/1639
                    // Node docs: "Throws a SystemError if a user has no username or homedir."
                    unixLikeTerminal = userInfo().shell;
                }
                catch (err) { }
            }
            if (!unixLikeTerminal) {
                unixLikeTerminal = 'sh';
            }
            // Some systems have $SHELL set to /bin/false which breaks the terminal
            if (unixLikeTerminal === '/bin/false') {
                unixLikeTerminal = '/bin/bash';
            }
        }
        _TERMINAL_DEFAULT_SHELL_UNIX_LIKE = unixLikeTerminal;
    }
    return _TERMINAL_DEFAULT_SHELL_UNIX_LIKE;
}
let _TERMINAL_DEFAULT_SHELL_WINDOWS = null;
async function getSystemShellWindows() {
    if (!_TERMINAL_DEFAULT_SHELL_WINDOWS) {
        _TERMINAL_DEFAULT_SHELL_WINDOWS = (await getFirstAvailablePowerShellInstallation()).exePath;
    }
    return _TERMINAL_DEFAULT_SHELL_WINDOWS;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hlbGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9ub2RlL3NoZWxsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDOUIsT0FBTyxLQUFLLFFBQVEsTUFBTSx1QkFBdUIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMxRSxPQUFPLEtBQUssU0FBUyxNQUFNLGdCQUFnQixDQUFDO0FBRTVDOzs7O0dBSUc7QUFDSCxNQUFNLENBQUMsS0FBSyxVQUFVLGNBQWMsQ0FBQyxFQUE0QixFQUFFLEdBQWlDO0lBQ25HLElBQUksRUFBRSw2Q0FBcUMsRUFBRSxDQUFDO1FBQzdDLElBQUksUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3hCLE9BQU8scUJBQXFCLEVBQUUsQ0FBQztRQUNoQyxDQUFDO1FBQ0QsaURBQWlEO1FBQ2pELE9BQU8sU0FBUyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRUQsT0FBTyxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDeEMsQ0FBQztBQUVELElBQUksaUNBQWlDLEdBQWtCLElBQUksQ0FBQztBQUM1RCxTQUFTLHNCQUFzQixDQUFDLEVBQTRCLEVBQUUsR0FBaUM7SUFDOUYscUNBQXFDO0lBQ3JDLElBQUksUUFBUSxDQUFDLE9BQU8sSUFBSSxFQUFFLCtDQUF1QyxJQUFJLFFBQVEsQ0FBQyxXQUFXLElBQUksRUFBRSwyQ0FBbUMsRUFBRSxDQUFDO1FBQ3BJLE9BQU8sV0FBVyxDQUFDO0lBQ3BCLENBQUM7SUFFRCxJQUFJLENBQUMsaUNBQWlDLEVBQUUsQ0FBQztRQUN4QyxJQUFJLGdCQUEyQyxDQUFDO1FBQ2hELElBQUksUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3hCLGdCQUFnQixHQUFHLFdBQVcsQ0FBQyxDQUFDLFVBQVU7UUFDM0MsQ0FBQzthQUFNLENBQUM7WUFDUCxnQkFBZ0IsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFaEMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7Z0JBQ3ZCLElBQUksQ0FBQztvQkFDSix5SEFBeUg7b0JBQ3pILDBFQUEwRTtvQkFDMUUsZ0JBQWdCLEdBQUcsUUFBUSxFQUFFLENBQUMsS0FBSyxDQUFDO2dCQUNyQyxDQUFDO2dCQUFDLE9BQU8sR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2xCLENBQUM7WUFFRCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztnQkFDdkIsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDO1lBQ3pCLENBQUM7WUFFRCx1RUFBdUU7WUFDdkUsSUFBSSxnQkFBZ0IsS0FBSyxZQUFZLEVBQUUsQ0FBQztnQkFDdkMsZ0JBQWdCLEdBQUcsV0FBVyxDQUFDO1lBQ2hDLENBQUM7UUFDRixDQUFDO1FBQ0QsaUNBQWlDLEdBQUcsZ0JBQWdCLENBQUM7SUFDdEQsQ0FBQztJQUNELE9BQU8saUNBQWlDLENBQUM7QUFDMUMsQ0FBQztBQUVELElBQUksK0JBQStCLEdBQWtCLElBQUksQ0FBQztBQUMxRCxLQUFLLFVBQVUscUJBQXFCO0lBQ25DLElBQUksQ0FBQywrQkFBK0IsRUFBRSxDQUFDO1FBQ3RDLCtCQUErQixHQUFHLENBQUMsTUFBTSx1Q0FBdUMsRUFBRSxDQUFFLENBQUMsT0FBTyxDQUFDO0lBQzlGLENBQUM7SUFDRCxPQUFPLCtCQUErQixDQUFDO0FBQ3hDLENBQUMifQ==