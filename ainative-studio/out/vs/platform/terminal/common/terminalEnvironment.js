/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { OS } from '../../../base/common/platform.js';
/**
 * Aggressively escape non-windows paths to prepare for being sent to a shell. This will do some
 * escaping inaccurately to be careful about possible script injection via the file path. For
 * example, we're trying to prevent this sort of attack: `/foo/file$(echo evil)`.
 */
export function escapeNonWindowsPath(path) {
    let newPath = path;
    if (newPath.includes('\\')) {
        newPath = newPath.replace(/\\/g, '\\\\');
    }
    const bannedChars = /[\`\$\|\&\>\~\#\!\^\*\;\<\"\']/g;
    newPath = newPath.replace(bannedChars, '');
    return `'${newPath}'`;
}
/**
 * Collapses the user's home directory into `~` if it exists within the path, this gives a shorter
 * path that is more suitable within the context of a terminal.
 */
export function collapseTildePath(path, userHome, separator) {
    if (!path) {
        return '';
    }
    if (!userHome) {
        return path;
    }
    // Trim the trailing separator from the end if it exists
    if (userHome.match(/[\/\\]$/)) {
        userHome = userHome.slice(0, userHome.length - 1);
    }
    const normalizedPath = path.replace(/\\/g, '/').toLowerCase();
    const normalizedUserHome = userHome.replace(/\\/g, '/').toLowerCase();
    if (!normalizedPath.includes(normalizedUserHome)) {
        return path;
    }
    return `~${separator}${path.slice(userHome.length + 1)}`;
}
/**
 * Sanitizes a cwd string, removing any wrapping quotes and making the Windows drive letter
 * uppercase.
 * @param cwd The directory to sanitize.
 */
export function sanitizeCwd(cwd) {
    // Sanity check that the cwd is not wrapped in quotes (see #160109)
    if (cwd.match(/^['"].*['"]$/)) {
        cwd = cwd.substring(1, cwd.length - 1);
    }
    // Make the drive letter uppercase on Windows (see #9448)
    if (OS === 1 /* OperatingSystem.Windows */ && cwd && cwd[1] === ':') {
        return cwd[0].toUpperCase() + cwd.substring(1);
    }
    return cwd;
}
/**
 * Determines whether the given shell launch config should use the environment variable collection.
 * @param slc The shell launch config to check.
 */
export function shouldUseEnvironmentVariableCollection(slc) {
    return !slc.strictEnv;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFbnZpcm9ubWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC9jb21tb24vdGVybWluYWxFbnZpcm9ubWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQW1CLEVBQUUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBR3ZFOzs7O0dBSUc7QUFDSCxNQUFNLFVBQVUsb0JBQW9CLENBQUMsSUFBWTtJQUNoRCxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUM7SUFDbkIsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7UUFDNUIsT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFDRCxNQUFNLFdBQVcsR0FBRyxpQ0FBaUMsQ0FBQztJQUN0RCxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDM0MsT0FBTyxJQUFJLE9BQU8sR0FBRyxDQUFDO0FBQ3ZCLENBQUM7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsaUJBQWlCLENBQUMsSUFBd0IsRUFBRSxRQUE0QixFQUFFLFNBQWlCO0lBQzFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNYLE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQztJQUNELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNmLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUNELHdEQUF3RDtJQUN4RCxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztRQUMvQixRQUFRLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBQ0QsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDOUQsTUFBTSxrQkFBa0IsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUN0RSxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLENBQUM7UUFDbEQsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBQ0QsT0FBTyxJQUFJLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUMxRCxDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILE1BQU0sVUFBVSxXQUFXLENBQUMsR0FBVztJQUN0QyxtRUFBbUU7SUFDbkUsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7UUFDL0IsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDeEMsQ0FBQztJQUNELHlEQUF5RDtJQUN6RCxJQUFJLEVBQUUsb0NBQTRCLElBQUksR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztRQUM3RCxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFDRCxPQUFPLEdBQUcsQ0FBQztBQUNaLENBQUM7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsc0NBQXNDLENBQUMsR0FBdUI7SUFDN0UsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUM7QUFDdkIsQ0FBQyJ9