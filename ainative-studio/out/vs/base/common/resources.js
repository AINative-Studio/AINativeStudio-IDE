/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as extpath from './extpath.js';
import { Schemas } from './network.js';
import * as paths from './path.js';
import { isLinux, isWindows } from './platform.js';
import { compare as strCompare, equalsIgnoreCase } from './strings.js';
import { URI, uriToFsPath } from './uri.js';
export function originalFSPath(uri) {
    return uriToFsPath(uri, true);
}
export class ExtUri {
    constructor(_ignorePathCasing) {
        this._ignorePathCasing = _ignorePathCasing;
    }
    compare(uri1, uri2, ignoreFragment = false) {
        if (uri1 === uri2) {
            return 0;
        }
        return strCompare(this.getComparisonKey(uri1, ignoreFragment), this.getComparisonKey(uri2, ignoreFragment));
    }
    isEqual(uri1, uri2, ignoreFragment = false) {
        if (uri1 === uri2) {
            return true;
        }
        if (!uri1 || !uri2) {
            return false;
        }
        return this.getComparisonKey(uri1, ignoreFragment) === this.getComparisonKey(uri2, ignoreFragment);
    }
    getComparisonKey(uri, ignoreFragment = false) {
        return uri.with({
            path: this._ignorePathCasing(uri) ? uri.path.toLowerCase() : undefined,
            fragment: ignoreFragment ? null : undefined
        }).toString();
    }
    ignorePathCasing(uri) {
        return this._ignorePathCasing(uri);
    }
    isEqualOrParent(base, parentCandidate, ignoreFragment = false) {
        if (base.scheme === parentCandidate.scheme) {
            if (base.scheme === Schemas.file) {
                return extpath.isEqualOrParent(originalFSPath(base), originalFSPath(parentCandidate), this._ignorePathCasing(base)) && base.query === parentCandidate.query && (ignoreFragment || base.fragment === parentCandidate.fragment);
            }
            if (isEqualAuthority(base.authority, parentCandidate.authority)) {
                return extpath.isEqualOrParent(base.path, parentCandidate.path, this._ignorePathCasing(base), '/') && base.query === parentCandidate.query && (ignoreFragment || base.fragment === parentCandidate.fragment);
            }
        }
        return false;
    }
    // --- path math
    joinPath(resource, ...pathFragment) {
        return URI.joinPath(resource, ...pathFragment);
    }
    basenameOrAuthority(resource) {
        return basename(resource) || resource.authority;
    }
    basename(resource) {
        return paths.posix.basename(resource.path);
    }
    extname(resource) {
        return paths.posix.extname(resource.path);
    }
    dirname(resource) {
        if (resource.path.length === 0) {
            return resource;
        }
        let dirname;
        if (resource.scheme === Schemas.file) {
            dirname = URI.file(paths.dirname(originalFSPath(resource))).path;
        }
        else {
            dirname = paths.posix.dirname(resource.path);
            if (resource.authority && dirname.length && dirname.charCodeAt(0) !== 47 /* CharCode.Slash */) {
                console.error(`dirname("${resource.toString})) resulted in a relative path`);
                dirname = '/'; // If a URI contains an authority component, then the path component must either be empty or begin with a CharCode.Slash ("/") character
            }
        }
        return resource.with({
            path: dirname
        });
    }
    normalizePath(resource) {
        if (!resource.path.length) {
            return resource;
        }
        let normalizedPath;
        if (resource.scheme === Schemas.file) {
            normalizedPath = URI.file(paths.normalize(originalFSPath(resource))).path;
        }
        else {
            normalizedPath = paths.posix.normalize(resource.path);
        }
        return resource.with({
            path: normalizedPath
        });
    }
    relativePath(from, to) {
        if (from.scheme !== to.scheme || !isEqualAuthority(from.authority, to.authority)) {
            return undefined;
        }
        if (from.scheme === Schemas.file) {
            const relativePath = paths.relative(originalFSPath(from), originalFSPath(to));
            return isWindows ? extpath.toSlashes(relativePath) : relativePath;
        }
        let fromPath = from.path || '/';
        const toPath = to.path || '/';
        if (this._ignorePathCasing(from)) {
            // make casing of fromPath match toPath
            let i = 0;
            for (const len = Math.min(fromPath.length, toPath.length); i < len; i++) {
                if (fromPath.charCodeAt(i) !== toPath.charCodeAt(i)) {
                    if (fromPath.charAt(i).toLowerCase() !== toPath.charAt(i).toLowerCase()) {
                        break;
                    }
                }
            }
            fromPath = toPath.substr(0, i) + fromPath.substr(i);
        }
        return paths.posix.relative(fromPath, toPath);
    }
    resolvePath(base, path) {
        if (base.scheme === Schemas.file) {
            const newURI = URI.file(paths.resolve(originalFSPath(base), path));
            return base.with({
                authority: newURI.authority,
                path: newURI.path
            });
        }
        path = extpath.toPosixPath(path); // we allow path to be a windows path
        return base.with({
            path: paths.posix.resolve(base.path, path)
        });
    }
    // --- misc
    isAbsolutePath(resource) {
        return !!resource.path && resource.path[0] === '/';
    }
    isEqualAuthority(a1, a2) {
        return a1 === a2 || (a1 !== undefined && a2 !== undefined && equalsIgnoreCase(a1, a2));
    }
    hasTrailingPathSeparator(resource, sep = paths.sep) {
        if (resource.scheme === Schemas.file) {
            const fsp = originalFSPath(resource);
            return fsp.length > extpath.getRoot(fsp).length && fsp[fsp.length - 1] === sep;
        }
        else {
            const p = resource.path;
            return (p.length > 1 && p.charCodeAt(p.length - 1) === 47 /* CharCode.Slash */) && !(/^[a-zA-Z]:(\/$|\\$)/.test(resource.fsPath)); // ignore the slash at offset 0
        }
    }
    removeTrailingPathSeparator(resource, sep = paths.sep) {
        // Make sure that the path isn't a drive letter. A trailing separator there is not removable.
        if (hasTrailingPathSeparator(resource, sep)) {
            return resource.with({ path: resource.path.substr(0, resource.path.length - 1) });
        }
        return resource;
    }
    addTrailingPathSeparator(resource, sep = paths.sep) {
        let isRootSep = false;
        if (resource.scheme === Schemas.file) {
            const fsp = originalFSPath(resource);
            isRootSep = ((fsp !== undefined) && (fsp.length === extpath.getRoot(fsp).length) && (fsp[fsp.length - 1] === sep));
        }
        else {
            sep = '/';
            const p = resource.path;
            isRootSep = p.length === 1 && p.charCodeAt(p.length - 1) === 47 /* CharCode.Slash */;
        }
        if (!isRootSep && !hasTrailingPathSeparator(resource, sep)) {
            return resource.with({ path: resource.path + '/' });
        }
        return resource;
    }
}
/**
 * Unbiased utility that takes uris "as they are". This means it can be interchanged with
 * uri#toString() usages. The following is true
 * ```
 * assertEqual(aUri.toString() === bUri.toString(), exturi.isEqual(aUri, bUri))
 * ```
 */
