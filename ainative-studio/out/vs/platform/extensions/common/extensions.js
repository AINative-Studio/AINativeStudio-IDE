/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../base/common/strings.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { getRemoteName } from '../../remote/common/remoteHosts.js';
export const USER_MANIFEST_CACHE_FILE = 'extensions.user.cache';
export const BUILTIN_MANIFEST_CACHE_FILE = 'extensions.builtin.cache';
export const UNDEFINED_PUBLISHER = 'undefined_publisher';
export const ALL_EXTENSION_KINDS = ['ui', 'workspace', 'web'];
export function getWorkspaceSupportTypeMessage(supportType) {
    if (typeof supportType === 'object' && supportType !== null) {
        if (supportType.supported !== true) {
            return supportType.description;
        }
    }
    return undefined;
}
export const EXTENSION_CATEGORIES = [
    'AI',
    'Azure',
    'Chat',
    'Data Science',
    'Debuggers',
    'Extension Packs',
    'Education',
    'Formatters',
    'Keymaps',
    'Language Packs',
    'Linters',
    'Machine Learning',
    'Notebooks',
    'Programming Languages',
    'SCM Providers',
    'Snippets',
    'Testing',
    'Themes',
    'Visualization',
    'Other',
];
export var ExtensionType;
(function (ExtensionType) {
    ExtensionType[ExtensionType["System"] = 0] = "System";
    ExtensionType[ExtensionType["User"] = 1] = "User";
})(ExtensionType || (ExtensionType = {}));
export var TargetPlatform;
(function (TargetPlatform) {
    TargetPlatform["WIN32_X64"] = "win32-x64";
    TargetPlatform["WIN32_ARM64"] = "win32-arm64";
    TargetPlatform["LINUX_X64"] = "linux-x64";
    TargetPlatform["LINUX_ARM64"] = "linux-arm64";
    TargetPlatform["LINUX_ARMHF"] = "linux-armhf";
    TargetPlatform["ALPINE_X64"] = "alpine-x64";
    TargetPlatform["ALPINE_ARM64"] = "alpine-arm64";
    TargetPlatform["DARWIN_X64"] = "darwin-x64";
    TargetPlatform["DARWIN_ARM64"] = "darwin-arm64";
    TargetPlatform["WEB"] = "web";
    TargetPlatform["UNIVERSAL"] = "universal";
    TargetPlatform["UNKNOWN"] = "unknown";
    TargetPlatform["UNDEFINED"] = "undefined";
})(TargetPlatform || (TargetPlatform = {}));
/**
 * **!Do not construct directly!**
 *
 * **!Only static methods because it gets serialized!**
 *
 * This represents the "canonical" version for an extension identifier. Extension ids
 * have to be case-insensitive (due to the marketplace), but we must ensure case
 * preservation because the extension API is already public at this time.
 *
 * For example, given an extension with the publisher `"Hello"` and the name `"World"`,
 * its canonical extension identifier is `"Hello.World"`. This extension could be
 * referenced in some other extension's dependencies using the string `"hello.world"`.
 *
 * To make matters more complicated, an extension can optionally have an UUID. When two
 * extensions have the same UUID, they are considered equal even if their identifier is different.
 */
