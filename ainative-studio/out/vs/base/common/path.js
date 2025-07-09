/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// NOTE: VSCode's copy of nodejs path library to be usable in common (non-node) namespace
// Copied from: https://github.com/nodejs/node/commits/v20.18.2/lib/path.js
// Excluding: the change that adds primordials
// (https://github.com/nodejs/node/commit/187a862d221dec42fa9a5c4214e7034d9092792f and others)
// Excluding: the change that adds glob matching
// (https://github.com/nodejs/node/commit/57b8b8e18e5e2007114c63b71bf0baedc01936a6)
/**
 * Copyright Joyent, Inc. and other Node contributors.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to permit
 * persons to whom the Software is furnished to do so, subject to the
 * following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
 * NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
 * USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import * as process from './process.js';
const CHAR_UPPERCASE_A = 65; /* A */
const CHAR_LOWERCASE_A = 97; /* a */
const CHAR_UPPERCASE_Z = 90; /* Z */
const CHAR_LOWERCASE_Z = 122; /* z */
const CHAR_DOT = 46; /* . */
const CHAR_FORWARD_SLASH = 47; /* / */
const CHAR_BACKWARD_SLASH = 92; /* \ */
const CHAR_COLON = 58; /* : */
const CHAR_QUESTION_MARK = 63; /* ? */
class ErrorInvalidArgType extends Error {
    constructor(name, expected, actual) {
        // determiner: 'must be' or 'must not be'
        let determiner;
        if (typeof expected === 'string' && expected.indexOf('not ') === 0) {
            determiner = 'must not be';
            expected = expected.replace(/^not /, '');
        }
        else {
            determiner = 'must be';
        }
        const type = name.indexOf('.') !== -1 ? 'property' : 'argument';
        let msg = `The "${name}" ${type} ${determiner} of type ${expected}`;
        msg += `. Received type ${typeof actual}`;
        super(msg);
        this.code = 'ERR_INVALID_ARG_TYPE';
    }
}
function validateObject(pathObject, name) {
    if (pathObject === null || typeof pathObject !== 'object') {
        throw new ErrorInvalidArgType(name, 'Object', pathObject);
    }
}
function validateString(value, name) {
    if (typeof value !== 'string') {
        throw new ErrorInvalidArgType(name, 'string', value);
    }
}
const platformIsWin32 = (process.platform === 'win32');
function isPathSeparator(code) {
    return code === CHAR_FORWARD_SLASH || code === CHAR_BACKWARD_SLASH;
}
function isPosixPathSeparator(code) {
    return code === CHAR_FORWARD_SLASH;
}
function isWindowsDeviceRoot(code) {
    return (code >= CHAR_UPPERCASE_A && code <= CHAR_UPPERCASE_Z) ||
        (code >= CHAR_LOWERCASE_A && code <= CHAR_LOWERCASE_Z);
}
// Resolves . and .. elements in a path with directory names
function normalizeString(path, allowAboveRoot, separator, isPathSeparator) {
    let res = '';
    let lastSegmentLength = 0;
    let lastSlash = -1;
    let dots = 0;
    let code = 0;
    for (let i = 0; i <= path.length; ++i) {
        if (i < path.length) {
            code = path.charCodeAt(i);
        }
        else if (isPathSeparator(code)) {
            break;
        }
        else {
            code = CHAR_FORWARD_SLASH;
        }
        if (isPathSeparator(code)) {
            if (lastSlash === i - 1 || dots === 1) {
                // NOOP
            }
            else if (dots === 2) {
                if (res.length < 2 || lastSegmentLength !== 2 ||
                    res.charCodeAt(res.length - 1) !== CHAR_DOT ||
                    res.charCodeAt(res.length - 2) !== CHAR_DOT) {
                    if (res.length > 2) {
                        const lastSlashIndex = res.lastIndexOf(separator);
                        if (lastSlashIndex === -1) {
                            res = '';
                            lastSegmentLength = 0;
                        }
                        else {
                            res = res.slice(0, lastSlashIndex);
                            lastSegmentLength = res.length - 1 - res.lastIndexOf(separator);
                        }
                        lastSlash = i;
                        dots = 0;
                        continue;
                    }
                    else if (res.length !== 0) {
                        res = '';
                        lastSegmentLength = 0;
                        lastSlash = i;
                        dots = 0;
                        continue;
                    }
                }
                if (allowAboveRoot) {
                    res += res.length > 0 ? `${separator}..` : '..';
                    lastSegmentLength = 2;
                }
            }
            else {
                if (res.length > 0) {
                    res += `${separator}${path.slice(lastSlash + 1, i)}`;
                }
                else {
                    res = path.slice(lastSlash + 1, i);
                }
                lastSegmentLength = i - lastSlash - 1;
            }
            lastSlash = i;
            dots = 0;
        }
        else if (code === CHAR_DOT && dots !== -1) {
            ++dots;
        }
        else {
            dots = -1;
        }
    }
    return res;
}
function formatExt(ext) {
    return ext ? `${ext[0] === '.' ? '' : '.'}${ext}` : '';
}
function _format(sep, pathObject) {
    validateObject(pathObject, 'pathObject');
    const dir = pathObject.dir || pathObject.root;
    const base = pathObject.base ||
        `${pathObject.name || ''}${formatExt(pathObject.ext)}`;
    if (!dir) {
        return base;
    }
    return dir === pathObject.root ? `${dir}${base}` : `${dir}${sep}${base}`;
}
export const win32 = {
    // path.resolve([from ...], to)
    resolve(...pathSegments) {
        let resolvedDevice = '';
        let resolvedTail = '';
        let resolvedAbsolute = false;
        for (let i = pathSegments.length - 1; i >= -1; i--) {
            let path;
            if (i >= 0) {
                path = pathSegments[i];
                validateString(path, `paths[${i}]`);
                // Skip empty entries
                if (path.length === 0) {
                    continue;
                }
            }
            else if (resolvedDevice.length === 0) {
                path = process.cwd();
            }
            else {
                // Windows has the concept of drive-specific current working
                // directories. If we've resolved a drive letter but not yet an
                // absolute path, get cwd for that drive, or the process cwd if
                // the drive cwd is not available. We're sure the device is not
                // a UNC path at this points, because UNC paths are always absolute.
                path = process.env[`=${resolvedDevice}`] || process.cwd();
                // Verify that a cwd was found and that it actually points
                // to our drive. If not, default to the drive's root.
                if (path === undefined ||
                    (path.slice(0, 2).toLowerCase() !== resolvedDevice.toLowerCase() &&
                        path.charCodeAt(2) === CHAR_BACKWARD_SLASH)) {
                    path = `${resolvedDevice}\\`;
                }
            }
            const len = path.length;
            let rootEnd = 0;
            let device = '';
            let isAbsolute = false;
            const code = path.charCodeAt(0);
            // Try to match a root
            if (len === 1) {
                if (isPathSeparator(code)) {
                    // `path` contains just a path separator
                    rootEnd = 1;
                    isAbsolute = true;
                }
            }
            else if (isPathSeparator(code)) {
                // Possible UNC root
                // If we started with a separator, we know we at least have an
                // absolute path of some kind (UNC or otherwise)
                isAbsolute = true;
                if (isPathSeparator(path.charCodeAt(1))) {
                    // Matched double path separator at beginning
                    let j = 2;
                    let last = j;
                    // Match 1 or more non-path separators
                    while (j < len && !isPathSeparator(path.charCodeAt(j))) {
                        j++;
                    }
                    if (j < len && j !== last) {
                        const firstPart = path.slice(last, j);
                        // Matched!
                        last = j;
                        // Match 1 or more path separators
                        while (j < len && isPathSeparator(path.charCodeAt(j))) {
                            j++;
                        }
                        if (j < len && j !== last) {
                            // Matched!
                            last = j;
                            // Match 1 or more non-path separators
                            while (j < len && !isPathSeparator(path.charCodeAt(j))) {
                                j++;
                            }
                            if (j === len || j !== last) {
                                // We matched a UNC root
                                device = `\\\\${firstPart}\\${path.slice(last, j)}`;
                                rootEnd = j;
                            }
                        }
                    }
                }
                else {
                    rootEnd = 1;
                }
            }
            else if (isWindowsDeviceRoot(code) &&
                path.charCodeAt(1) === CHAR_COLON) {
                // Possible device root
                device = path.slice(0, 2);
                rootEnd = 2;
                if (len > 2 && isPathSeparator(path.charCodeAt(2))) {
                    // Treat separator following drive name as an absolute path
                    // indicator
                    isAbsolute = true;
                    rootEnd = 3;
                }
            }
            if (device.length > 0) {
                if (resolvedDevice.length > 0) {
                    if (device.toLowerCase() !== resolvedDevice.toLowerCase()) {
                        // This path points to another device so it is not applicable
                        continue;
                    }
                }
                else {
                    resolvedDevice = device;
                }
            }
            if (resolvedAbsolute) {
                if (resolvedDevice.length > 0) {
                    break;
                }
            }
            else {
                resolvedTail = `${path.slice(rootEnd)}\\${resolvedTail}`;
                resolvedAbsolute = isAbsolute;
                if (isAbsolute && resolvedDevice.length > 0) {
                    break;
                }
            }
        }
        // At this point the path should be resolved to a full absolute path,
        // but handle relative paths to be safe (might happen when process.cwd()
        // fails)
        // Normalize the tail path
        resolvedTail = normalizeString(resolvedTail, !resolvedAbsolute, '\\', isPathSeparator);
        return resolvedAbsolute ?
            `${resolvedDevice}\\${resolvedTail}` :
            `${resolvedDevice}${resolvedTail}` || '.';
    },
    normalize(path) {
        validateString(path, 'path');
        const len = path.length;
        if (len === 0) {
            return '.';
        }
        let rootEnd = 0;
        let device;
        let isAbsolute = false;
        const code = path.charCodeAt(0);
        // Try to match a root
        if (len === 1) {
            // `path` contains just a single char, exit early to avoid
            // unnecessary work
            return isPosixPathSeparator(code) ? '\\' : path;
        }
        if (isPathSeparator(code)) {
            // Possible UNC root
            // If we started with a separator, we know we at least have an absolute
            // path of some kind (UNC or otherwise)
            isAbsolute = true;
            if (isPathSeparator(path.charCodeAt(1))) {
                // Matched double path separator at beginning
                let j = 2;
                let last = j;
                // Match 1 or more non-path separators
                while (j < len && !isPathSeparator(path.charCodeAt(j))) {
                    j++;
                }
                if (j < len && j !== last) {
                    const firstPart = path.slice(last, j);
                    // Matched!
                    last = j;
                    // Match 1 or more path separators
                    while (j < len && isPathSeparator(path.charCodeAt(j))) {
                        j++;
                    }
                    if (j < len && j !== last) {
                        // Matched!
                        last = j;
                        // Match 1 or more non-path separators
                        while (j < len && !isPathSeparator(path.charCodeAt(j))) {
                            j++;
                        }
                        if (j === len) {
                            // We matched a UNC root only
                            // Return the normalized version of the UNC root since there
                            // is nothing left to process
                            return `\\\\${firstPart}\\${path.slice(last)}\\`;
                        }
                        if (j !== last) {
                            // We matched a UNC root with leftovers
                            device = `\\\\${firstPart}\\${path.slice(last, j)}`;
                            rootEnd = j;
                        }
                    }
                }
            }
            else {
                rootEnd = 1;
            }
        }
        else if (isWindowsDeviceRoot(code) && path.charCodeAt(1) === CHAR_COLON) {
            // Possible device root
            device = path.slice(0, 2);
            rootEnd = 2;
            if (len > 2 && isPathSeparator(path.charCodeAt(2))) {
                // Treat separator following drive name as an absolute path
                // indicator
                isAbsolute = true;
                rootEnd = 3;
            }
        }
        let tail = rootEnd < len ?
            normalizeString(path.slice(rootEnd), !isAbsolute, '\\', isPathSeparator) :
            '';
        if (tail.length === 0 && !isAbsolute) {
            tail = '.';
        }
        if (tail.length > 0 && isPathSeparator(path.charCodeAt(len - 1))) {
            tail += '\\';
        }
        if (!isAbsolute && device === undefined && path.includes(':')) {
            // If the original path was not absolute and if we have not been able to
            // resolve it relative to a particular device, we need to ensure that the
            // `tail` has not become something that Windows might interpret as an
            // absolute path. See CVE-2024-36139.
            if (tail.length >= 2 &&
                isWindowsDeviceRoot(tail.charCodeAt(0)) &&
                tail.charCodeAt(1) === CHAR_COLON) {
                return `.\\${tail}`;
            }
            let index = path.indexOf(':');
            do {
                if (index === len - 1 || isPathSeparator(path.charCodeAt(index + 1))) {
                    return `.\\${tail}`;
                }
            } while ((index = path.indexOf(':', index + 1)) !== -1);
        }
        if (device === undefined) {
            return isAbsolute ? `\\${tail}` : tail;
        }
        return isAbsolute ? `${device}\\${tail}` : `${device}${tail}`;
    },
    isAbsolute(path) {
        validateString(path, 'path');
        const len = path.length;
        if (len === 0) {
            return false;
        }
        const code = path.charCodeAt(0);
        return isPathSeparator(code) ||
            // Possible device root
            (len > 2 &&
                isWindowsDeviceRoot(code) &&
                path.charCodeAt(1) === CHAR_COLON &&
                isPathSeparator(path.charCodeAt(2)));
    },
    join(...paths) {
        if (paths.length === 0) {
            return '.';
        }
        let joined;
        let firstPart;
        for (let i = 0; i < paths.length; ++i) {
            const arg = paths[i];
            validateString(arg, 'path');
            if (arg.length > 0) {
                if (joined === undefined) {
                    joined = firstPart = arg;
                }
                else {
                    joined += `\\${arg}`;
                }
            }
        }
        if (joined === undefined) {
            return '.';
        }
        // Make sure that the joined path doesn't start with two slashes, because
        // normalize() will mistake it for a UNC path then.
        //
        // This step is skipped when it is very clear that the user actually
        // intended to point at a UNC path. This is assumed when the first
        // non-empty string arguments starts with exactly two slashes followed by
        // at least one more non-slash character.
        //
        // Note that for normalize() to treat a path as a UNC path it needs to
        // have at least 2 components, so we don't filter for that here.
        // This means that the user can use join to construct UNC paths from
        // a server name and a share name; for example:
        //   path.join('//server', 'share') -> '\\\\server\\share\\')
        let needsReplace = true;
        let slashCount = 0;
        if (typeof firstPart === 'string' && isPathSeparator(firstPart.charCodeAt(0))) {
            ++slashCount;
            const firstLen = firstPart.length;
            if (firstLen > 1 && isPathSeparator(firstPart.charCodeAt(1))) {
                ++slashCount;
                if (firstLen > 2) {
                    if (isPathSeparator(firstPart.charCodeAt(2))) {
                        ++slashCount;
                    }
                    else {
                        // We matched a UNC path in the first part
                        needsReplace = false;
                    }
                }
            }
        }
        if (needsReplace) {
            // Find any more consecutive slashes we need to replace
            while (slashCount < joined.length &&
                isPathSeparator(joined.charCodeAt(slashCount))) {
                slashCount++;
            }
            // Replace the slashes if needed
            if (slashCount >= 2) {
                joined = `\\${joined.slice(slashCount)}`;
            }
        }
        return win32.normalize(joined);
    },
    // It will solve the relative path from `from` to `to`, for instance:
    //  from = 'C:\\orandea\\test\\aaa'
    //  to = 'C:\\orandea\\impl\\bbb'
    // The output of the function should be: '..\\..\\impl\\bbb'
    relative(from, to) {
        validateString(from, 'from');
        validateString(to, 'to');
        if (from === to) {
            return '';
        }
        const fromOrig = win32.resolve(from);
        const toOrig = win32.resolve(to);
        if (fromOrig === toOrig) {
            return '';
        }
        from = fromOrig.toLowerCase();
        to = toOrig.toLowerCase();
        if (from === to) {
            return '';
        }
        if (fromOrig.length !== from.length || toOrig.length !== to.length) {
            const fromSplit = fromOrig.split('\\');
            const toSplit = toOrig.split('\\');
            if (fromSplit[fromSplit.length - 1] === '') {
                fromSplit.pop();
            }
            if (toSplit[toSplit.length - 1] === '') {
                toSplit.pop();
            }
            const fromLen = fromSplit.length;
            const toLen = toSplit.length;
            const length = fromLen < toLen ? fromLen : toLen;
            let i;
            for (i = 0; i < length; i++) {
                if (fromSplit[i].toLowerCase() !== toSplit[i].toLowerCase()) {
                    break;
                }
            }
            if (i === 0) {
                return toOrig;
            }
            else if (i === length) {
                if (toLen > length) {
                    return toSplit.slice(i).join('\\');
                }
                if (fromLen > length) {
                    return '..\\'.repeat(fromLen - 1 - i) + '..';
                }
                return '';
            }
            return '..\\'.repeat(fromLen - i) + toSplit.slice(i).join('\\');
        }
        // Trim any leading backslashes
        let fromStart = 0;
        while (fromStart < from.length &&
            from.charCodeAt(fromStart) === CHAR_BACKWARD_SLASH) {
            fromStart++;
        }
        // Trim trailing backslashes (applicable to UNC paths only)
        let fromEnd = from.length;
        while (fromEnd - 1 > fromStart &&
            from.charCodeAt(fromEnd - 1) === CHAR_BACKWARD_SLASH) {
            fromEnd--;
        }
        const fromLen = fromEnd - fromStart;
        // Trim any leading backslashes
        let toStart = 0;
        while (toStart < to.length &&
            to.charCodeAt(toStart) === CHAR_BACKWARD_SLASH) {
            toStart++;
        }
        // Trim trailing backslashes (applicable to UNC paths only)
        let toEnd = to.length;
        while (toEnd - 1 > toStart &&
            to.charCodeAt(toEnd - 1) === CHAR_BACKWARD_SLASH) {
            toEnd--;
        }
        const toLen = toEnd - toStart;
        // Compare paths to find the longest common path from root
        const length = fromLen < toLen ? fromLen : toLen;
        let lastCommonSep = -1;
        let i = 0;
        for (; i < length; i++) {
            const fromCode = from.charCodeAt(fromStart + i);
            if (fromCode !== to.charCodeAt(toStart + i)) {
                break;
            }
            else if (fromCode === CHAR_BACKWARD_SLASH) {
                lastCommonSep = i;
            }
        }
        // We found a mismatch before the first common path separator was seen, so
        // return the original `to`.
        if (i !== length) {
            if (lastCommonSep === -1) {
                return toOrig;
            }
        }
        else {
            if (toLen > length) {
                if (to.charCodeAt(toStart + i) === CHAR_BACKWARD_SLASH) {
                    // We get here if `from` is the exact base path for `to`.
                    // For example: from='C:\\foo\\bar'; to='C:\\foo\\bar\\baz'
                    return toOrig.slice(toStart + i + 1);
                }
                if (i === 2) {
                    // We get here if `from` is the device root.
                    // For example: from='C:\\'; to='C:\\foo'
                    return toOrig.slice(toStart + i);
                }
            }
            if (fromLen > length) {
                if (from.charCodeAt(fromStart + i) === CHAR_BACKWARD_SLASH) {
                    // We get here if `to` is the exact base path for `from`.
                    // For example: from='C:\\foo\\bar'; to='C:\\foo'
                    lastCommonSep = i;
                }
                else if (i === 2) {
                    // We get here if `to` is the device root.
                    // For example: from='C:\\foo\\bar'; to='C:\\'
                    lastCommonSep = 3;
                }
            }
            if (lastCommonSep === -1) {
                lastCommonSep = 0;
            }
        }
        let out = '';
        // Generate the relative path based on the path difference between `to` and
        // `from`
        for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
            if (i === fromEnd || from.charCodeAt(i) === CHAR_BACKWARD_SLASH) {
                out += out.length === 0 ? '..' : '\\..';
            }
        }
        toStart += lastCommonSep;
        // Lastly, append the rest of the destination (`to`) path that comes after
        // the common path parts
        if (out.length > 0) {
            return `${out}${toOrig.slice(toStart, toEnd)}`;
        }
        if (toOrig.charCodeAt(toStart) === CHAR_BACKWARD_SLASH) {
            ++toStart;
        }
        return toOrig.slice(toStart, toEnd);
    },
    toNamespacedPath(path) {
        // Note: this will *probably* throw somewhere.
        if (typeof path !== 'string' || path.length === 0) {
            return path;
        }
        const resolvedPath = win32.resolve(path);
        if (resolvedPath.length <= 2) {
            return path;
        }
        if (resolvedPath.charCodeAt(0) === CHAR_BACKWARD_SLASH) {
            // Possible UNC root
            if (resolvedPath.charCodeAt(1) === CHAR_BACKWARD_SLASH) {
                const code = resolvedPath.charCodeAt(2);
                if (code !== CHAR_QUESTION_MARK && code !== CHAR_DOT) {
                    // Matched non-long UNC root, convert the path to a long UNC path
                    return `\\\\?\\UNC\\${resolvedPath.slice(2)}`;
                }
            }
        }
        else if (isWindowsDeviceRoot(resolvedPath.charCodeAt(0)) &&
            resolvedPath.charCodeAt(1) === CHAR_COLON &&
            resolvedPath.charCodeAt(2) === CHAR_BACKWARD_SLASH) {
            // Matched device root, convert the path to a long UNC path
            return `\\\\?\\${resolvedPath}`;
        }
        return resolvedPath;
    },
    dirname(path) {
        validateString(path, 'path');
        const len = path.length;
        if (len === 0) {
            return '.';
        }
        let rootEnd = -1;
        let offset = 0;
        const code = path.charCodeAt(0);
        if (len === 1) {
            // `path` contains just a path separator, exit early to avoid
            // unnecessary work or a dot.
            return isPathSeparator(code) ? path : '.';
        }
        // Try to match a root
        if (isPathSeparator(code)) {
            // Possible UNC root
            rootEnd = offset = 1;
            if (isPathSeparator(path.charCodeAt(1))) {
                // Matched double path separator at beginning
                let j = 2;
                let last = j;
                // Match 1 or more non-path separators
                while (j < len && !isPathSeparator(path.charCodeAt(j))) {
                    j++;
                }
                if (j < len && j !== last) {
                    // Matched!
                    last = j;
                    // Match 1 or more path separators
                    while (j < len && isPathSeparator(path.charCodeAt(j))) {
                        j++;
                    }
                    if (j < len && j !== last) {
                        // Matched!
                        last = j;
                        // Match 1 or more non-path separators
                        while (j < len && !isPathSeparator(path.charCodeAt(j))) {
                            j++;
                        }
                        if (j === len) {
                            // We matched a UNC root only
                            return path;
                        }
                        if (j !== last) {
                            // We matched a UNC root with leftovers
                            // Offset by 1 to include the separator after the UNC root to
                            // treat it as a "normal root" on top of a (UNC) root
                            rootEnd = offset = j + 1;
                        }
                    }
                }
            }
            // Possible device root
        }
        else if (isWindowsDeviceRoot(code) && path.charCodeAt(1) === CHAR_COLON) {
            rootEnd = len > 2 && isPathSeparator(path.charCodeAt(2)) ? 3 : 2;
            offset = rootEnd;
        }
        let end = -1;
        let matchedSlash = true;
        for (let i = len - 1; i >= offset; --i) {
            if (isPathSeparator(path.charCodeAt(i))) {
                if (!matchedSlash) {
                    end = i;
                    break;
                }
            }
            else {
                // We saw the first non-path separator
                matchedSlash = false;
            }
        }
        if (end === -1) {
            if (rootEnd === -1) {
                return '.';
            }
            end = rootEnd;
        }
        return path.slice(0, end);
    },
    basename(path, suffix) {
        if (suffix !== undefined) {
            validateString(suffix, 'suffix');
        }
        validateString(path, 'path');
        let start = 0;
        let end = -1;
        let matchedSlash = true;
        let i;
        // Check for a drive letter prefix so as not to mistake the following
        // path separator as an extra separator at the end of the path that can be
        // disregarded
        if (path.length >= 2 &&
            isWindowsDeviceRoot(path.charCodeAt(0)) &&
            path.charCodeAt(1) === CHAR_COLON) {
            start = 2;
        }
        if (suffix !== undefined && suffix.length > 0 && suffix.length <= path.length) {
            if (suffix === path) {
                return '';
            }
            let extIdx = suffix.length - 1;
            let firstNonSlashEnd = -1;
            for (i = path.length - 1; i >= start; --i) {
                const code = path.charCodeAt(i);
                if (isPathSeparator(code)) {
                    // If we reached a path separator that was not part of a set of path
                    // separators at the end of the string, stop now
                    if (!matchedSlash) {
                        start = i + 1;
                        break;
                    }
                }
                else {
                    if (firstNonSlashEnd === -1) {
                        // We saw the first non-path separator, remember this index in case
                        // we need it if the extension ends up not matching
                        matchedSlash = false;
                        firstNonSlashEnd = i + 1;
                    }
                    if (extIdx >= 0) {
                        // Try to match the explicit extension
                        if (code === suffix.charCodeAt(extIdx)) {
                            if (--extIdx === -1) {
                                // We matched the extension, so mark this as the end of our path
                                // component
                                end = i;
                            }
                        }
                        else {
                            // Extension does not match, so our result is the entire path
                            // component
                            extIdx = -1;
                            end = firstNonSlashEnd;
                        }
                    }
                }
            }
            if (start === end) {
                end = firstNonSlashEnd;
            }
            else if (end === -1) {
                end = path.length;
            }
            return path.slice(start, end);
        }
        for (i = path.length - 1; i >= start; --i) {
            if (isPathSeparator(path.charCodeAt(i))) {
                // If we reached a path separator that was not part of a set of path
                // separators at the end of the string, stop now
                if (!matchedSlash) {
                    start = i + 1;
                    break;
                }
            }
            else if (end === -1) {
                // We saw the first non-path separator, mark this as the end of our
                // path component
                matchedSlash = false;
                end = i + 1;
            }
        }
        if (end === -1) {
            return '';
        }
        return path.slice(start, end);
    },
    extname(path) {
        validateString(path, 'path');
        let start = 0;
        let startDot = -1;
        let startPart = 0;
        let end = -1;
        let matchedSlash = true;
        // Track the state of characters (if any) we see before our first dot and
        // after any path separator we find
        let preDotState = 0;
        // Check for a drive letter prefix so as not to mistake the following
        // path separator as an extra separator at the end of the path that can be
        // disregarded
        if (path.length >= 2 &&
            path.charCodeAt(1) === CHAR_COLON &&
            isWindowsDeviceRoot(path.charCodeAt(0))) {
            start = startPart = 2;
        }
        for (let i = path.length - 1; i >= start; --i) {
            const code = path.charCodeAt(i);
            if (isPathSeparator(code)) {
                // If we reached a path separator that was not part of a set of path
                // separators at the end of the string, stop now
                if (!matchedSlash) {
                    startPart = i + 1;
                    break;
                }
                continue;
            }
            if (end === -1) {
                // We saw the first non-path separator, mark this as the end of our
                // extension
                matchedSlash = false;
                end = i + 1;
            }
            if (code === CHAR_DOT) {
                // If this is our first dot, mark it as the start of our extension
                if (startDot === -1) {
                    startDot = i;
                }
                else if (preDotState !== 1) {
                    preDotState = 1;
                }
            }
            else if (startDot !== -1) {
                // We saw a non-dot and non-path separator before our dot, so we should
                // have a good chance at having a non-empty extension
                preDotState = -1;
            }
        }
        if (startDot === -1 ||
            end === -1 ||
            // We saw a non-dot character immediately before the dot
            preDotState === 0 ||
            // The (right-most) trimmed path component is exactly '..'
            (preDotState === 1 &&
                startDot === end - 1 &&
                startDot === startPart + 1)) {
            return '';
        }
        return path.slice(startDot, end);
    },
    format: _format.bind(null, '\\'),
    parse(path) {
        validateString(path, 'path');
        const ret = { root: '', dir: '', base: '', ext: '', name: '' };
        if (path.length === 0) {
            return ret;
        }
        const len = path.length;
        let rootEnd = 0;
        let code = path.charCodeAt(0);
        if (len === 1) {
            if (isPathSeparator(code)) {
                // `path` contains just a path separator, exit early to avoid
                // unnecessary work
                ret.root = ret.dir = path;
                return ret;
            }
            ret.base = ret.name = path;
            return ret;
        }
        // Try to match a root
        if (isPathSeparator(code)) {
            // Possible UNC root
            rootEnd = 1;
            if (isPathSeparator(path.charCodeAt(1))) {
                // Matched double path separator at beginning
                let j = 2;
                let last = j;
                // Match 1 or more non-path separators
                while (j < len && !isPathSeparator(path.charCodeAt(j))) {
                    j++;
                }
                if (j < len && j !== last) {
                    // Matched!
                    last = j;
                    // Match 1 or more path separators
                    while (j < len && isPathSeparator(path.charCodeAt(j))) {
                        j++;
                    }
                    if (j < len && j !== last) {
                        // Matched!
                        last = j;
                        // Match 1 or more non-path separators
                        while (j < len && !isPathSeparator(path.charCodeAt(j))) {
                            j++;
                        }
                        if (j === len) {
                            // We matched a UNC root only
                            rootEnd = j;
                        }
                        else if (j !== last) {
                            // We matched a UNC root with leftovers
                            rootEnd = j + 1;
                        }
                    }
                }
            }
        }
        else if (isWindowsDeviceRoot(code) && path.charCodeAt(1) === CHAR_COLON) {
            // Possible device root
            if (len <= 2) {
                // `path` contains just a drive root, exit early to avoid
                // unnecessary work
                ret.root = ret.dir = path;
                return ret;
            }
            rootEnd = 2;
            if (isPathSeparator(path.charCodeAt(2))) {
                if (len === 3) {
                    // `path` contains just a drive root, exit early to avoid
                    // unnecessary work
                    ret.root = ret.dir = path;
                    return ret;
                }
                rootEnd = 3;
            }
        }
        if (rootEnd > 0) {
            ret.root = path.slice(0, rootEnd);
        }
        let startDot = -1;
        let startPart = rootEnd;
        let end = -1;
        let matchedSlash = true;
        let i = path.length - 1;
        // Track the state of characters (if any) we see before our first dot and
        // after any path separator we find
        let preDotState = 0;
        // Get non-dir info
        for (; i >= rootEnd; --i) {
            code = path.charCodeAt(i);
            if (isPathSeparator(code)) {
                // If we reached a path separator that was not part of a set of path
                // separators at the end of the string, stop now
                if (!matchedSlash) {
                    startPart = i + 1;
                    break;
                }
                continue;
            }
            if (end === -1) {
                // We saw the first non-path separator, mark this as the end of our
                // extension
                matchedSlash = false;
                end = i + 1;
            }
            if (code === CHAR_DOT) {
                // If this is our first dot, mark it as the start of our extension
                if (startDot === -1) {
                    startDot = i;
                }
                else if (preDotState !== 1) {
                    preDotState = 1;
                }
            }
            else if (startDot !== -1) {
                // We saw a non-dot and non-path separator before our dot, so we should
                // have a good chance at having a non-empty extension
                preDotState = -1;
            }
        }
        if (end !== -1) {
            if (startDot === -1 ||
                // We saw a non-dot character immediately before the dot
                preDotState === 0 ||
                // The (right-most) trimmed path component is exactly '..'
                (preDotState === 1 &&
                    startDot === end - 1 &&
                    startDot === startPart + 1)) {
                ret.base = ret.name = path.slice(startPart, end);
            }
            else {
                ret.name = path.slice(startPart, startDot);
                ret.base = path.slice(startPart, end);
                ret.ext = path.slice(startDot, end);
            }
        }
        // If the directory is the root, use the entire root as the `dir` including
        // the trailing slash if any (`C:\abc` -> `C:\`). Otherwise, strip out the
        // trailing slash (`C:\abc\def` -> `C:\abc`).
        if (startPart > 0 && startPart !== rootEnd) {
            ret.dir = path.slice(0, startPart - 1);
        }
        else {
            ret.dir = ret.root;
        }
        return ret;
    },
    sep: '\\',
    delimiter: ';',
    win32: null,
    posix: null
};
const posixCwd = (() => {
    if (platformIsWin32) {
        // Converts Windows' backslash path separators to POSIX forward slashes
        // and truncates any drive indicator
        const regexp = /\\/g;
        return () => {
            const cwd = process.cwd().replace(regexp, '/');
            return cwd.slice(cwd.indexOf('/'));
        };
    }
    // We're already on POSIX, no need for any transformations
    return () => process.cwd();
})();
export const posix = {
    // path.resolve([from ...], to)
    resolve(...pathSegments) {
        let resolvedPath = '';
        let resolvedAbsolute = false;
        for (let i = pathSegments.length - 1; i >= 0 && !resolvedAbsolute; i--) {
            const path = pathSegments[i];
            validateString(path, `paths[${i}]`);
            // Skip empty entries
            if (path.length === 0) {
                continue;
            }
            resolvedPath = `${path}/${resolvedPath}`;
            resolvedAbsolute = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
        }
        if (!resolvedAbsolute) {
            const cwd = posixCwd();
            resolvedPath = `${cwd}/${resolvedPath}`;
            resolvedAbsolute =
                cwd.charCodeAt(0) === CHAR_FORWARD_SLASH;
        }
        // At this point the path should be resolved to a full absolute path, but
        // handle relative paths to be safe (might happen when process.cwd() fails)
        // Normalize the path
        resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute, '/', isPosixPathSeparator);
        if (resolvedAbsolute) {
            return `/${resolvedPath}`;
        }
        return resolvedPath.length > 0 ? resolvedPath : '.';
    },
    normalize(path) {
        validateString(path, 'path');
        if (path.length === 0) {
            return '.';
        }
        const isAbsolute = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
        const trailingSeparator = path.charCodeAt(path.length - 1) === CHAR_FORWARD_SLASH;
        // Normalize the path
        path = normalizeString(path, !isAbsolute, '/', isPosixPathSeparator);
        if (path.length === 0) {
            if (isAbsolute) {
                return '/';
            }
            return trailingSeparator ? './' : '.';
        }
        if (trailingSeparator) {
            path += '/';
        }
        return isAbsolute ? `/${path}` : path;
    },
    isAbsolute(path) {
        validateString(path, 'path');
        return path.length > 0 && path.charCodeAt(0) === CHAR_FORWARD_SLASH;
    },
    join(...paths) {
        if (paths.length === 0) {
            return '.';
        }
        const path = [];
        for (let i = 0; i < paths.length; ++i) {
            const arg = paths[i];
            validateString(arg, 'path');
            if (arg.length > 0) {
                path.push(arg);
            }
        }
        if (path.length === 0) {
            return '.';
        }
        return posix.normalize(path.join('/'));
    },
    relative(from, to) {
        validateString(from, 'from');
        validateString(to, 'to');
        if (from === to) {
            return '';
        }
        // Trim leading forward slashes.
        from = posix.resolve(from);
        to = posix.resolve(to);
        if (from === to) {
            return '';
        }
        const fromStart = 1;
        const fromEnd = from.length;
        const fromLen = fromEnd - fromStart;
        const toStart = 1;
        const toLen = to.length - toStart;
        // Compare paths to find the longest common path from root
        const length = (fromLen < toLen ? fromLen : toLen);
        let lastCommonSep = -1;
        let i = 0;
        for (; i < length; i++) {
            const fromCode = from.charCodeAt(fromStart + i);
            if (fromCode !== to.charCodeAt(toStart + i)) {
                break;
            }
            else if (fromCode === CHAR_FORWARD_SLASH) {
                lastCommonSep = i;
            }
        }
        if (i === length) {
            if (toLen > length) {
                if (to.charCodeAt(toStart + i) === CHAR_FORWARD_SLASH) {
                    // We get here if `from` is the exact base path for `to`.
                    // For example: from='/foo/bar'; to='/foo/bar/baz'
                    return to.slice(toStart + i + 1);
                }
                if (i === 0) {
                    // We get here if `from` is the root
                    // For example: from='/'; to='/foo'
                    return to.slice(toStart + i);
                }
            }
            else if (fromLen > length) {
                if (from.charCodeAt(fromStart + i) === CHAR_FORWARD_SLASH) {
                    // We get here if `to` is the exact base path for `from`.
                    // For example: from='/foo/bar/baz'; to='/foo/bar'
                    lastCommonSep = i;
                }
                else if (i === 0) {
                    // We get here if `to` is the root.
                    // For example: from='/foo/bar'; to='/'
                    lastCommonSep = 0;
                }
            }
        }
        let out = '';
        // Generate the relative path based on the path difference between `to`
        // and `from`.
        for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
            if (i === fromEnd || from.charCodeAt(i) === CHAR_FORWARD_SLASH) {
                out += out.length === 0 ? '..' : '/..';
            }
        }
        // Lastly, append the rest of the destination (`to`) path that comes after
        // the common path parts.
        return `${out}${to.slice(toStart + lastCommonSep)}`;
    },
    toNamespacedPath(path) {
        // Non-op on posix systems
        return path;
    },
    dirname(path) {
        validateString(path, 'path');
        if (path.length === 0) {
            return '.';
        }
        const hasRoot = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
        let end = -1;
        let matchedSlash = true;
        for (let i = path.length - 1; i >= 1; --i) {
            if (path.charCodeAt(i) === CHAR_FORWARD_SLASH) {
                if (!matchedSlash) {
                    end = i;
                    break;
                }
            }
            else {
                // We saw the first non-path separator
                matchedSlash = false;
            }
        }
        if (end === -1) {
            return hasRoot ? '/' : '.';
        }
        if (hasRoot && end === 1) {
            return '//';
        }
        return path.slice(0, end);
    },
    basename(path, suffix) {
        if (suffix !== undefined) {
            validateString(suffix, 'suffix');
        }
        validateString(path, 'path');
        let start = 0;
        let end = -1;
        let matchedSlash = true;
        let i;
        if (suffix !== undefined && suffix.length > 0 && suffix.length <= path.length) {
            if (suffix === path) {
                return '';
            }
            let extIdx = suffix.length - 1;
            let firstNonSlashEnd = -1;
            for (i = path.length - 1; i >= 0; --i) {
                const code = path.charCodeAt(i);
                if (code === CHAR_FORWARD_SLASH) {
                    // If we reached a path separator that was not part of a set of path
                    // separators at the end of the string, stop now
                    if (!matchedSlash) {
                        start = i + 1;
                        break;
                    }
                }
                else {
                    if (firstNonSlashEnd === -1) {
                        // We saw the first non-path separator, remember this index in case
                        // we need it if the extension ends up not matching
                        matchedSlash = false;
                        firstNonSlashEnd = i + 1;
                    }
                    if (extIdx >= 0) {
                        // Try to match the explicit extension
                        if (code === suffix.charCodeAt(extIdx)) {
                            if (--extIdx === -1) {
                                // We matched the extension, so mark this as the end of our path
                                // component
                                end = i;
                            }
                        }
                        else {
                            // Extension does not match, so our result is the entire path
                            // component
                            extIdx = -1;
                            end = firstNonSlashEnd;
                        }
                    }
                }
            }
            if (start === end) {
                end = firstNonSlashEnd;
            }
            else if (end === -1) {
                end = path.length;
            }
            return path.slice(start, end);
        }
        for (i = path.length - 1; i >= 0; --i) {
            if (path.charCodeAt(i) === CHAR_FORWARD_SLASH) {
                // If we reached a path separator that was not part of a set of path
                // separators at the end of the string, stop now
                if (!matchedSlash) {
                    start = i + 1;
                    break;
                }
            }
            else if (end === -1) {
                // We saw the first non-path separator, mark this as the end of our
                // path component
                matchedSlash = false;
                end = i + 1;
            }
        }
        if (end === -1) {
            return '';
        }
        return path.slice(start, end);
    },
    extname(path) {
        validateString(path, 'path');
        let startDot = -1;
        let startPart = 0;
        let end = -1;
        let matchedSlash = true;
        // Track the state of characters (if any) we see before our first dot and
        // after any path separator we find
        let preDotState = 0;
        for (let i = path.length - 1; i >= 0; --i) {
            const char = path[i];
            if (char === '/') {
                // If we reached a path separator that was not part of a set of path
                // separators at the end of the string, stop now
                if (!matchedSlash) {
                    startPart = i + 1;
                    break;
                }
                continue;
            }
            if (end === -1) {
                // We saw the first non-path separator, mark this as the end of our
                // extension
                matchedSlash = false;
                end = i + 1;
            }
            if (char === '.') {
                // If this is our first dot, mark it as the start of our extension
                if (startDot === -1) {
                    startDot = i;
                }
                else if (preDotState !== 1) {
                    preDotState = 1;
                }
            }
            else if (startDot !== -1) {
                // We saw a non-dot and non-path separator before our dot, so we should
                // have a good chance at having a non-empty extension
                preDotState = -1;
            }
        }
        if (startDot === -1 ||
            end === -1 ||
            // We saw a non-dot character immediately before the dot
            preDotState === 0 ||
            // The (right-most) trimmed path component is exactly '..'
            (preDotState === 1 &&
                startDot === end - 1 &&
                startDot === startPart + 1)) {
            return '';
        }
        return path.slice(startDot, end);
    },
    format: _format.bind(null, '/'),
    parse(path) {
        validateString(path, 'path');
        const ret = { root: '', dir: '', base: '', ext: '', name: '' };
        if (path.length === 0) {
            return ret;
        }
        const isAbsolute = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
        let start;
        if (isAbsolute) {
            ret.root = '/';
            start = 1;
        }
        else {
            start = 0;
        }
        let startDot = -1;
        let startPart = 0;
        let end = -1;
        let matchedSlash = true;
        let i = path.length - 1;
        // Track the state of characters (if any) we see before our first dot and
        // after any path separator we find
        let preDotState = 0;
        // Get non-dir info
        for (; i >= start; --i) {
            const code = path.charCodeAt(i);
            if (code === CHAR_FORWARD_SLASH) {
                // If we reached a path separator that was not part of a set of path
                // separators at the end of the string, stop now
                if (!matchedSlash) {
                    startPart = i + 1;
                    break;
                }
                continue;
            }
            if (end === -1) {
                // We saw the first non-path separator, mark this as the end of our
                // extension
                matchedSlash = false;
                end = i + 1;
            }
            if (code === CHAR_DOT) {
                // If this is our first dot, mark it as the start of our extension
                if (startDot === -1) {
                    startDot = i;
                }
                else if (preDotState !== 1) {
                    preDotState = 1;
                }
            }
            else if (startDot !== -1) {
                // We saw a non-dot and non-path separator before our dot, so we should
                // have a good chance at having a non-empty extension
                preDotState = -1;
            }
        }
        if (end !== -1) {
            const start = startPart === 0 && isAbsolute ? 1 : startPart;
            if (startDot === -1 ||
                // We saw a non-dot character immediately before the dot
                preDotState === 0 ||
                // The (right-most) trimmed path component is exactly '..'
                (preDotState === 1 &&
                    startDot === end - 1 &&
                    startDot === startPart + 1)) {
                ret.base = ret.name = path.slice(start, end);
            }
            else {
                ret.name = path.slice(start, startDot);
                ret.base = path.slice(start, end);
                ret.ext = path.slice(startDot, end);
            }
        }
        if (startPart > 0) {
            ret.dir = path.slice(0, startPart - 1);
        }
        else if (isAbsolute) {
            ret.dir = '/';
        }
        return ret;
    },
    sep: '/',
    delimiter: ':',
    win32: null,
    posix: null
};
posix.win32 = win32.win32 = win32;
posix.posix = win32.posix = posix;
export const normalize = (platformIsWin32 ? win32.normalize : posix.normalize);
export const isAbsolute = (platformIsWin32 ? win32.isAbsolute : posix.isAbsolute);
export const join = (platformIsWin32 ? win32.join : posix.join);
export const resolve = (platformIsWin32 ? win32.resolve : posix.resolve);
export const relative = (platformIsWin32 ? win32.relative : posix.relative);
export const dirname = (platformIsWin32 ? win32.dirname : posix.dirname);
export const basename = (platformIsWin32 ? win32.basename : posix.basename);
export const extname = (platformIsWin32 ? win32.extname : posix.extname);
export const format = (platformIsWin32 ? win32.format : posix.format);
export const parse = (platformIsWin32 ? win32.parse : posix.parse);
export const toNamespacedPath = (platformIsWin32 ? win32.toNamespacedPath : posix.toNamespacedPath);
export const sep = (platformIsWin32 ? win32.sep : posix.sep);
export const delimiter = (platformIsWin32 ? win32.delimiter : posix.delimiter);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0aC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9wYXRoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLHlGQUF5RjtBQUN6RiwyRUFBMkU7QUFDM0UsOENBQThDO0FBQzlDLDhGQUE4RjtBQUM5RixnREFBZ0Q7QUFDaEQsbUZBQW1GO0FBRW5GOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FxQkc7QUFFSCxPQUFPLEtBQUssT0FBTyxNQUFNLGNBQWMsQ0FBQztBQUV4QyxNQUFNLGdCQUFnQixHQUFHLEVBQUUsQ0FBQyxDQUFBLE9BQU87QUFDbkMsTUFBTSxnQkFBZ0IsR0FBRyxFQUFFLENBQUMsQ0FBQyxPQUFPO0FBQ3BDLE1BQU0sZ0JBQWdCLEdBQUcsRUFBRSxDQUFDLENBQUMsT0FBTztBQUNwQyxNQUFNLGdCQUFnQixHQUFHLEdBQUcsQ0FBQyxDQUFDLE9BQU87QUFDckMsTUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDLENBQUMsT0FBTztBQUM1QixNQUFNLGtCQUFrQixHQUFHLEVBQUUsQ0FBQyxDQUFDLE9BQU87QUFDdEMsTUFBTSxtQkFBbUIsR0FBRyxFQUFFLENBQUMsQ0FBQyxPQUFPO0FBQ3ZDLE1BQU0sVUFBVSxHQUFHLEVBQUUsQ0FBQyxDQUFDLE9BQU87QUFDOUIsTUFBTSxrQkFBa0IsR0FBRyxFQUFFLENBQUMsQ0FBQyxPQUFPO0FBRXRDLE1BQU0sbUJBQW9CLFNBQVEsS0FBSztJQUV0QyxZQUFZLElBQVksRUFBRSxRQUFnQixFQUFFLE1BQWU7UUFDMUQseUNBQXlDO1FBQ3pDLElBQUksVUFBVSxDQUFDO1FBQ2YsSUFBSSxPQUFPLFFBQVEsS0FBSyxRQUFRLElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNw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LENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDaEUsTUFBTSxDQUFDLE1BQU0sT0FBTyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDekUsTUFBTSxDQUFDLE1BQU0sUUFBUSxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDNUUsTUFBTSxDQUFDLE1BQU0sT0FBTyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDekUsTUFBTSxDQUFDLE1BQU0sUUFBUSxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDNUUsTUFBTSxDQUFDLE1BQU0sT0FBTyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDekUsTUFBTSxDQUFDLE1BQU0sTUFBTSxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDdEUsTUFBTSxDQUFDLE1BQU0sS0FBSyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDbkUsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDcEcsTUFBTSxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDN0QsTUFBTSxDQUFDLE1BQU0sU0FBUyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMifQ==