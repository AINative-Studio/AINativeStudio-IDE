/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { hasDriveLetter, toSlashes } from './extpath.js';
import { posix, sep, win32 } from './path.js';
import { isMacintosh, isWindows, OS } from './platform.js';
import { extUri, extUriIgnorePathCase } from './resources.js';
import { rtrim, startsWithIgnoreCase } from './strings.js';
export function getPathLabel(resource, formatting) {
    const { os, tildify: tildifier, relative: relatifier } = formatting;
    // return early with a relative path if we can resolve one
    if (relatifier) {
        const relativePath = getRelativePathLabel(resource, relatifier, os);
        if (typeof relativePath === 'string') {
            return relativePath;
        }
    }
    // otherwise try to resolve a absolute path label and
    // apply target OS standard path separators if target
    // OS differs from actual OS we are running in
    let absolutePath = resource.fsPath;
    if (os === 1 /* OperatingSystem.Windows */ && !isWindows) {
        absolutePath = absolutePath.replace(/\//g, '\\');
    }
    else if (os !== 1 /* OperatingSystem.Windows */ && isWindows) {
        absolutePath = absolutePath.replace(/\\/g, '/');
    }
    // macOS/Linux: tildify with provided user home directory
    if (os !== 1 /* OperatingSystem.Windows */ && tildifier?.userHome) {
        const userHome = tildifier.userHome.fsPath;
        // This is a bit of a hack, but in order to figure out if the
        // resource is in the user home, we need to make sure to convert it
        // to a user home resource. We cannot assume that the resource is
        // already a user home resource.
        let userHomeCandidate;
        if (resource.scheme !== tildifier.userHome.scheme && resource.path[0] === posix.sep && resource.path[1] !== posix.sep) {
            userHomeCandidate = tildifier.userHome.with({ path: resource.path }).fsPath;
        }
        else {
            userHomeCandidate = absolutePath;
        }
        absolutePath = tildify(userHomeCandidate, userHome, os);
    }
    // normalize
    const pathLib = os === 1 /* OperatingSystem.Windows */ ? win32 : posix;
    return pathLib.normalize(normalizeDriveLetter(absolutePath, os === 1 /* OperatingSystem.Windows */));
}
function getRelativePathLabel(resource, relativePathProvider, os) {
    const pathLib = os === 1 /* OperatingSystem.Windows */ ? win32 : posix;
    const extUriLib = os === 3 /* OperatingSystem.Linux */ ? extUri : extUriIgnorePathCase;
    const workspace = relativePathProvider.getWorkspace();
    const firstFolder = workspace.folders.at(0);
    if (!firstFolder) {
        return undefined;
    }
    // This is a bit of a hack, but in order to figure out the folder
    // the resource belongs to, we need to make sure to convert it
    // to a workspace resource. We cannot assume that the resource is
    // already matching the workspace.
    if (resource.scheme !== firstFolder.uri.scheme && resource.path[0] === posix.sep && resource.path[1] !== posix.sep) {
        resource = firstFolder.uri.with({ path: resource.path });
    }
    const folder = relativePathProvider.getWorkspaceFolder(resource);
    if (!folder) {
        return undefined;
    }
    let relativePathLabel = undefined;
    if (extUriLib.isEqual(folder.uri, resource)) {
        relativePathLabel = ''; // no label if paths are identical
    }
    else {
        relativePathLabel = extUriLib.relativePath(folder.uri, resource) ?? '';
    }
    // normalize
    if (relativePathLabel) {
        relativePathLabel = pathLib.normalize(relativePathLabel);
    }
    // always show root basename if there are multiple folders
    if (workspace.folders.length > 1 && !relativePathProvider.noPrefix) {
        const rootName = folder.name ? folder.name : extUriLib.basenameOrAuthority(folder.uri);
        relativePathLabel = relativePathLabel ? `${rootName} • ${relativePathLabel}` : rootName;
    }
    return relativePathLabel;
}
export function normalizeDriveLetter(path, isWindowsOS = isWindows) {
    if (hasDriveLetter(path, isWindowsOS)) {
        return path.charAt(0).toUpperCase() + path.slice(1);
    }
    return path;
}
let normalizedUserHomeCached = Object.create(null);
export function tildify(path, userHome, os = OS) {
    if (os === 1 /* OperatingSystem.Windows */ || !path || !userHome) {
        return path; // unsupported on Windows
    }
    let normalizedUserHome = normalizedUserHomeCached.original === userHome ? normalizedUserHomeCached.normalized : undefined;
    if (!normalizedUserHome) {
        normalizedUserHome = userHome;
        if (isWindows) {
            normalizedUserHome = toSlashes(normalizedUserHome); // make sure that the path is POSIX normalized on Windows
        }
        normalizedUserHome = `${rtrim(normalizedUserHome, posix.sep)}${posix.sep}`;
        normalizedUserHomeCached = { original: userHome, normalized: normalizedUserHome };
    }
    let normalizedPath = path;
    if (isWindows) {
        normalizedPath = toSlashes(normalizedPath); // make sure that the path is POSIX normalized on Windows
    }
    // Linux: case sensitive, macOS: case insensitive
    if (os === 3 /* OperatingSystem.Linux */ ? normalizedPath.startsWith(normalizedUserHome) : startsWithIgnoreCase(normalizedPath, normalizedUserHome)) {
        return `~/${normalizedPath.substr(normalizedUserHome.length)}`;
    }
    return path;
}
export function untildify(path, userHome) {
    return path.replace(/^~($|\/|\\)/, `${userHome}$1`);
}
/**
 * Shortens the paths but keeps them easy to distinguish.
 * Replaces not important parts with ellipsis.
 * Every shorten path matches only one original path and vice versa.
 *
 * Algorithm for shortening paths is as follows:
 * 1. For every path in list, find unique substring of that path.
 * 2. Unique substring along with ellipsis is shortened path of that path.
 * 3. To find unique substring of path, consider every segment of length from 1 to path.length of path from end of string
 *    and if present segment is not substring to any other paths then present segment is unique path,
 *    else check if it is not present as suffix of any other path and present segment is suffix of path itself,
 *    if it is true take present segment as unique path.
 * 4. Apply ellipsis to unique segment according to whether segment is present at start/in-between/end of path.
 *
 * Example 1
 * 1. consider 2 paths i.e. ['a\\b\\c\\d', 'a\\f\\b\\c\\d']
 * 2. find unique path of first path,
 * 	a. 'd' is present in path2 and is suffix of path2, hence not unique of present path.
 * 	b. 'c' is present in path2 and 'c' is not suffix of present path, similarly for 'b' and 'a' also.
 * 	c. 'd\\c' is suffix of path2.
 *  d. 'b\\c' is not suffix of present path.
 *  e. 'a\\b' is not present in path2, hence unique path is 'a\\b...'.
 * 3. for path2, 'f' is not present in path1 hence unique is '...\\f\\...'.
 *
 * Example 2
 * 1. consider 2 paths i.e. ['a\\b', 'a\\b\\c'].
 * 	a. Even if 'b' is present in path2, as 'b' is suffix of path1 and is not suffix of path2, unique path will be '...\\b'.
 * 2. for path2, 'c' is not present in path1 hence unique path is '..\\c'.
 */
const ellipsis = '\u2026';
const unc = '\\\\';
const home = '~';
export function shorten(paths, pathSeparator = sep) {
    const shortenedPaths = new Array(paths.length);
    // for every path
    let match = false;
    for (let pathIndex = 0; pathIndex < paths.length; pathIndex++) {
        const originalPath = paths[pathIndex];
        if (originalPath === '') {
            shortenedPaths[pathIndex] = `.${pathSeparator}`;
            continue;
        }
        if (!originalPath) {
            shortenedPaths[pathIndex] = originalPath;
            continue;
        }
        match = true;
        // trim for now and concatenate unc path (e.g. \\network) or root path (/etc, ~/etc) later
        let prefix = '';
        let trimmedPath = originalPath;
        if (trimmedPath.indexOf(unc) === 0) {
            prefix = trimmedPath.substr(0, trimmedPath.indexOf(unc) + unc.length);
            trimmedPath = trimmedPath.substr(trimmedPath.indexOf(unc) + unc.length);
        }
        else if (trimmedPath.indexOf(pathSeparator) === 0) {
            prefix = trimmedPath.substr(0, trimmedPath.indexOf(pathSeparator) + pathSeparator.length);
            trimmedPath = trimmedPath.substr(trimmedPath.indexOf(pathSeparator) + pathSeparator.length);
        }
        else if (trimmedPath.indexOf(home) === 0) {
            prefix = trimmedPath.substr(0, trimmedPath.indexOf(home) + home.length);
            trimmedPath = trimmedPath.substr(trimmedPath.indexOf(home) + home.length);
        }
        // pick the first shortest subpath found
        const segments = trimmedPath.split(pathSeparator);
        for (let subpathLength = 1; match && subpathLength <= segments.length; subpathLength++) {
            for (let start = segments.length - subpathLength; match && start >= 0; start--) {
                match = false;
                let subpath = segments.slice(start, start + subpathLength).join(pathSeparator);
                // that is unique to any other path
                for (let otherPathIndex = 0; !match && otherPathIndex < paths.length; otherPathIndex++) {
                    // suffix subpath treated specially as we consider no match 'x' and 'x/...'
                    if (otherPathIndex !== pathIndex && paths[otherPathIndex] && paths[otherPathIndex].indexOf(subpath) > -1) {
                        const isSubpathEnding = (start + subpathLength === segments.length);
                        // Adding separator as prefix for subpath, such that 'endsWith(src, trgt)' considers subpath as directory name instead of plain string.
                        // prefix is not added when either subpath is root directory or path[otherPathIndex] does not have multiple directories.
                        const subpathWithSep = (start > 0 && paths[otherPathIndex].indexOf(pathSeparator) > -1) ? pathSeparator + subpath : subpath;
                        const isOtherPathEnding = paths[otherPathIndex].endsWith(subpathWithSep);
                        match = !isSubpathEnding || isOtherPathEnding;
                    }
                }
                // found unique subpath
                if (!match) {
                    let result = '';
                    // preserve disk drive or root prefix
                    if (segments[0].endsWith(':') || prefix !== '') {
                        if (start === 1) {
                            // extend subpath to include disk drive prefix
                            start = 0;
                            subpathLength++;
                            subpath = segments[0] + pathSeparator + subpath;
                        }
                        if (start > 0) {
                            result = segments[0] + pathSeparator;
                        }
                        result = prefix + result;
                    }
                    // add ellipsis at the beginning if needed
                    if (start > 0) {
                        result = result + ellipsis + pathSeparator;
                    }
                    result = result + subpath;
                    // add ellipsis at the end if needed
                    if (start + subpathLength < segments.length) {
                        result = result + pathSeparator + ellipsis;
                    }
                    shortenedPaths[pathIndex] = result;
                }
            }
        }
        if (match) {
            shortenedPaths[pathIndex] = originalPath; // use original path if no unique subpaths found
        }
    }
    return shortenedPaths;
}
var Type;
(function (Type) {
    Type[Type["TEXT"] = 0] = "TEXT";
    Type[Type["VARIABLE"] = 1] = "VARIABLE";
    Type[Type["SEPARATOR"] = 2] = "SEPARATOR";
})(Type || (Type = {}));
/**
 * Helper to insert values for specific template variables into the string. E.g. "this $(is) a $(template)" can be
 * passed to this function together with an object that maps "is" and "template" to strings to have them replaced.
 * @param value string to which template is applied
 * @param values the values of the templates to use
 */
export function template(template, values = Object.create(null)) {
    const segments = [];
    let inVariable = false;
    let curVal = '';
    for (const char of template) {
        // Beginning of variable
        if (char === '$' || (inVariable && char === '{')) {
            if (curVal) {
                segments.push({ value: curVal, type: Type.TEXT });
            }
            curVal = '';
            inVariable = true;
        }
        // End of variable
        else if (char === '}' && inVariable) {
            const resolved = values[curVal];
            // Variable
            if (typeof resolved === 'string') {
                if (resolved.length) {
                    segments.push({ value: resolved, type: Type.VARIABLE });
                }
            }
            // Separator
            else if (resolved) {
                const prevSegment = segments[segments.length - 1];
                if (!prevSegment || prevSegment.type !== Type.SEPARATOR) {
                    segments.push({ value: resolved.label, type: Type.SEPARATOR }); // prevent duplicate separators
                }
            }
            curVal = '';
            inVariable = false;
        }
        // Text or Variable Name
        else {
            curVal += char;
        }
    }
    // Tail
    if (curVal && !inVariable) {
        segments.push({ value: curVal, type: Type.TEXT });
    }
    return segments.filter((segment, index) => {
        // Only keep separator if we have values to the left and right
        if (segment.type === Type.SEPARATOR) {
            const left = segments[index - 1];
            const right = segments[index + 1];
            return [left, right].every(segment => segment && (segment.type === Type.VARIABLE || segment.type === Type.TEXT) && segment.value.length > 0);
        }
        // accept any TEXT and VARIABLE
        return true;
    }).map(segment => segment.value).join('');
}
/**
 * Handles mnemonics for menu items. Depending on OS:
 * - Windows: Supported via & character (replace && with &)
 * -   Linux: Supported via & character (replace && with &)
 * -   macOS: Unsupported (replace && with empty string)
 */
export function mnemonicMenuLabel(label, forceDisableMnemonics) {
    if (isMacintosh || forceDisableMnemonics) {
        return label.replace(/\(&&\w\)|&&/g, '').replace(/&/g, isMacintosh ? '&' : '&&');
    }
    return label.replace(/&&|&/g, m => m === '&' ? '&&' : '&');
}
export function mnemonicButtonLabel(label, forceDisableMnemonics) {
    const withoutMnemonic = label.replace(/\(&&\w\)|&&/g, '');
    if (forceDisableMnemonics) {
        return withoutMnemonic;
    }
    if (isMacintosh) {
        return { withMnemonic: withoutMnemonic, withoutMnemonic };
    }
    let withMnemonic;
    if (isWindows) {
        withMnemonic = label.replace(/&&|&/g, m => m === '&' ? '&&' : '&');
    }
    else {
        withMnemonic = label.replace(/&&/g, '_');
    }
    return { withMnemonic, withoutMnemonic };
}
export function unmnemonicLabel(label) {
    return label.replace(/&/g, '&&');
}
/**
 * Splits a recent label in name and parent path, supporting both '/' and '\' and workspace suffixes.
 * If the location is remote, the remote name is included in the name part.
 */
export function splitRecentLabel(recentLabel) {
    if (recentLabel.endsWith(']')) {
        // label with workspace suffix
        const lastIndexOfSquareBracket = recentLabel.lastIndexOf(' [', recentLabel.length - 2);
        if (lastIndexOfSquareBracket !== -1) {
            const split = splitName(recentLabel.substring(0, lastIndexOfSquareBracket));
            const remoteNameWithSpace = recentLabel.substring(lastIndexOfSquareBracket);
            return { name: split.name + remoteNameWithSpace, parentPath: split.parentPath };
        }
    }
    return splitName(recentLabel);
}
function splitName(fullPath) {
    const p = fullPath.indexOf('/') !== -1 ? posix : win32;
    const name = p.basename(fullPath);
    const parentPath = p.dirname(fullPath);
    if (name.length) {
        return { name, parentPath };
    }
    // only the root segment
    return { name: parentPath, parentPath: '' };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFiZWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vbGFiZWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsU0FBUyxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUM5QyxPQUFPLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBbUIsRUFBRSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQzVFLE9BQU8sRUFBRSxNQUFNLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUM5RCxPQUFPLEVBQUUsS0FBSyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sY0FBYyxDQUFDO0FBMEMzRCxNQUFNLFVBQVUsWUFBWSxDQUFDLFFBQWEsRUFBRSxVQUFnQztJQUMzRSxNQUFNLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxHQUFHLFVBQVUsQ0FBQztJQUVwRSwwREFBMEQ7SUFDMUQsSUFBSSxVQUFVLEVBQUUsQ0FBQztRQUNoQixNQUFNLFlBQVksR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3BFLElBQUksT0FBTyxZQUFZLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDdEMsT0FBTyxZQUFZLENBQUM7UUFDckIsQ0FBQztJQUNGLENBQUM7SUFFRCxxREFBcUQ7SUFDckQscURBQXFEO0lBQ3JELDhDQUE4QztJQUM5QyxJQUFJLFlBQVksR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDO0lBQ25DLElBQUksRUFBRSxvQ0FBNEIsSUFBSSxDQUFDLFNBQVMs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