export const extUri = new ExtUri(() => false);
/**
 * BIASED utility that _mostly_ ignored the case of urs paths. ONLY use this util if you
 * understand what you are doing.
 *
 * This utility is INCOMPATIBLE with `uri.toString()`-usages and both CANNOT be used interchanged.
 *
 * When dealing with uris from files or documents, `extUri` (the unbiased friend)is sufficient
 * because those uris come from a "trustworthy source". When creating unknown uris it's always
 * better to use `IUriIdentityService` which exposes an `IExtUri`-instance which knows when path
 * casing matters.
 */
export const extUriBiasedIgnorePathCase = new ExtUri(uri => {
    // A file scheme resource is in the same platform as code, so ignore case for non linux platforms
    // Resource can be from another platform. Lowering the case as an hack. Should come from File system provider
    return uri.scheme === Schemas.file ? !isLinux : true;
});
/**
 * BIASED utility that always ignores the casing of uris paths. ONLY use this util if you
 * understand what you are doing.
 *
 * This utility is INCOMPATIBLE with `uri.toString()`-usages and both CANNOT be used interchanged.
 *
 * When dealing with uris from files or documents, `extUri` (the unbiased friend)is sufficient
 * because those uris come from a "trustworthy source". When creating unknown uris it's always
 * better to use `IUriIdentityService` which exposes an `IExtUri`-instance which knows when path
 * casing matters.
 */
