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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFiZWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2xhYmVscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLFNBQVMsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUN6RCxPQUFPLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFDOUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQW1CLEVBQUUsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUM1RSxPQUFPLEVBQUUsTUFBTSxFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDOUQsT0FBTyxFQUFFLEtBQUssRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQTBDM0QsTUFBTSxVQUFVLFlBQVksQ0FBQyxRQUFhLEVBQUUsVUFBZ0M7SUFDM0UsTUFBTSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsR0FBRyxVQUFVLENBQUM7SUFFcEUsMERBQTBEO0lBQzFELElBQUksVUFBVSxFQUFFLENBQUM7UUFDaEIsTUFBTSxZQUFZLEdBQUcsb0JBQW9CLENBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNwRSxJQUFJLE9BQU8sWUFBWSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3RDLE9BQU8sWUFBWSxDQUFDO1FBQ3JCLENBQUM7SUFDRixDQUFDO0lBRUQscURBQXFEO0lBQ3JELHFEQUFxRDtJQUNyRCw4Q0FBOEM7SUFDOUMsSUFBSSxZQUFZLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQztJQUNuQyxJQUFJLEVBQUUsb0NBQTRCLElBQUksQ0FBQyxTQUFT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