export class ExtensionIdentifier {
    constructor(value) {
        this.value = value;
        this._lower = value.toLowerCase();
    }
    static equals(a, b) {
        if (typeof a === 'undefined' || a === null) {
            return (typeof b === 'undefined' || b === null);
        }
        if (typeof b === 'undefined' || b === null) {
            return false;
        }
        if (typeof a === 'string' || typeof b === 'string') {
            // At least one of the arguments is an extension id in string form,
            // so we have to use the string comparison which ignores case.
            const aValue = (typeof a === 'string' ? a : a.value);
            const bValue = (typeof b === 'string' ? b : b.value);
            return strings.equalsIgnoreCase(aValue, bValue);
        }
        // Now we know both arguments are ExtensionIdentifier
        return (a._lower === b._lower);
    }
    /**
     * Gives the value by which to index (for equality).
     */
    static toKey(id) {
        if (typeof id === 'string') {
            return id.toLowerCase();
        }
        return id._lower;
    }
}
export class ExtensionIdentifierSet {
    get size() {
        return this._set.size;
    }
    constructor(iterable) {
        this._set = new Set();
        if (iterable) {
            for (const value of iterable) {
                this.add(value);
            }
        }
    }
    add(id) {
        this._set.add(ExtensionIdentifier.toKey(id));
    }
    delete(extensionId) {
        return this._set.delete(ExtensionIdentifier.toKey(extensionId));
    }
    has(id) {
        return this._set.has(ExtensionIdentifier.toKey(id));
    }
}
export class ExtensionIdentifierMap {
    constructor() {
        this._map = new Map();
    }
    clear() {
        this._map.clear();
    }
    delete(id) {
        this._map.delete(ExtensionIdentifier.toKey(id));
    }
    get(id) {
        return this._map.get(ExtensionIdentifier.toKey(id));
    }
    has(id) {
        return this._map.has(ExtensionIdentifier.toKey(id));
    }
    set(id, value) {
        this._map.set(ExtensionIdentifier.toKey(id), value);
    }
    values() {
        return this._map.values();
    }
    forEach(callbackfn) {
        this._map.forEach(callbackfn);
    }
    [Symbol.iterator]() {
        return this._map[Symbol.iterator]();
    }
}
/**
 * An error that is clearly from an extension, identified by the `ExtensionIdentifier`
 */