export const extUriIgnorePathCase = new ExtUri(_ => true);
export const isEqual = extUri.isEqual.bind(extUri);
export const isEqualOrParent = extUri.isEqualOrParent.bind(extUri);
export const getComparisonKey = extUri.getComparisonKey.bind(extUri);
export const basenameOrAuthority = extUri.basenameOrAuthority.bind(extUri);
export const basename = extUri.basename.bind(extUri);
export const extname = extUri.extname.bind(extUri);
export const dirname = extUri.dirname.bind(extUri);
export const joinPath = extUri.joinPath.bind(extUri);
export const normalizePath = extUri.normalizePath.bind(extUri);
export const relativePath = extUri.relativePath.bind(extUri);
export const resolvePath = extUri.resolvePath.bind(extUri);
export const isAbsolutePath = extUri.isAbsolutePath.bind(extUri);
export const isEqualAuthority = extUri.isEqualAuthority.bind(extUri);
export const hasTrailingPathSeparator = extUri.hasTrailingPathSeparator.bind(extUri);
export const removeTrailingPathSeparator = extUri.removeTrailingPathSeparator.bind(extUri);
export const addTrailingPathSeparator = extUri.addTrailingPathSeparator.bind(extUri);
//#endregion
export function distinctParents(items, resourceAccessor) {
    const distinctParents = [];
    for (let i = 0; i < items.length; i++) {
        const candidateResource = resourceAccessor(items[i]);
        if (items.some((otherItem, index) => {
            if (index === i) {
                return false;
            }
            return isEqualOrParent(candidateResource, resourceAccessor(otherItem));
        })) {
            continue;
        }
        distinctParents.push(items[i]);
    }
    return distinctParents;
}
/**
 * Data URI related helpers.
 */
export var DataUri;
(function (DataUri) {
    DataUri.META_DATA_LABEL = 'label';
    DataUri.META_DATA_DESCRIPTION = 'description';
    DataUri.META_DATA_SIZE = 'size';
    DataUri.META_DATA_MIME = 'mime';
    function parseMetaData(dataUri) {
        const metadata = new Map();
        // Given a URI of:  data:image/png;size:2313;label:SomeLabel;description:SomeDescription;base64,77+9UE5...
        // the metadata is: size:2313;label:SomeLabel;description:SomeDescription
        const meta = dataUri.path.substring(dataUri.path.indexOf(';') + 1, dataUri.path.lastIndexOf(';'));
        meta.split(';').forEach(property => {
            const [key, value] = property.split(':');
            if (key && value) {
                metadata.set(key, value);
            }
        });
        // Given a URI of:  data:image/png;size:2313;label:SomeLabel;description:SomeDescription;base64,77+9UE5...
        // the mime is: image/png
        const mime = dataUri.path.substring(0, dataUri.path.indexOf(';'));
        if (mime) {
            metadata.set(DataUri.META_DATA_MIME, mime);
        }
        return metadata;
    }
    DataUri.parseMetaData = parseMetaData;
})(DataUri || (DataUri = {}));
export function toLocalResource(resource, authority, localScheme) {
    if (authority) {
        let path = resource.path;
        if (path && path[0] !== paths.posix.sep) {
            path = paths.posix.sep + path;
        }
        return resource.with({ scheme: localScheme, authority, path });
    }
    return resource.with({ scheme: localScheme });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL3Jlc291cmNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEtBQUssT0FBTyxNQUFNLGNBQWMsQ0FBQztBQUN4QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ3ZDLE9BQU8sS0FBSyxLQUFLLE1BQU0sV0FBVyxDQUFDO0FBQ25DLE9BQU8sRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ25ELE9BQU8sRUFBRSxPQUFPLElBQUksVUFBVSxFQUFFLGdCQUFnQixFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxHQUFHLEVBQUUsV0FBVyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBRTVDLE1BQU0sVUFBVSxjQUFjLENBQUMsR0FBUTtJQUN0QyxPQUFPLFdBQVcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDL0IsQ0FBQztBQTJIRCxNQUFNLE9BQU8sTUFBTTtJQUVsQixZQUFvQixpQkFBd0M7UUFBeEMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUF1QjtJQUFJLENBQUM7SUFFakUsT0FBTyxDQUFDLElBQVMsRUFBRSxJQUFTLEVBQUUsaUJBQTBCLEtBQUs7UUFDNUQsSUFBSSxJQUFJLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDbkIsT0FBTyxDQUFDLENBQUM7UUFDVixDQUFDO1FBQ0QsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7SUFDN0csQ0FBQztJQUVELE9BQU8sQ0FB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