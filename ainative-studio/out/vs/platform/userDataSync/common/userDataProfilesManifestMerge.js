/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { equals } from '../../../base/common/objects.js';
export function merge(local, remote, lastSync, ignored) {
    const localResult = { added: [], removed: [], updated: [] };
    let remoteResult = { added: [], removed: [], updated: [] };
    if (!remote) {
        const added = local.filter(({ id }) => !ignored.includes(id));
        if (added.length) {
            remoteResult.added = added;
        }
        else {
            remoteResult = null;
        }
        return {
            local: localResult,
            remote: remoteResult
        };
    }
    const localToRemote = compare(local, remote, ignored);
    if (localToRemote.added.length > 0 || localToRemote.removed.length > 0 || localToRemote.updated.length > 0) {
        const baseToLocal = compare(lastSync, local, ignored);
        const baseToRemote = compare(lastSync, remote, ignored);
        // Remotely removed profiles
        for (const id of baseToRemote.removed) {
            const e = local.find(profile => profile.id === id);
            if (e) {
                localResult.removed.push(e);
            }
        }
        // Remotely added profiles
        for (const id of baseToRemote.added) {
            const remoteProfile = remote.find(profile => profile.id === id);
            // Got added in local
            if (baseToLocal.added.includes(id)) {
                // Is different from local to remote
                if (localToRemote.updated.includes(id)) {
                    // Remote wins always
                    localResult.updated.push(remoteProfile);
                }
            }
            else {
                localResult.added.push(remoteProfile);
            }
        }
        // Remotely updated profiles
        for (const id of baseToRemote.updated) {
            // Remote wins always
            localResult.updated.push(remote.find(profile => profile.id === id));
        }
        // Locally added profiles
        for (const id of baseToLocal.added) {
            // Not there in remote
            if (!baseToRemote.added.includes(id)) {
                remoteResult.added.push(local.find(profile => profile.id === id));
            }
        }
        // Locally updated profiles
        for (const id of baseToLocal.updated) {
            // If removed in remote
            if (baseToRemote.removed.includes(id)) {
                continue;
            }
            // If not updated in remote
            if (!baseToRemote.updated.includes(id)) {
                remoteResult.updated.push(local.find(profile => profile.id === id));
            }
        }
        // Locally removed profiles
        for (const id of baseToLocal.removed) {
            const removedProfile = remote.find(profile => profile.id === id);
            if (removedProfile) {
                remoteResult.removed.push(removedProfile);
            }
        }
    }
    if (remoteResult.added.length === 0 && remoteResult.removed.length === 0 && remoteResult.updated.length === 0) {
        remoteResult = null;
    }
    return { local: localResult, remote: remoteResult };
}
function compare(from, to, ignoredProfiles) {
    from = from ? from.filter(({ id }) => !ignoredProfiles.includes(id)) : [];
    to = to.filter(({ id }) => !ignoredProfiles.includes(id));
    const fromKeys = from.map(({ id }) => id);
    const toKeys = to.map(({ id }) => id);
    const added = toKeys.filter(key => !fromKeys.includes(key));
    const removed = fromKeys.filter(key => !toKeys.includes(key));
    const updated = [];
    for (const { id, name, icon, useDefaultFlags } of from) {
        if (removed.includes(id)) {
            continue;
        }
        const toProfile = to.find(p => p.id === id);
        if (!toProfile
            || toProfile.name !== name
            || toProfile.icon !== icon
            || !equals(toProfile.useDefaultFlags, useDefaultFlags)) {
            updated.push(id);
        }
    }
    return { added, removed, updated };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlc01hbmlmZXN0TWVyZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFTeW5jL2NvbW1vbi91c2VyRGF0YVByb2ZpbGVzTWFuaWZlc3RNZXJnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFrQnpELE1BQU0sVUFBVSxLQUFLLENBQUMsS0FBeUIsRUFBRSxNQUFxQyxFQUFFLFFBQXVDLEVBQUUsT0FBaUI7SUFDakosTUFBTSxXQUFXLEdBQW9HLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsQ0FBQztJQUM3SixJQUFJLFlBQVksR0FBdUcsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxDQUFDO0lBRS9KLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNiLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM5RCxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNsQixZQUFZLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUM1QixDQUFDO2FBQU0sQ0FBQztZQUNQLFlBQVksR0FBRyxJQUFJLENBQUM7UUFDckIsQ0FBQztRQUNELE9BQU87WUFDTixLQUFLLEVBQUUsV0FBVztZQUNsQixNQUFNLEVBQUUsWUFBWTtTQUNwQixDQUFDO0lBQ0gsQ0FBQztJQUVELE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3RELElBQUksYUFBYSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLGFBQWEsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxhQUFhLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUU1RyxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN0RCxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUV4RCw0QkFBNEI7UUFDNUIsS0FBSyxNQUFNLEVBQUUsSUFBSSxZQUFZLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDdkMsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDbkQsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDUCxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM3QixDQUFDO1FBQ0YsQ0FBQztRQUVELDBCQUEwQjtRQUMxQixLQUFLLE1BQU0sRUFBRSxJQUFJLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNyQyxNQUFNLGFBQWEsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUUsQ0FBQztZQUNqRSxxQkFBcUI7WUFDckIsSUFBSSxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUNwQyxvQ0FBb0M7Z0JBQ3BDLElBQUksYUFBYSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztvQkFDeEMscUJBQXFCO29CQUNyQixXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztnQkFDekMsQ0FBQztZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUN2QyxDQUFDO1FBQ0YsQ0FBQztRQUVELDRCQUE0QjtRQUM1QixLQUFLLE1BQU0sRUFBRSxJQUFJLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN2QyxxQkFBcUI7WUFDckIsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFFLENBQUMsQ0FBQztRQUN0RSxDQUFDO1FBRUQseUJBQXlCO1FBQ3pCLEtBQUssTUFBTSxFQUFFLElBQUksV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3BDLHNCQUFzQjtZQUN0QixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztnQkFDdEMsWUFBWSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFFLENBQUMsQ0FBQztZQUNwRSxDQUFDO1FBQ0YsQ0FBQztRQUVELDJCQUEyQjtRQUMzQixLQUFLLE1BQU0sRUFBRSxJQUFJLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN0Qyx1QkFBdUI7WUFDdkIsSUFBSSxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUN2QyxTQUFTO1lBQ1YsQ0FBQztZQUVELDJCQUEyQjtZQUMzQixJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztnQkFDeEMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFFLENBQUMsQ0FBQztZQUN0RSxDQUFDO1FBQ0YsQ0FBQztRQUVELDJCQUEyQjtRQUMzQixLQUFLLE1BQU0sRUFBRSxJQUFJLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN0QyxNQUFNLGNBQWMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUNqRSxJQUFJLGNBQWMsRUFBRSxDQUFDO2dCQUNwQixZQUFZLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUMzQyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFJLFlBQVksQ0FBQyxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxZQUFZLENBQUMsT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksWUFBWSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDL0csWUFBWSxHQUFHLElBQUksQ0FBQztJQUNyQixDQUFDO0lBRUQsT0FBTyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxDQUFDO0FBQ3JELENBQUM7QUFFRCxTQUFTLE9BQU8sQ0FBQyxJQUFtQyxFQUFFLEVBQTBCLEVBQUUsZUFBeUI7SUFDMUcsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDMUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMxRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDMUMsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3RDLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUM1RCxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDOUQsTUFBTSxPQUFPLEdBQWEsRUFBRSxDQUFDO0lBRTdCLEtBQUssTUFBTSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLGVBQWUsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDO1FBQ3hELElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQzFCLFNBQVM7UUFDVixDQUFDO1FBQ0QsTUFBTSxTQUFTLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDNUMsSUFBSSxDQUFDLFNBQVM7ZUFDVixTQUFTLENBQUMsSUFBSSxLQUFLLElBQUk7ZUFDdkIsU0FBUyxDQUFDLElBQUksS0FBSyxJQUFJO2VBQ3ZCLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUUsZUFBZSxDQUFDLEVBQ3JELENBQUM7WUFDRixPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2xCLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUM7QUFDcEMsQ0FBQyJ9