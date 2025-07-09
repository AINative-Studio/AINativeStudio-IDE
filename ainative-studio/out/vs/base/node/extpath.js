/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import { basename, dirname, join, normalize, sep } from '../common/path.js';
import { isLinux } from '../common/platform.js';
import { rtrim } from '../common/strings.js';
import { Promises } from './pfs.js';
/**
 * Copied from: https://github.com/microsoft/vscode-node-debug/blob/master/src/node/pathUtilities.ts#L83
 *
 * Given an absolute, normalized, and existing file path 'realcase' returns the exact path that the file has on disk.
 * On a case insensitive file system, the returned path might differ from the original path by character casing.
 * On a case sensitive file system, the returned path will always be identical to the original path.
 * In case of errors, null is returned. But you cannot use this function to verify that a path exists.
 * realcase does not handle '..' or '.' path segments and it does not take the locale into account.
 */
export async function realcase(path, token) {
    if (isLinux) {
        // This method is unsupported on OS that have case sensitive
        // file system where the same path can exist in different forms
        // (see also https://github.com/microsoft/vscode/issues/139709)
        return path;
    }
    const dir = dirname(path);
    if (path === dir) { // end recursion
        return path;
    }
    const name = (basename(path) /* can be '' for windows drive letters */ || path).toLowerCase();
    try {
        if (token?.isCancellationRequested) {
            return null;
        }
        const entries = await Promises.readdir(dir);
        const found = entries.filter(e => e.toLowerCase() === name); // use a case insensitive search
        if (found.length === 1) {
            // on a case sensitive filesystem we cannot determine here, whether the file exists or not, hence we need the 'file exists' precondition
            const prefix = await realcase(dir, token); // recurse
            if (prefix) {
                return join(prefix, found[0]);
            }
        }
        else if (found.length > 1) {
            // must be a case sensitive $filesystem
            const ix = found.indexOf(name);
            if (ix >= 0) { // case sensitive
                const prefix = await realcase(dir, token); // recurse
                if (prefix) {
                    return join(prefix, found[ix]);
                }
            }
        }
    }
    catch (error) {
        // silently ignore error
    }
    return null;
}
export async function realpath(path) {
    try {
        // DO NOT USE `fs.promises.realpath` here as it internally
        // calls `fs.native.realpath` which will result in subst
        // drives to be resolved to their target on Windows
        // https://github.com/microsoft/vscode/issues/118562
        return await Promises.realpath(path);
    }
    catch (error) {
        // We hit an error calling fs.realpath(). Since fs.realpath() is doing some path normalization
        // we now do a similar normalization and then try again if we can access the path with read
        // permissions at least. If that succeeds, we return that path.
        // fs.realpath() is resolving symlinks and that can fail in certain cases. The workaround is
        // to not resolve links but to simply see if the path is read accessible or not.
        const normalizedPath = normalizePath(path);
        await fs.promises.access(normalizedPath, fs.constants.R_OK);
        return normalizedPath;
    }
}
export function realpathSync(path) {
    try {
        return fs.realpathSync(path);
    }
    catch (error) {
        // We hit an error calling fs.realpathSync(). Since fs.realpathSync() is doing some path normalization
        // we now do a similar normalization and then try again if we can access the path with read
        // permissions at least. If that succeeds, we return that path.
        // fs.realpath() is resolving symlinks and that can fail in certain cases. The workaround is
        // to not resolve links but to simply see if the path is read accessible or not.
        const normalizedPath = normalizePath(path);
        fs.accessSync(normalizedPath, fs.constants.R_OK); // throws in case of an error
        return normalizedPath;
    }
}
function normalizePath(path) {
    return rtrim(normalize(path), sep);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0cGF0aC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL25vZGUvZXh0cGF0aC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQztBQUV6QixPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzVFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNoRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDN0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUVwQzs7Ozs7Ozs7R0FRRztBQUNILE1BQU0sQ0FBQyxLQUFLLFVBQVUsUUFBUSxDQUFDLElBQVksRUFBRSxLQUF5QjtJQUNyRSxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ2IsNERBQTREO1FBQzVELCtEQUErRDtRQUMvRCwrREFBK0Q7UUFDL0QsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzFCLElBQUksSUFBSSxLQUFLLEdBQUcsRUFBRSxDQUFDLENBQUMsZ0JBQWdCO1FBQ25DLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELE1BQU0sSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLHlDQUF5QyxJQUFJLElBQUksQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQzlGLElBQUksQ0FBQztRQUNKLElBQUksS0FBSyxFQUFFLHVCQUF1QixFQUFFLENBQUM7WUFDcEMsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FB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