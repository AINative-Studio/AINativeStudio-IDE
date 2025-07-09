/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function merge(local, remote, base) {
    const localAdded = {};
    const localUpdated = {};
    const localRemoved = new Set();
    if (!remote) {
        return {
            local: { added: localAdded, updated: localUpdated, removed: [...localRemoved.values()] },
            remote: { added: local, updated: {}, removed: [] },
            conflicts: []
        };
    }
    const localToRemote = compare(local, remote);
    if (localToRemote.added.size === 0 && localToRemote.removed.size === 0 && localToRemote.updated.size === 0) {
        // No changes found between local and remote.
        return {
            local: { added: localAdded, updated: localUpdated, removed: [...localRemoved.values()] },
            remote: { added: {}, updated: {}, removed: [] },
            conflicts: []
        };
    }
    const baseToLocal = compare(base, local);
    const baseToRemote = compare(base, remote);
    const remoteAdded = {};
    const remoteUpdated = {};
    const remoteRemoved = new Set();
    const conflicts = new Set();
    // Removed prompts in Local
    for (const key of baseToLocal.removed.values()) {
        // Conflict - Got updated in remote.
        if (baseToRemote.updated.has(key)) {
            // Add to local
            localAdded[key] = remote[key];
        }
        // Remove it in remote
        else {
            remoteRemoved.add(key);
        }
    }
    // Removed prompts in Remote
    for (const key of baseToRemote.removed.values()) {
        if (conflicts.has(key)) {
            continue;
        }
        // Conflict - Got updated in local
        if (baseToLocal.updated.has(key)) {
            conflicts.add(key);
        }
        // Also remove in Local
        else {
            localRemoved.add(key);
        }
    }
    // Updated prompts in Local
    for (const key of baseToLocal.updated.values()) {
        if (conflicts.has(key)) {
            continue;
        }
        // Got updated in remote
        if (baseToRemote.updated.has(key)) {
            // Has different value
            if (localToRemote.updated.has(key)) {
                conflicts.add(key);
            }
        }
        else {
            remoteUpdated[key] = local[key];
        }
    }
    // Updated prompts in Remote
    for (const key of baseToRemote.updated.values()) {
        if (conflicts.has(key)) {
            continue;
        }
        // Got updated in local
        if (baseToLocal.updated.has(key)) {
            // Has different value
            if (localToRemote.updated.has(key)) {
                conflicts.add(key);
            }
        }
        else if (local[key] !== undefined) {
            localUpdated[key] = remote[key];
        }
    }
    // Added prompts in Local
    for (const key of baseToLocal.added.values()) {
        if (conflicts.has(key)) {
            continue;
        }
        // Got added in remote
        if (baseToRemote.added.has(key)) {
            // Has different value
            if (localToRemote.updated.has(key)) {
                conflicts.add(key);
            }
        }
        else {
            remoteAdded[key] = local[key];
        }
    }
    // Added prompts in remote
    for (const key of baseToRemote.added.values()) {
        if (conflicts.has(key)) {
            continue;
        }
        // Got added in local
        if (baseToLocal.added.has(key)) {
            // Has different value
            if (localToRemote.updated.has(key)) {
                conflicts.add(key);
            }
        }
        else {
            localAdded[key] = remote[key];
        }
    }
    return {
        local: { added: localAdded, removed: [...localRemoved.values()], updated: localUpdated },
        remote: { added: remoteAdded, removed: [...remoteRemoved.values()], updated: remoteUpdated },
        conflicts: [...conflicts.values()],
    };
}
function compare(from, to) {
    const fromKeys = from ? Object.keys(from) : [];
    const toKeys = to ? Object.keys(to) : [];
    const added = toKeys.filter(key => !fromKeys.includes(key)).reduce((r, key) => { r.add(key); return r; }, new Set());
    const removed = fromKeys.filter(key => !toKeys.includes(key)).reduce((r, key) => { r.add(key); return r; }, new Set());
    const updated = new Set();
    for (const key of fromKeys) {
        if (removed.has(key)) {
            continue;
        }
        const fromPrompt = from[key];
        const toPrompt = to[key];
        if (fromPrompt !== toPrompt) {
            updated.add(key);
        }
    }
    return { added, removed, updated };
}
export function areSame(a, b) {
    const { added, removed, updated } = compare(a, b);
    return added.size === 0 && removed.size === 0 && updated.size === 0;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0c01lcmdlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy9jb21tb24vcHJvbXB0c1N5bmMvcHJvbXB0c01lcmdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBa0JoRyxNQUFNLFVBQVUsS0FBSyxDQUFDLEtBQWdDLEVBQUUsTUFBd0MsRUFBRSxJQUFzQztJQUN2SSxNQUFNLFVBQVUsR0FBOEIsRUFBRSxDQUFDO0lBQ2pELE1BQU0sWUFBWSxHQUE4QixFQUFFLENBQUM7SUFDbkQsTUFBTSxZQUFZLEdBQWdCLElBQUksR0FBRyxFQUFVLENBQUM7SUFFcEQsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2IsT0FBTztZQUNOLEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsQ0FBQyxHQUFHLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFO1lBQ3hGLE1BQU0sRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFO1lBQ2xELFNBQVMsRUFBRSxFQUFFO1NBQ2IsQ0FBQztJQUNILENBQUM7SUFFRCxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzdDLElBQUksYUFBYSxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLGFBQWEsQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxhQUFhLENBQUMsT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUM1Ryw2Q0FBNkM7UUFDN0MsT0FBTztZQUNOLEtBQUssRUFBRSxFQUFFLEtB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