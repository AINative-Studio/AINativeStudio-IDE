/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function getUNCHostAllowlist() {
    const allowlist = processUNCHostAllowlist();
    if (allowlist) {
        return Array.from(allowlist);
    }
    return [];
}
function processUNCHostAllowlist() {
    // The property `process.uncHostAllowlist` is not available in official node.js
    // releases, only in our own builds, so we have to probe for availability
    return process.uncHostAllowlist;
}
export function addUNCHostToAllowlist(allowedHost) {
    if (process.platform !== 'win32') {
        return;
    }
    const allowlist = processUNCHostAllowlist();
    if (allowlist) {
        if (typeof allowedHost === 'string') {
            allowlist.add(allowedHost.toLowerCase()); // UNC hosts are case-insensitive
        }
        else {
            for (const host of toSafeStringArray(allowedHost)) {
                addUNCHostToAllowlist(host);
            }
        }
    }
}
function toSafeStringArray(arg0) {
    const allowedUNCHosts = new Set();
    if (Array.isArray(arg0)) {
        for (const host of arg0) {
            if (typeof host === 'string') {
                allowedUNCHosts.add(host);
            }
        }
    }
    return Array.from(allowedUNCHosts);
}
export function getUNCHost(maybeUNCPath) {
    if (typeof maybeUNCPath !== 'string') {
        return undefined; // require a valid string
    }
    const uncRoots = [
        '\\\\.\\UNC\\', // DOS Device paths (https://learn.microsoft.com/en-us/dotnet/standard/io/file-path-formats)
        '\\\\?\\UNC\\',
        '\\\\' // standard UNC path
    ];
    let host = undefined;
    for (const uncRoot of uncRoots) {
        const indexOfUNCRoot = maybeUNCPath.indexOf(uncRoot);
        if (indexOfUNCRoot !== 0) {
            continue; // not matching any of our expected UNC roots
        }
        const indexOfUNCPath = maybeUNCPath.indexOf('\\', uncRoot.length);
        if (indexOfUNCPath === -1) {
            continue; // no path component found
        }
        const hostCandidate = maybeUNCPath.substring(uncRoot.length, indexOfUNCPath);
        if (hostCandidate) {
            host = hostCandidate;
            break;
        }
    }
    return host;
}
export function disableUNCAccessRestrictions() {
    if (process.platform !== 'win32') {
        return;
    }
    process.restrictUNCAccess = false;
}
export function isUNCAccessRestrictionsDisabled() {
    if (process.platform !== 'win32') {
        return true;
    }
    return process.restrictUNCAccess === false;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5jLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2Uvbm9kZS91bmMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsTUFBTSxVQUFVLG1CQUFtQjtJQUNsQyxNQUFNLFNBQVMsR0FBRyx1QkFBdUIsRUFBRSxDQUFDO0lBQzVDLElBQUksU0FBUyxFQUFFLENBQUM7UUFDZixPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDOUIsQ0FBQztJQUVELE9BQU8sRUFBRSxDQUFDO0FBQ1gsQ0FBQztBQUVELFNBQVMsdUJBQXVCO0lBRS9CLCtFQUErRTtJQUMvRSx5RUFBeUU7SUFFekUsT0FBUSxPQUFlLENBQUMsZ0JBQWdCLENBQUM7QUFDMUMsQ0FBQztBQUVELE1BQU0sVUFBVSxxQkFBcUIsQ0FBQyxXQUE4QjtJQUNuRSxJQUFJLE9BQU8sQ0FBQyxRQUFRLEtBQUssT0FBTyxFQUFFLENBQUM7UUFDbEMsT0FBTztJQUNSLENBQUM7SUFFRCxNQUFNLFNBQVMsR0FBRyx1QkFBdUIsRUFBRSxDQUFDO0lBQzVDLElBQUksU0FBUyxFQUFFLENBQUM7UUFDZixJQUFJLE9BQU8sV0FBVyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3JDLFNBQVMsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQyxpQ0FBaUM7UUFDNUUsQ0FBQzthQUFNLENBQUM7WUFDUCxLQUFLLE1BQU0sSUFBSSxJQUFJLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7Z0JBQ25ELHFCQUFxQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzdCLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztBQUNGLENBQUM7QUFFRCxTQUFTLGlCQUFpQixDQUFDLElBQWE7SUFDdkMsTUFBTSxlQUFlLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztJQUUxQyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUN6QixLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ3pCLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQzlCLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDM0IsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ3BDLENBQUM7QUFFRCxNQUFNLFVBQVUsVUFBVSxDQUFDLFlBQXVDO0lBQ2pFLElBQUksT0FBTyxZQUFZLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDdEMsT0FBTyxTQUFTLENBQUMsQ0FBQyx5QkFBeUI7SUFDNUMsQ0FBQztJQUVELE1BQU0sUUFBUSxHQUFHO1FBQ2hCLGNBQWMsRUFBRSw0RkFBNEY7UUFDNUcsY0FBYztRQUNkLE1BQU0sQ0FBRyxvQkFBb0I7S0FDN0IsQ0FBQztJQUVGLElBQUksSUFBSSxHQUFHLFNBQVMsQ0FBQztJQUVyQixLQUFLLE1BQU0sT0FBTyxJQUFJLFFBQVEsRUFBRSxDQUFDO1FBQ2hDLE1BQU0sY0FBYyxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDckQsSUFBSSxjQUFjLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDMUIsU0FBUyxDQUFDLDZDQUE2QztRQUN4RCxDQUFDO1FBRUQsTUFBTSxjQUFjLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2xFLElBQUksY0FBYyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDM0IsU0FBUyxDQUFDLDBCQUEwQjtRQUNyQyxDQUFDO1FBRUQsTUFBTSxhQUFhLEdBQUcsWUFBWSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQzdFLElBQUksYUFBYSxFQUFFLENBQUM7WUFDbkIsSUFBSSxHQUFHLGFBQWEsQ0FBQztZQUNyQixNQUFNO1FBQ1AsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLElBQUksQ0FBQztBQUNiLENBQUM7QUFFRCxNQUFNLFVBQVUsNEJBQTRCO0lBQzNDLElBQUksT0FBTyxDQUFDLFFBQVEsS0FBSyxPQUFPLEVBQUUsQ0FBQztRQUNsQyxPQUFPO0lBQ1IsQ0FBQztJQUVBLE9BQWUsQ0FBQyxpQkFBaUIsR0FBRyxLQUFLLENBQUM7QUFDNUMsQ0FBQztBQUVELE1BQU0sVUFBVSwrQkFBK0I7SUFDOUMsSUFBSSxPQUFPLENBQUMsUUFBUSxLQUFLLE9BQU8sRUFBRSxDQUFDO1FBQ2xDLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELE9BQVEsT0FBZSxDQUFDLGlCQUFpQixLQUFLLEtBQUssQ0FBQztBQUNyRCxDQUFDIn0=