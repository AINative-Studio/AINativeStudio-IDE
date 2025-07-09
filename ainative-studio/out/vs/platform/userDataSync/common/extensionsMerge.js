/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepClone, equals } from '../../../base/common/objects.js';
import * as semver from '../../../base/common/semver/semver.js';
import { assertIsDefined } from '../../../base/common/types.js';
export function merge(localExtensions, remoteExtensions, lastSyncExtensions, skippedExtensions, ignoredExtensions, lastSyncBuiltinExtensions) {
    const added = [];
    const removed = [];
    const updated = [];
    if (!remoteExtensions) {
        const remote = localExtensions.filter(({ identifier }) => ignoredExtensions.every(id => id.toLowerCase() !== identifier.id.toLowerCase()));
        return {
            local: {
                added,
                removed,
                updated,
            },
            remote: remote.length > 0 ? {
                added: remote,
                updated: [],
                removed: [],
                all: remote
            } : null
        };
    }
    localExtensions = localExtensions.map(massageIncomingExtension);
    remoteExtensions = remoteExtensions.map(massageIncomingExtension);
    lastSyncExtensions = lastSyncExtensions ? lastSyncExtensions.map(massageIncomingExtension) : null;
    const uuids = new Map();
    const addUUID = (identifier) => { if (identifier.uuid) {
        uuids.set(identifier.id.toLowerCase(), identifier.uuid);
    } };
    localExtensions.forEach(({ identifier }) => addUUID(identifier));
    remoteExtensions.forEach(({ identifier }) => addUUID(identifier));
    lastSyncExtensions?.forEach(({ identifier }) => addUUID(identifier));
    skippedExtensions?.forEach(({ identifier }) => addUUID(identifier));
    lastSyncBuiltinExtensions?.forEach(identifier => addUUID(identifier));
    const getKey = (extension) => {
        const uuid = extension.identifier.uuid || uuids.get(extension.identifier.id.toLowerCase());
        return uuid ? `uuid:${uuid}` : `id:${extension.identifier.id.toLowerCase()}`;
    };
    const addExtensionToMap = (map, extension) => {
        map.set(getKey(extension), extension);
        return map;
    };
    const localExtensionsMap = localExtensions.reduce(addExtensionToMap, new Map());
    const remoteExtensionsMap = remoteExtensions.reduce(addExtensionToMap, new Map());
    const newRemoteExtensionsMap = remoteExtensions.reduce((map, extension) => addExtensionToMap(map, deepClone(extension)), new Map());
    const lastSyncExtensionsMap = lastSyncExtensions ? lastSyncExtensions.reduce(addExtensionToMap, new Map()) : null;
    const skippedExtensionsMap = skippedExtensions.reduce(addExtensionToMap, new Map());
    const ignoredExtensionsSet = ignoredExtensions.reduce((set, id) => {
        const uuid = uuids.get(id.toLowerCase());
        return set.add(uuid ? `uuid:${uuid}` : `id:${id.toLowerCase()}`);
    }, new Set());
    const lastSyncBuiltinExtensionsSet = lastSyncBuiltinExtensions ? lastSyncBuiltinExtensions.reduce((set, { id, uuid }) => {
        uuid = uuid ?? uuids.get(id.toLowerCase());
        return set.add(uuid ? `uuid:${uuid}` : `id:${id.toLowerCase()}`);
    }, new Set()) : null;
    const localToRemote = compare(localExtensionsMap, remoteExtensionsMap, ignoredExtensionsSet, false);
    if (localToRemote.added.size > 0 || localToRemote.removed.size > 0 || localToRemote.updated.size > 0) {
        const baseToLocal = compare(lastSyncExtensionsMap, localExtensionsMap, ignoredExtensionsSet, false);
        const baseToRemote = compare(lastSyncExtensionsMap, remoteExtensionsMap, ignoredExtensionsSet, true);
        const merge = (key, localExtension, remoteExtension, preferred) => {
            let pinned, version, preRelease;
            if (localExtension.installed) {
                pinned = preferred.pinned;
                preRelease = preferred.preRelease;
                if (pinned) {
                    version = preferred.version;
                }
            }
            else {
                pinned = remoteExtension.pinned;
                preRelease = remoteExtension.preRelease;
                if (pinned) {
                    version = remoteExtension.version;
                }
            }
            if (pinned === undefined /* from older client*/) {
                pinned = localExtension.pinned;
                if (pinned) {
                    version = localExtension.version;
                }
            }
            if (preRelease === undefined /* from older client*/) {
                preRelease = localExtension.preRelease;
            }
            return {
                ...preferred,
                installed: localExtension.installed || remoteExtension.installed,
                pinned,
                preRelease,
                version: version ?? (remoteExtension.version && (!localExtension.installed || semver.gt(remoteExtension.version, localExtension.version)) ? remoteExtension.version : localExtension.version),
                state: mergeExtensionState(localExtension, remoteExtension, lastSyncExtensionsMap?.get(key)),
            };
        };
        // Remotely removed extension => exist in base and does not in remote
        for (const key of baseToRemote.removed.values()) {
            const localExtension = localExtensionsMap.get(key);
            if (!localExtension) {
                continue;
            }
            const baseExtension = assertIsDefined(lastSyncExtensionsMap?.get(key));
            const wasAnInstalledExtensionDuringLastSync = lastSyncBuiltinExtensionsSet && !lastSyncBuiltinExtensionsSet.has(key) && baseExtension.installed;
            if (localExtension.installed && wasAnInstalledExtensionDuringLastSync /* It is an installed extension now and during last sync */) {
                // Installed extension is removed from remote. Remove it from local.
                removed.push(localExtension.identifier);
            }
            else {
                // Add to remote: It is a builtin extenision or got installed after last sync
                newRemoteExtensionsMap.set(key, localExtension);
            }
        }
        // Remotely added extension => does not exist in base and exist in remote
        for (const key of baseToRemote.added.values()) {
            const remoteExtension = assertIsDefined(remoteExtensionsMap.get(key));
            const localExtension = localExtensionsMap.get(key);
            // Also exist in local
            if (localExtension) {
                // Is different from local to remote
                if (localToRemote.updated.has(key)) {
                    const mergedExtension = merge(key, localExtension, remoteExtension, remoteExtension);
                    // Update locally only when the extension has changes in properties other than installed poperty
                    if (!areSame(localExtension, remoteExtension, false, false)) {
                        updated.push(massageOutgoingExtension(mergedExtension, key));
                    }
                    newRemoteExtensionsMap.set(key, mergedExtension);
                }
            }
            else {
                // Add only if the extension is an installed extension
                if (remoteExtension.installed) {
                    added.push(massageOutgoingExtension(remoteExtension, key));
                }
            }
        }
        // Remotely updated extension => exist in base and remote
        for (const key of baseToRemote.updated.values()) {
            const remoteExtension = assertIsDefined(remoteExtensionsMap.get(key));
            const baseExtension = assertIsDefined(lastSyncExtensionsMap?.get(key));
            const localExtension = localExtensionsMap.get(key);
            // Also exist in local
            if (localExtension) {
                const wasAnInstalledExtensionDuringLastSync = lastSyncBuiltinExtensionsSet && !lastSyncBuiltinExtensionsSet.has(key) && baseExtension.installed;
                if (wasAnInstalledExtensionDuringLastSync && localExtension.installed && !remoteExtension.installed) {
                    // Remove it locally if it is installed locally and not remotely
                    removed.push(localExtension.identifier);
                }
                else {
                    // Update in local always
                    const mergedExtension = merge(key, localExtension, remoteExtension, remoteExtension);
                    updated.push(massageOutgoingExtension(mergedExtension, key));
                    newRemoteExtensionsMap.set(key, mergedExtension);
                }
            }
            // Add it locally if does not exist locally and installed remotely
            else if (remoteExtension.installed) {
                added.push(massageOutgoingExtension(remoteExtension, key));
            }
        }
        // Locally added extension => does not exist in base and exist in local
        for (const key of baseToLocal.added.values()) {
            // If added in remote (already handled)
            if (baseToRemote.added.has(key)) {
                continue;
            }
            newRemoteExtensionsMap.set(key, assertIsDefined(localExtensionsMap.get(key)));
        }
        // Locally updated extension => exist in base and local
        for (const key of baseToLocal.updated.values()) {
            // If removed in remote (already handled)
            if (baseToRemote.removed.has(key)) {
                continue;
            }
            // If updated in remote (already handled)
            if (baseToRemote.updated.has(key)) {
                continue;
            }
            const localExtension = assertIsDefined(localExtensionsMap.get(key));
            const remoteExtension = assertIsDefined(remoteExtensionsMap.get(key));
            // Update remotely
            newRemoteExtensionsMap.set(key, merge(key, localExtension, remoteExtension, localExtension));
        }
        // Locally removed extensions => exist in base and does not exist in local
        for (const key of baseToLocal.removed.values()) {
            // If updated in remote (already handled)
            if (baseToRemote.updated.has(key)) {
                continue;
            }
            // If removed in remote (already handled)
            if (baseToRemote.removed.has(key)) {
                continue;
            }
            // Skipped
            if (skippedExtensionsMap.has(key)) {
                continue;
            }
            // Skip if it is a builtin extension
            if (!assertIsDefined(remoteExtensionsMap.get(key)).installed) {
                continue;
            }
            // Skip if last sync builtin extensions set is not available
            if (!lastSyncBuiltinExtensionsSet) {
                continue;
            }
            // Skip if it was a builtin extension during last sync
            if (lastSyncBuiltinExtensionsSet.has(key) || !assertIsDefined(lastSyncExtensionsMap?.get(key)).installed) {
                continue;
            }
            newRemoteExtensionsMap.delete(key);
        }
    }
    const remote = [];
    const remoteChanges = compare(remoteExtensionsMap, newRemoteExtensionsMap, new Set(), true);
    const hasRemoteChanges = remoteChanges.added.size > 0 || remoteChanges.updated.size > 0 || remoteChanges.removed.size > 0;
    if (hasRemoteChanges) {
        newRemoteExtensionsMap.forEach((value, key) => remote.push(massageOutgoingExtension(value, key)));
    }
    return {
        local: { added, removed, updated },
        remote: hasRemoteChanges ? {
            added: [...remoteChanges.added].map(id => newRemoteExtensionsMap.get(id)),
            updated: [...remoteChanges.updated].map(id => newRemoteExtensionsMap.get(id)),
            removed: [...remoteChanges.removed].map(id => remoteExtensionsMap.get(id)),
            all: remote
        } : null
    };
}
function compare(from, to, ignoredExtensions, checkVersionProperty) {
    const fromKeys = from ? [...from.keys()].filter(key => !ignoredExtensions.has(key)) : [];
    const toKeys = [...to.keys()].filter(key => !ignoredExtensions.has(key));
    const added = toKeys.filter(key => !fromKeys.includes(key)).reduce((r, key) => { r.add(key); return r; }, new Set());
    const removed = fromKeys.filter(key => !toKeys.includes(key)).reduce((r, key) => { r.add(key); return r; }, new Set());
    const updated = new Set();
    for (const key of fromKeys) {
        if (removed.has(key)) {
            continue;
        }
        const fromExtension = from.get(key);
        const toExtension = to.get(key);
        if (!toExtension || !areSame(fromExtension, toExtension, checkVersionProperty, true)) {
            updated.add(key);
        }
    }
    return { added, removed, updated };
}
function areSame(fromExtension, toExtension, checkVersionProperty, checkInstalledProperty) {
    if (fromExtension.disabled !== toExtension.disabled) {
        /* extension enablement changed */
        return false;
    }
    if (!!fromExtension.isApplicationScoped !== !!toExtension.isApplicationScoped) {
        /* extension application scope has changed */
        return false;
    }
    if (checkInstalledProperty && fromExtension.installed !== toExtension.installed) {
        /* extension installed property changed */
        return false;
    }
    if (fromExtension.installed && toExtension.installed) {
        if (fromExtension.preRelease !== toExtension.preRelease) {
            /* installed extension's pre-release version changed */
            return false;
        }
        if (fromExtension.pinned !== toExtension.pinned) {
            /* installed extension's pinning changed */
            return false;
        }
        if (toExtension.pinned && fromExtension.version !== toExtension.version) {
            /* installed extension's pinned version changed */
            return false;
        }
    }
    if (!isSameExtensionState(fromExtension.state, toExtension.state)) {
        /* extension state changed */
        return false;
    }
    if ((checkVersionProperty && fromExtension.version !== toExtension.version)) {
        /* extension version changed */
        return false;
    }
    return true;
}
function mergeExtensionState(localExtension, remoteExtension, lastSyncExtension) {
    const localState = localExtension.state;
    const remoteState = remoteExtension.state;
    const baseState = lastSyncExtension?.state;
    // If remote extension has no version, use local state
    if (!remoteExtension.version) {
        return localState;
    }
    // If local state exists and local extension is latest then use local state
    if (localState && semver.gt(localExtension.version, remoteExtension.version)) {
        return localState;
    }
    // If remote state exists and remote extension is latest, use remote state
    if (remoteState && semver.gt(remoteExtension.version, localExtension.version)) {
        return remoteState;
    }
    /* Remote and local are on same version */
    // If local state is not yet set, use remote state
    if (!localState) {
        return remoteState;
    }
    // If remote state is not yet set, use local state
    if (!remoteState) {
        return localState;
    }
    const mergedState = deepClone(localState);
    const baseToRemote = baseState ? compareExtensionState(baseState, remoteState) : { added: Object.keys(remoteState).reduce((r, k) => { r.add(k); return r; }, new Set()), removed: new Set(), updated: new Set() };
    const baseToLocal = baseState ? compareExtensionState(baseState, localState) : { added: Object.keys(localState).reduce((r, k) => { r.add(k); return r; }, new Set()), removed: new Set(), updated: new Set() };
    // Added/Updated in remote
    for (const key of [...baseToRemote.added.values(), ...baseToRemote.updated.values()]) {
        mergedState[key] = remoteState[key];
    }
    // Removed in remote
    for (const key of baseToRemote.removed.values()) {
        // Not updated in local
        if (!baseToLocal.updated.has(key)) {
            delete mergedState[key];
        }
    }
    return mergedState;
}
function compareExtensionState(from, to) {
    const fromKeys = Object.keys(from);
    const toKeys = Object.keys(to);
    const added = toKeys.filter(key => !fromKeys.includes(key)).reduce((r, key) => { r.add(key); return r; }, new Set());
    const removed = fromKeys.filter(key => !toKeys.includes(key)).reduce((r, key) => { r.add(key); return r; }, new Set());
    const updated = new Set();
    for (const key of fromKeys) {
        if (removed.has(key)) {
            continue;
        }
        const value1 = from[key];
        const value2 = to[key];
        if (!equals(value1, value2)) {
            updated.add(key);
        }
    }
    return { added, removed, updated };
}
function isSameExtensionState(a = {}, b = {}) {
    const { added, removed, updated } = compareExtensionState(a, b);
    return added.size === 0 && removed.size === 0 && updated.size === 0;
}
// massage incoming extension - add optional properties
function massageIncomingExtension(extension) {
    return { ...extension, ...{ disabled: !!extension.disabled, installed: !!extension.installed } };
}
// massage outgoing extension - remove optional properties
function massageOutgoingExtension(extension, key) {
    const massagedExtension = {
        ...extension,
        identifier: {
            id: extension.identifier.id,
            uuid: key.startsWith('uuid:') ? key.substring('uuid:'.length) : undefined
        },
        /* set following always so that to differentiate with older clients */
        preRelease: !!extension.preRelease,
        pinned: !!extension.pinned,
    };
    if (!extension.disabled) {
        delete massagedExtension.disabled;
    }
    if (!extension.installed) {
        delete massagedExtension.installed;
    }
    if (!extension.state) {
        delete massagedExtension.state;
    }
    if (!extension.isApplicationScoped) {
        delete massagedExtension.isApplicationScoped;
    }
    return massagedExtension;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc01lcmdlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy9jb21tb24vZXh0ZW5zaW9uc01lcmdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDcEUsT0FBTyxLQUFLLE1BQU0sTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFTaEUsTUFBTSxVQUFVLEtBQUssQ0FBQyxlQUFzQyxFQUFFLGdCQUErQyxFQUFFLGtCQUFpRCxFQUFFLGlCQUFtQyxFQUFFLGlCQUEyQixFQUFFLHlCQUF3RDtJQUMzUixNQUFNLEtBQUssR0FBcUIsRUFBRSxDQUFDO0lBQ25DLE1BQU0sT0FBTyxHQUEyQixFQUFFLENBQUM7SUFDM0MsTUFBTSxPQUFPLEdBQXFCLEVBQUUsQ0FBQztJQUVyQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUN2QixNQUFNLE1BQU0sR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxLQUFLLFVBQVUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzNJLE9BQU87WUFDTixLQUFLLEVBQUU7Z0JBQ04sS0FBSztnQkFDTCxPQUFPO2dCQUNQLE9BQU87YUFDUDtZQUNELE1BQU0sRUFBRSxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzNCLEtBQUssRUFB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