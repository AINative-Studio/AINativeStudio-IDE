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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hlbGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2Uvbm9kZS9zaGVsbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQzlCLE9BQU8sS0FBSyxRQUFRLE1BQU0sdUJBQXVCLENBQUM7QUFDbEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDMUUsT0FBTyxLQUFLLFNBQVMsTUFBTSxnQkFBZ0IsQ0FBQztBQUU1Qzs7OztHQUlHO0FBQ0gsTUFBTSxDQUFDLEtBQUssVUFBVSxjQUFjLENBQUMsRUFBNEIsRUFBRSxHQUFpQztJQUNuRyxJQUFJLEVBQUUsNkNBQXFDLEVBQUUsQ0FBQztRQUM3QyxJQUFJLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN4QixPQUFPLHFCQUFxQixFQUFFLENBQUM7UUFDaEMsQ0FBQztRQUNELGlEQUFpRDtRQUNqRCxPQUFPLFNBQVMsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUVELE9BQU8sc0JBQXNCLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ3hDLENBQUM7QUFFRCxJQUFJLGlDQUFpQyxHQUFrQixJQUFJLENBQUM7QUFDNUQsU0FBUyxzQkFBc0IsQ0FBQyxFQUE0QixFQUFFLEdBQWlDO0lBQzlGLHFDQUFxQztJQUNyQyxJQUFJLFFBQVEsQ0FBQyxPQUFPLElBQUksRUFBRSwrQ0FBdUMsSUFBSSxRQUFRLENBQUMsV0FBVyxJQUFJLEVBQUUsMkNBQW1DLEVBQUUsQ0FBQztRQUNwSSxPQUFPLFdBQVcsQ0FBQztJQUNwQixDQUFDO0lBRUQsSUFBSSxDQUFDLGlDQUFpQyxFQUFFLENBQUM7UUFDeEMsSUFBSSxnQkFBMkMsQ0FBQztRQUNoRCxJQUFJLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN4QixnQkFBZ0IsR0FBRyxXQUFXLENBQUMsQ0FBQyxVQUFVO1FBQzNDLENBQUM7YUFBTSxDQUFDO1lBQ1AsZ0JBQWdCLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRWhDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUN2QixJQUFJLENBQUM7b0JBQ0oseUhBQXlIO29CQUN6SCwwRUFBMEU7b0JBQzFFLGdCQUFnQixHQUFHLFFBQVEsRUFBRSxDQUFDLEtBQUssQ0FBQztnQkFDckMsQ0FBQztnQkFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNsQixDQUFDO1lBRUQsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7Z0JBQ3ZCLGdCQUFnQixHQUFHLElBQUksQ0FBQztZQUN6QixDQUFDO1lBRUQsdUVBQXVFO1lBQ3ZFLElBQUksZ0JBQWdCLEtBQUssWUFBWSxFQUFFLENBQUM7Z0JBQ3ZDLGdCQUFnQixHQUFHLFdBQVcsQ0FBQztZQUNoQyxDQUFDO1FBQ0YsQ0FBQztRQUNELGlDQUFpQyxHQUFHLGdCQUFnQixDQUFDO0lBQ3RELENBQUM7SUFDRCxPQUFPLGlDQUFpQyxDQUFDO0FBQzFDLENBQUM7QUFFRCxJQUFJLCtCQUErQixHQUFrQixJQUFJLENBQUM7QUFDMUQsS0FBSyxVQUFVLHFCQUFxQjtJQUNuQyxJQUFJLENBQUMsK0JBQStCLEVBQUUsQ0FBQztRQUN0QywrQkFBK0IsR0FBRyxDQUFDLE1BQU0sdUNBQXVDLEVBQUUsQ0FBRSxDQUFDLE9BQU8sQ0FBQztJQUM5RixDQUFDO0lBQ0QsT0FBTywrQkFBK0IsQ0FBQztBQUN4QyxDQUFDIn0=