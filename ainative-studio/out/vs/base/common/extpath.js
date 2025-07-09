/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isAbsolute, join, normalize, posix, sep } from './path.js';
import { isWindows } from './platform.js';
import { equalsIgnoreCase, rtrim, startsWithIgnoreCase } from './strings.js';
import { isNumber } from './types.js';
export function isPathSeparator(code) {
    return code === 47 /* CharCode.Slash */ || code === 92 /* CharCode.Backslash */;
}
/**
 * Takes a Windows OS path and changes backward slashes to forward slashes.
 * This should only be done for OS paths from Windows (or user provided paths potentially from Windows).
 * Using it on a Linux or MaxOS path might change it.
 */
export function toSlashes(osPath) {
    return osPath.replace(/[\\/]/g, posix.sep);
}
/**
 * Takes a Windows OS path (using backward or forward slashes) and turns it into a posix path:
 * - turns backward slashes into forward slashes
 * - makes it absolute if it starts with a drive letter
 * This should only be done for OS paths from Windows (or user provided paths potentially from Windows).
 * Using it on a Linux or MaxOS path might change it.
 */
export function toPosixPath(osPath) {
    if (osPath.indexOf('/') === -1) {
        osPath = toSlashes(osPath);
    }
    if (/^[a-zA-Z]:(\/|$)/.test(osPath)) { // starts with a drive letter
        osPath = '/' + osPath;
    }
    return osPath;
}
/**
 * Computes the _root_ this path, like `getRoot('c:\files') === c:\`,
 * `getRoot('files:///files/path') === files:///`,
 * or `getRoot('\\server\shares\path') === \\server\shares\`
 */
export function getRoot(path, sep = posix.sep) {
    if (!path) {
        return '';
    }
    const len = path.length;
    const firstLetter = path.charCodeAt(0);
    if (isPathSeparator(firstLetter)) {
        if (isPathSeparator(path.charCodeAt(1))) {
            // UNC candidate \\localhost\shares\ddd
            //               ^^^^^^^^^^^^^^^^^^^
            if (!isPathSeparator(path.charCodeAt(2))) {
                let pos = 3;
                const start = pos;
                for (; pos < len; pos++) {
                    if (isPathSeparator(path.charCodeAt(pos))) {
                        break;
                    }
                }
                if (start !== pos && !isPathSeparator(path.charCodeAt(pos + 1))) {
                    pos += 1;
                    for (; pos < len; pos++) {
                        if (isPathSeparator(path.charCodeAt(pos))) {
                            return path.slice(0, pos + 1) // consume this separator
                                .replace(/[\\/]/g, sep);
                        }
                    }
                }
            }
        }
        // /user/far
        // ^
        return sep;
    }
    else if (isWindowsDriveLetter(firstLetter)) {
        // check for windows drive letter c:\ or c:
        if (path.charCodeAt(1) === 58 /* CharCode.Colon */) {
            if (isPathSeparator(path.charCodeAt(2))) {
                // C:\fff
                // ^^^
                return path.slice(0, 2) + sep;
            }
            else {
                // C:
                // ^^
                return path.slice(0, 2);
            }
        }
    }
    // check for URI
    // scheme://authority/path
    // ^^^^^^^^^^^^^^^^^^^
    let pos = path.indexOf('://');
    if (pos !== -1) {
        pos += 3; // 3 -> "://".length
        for (; pos < len; pos++) {
            if (isPathSeparator(path.charCodeAt(pos))) {
                return path.slice(0, pos + 1); // consume this separator
            }
        }
    }
    return '';
}
/**
 * Check if the path follows this pattern: `\\hostname\sharename`.
 *
 * @see https://msdn.microsoft.com/en-us/library/gg465305.aspx
 * @return A boolean indication if the path is a UNC path, on none-windows
 * always false.
 */
