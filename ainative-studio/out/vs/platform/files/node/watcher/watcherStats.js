/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isRecursiveWatchRequest, requestFilterToString } from '../../common/watcher.js';
export function computeStats(requests, failedRecursiveRequests, recursiveWatcher, nonRecursiveWatcher) {
    const lines = [];
    const allRecursiveRequests = sortByPathPrefix(requests.filter(request => isRecursiveWatchRequest(request)));
    const nonSuspendedRecursiveRequests = allRecursiveRequests.filter(request => recursiveWatcher.isSuspended(request) === false);
    const suspendedPollingRecursiveRequests = allRecursiveRequests.filter(request => recursiveWatcher.isSuspended(request) === 'polling');
    const suspendedNonPollingRecursiveRequests = allRecursiveRequests.filter(request => recursiveWatcher.isSuspended(request) === true);
    const recursiveRequestsStatus = computeRequestStatus(allRecursiveRequests, recursiveWatcher);
    const recursiveWatcherStatus = computeRecursiveWatchStatus(recursiveWatcher);
    const allNonRecursiveRequests = sortByPathPrefix(requests.filter(request => !isRecursiveWatchRequest(request)));
    const nonSuspendedNonRecursiveRequests = allNonRecursiveRequests.filter(request => nonRecursiveWatcher.isSuspended(request) === false);
    const suspendedPollingNonRecursiveRequests = allNonRecursiveRequests.filter(request => nonRecursiveWatcher.isSuspended(request) === 'polling');
    const suspendedNonPollingNonRecursiveRequests = allNonRecursiveRequests.filter(request => nonRecursiveWatcher.isSuspended(request) === true);
    const nonRecursiveRequestsStatus = computeRequestStatus(allNonRecursiveRequests, nonRecursiveWatcher);
    const nonRecursiveWatcherStatus = computeNonRecursiveWatchStatus(nonRecursiveWatcher);
    lines.push('[Summary]');
    lines.push(`- Recursive Requests:     total: ${allRecursiveRequests.length}, suspended: ${recursiveRequestsStatus.suspended}, polling: ${recursiveRequestsStatus.polling}, failed: ${failedRecursiveRequests}`);
    lines.push(`- Non-Recursive Requests: total: ${allNonRecursiveRequests.length}, suspended: ${nonRecursiveRequestsStatus.suspended}, polling: ${nonRecursiveRequestsStatus.polling}`);
    lines.push(`- Recursive Watchers:     total: ${Array.from(recursiveWatcher.watchers).length}, active: ${recursiveWatcherStatus.active}, failed: ${recursiveWatcherStatus.failed}, stopped: ${recursiveWatcherStatus.stopped}`);
    lines.push(`- Non-Recursive Watchers: total: ${Array.from(nonRecursiveWatcher.watchers).length}, active: ${nonRecursiveWatcherStatus.active}, failed: ${nonRecursiveWatcherStatus.failed}, reusing: ${nonRecursiveWatcherStatus.reusing}`);
    lines.push(`- I/O Handles Impact:     total: ${recursiveRequestsStatus.polling + nonRecursiveRequestsStatus.polling + recursiveWatcherStatus.active + nonRecursiveWatcherStatus.active}`);
    lines.push(`\n[Recursive Requests (${allRecursiveRequests.length}, suspended: ${recursiveRequestsStatus.suspended}, polling: ${recursiveRequestsStatus.polling})]:`);
    const recursiveRequestLines = [];
    for (const request of [nonSuspendedRecursiveRequests, suspendedPollingRecursiveRequests, suspendedNonPollingRecursiveRequests].flat()) {
        fillRequestStats(recursiveRequestLines, request, recursiveWatcher);
    }
    lines.push(...alignTextColumns(recursiveRequestLines));
    const recursiveWatcheLines = [];
    fillRecursiveWatcherStats(recursiveWatcheLines, recursiveWatcher);
    lines.push(...alignTextColumns(recursiveWatcheLines));
    lines.push(`\n[Non-Recursive Requests (${allNonRecursiveRequests.length}, suspended: ${nonRecursiveRequestsStatus.suspended}, polling: ${nonRecursiveRequestsStatus.polling})]:`);
    const nonRecursiveRequestLines = [];
    for (const request of [nonSuspendedNonRecursiveRequests, suspendedPollingNonRecursiveRequests, suspendedNonPollingNonRecursiveRequests].flat()) {
        fillRequestStats(nonRecursiveRequestLines, request, nonRecursiveWatcher);
    }
    lines.push(...alignTextColumns(nonRecursiveRequestLines));
    const nonRecursiveWatcheLines = [];
    fillNonRecursiveWatcherStats(nonRecursiveWatcheLines, nonRecursiveWatcher);
    lines.push(...alignTextColumns(nonRecursiveWatcheLines));
    return `\n\n[File Watcher] request stats:\n\n${lines.join('\n')}\n\n`;
}
function alignTextColumns(lines) {
    let maxLength = 0;
    for (const line of lines) {
        maxLength = Math.max(maxLength, line.split('\t')[0].length);
    }
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.split('\t');
        if (parts.length === 2) {
            const padding = ' '.repeat(maxLength - parts[0].length);
            lines[i] = `${parts[0]}${padding}\t${parts[1]}`;
        }
    }
    return lines;
}
function computeRequestStatus(requests, watcher) {
    let polling = 0;
    let suspended = 0;
    for (const request of requests) {
        const isSuspended = watcher.isSuspended(request);
        if (isSuspended === false) {
            continue;
        }
        suspended++;
        if (isSuspended === 'polling') {
            polling++;
        }
    }
    return { suspended, polling };
}
function computeRecursiveWatchStatus(recursiveWatcher) {
    let active = 0;
    let failed = 0;
    let stopped = 0;
    for (const watcher of recursiveWatcher.watchers) {
        if (!watcher.failed && !watcher.stopped) {
            active++;
        }
        if (watcher.failed) {
            failed++;
        }
        if (watcher.stopped) {
            stopped++;
        }
    }
    return { active, failed, stopped };
}
function computeNonRecursiveWatchStatus(nonRecursiveWatcher) {
    let active = 0;
    let failed = 0;
    let reusing = 0;
    for (const watcher of nonRecursiveWatcher.watchers) {
        if (!watcher.instance.failed && !watcher.instance.isReusingRecursiveWatcher) {
            active++;
        }
        if (watcher.instance.failed) {
            failed++;
        }
        if (watcher.instance.isReusingRecursiveWatcher) {
            reusing++;
        }
    }
    return { active, failed, reusing };
}
function sortByPathPrefix(requests) {
    requests.sort((r1, r2) => {
        const p1 = isUniversalWatchRequest(r1) ? r1.path : r1.request.path;
        const p2 = isUniversalWatchRequest(r2) ? r2.path : r2.request.path;
        const minLength = Math.min(p1.length, p2.length);
        for (let i = 0; i < minLength; i++) {
            if (p1[i] !== p2[i]) {
                return (p1[i] < p2[i]) ? -1 : 1;
            }
        }
        return p1.length - p2.length;
    });
    return requests;
}
function isUniversalWatchRequest(obj) {
    const candidate = obj;
    return typeof candidate?.path === 'string';
}
function fillRequestStats(lines, request, watcher) {
    const decorations = [];
    const suspended = watcher.isSuspended(request);
    if (suspended !== false) {
        if (suspended === 'polling') {
            decorations.push('[SUSPENDED <polling>]');
        }
        else {
            decorations.push('[SUSPENDED <non-polling>]');
        }
    }
    lines.push(` ${request.path}\t${decorations.length > 0 ? decorations.join(' ') + ' ' : ''}(${requestDetailsToString(request)})`);
}
function requestDetailsToString(request) {
    return `excludes: ${request.excludes.length > 0 ? request.excludes : '<none>'}, includes: ${request.includes && request.includes.length > 0 ? JSON.stringify(request.includes) : '<all>'}, filter: ${requestFilterToString(request.filter)}, correlationId: ${typeof request.correlationId === 'number' ? request.correlationId : '<none>'}`;
}
function fillRecursiveWatcherStats(lines, recursiveWatcher) {
    const watchers = sortByPathPrefix(Array.from(recursiveWatcher.watchers));
    const { active, failed, stopped } = computeRecursiveWatchStatus(recursiveWatcher);
    lines.push(`\n[Recursive Watchers (${watchers.length}, active: ${active}, failed: ${failed}, stopped: ${stopped})]:`);
    for (const watcher of watchers) {
        const decorations = [];
        if (watcher.failed) {
            decorations.push('[FAILED]');
        }
        if (watcher.stopped) {
            decorations.push('[STOPPED]');
        }
        if (watcher.subscriptionsCount > 0) {
            decorations.push(`[SUBSCRIBED:${watcher.subscriptionsCount}]`);
        }
        if (watcher.restarts > 0) {
            decorations.push(`[RESTARTED:${watcher.restarts}]`);
        }
        lines.push(` ${watcher.request.path}\t${decorations.length > 0 ? decorations.join(' ') + ' ' : ''}(${requestDetailsToString(watcher.request)})`);
    }
}
function fillNonRecursiveWatcherStats(lines, nonRecursiveWatcher) {
    const allWatchers = sortByPathPrefix(Array.from(nonRecursiveWatcher.watchers));
    const activeWatchers = allWatchers.filter(watcher => !watcher.instance.failed && !watcher.instance.isReusingRecursiveWatcher);
    const failedWatchers = allWatchers.filter(watcher => watcher.instance.failed);
    const reusingWatchers = allWatchers.filter(watcher => watcher.instance.isReusingRecursiveWatcher);
    const { active, failed, reusing } = computeNonRecursiveWatchStatus(nonRecursiveWatcher);
    lines.push(`\n[Non-Recursive Watchers (${allWatchers.length}, active: ${active}, failed: ${failed}, reusing: ${reusing})]:`);
    for (const watcher of [activeWatchers, failedWatchers, reusingWatchers].flat()) {
        const decorations = [];
        if (watcher.instance.failed) {
            decorations.push('[FAILED]');
        }
        if (watcher.instance.isReusingRecursiveWatcher) {
            decorations.push('[REUSING]');
        }
        lines.push(` ${watcher.request.path}\t${decorations.length > 0 ? decorations.join(' ') + ' ' : ''}(${requestDetailsToString(watcher.request)})`);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2F0Y2hlclN0YXRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2ZpbGVzL25vZGUvd2F0Y2hlci93YXRjaGVyU3RhdHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFxRCx1QkFBdUIsRUFBMEIscUJBQXFCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUlwSyxNQUFNLFVBQVUsWUFBWSxDQUMzQixRQUFrQyxFQUNsQyx1QkFBK0IsRUFDL0IsZ0JBQStCLEVBQy9CLG1CQUFrQztJQUVsQyxNQUFNLEtBQUssR0FBYSxFQUFFLENBQUM7SUFFM0IsTUFBTSxvQkFBb0IsR0FBRyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzVHLE1BQU0sNkJBQTZCLEdBQUcsb0JBQW9CLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDO0lBQzlILE1BQU0saUNBQWlDLEdBQUcsb0JBQW9CLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxLQUFLLFNBQVMsQ0FBQyxDQUFDO0lBQ3RJLE1BQU0sb0NBQW9DLEdBQUcsb0JBQW9CLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDO0lBRXBJLE1BQU0sdUJBQXVCLEdBQUcsb0JBQW9CLENBQUMsb0JBQW9CLEVBQUUsZ0JBQWdCLENBQUMs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