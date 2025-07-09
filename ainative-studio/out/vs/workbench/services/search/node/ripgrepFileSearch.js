/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as cp from 'child_process';
import * as path from '../../../../base/common/path.js';
import { normalizeNFD } from '../../../../base/common/normalization.js';
import * as extpath from '../../../../base/common/extpath.js';
import { isMacintosh as isMac } from '../../../../base/common/platform.js';
import * as strings from '../../../../base/common/strings.js';
import { anchorGlob } from './ripgrepSearchUtils.js';
import { rgPath } from '@vscode/ripgrep';
// If @vscode/ripgrep is in an .asar file, then the binary is unpacked.
const rgDiskPath = rgPath.replace(/\bnode_modules\.asar\b/, 'node_modules.asar.unpacked');
export function spawnRipgrepCmd(config, folderQuery, includePattern, excludePattern, numThreads) {
    const rgArgs = getRgArgs(config, folderQuery, includePattern, excludePattern, numThreads);
    const cwd = folderQuery.folder.fsPath;
    return {
        cmd: cp.spawn(rgDiskPath, rgArgs.args, { cwd }),
        rgDiskPath,
        siblingClauses: rgArgs.siblingClauses,
        rgArgs,
        cwd
    };
}
function getRgArgs(config, folderQuery, includePattern, excludePattern, numThreads) {
    const args = ['--files', '--hidden', '--case-sensitive', '--no-require-git'];
    // includePattern can't have siblingClauses
    foldersToIncludeGlobs([folderQuery], includePattern, false).forEach(globArg => {
        const inclusion = anchorGlob(globArg);
        args.push('-g', inclusion);
        if (isMac) {
            const normalized = normalizeNFD(inclusion);
            if (normalized !== inclusion) {
                args.push('-g', normalized);
            }
        }
    });
    const rgGlobs = foldersToRgExcludeGlobs([folderQuery], excludePattern, undefined, false);
    rgGlobs.globArgs.forEach(globArg => {
        const exclusion = `!${anchorGlob(globArg)}`;
        args.push('-g', exclusion);
        if (isMac) {
            const normalized = normalizeNFD(exclusion);
            if (normalized !== exclusion) {
                args.push('-g', normalized);
            }
        }
    });
    if (folderQuery.disregardIgnoreFiles !== false) {
        // Don't use .gitignore or .ignore
        args.push('--no-ignore');
    }
    else if (folderQuery.disregardParentIgnoreFiles !== false) {
        args.push('--no-ignore-parent');
    }
    // Follow symlinks
    if (!folderQuery.ignoreSymlinks) {
        args.push('--follow');
    }
    if (config.exists) {
        args.push('--quiet');
    }
    if (numThreads) {
        args.push('--threads', `${numThreads}`);
    }
    args.push('--no-config');
    if (folderQuery.disregardGlobalIgnoreFiles) {
        args.push('--no-ignore-global');
    }
    return {
        args,
        siblingClauses: rgGlobs.siblingClauses
    };
}
function foldersToRgExcludeGlobs(folderQueries, globalExclude, excludesToSkip, absoluteGlobs = true) {
    const globArgs = [];
    let siblingClauses = {};
    folderQueries.forEach(folderQuery => {
        const totalExcludePattern = Object.assign({}, folderQuery.excludePattern || {}, globalExclude || {});
        const result = globExprsToRgGlobs(totalExcludePattern, absoluteGlobs ? folderQuery.folder.fsPath : undefined, excludesToSkip);
        globArgs.push(...result.globArgs);
        if (result.siblingClauses) {
            siblingClauses = Object.assign(siblingClauses, result.siblingClauses);
        }
    });
    return { globArgs, siblingClauses };
}
function foldersToIncludeGlobs(folderQueries, globalInclude, absoluteGlobs = true) {
    const globArgs = [];
    folderQueries.forEach(folderQuery => {
        const totalIncludePattern = Object.assign({}, globalInclude || {}, folderQuery.includePattern || {});
        const result = globExprsToRgGlobs(totalIncludePattern, absoluteGlobs ? folderQuery.folder.fsPath : undefined);
        globArgs.push(...result.globArgs);
    });
    return globArgs;
}
function globExprsToRgGlobs(patterns, folder, excludesToSkip) {
    const globArgs = [];
    const siblingClauses = {};
    Object.keys(patterns)
        .forEach(key => {
        if (excludesToSkip && excludesToSkip.has(key)) {
            return;
        }
        if (!key) {
            return;
        }
        const value = patterns[key];
        key = trimTrailingSlash(folder ? getAbsoluteGlob(folder, key) : key);
        // glob.ts requires forward slashes, but a UNC path still must start with \\
        // #38165 and #38151
        if (key.startsWith('\\\\')) {
            key = '\\\\' + key.substr(2).replace(/\\/g, '/');
        }
        else {
            key = key.replace(/\\/g, '/');
        }
        if (typeof value === 'boolean' && value) {
            if (key.startsWith('\\\\')) {
                // Absolute globs UNC paths don't work properly, see #58758
                key += '**';
            }
            globArgs.push(fixDriveC(key));
        }
        else if (value && value.when) {
            siblingClauses[key] = value;
        }
    });
    return { globArgs, siblingClauses };
}
/**
 * Resolves a glob like "node_modules/**" in "/foo/bar" to "/foo/bar/node_modules/**".
 * Special cases C:/foo paths to write the glob like /foo instead - see https://github.com/BurntSushi/ripgrep/issues/530.
 *
 * Exported for testing
 */
export function getAbsoluteGlob(folder, key) {
    return path.isAbsolute(key) ?
        key :
        path.join(folder, key);
}
function trimTrailingSlash(str) {
    str = strings.rtrim(str, '\\');
    return strings.rtrim(str, '/');
}
export function fixDriveC(path) {
    const root = extpath.getRoot(path);
    return root.toLowerCase() === 'c:/' ?
        path.replace(/^c:[/\\]/i, '/') :
        path;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmlwZ3JlcEZpbGVTZWFyY2guanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC9ub2RlL3JpcGdyZXBGaWxlU2VhcmNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3BDLE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUM7QUFFeEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3hFLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxFQUFFLFdBQVcsSUFBSSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMzRSxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFDO0FBRTlELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFFekMsdUVBQXVFO0FBQ3ZFLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsd0JBQXdCLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztBQUUxRixNQUFNLFVBQVUsZUFBZSxDQUFDLE1BQWtCLEVBQUUsV0FBeUIsRUFBRSxjQUFpQyxFQUFFLGNBQWlDLEVBQUUsVUFBbUI7SUFDdkssTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUMxRixNQUFNLEdBQUcsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztJQUN0QyxPQUFPO1FBQ04sR0FBRyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENB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