export function isUNC(path) {
    if (!isWindows) {
        // UNC is a windows concept
        return false;
    }
    if (!path || path.length < 5) {
        // at least \\a\b
        return false;
    }
    let code = path.charCodeAt(0);
    if (code !== 92 /* CharCode.Backslash */) {
        return false;
    }
    code = path.charCodeAt(1);
    if (code !== 92 /* CharCode.Backslash */) {
        return false;
    }
    let pos = 2;
    const start = pos;
    for (; pos < path.length; pos++) {
        code = path.charCodeAt(pos);
        if (code === 92 /* CharCode.Backslash */) {
            break;
        }
    }
    if (start === pos) {
        return false;
    }
    code = path.charCodeAt(pos + 1);
    if (isNaN(code) || code === 92 /* CharCode.Backslash */) {
        return false;
    }
    return true;
}
// Reference: https://en.wikipedia.org/wiki/Filename
const WINDOWS_INVALID_FILE_CHARS = /[\\/:\*\?"<>\|]/g;
const UNIX_INVALID_FILE_CHARS = /[/]/g;
const WINDOWS_FORBIDDEN_NAMES = /^(con|prn|aux|clock\$|nul|lpt[0-9]|com[0-9])(\.(.*?))?$/i;
export function isValidBasename(name, isWindowsOS = isWindows) {
    const invalidFileChars = isWindowsOS ? WINDOWS_INVALID_FILE_CHARS : UNIX_INVALID_FILE_CHARS;
    if (!name || name.length === 0 || /^\s+$/.test(name)) {
        return false; // require a name that is not just whitespace
    }
    invalidFileChars.lastIndex = 0; // the holy grail of software development
    if (invalidFileChars.test(name)) {
        return false; // check for certain invalid file characters
    }
    if (isWindowsOS && WINDOWS_FORBIDDEN_NAMES.test(name)) {
        return false; // check for certain invalid file names
    }
    if (name === '.' || name === '..') {
        return false; // check for reserved values
    }
    if (isWindowsOS && name[name.length - 1] === '.') {
        return false; // Windows: file cannot end with a "."
    }
    if (isWindowsOS && name.length !== name.trim().length) {
        return false; // Windows: file cannot end with a whitespace
    }
    if (name.length > 255) {
        return false; // most file systems do not allow files > 255 length
    }
    return true;
}
/**
 * @deprecated please use `IUriIdentityService.extUri.isEqual` instead. If you are
 * in a context without services, consider to pass down the `extUri` from the outside
 * or use `extUriBiasedIgnorePathCase` if you know what you are doing.
 */
export function isEqual(pathA, pathB, ignoreCase) {
    const identityEquals = (pathA === pathB);
    if (!ignoreCase || identityEquals) {
        return identityEquals;
    }
    if (!pathA || !pathB) {
        return false;
    }
    return equalsIgnoreCase(pathA, pathB);
}
/**
 * @deprecated please use `IUriIdentityService.extUri.isEqualOrParent` instead. If
 * you are in a context without services, consider to pass down the `extUri` from the
 * outside, or use `extUriBiasedIgnorePathCase` if you know what you are doing.
 */
export function isEqualOrParent(base, parentCandidate, ignoreCase, separator = sep) {
    if (base === parentCandidate) {
        return true;
    }
    if (!base || !parentCandidate) {
        return false;
    }
    if (parentCandidate.length > base.length) {
        return false;
    }
    if (ignoreCase) {
        const beginsWith = startsWithIgnoreCase(base, parentCandidate);
        if (!beginsWith) {
            return false;
        }
        if (parentCandidate.length === base.length) {
            return true; // same path, different casing
        }
        let sepOffset = parentCandidate.length;
        if (parentCandidate.charAt(parentCandidate.length - 1) === separator) {
            sepOffset--; // adjust the expected sep offset in case our candidate already ends in separator character
        }
        return base.charAt(sepOffset) === separator;
    }
    if (parentCandidate.charAt(parentCandidate.length - 1) !== separator) {
        parentCandidate += separator;
    }
    return base.indexOf(parentCandidate) === 0;
}
export function isWindowsDriveLetter(char0) {
    return char0 >= 65 /* CharCode.A */ && char0 <= 90 /* CharCode.Z */ || char0 >= 97 /* CharCode.a */ && char0 <= 122 /* CharCode.z */;
}
export function sanitizeFilePath(candidate, cwd) {
    // Special case: allow to open a drive letter without trailing backslash
    if (isWindows && candidate.endsWith(':')) {
        candidate += sep;
    }
    // Ensure absolute
    if (!isAbsolute(candidate)) {
        candidate = join(cwd, candidate);
    }
    // Ensure normalized
    candidate = normalize(candidate);
    // Ensure no trailing slash/backslash
    return removeTrailingPathSeparator(candidate);
}
export function removeTrailingPathSeparator(candidate) {
    if (isWindows) {
        candidate = rtrim(candidate, sep);
        // Special case: allow to open drive root ('C:\')
        if (candidate.endsWith(':')) {
            candidate += sep;
        }
    }
    else {
        candidate = rtrim(candidate, sep);
        // Special case: allow to open root ('/')
        if (!candidate) {
            candidate = sep;
        }
    }
    return candidate;
}
export function isRootOrDriveLetter(path) {
    const pathNormalized = normalize(path);
    if (isWindows) {
        if (path.length > 3) {
            return false;
        }
        return hasDriveLetter(pathNormalized) &&
            (path.length === 2 || pathNormalized.charCodeAt(2) === 92 /* CharCode.Backslash */);
    }
    return pathNormalized === posix.sep;
}
export function hasDriveLetter(path, isWindowsOS = isWindows) {
    if (isWindowsOS) {
        return isWindowsDriveLetter(path.charCodeAt(0)) && path.charCodeAt(1) === 58 /* CharCode.Colon */;
    }
    return false;
}
export function getDriveLetter(path, isWindowsOS = isWindows) {
    return hasDriveLetter(path, isWindowsOS) ? path[0] : undefined;
}
export function indexOfPath(path, candidate, ignoreCase) {
    if (candidate.length > path.length) {
        return -1;
    }
    if (path === candidate) {
        return 0;
    }
    if (ignoreCase) {
        path = path.toLowerCase();
        candidate = candidate.toLowerCase();
    }
    return path.indexOf(candidate);
}
export function parseLineAndColumnAware(rawPath) {
    const segments = rawPath.split(':'); // C:\file.txt:<line>:<column>
    let path = undefined;
    let line = undefined;
    let column = undefined;
    for (const segment of segments) {
        const segmentAsNumber = Number(segment);
        if (!isNumber(segmentAsNumber)) {
            path = !!path ? [path, segment].join(':') : segment; // a colon can well be part of a path (e.g. C:\...)
        }
        else if (line === undefined) {
            line = segmentAsNumber;
        }
        else if (column === undefined) {
            column = segmentAsNumber;
        }
    }
    if (!path) {
        throw new Error('Format for `--goto` should be: `FILE:LINE(:COLUMN)`');
    }
    return {
        path,
        line: line !== undefined ? line : undefined,
        column: column !== undefined ? column : line !== undefined ? 1 : undefined // if we have a line, make sure column is also set
    };
}
const pathChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const windowsSafePathFirstChars = 'BDEFGHIJKMOQRSTUVWXYZbdefghijkmoqrstuvwxyz0123456789';
export function randomPath(parent, prefix, randomLength = 8) {
    let suffix = '';
    for (let i = 0; i < randomLength; i++) {
        let pathCharsTouse;
        if (i === 0 && isWindows && !prefix && (randomLength === 3 || randomLength === 4)) {
            // Windows has certain reserved file names that cannot be used, such
            // as AUX, CON, PRN, etc. We want to avoid generating a random name
            // that matches that pattern, so we use a different set of characters
            // for the first character of the name that does not include any of
            // the reserved names first characters.
            pathCharsTouse = windowsSafePathFirstChars;
        }
        else {
            pathCharsTouse = pathChars;
        }
        suffix += pathCharsTouse.charAt(Math.floor(Math.random() * pathCharsTouse.length));
    }
    let randomFileName;
    if (prefix) {
        randomFileName = `${prefix}-${suffix}`;
    }
    else {
        randomFileName = suffix;
    }
    if (parent) {
        return join(parent, randomFileName);
    }
    return randomFileName;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0cGF0aC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9leHRwYXRoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDMUMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLEtBQUssRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRXRDLE1BQU0sVUFBVSxlQUFlLENBQUMsSUFBWTtJQUMzQyxPQUFPLElBQUksNEJBQW1CLElBQUksSUFBSSxnQ0FBdUIsQ0FBQztBQUMvRCxDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILE1BQU0sVUFBVSxTQUFTLENBQUMsTUFBYztJQUN2QyxPQUFPLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUM1QyxDQUFDO0FBRUQ7Ozs7OztHQU1HO0FBQ0gsTUFBTSxVQUFVLFdBQVcsQ0FBQyxNQUFjO0lBQ3pDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ2hDLE1BQU0sR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDNUIsQ0FBQztJQUNELElBQUksa0JBQWtCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyw2QkFBNkI7UUFDbkUsTUFBTSxHQUFHLEdBQUcsR0FBRyxNQUFNLENBQUM7SUFDdkIsQ0FBQztJ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