export class ExtensionError extends Error {
    constructor(extensionIdentifier, cause, message) {
        super(`Error in extension ${ExtensionIdentifier.toKey(extensionIdentifier)}: ${message ?? cause.message}`, { cause });
        this.name = 'ExtensionError';
        this.extension = extensionIdentifier;
    }
}
export function isApplicationScopedExtension(manifest) {
    return isLanguagePackExtension(manifest);
}
export function isLanguagePackExtension(manifest) {
    return manifest.contributes && manifest.contributes.localizations ? manifest.contributes.localizations.length > 0 : false;
}
export function isAuthenticationProviderExtension(manifest) {
    return manifest.contributes && manifest.contributes.authentication ? manifest.contributes.authentication.length > 0 : false;
}
export function isResolverExtension(manifest, remoteAuthority) {
    if (remoteAuthority) {
        const activationEvent = `onResolveRemoteAuthority:${getRemoteName(remoteAuthority)}`;
        return !!manifest.activationEvents?.includes(activationEvent);
    }
    return false;
}
export function parseApiProposals(enabledApiProposals) {
    return enabledApiProposals.map(proposal => {
        const [proposalName, version] = proposal.split('@');
        return { proposalName, version: version ? parseInt(version) : undefined };
    });
}
export function parseEnabledApiProposalNames(enabledApiProposals) {
    return enabledApiProposals.map(proposal => proposal.split('@')[0]);
}
export const IBuiltinExtensionsScannerService = createDecorator('IBuiltinExtensionsScannerService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25zL2NvbW1vbi9leHRlbnNpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUM7QUFJM0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUVuRSxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyx1QkFBdUIsQ0FBQztBQUNoRSxNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRywwQkFBMEIsQ0FBQztBQUN0RSxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxxQkFBcUIsQ0FBQztBQW9OekQsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQTZCLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQztBQVN4RixNQUFNLFVBQVUsOEJBQThCLENBQUMsV0FBOEY7SUFDNUksSUFBSSxPQUFPLFdBQVcsS0FBSyxRQUFRLElBQUksV0FBVyxLQUFLLElBQUksRUFBRSxDQUFDO1FBQzdELElBQUksV0FBVyxDQUFDLFNBQVMsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUNwQyxPQUFPLFdBQVcsQ0FBQyxXQUFXLENBQUM7UUFDaEMsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLFNBQVMsQ0FBQztBQUNsQixDQUFDO0FBUUQsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUc7SUFDbkMsSUFBSTtJQUNKLE9BQU87SUFDUCxNQUFNO0lBQ04sY0FBYztJQUNkLFdBQVc7SUFDWCxpQkFBaUI7SUFDakIsV0FBVztJQUNYLFlBQVk7SUFDWixTQUFTO0lBQ1QsZ0JBQWdCO0lBQ2hCLFNBQVM7SUFDVCxrQkFBa0I7SUFDbEIsV0FBVztJQUNYLHVCQUF1QjtJQUN2QixlQUFlO0lBQ2YsVUFBVTtJQUNWLFNBQVM7SUFDVCxRQUFRO0lBQ1IsZUFBZTtJQUNmLE9BQU87Q0FDUCxDQUFDO0FBa0NGLE1BQU0sQ0FBTixJQUFrQixhQUdqQjtBQUhELFdBQWtCLGFBQWE7SUFDOUIscURBQU0sQ0FBQTtJQUNOLGlEQUFJLENBQUE7QUFDTCxDQUFDLEVBSGlCLGFBQWEsS0FBYixhQUFhLFFBRzlCO0FBRUQsTUFBTSxDQUFOLElBQWtCLGNBbUJqQjtBQW5CRCxXQUFrQixjQUFjO0lBQy9CLHlDQUF1QixDQUFBO0lBQ3ZCLDZDQUEyQixDQUFBO0lBRTNCLHlDQUF1QixDQUFBO0lBQ3ZCLDZDQUEyQixDQUFBO0lBQzNCLDZDQUEyQixDQUFBO0lBRTNCLDJDQUF5QixDQUFBO0lBQ3pCLCtDQUE2QixDQUFBO0lBRTdCLDJDQUF5QixDQUFBO0lBQ3pCLCtDQUE2QixDQUFBO0lBRTdCLDZCQUFXLENBQUE7SUFFWCx5Q0FBdUIsQ0FBQTtJQUN2QixxQ0FBbUIsQ0FBQTtJQUNuQix5Q0FBdUIsQ0FBQTtBQUN4QixDQUFDLEVBbkJpQixjQUFjLEtBQWQsY0FBYyxRQW1CL0I7QUFpQkQ7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBQ0gsTUFBTSxPQUFPLG1CQUFtQjtJQVMvQixZQUFZLEtBQWE7UUFDeEIsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbkIsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDbkMsQ0FBQztJQUVNLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBa0QsRUFBRSxDQUFrRDtRQUMxSCxJQUFJLE9BQU8sQ0FBQyxLQUFLLFdBQVcsSUFBSSxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDNUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLFdBQVcsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUM7UUFDakQsQ0FBQztRQUNELElBQUksT0FBTyxDQUFDLEtBQUssV0FBVyxJQUFJLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUM1QyxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFDRCxJQUFJLE9BQU8sQ0FBQyxLQUFLLFFBQVEsSUFBSSxPQUFPLENBQUMsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNwRCxtRUFBbUU7WUFDbkUsOERBQThEO1lBQzlELE1BQU0sTUFBTSxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNyRCxNQUFNLE1BQU0sR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDckQsT0FBTyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ2pELENBQUM7UUFFRCxxREFBcUQ7UUFDckQsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ2hDLENBQUM7SUFFRDs7T0FFRztJQUNJLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBZ0M7UUFDbkQsSUFBSSxPQUFPLEVBQUUsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUM1QixPQUFPLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUN6QixDQUFDO1FBQ0QsT0FBTyxFQUFFLENBQUMsTUFBTSxDQUFDO0lBQ2xCLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxzQkFBc0I7SUFJbEMsSUFBVyxJQUFJO1FBQ2QsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztJQUN2QixDQUFDO0lBRUQsWUFBWSxRQUFpRDtRQU41QyxTQUFJLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQU96QyxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2QsS0FBSyxNQUFNLEtBQUssSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDOUIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNqQixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTSxHQUFHLENBQUMsRUFBZ0M7UUFDMUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUVNLE1BQU0sQ0FBQyxXQUFnQztRQUM3QyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO0lBQ2pFLENBQUM7SUFFTSxHQUFHLENBQUMsRUFBZ0M7UUFDMUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNyRCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sc0JBQXNCO0lBQW5DO1FBRWtCLFNBQUksR0FBRyxJQUFJLEdBQUcsRUFBYSxDQUFDO0lBaUM5QyxDQUFDO0lBL0JPLEtBQUs7UUFDWCxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ25CLENBQUM7SUFFTSxNQUFNLENBQUMsRUFBZ0M7UUFDN0MsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDakQsQ0FBQztJQUVNLEdBQUcsQ0FBQyxFQUFnQztRQUMxQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFFTSxHQUFHLENBQUMsRUFBZ0M7UUFDMUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNyRCxDQUFDO0lBRU0sR0FBRyxDQUFDLEVBQWdDLEVBQUUsS0FBUTtRQUNwRCxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDckQsQ0FBQztJQUVNLE1BQU07UUFDWixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDM0IsQ0FBQztJQUVELE9BQU8sQ0FBQyxVQUFnRTtRQUN2RSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUMvQixDQUFDO0lBRUQsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztJQUNyQyxDQUFDO0NBQ0Q7QUFFRDs7R0FFRztBQUNILE1BQU0sT0FBTyxjQUFlLFNBQVEsS0FBSztJQUl4QyxZQUFZLG1CQUF3QyxFQUFFLEtBQVksRUFBRSxPQUFnQjtRQUNuRixLQUFLLENBQUMsc0JBQXNCLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLE9BQU8sSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ3RILElBQUksQ0FBQyxJQUFJLEdBQUcsZ0JBQWdCLENBQUM7UUFDN0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxtQkFBbUIsQ0FBQztJQUN0QyxDQUFDO0NBQ0Q7QUFpQkQsTUFBTSxVQUFVLDRCQUE0QixDQUFDLFFBQTRCO0lBQ3hFLE9BQU8sdUJBQXVCLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDMUMsQ0FBQztBQUVELE1BQU0sVUFBVSx1QkFBdUIsQ0FBQyxRQUE0QjtJQUNuRSxPQUFPLFFBQVEsQ0FBQyxXQUFXLElBQUksUUFBUSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUMzSCxDQUFDO0FBRUQsTUFBTSxVQUFVLGlDQUFpQyxDQUFDLFFBQTRCO0lBQzdFLE9BQU8sUUFBUSxDQUFDLFdBQVcsSUFBSSxRQUFRLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQzdILENBQUM7QUFFRCxNQUFNLFVBQVUsbUJBQW1CLENBQUMsUUFBNEIsRUFBRSxlQUFtQztJQUNwRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ3JCLE1BQU0sZUFBZSxHQUFHLDRCQUE0QixhQUFhLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQztRQUNyRixPQUFPLENBQUMsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQy9ELENBQUM7SUFDRCxPQUFPLEtBQUssQ0FBQztBQUNkLENBQUM7QUFFRCxNQUFNLFVBQVUsaUJBQWlCLENBQUMsbUJBQTZCO0lBQzlELE9BQU8sbUJBQW1CLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFO1FBQ3pDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNwRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDM0UsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsTUFBTSxVQUFVLDRCQUE0QixDQUFDLG1CQUE2QjtJQUN6RSxPQUFPLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwRSxDQUFDO0FBRUQsTUFBTSxDQUFDLE1BQU0sZ0NBQWdDLEdBQUcsZUFBZSxDQUFtQyxrQ0FBa0MsQ0FBQyxDQUFDIn0=