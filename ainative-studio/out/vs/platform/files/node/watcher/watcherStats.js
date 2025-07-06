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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2F0Y2hlclN0YXRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9maWxlcy9ub2RlL3dhdGNoZXIvd2F0Y2hlclN0YXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBcUQsdUJBQXVCLEVBQTBCLHFCQUFxQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFJcEssTUFBTSxVQUFVLFlBQVksQ0FDM0IsUUFBa0MsRUFDbEMsdUJBQStCLEVBQy9CLGdCQUErQixFQUMvQixtQkFBa0M7SUFFbEMsTUFBTSxLQUFLLEdBQWEsRUFBRSxDQUFDO0lBRTNCLE1BQU0sb0JBQW9CLEdBQUcsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM1RyxNQUFNLDZCQUE2QixHQUFHLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQztJQUM5SCxNQUFNLGlDQUFpQyxHQUFHLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsS0FBSyxTQUFTLENBQUMsQ0FBQztJQUN0SSxNQUFNLG9DQUFvQyxHQUFHLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQztJQUVwSSxNQUFNLHVCQUF1QixHQUFHLG9CQUFvQixDQUFDLG9CQUFvQixFQUFFLGdCQUFnQixDQUFDLENBQUM7SUFDN0YsTUFBTSxzQkFBc0IsR0FBRywyQkFBMkIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBRTdFLE1BQU0sdUJBQXVCLEdBQUcsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2hILE1BQU0sZ0NBQWdDLEdBQUcsdUJBQXVCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDO0lBQ3ZJLE1BQU0sb0NBQW9DLEdBQUcsdUJBQXVCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxLQUFLLFNBQVMsQ0FBQyxDQUFDO0lBQy9JLE1BQU0sdUNBQXVDLEdBQUcsdUJBQXVCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDO0lBRTdJLE1BQU0sMEJBQTBCLEdBQUcsb0JBQW9CLENBQUMsdUJBQXVCLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztJQUN0RyxNQUFNLHlCQUF5QixHQUFHLDhCQUE4QixDQUFDLG1CQUFtQixDQUFDLENBQUM7SUFFdEYsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUN4QixLQUFLLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxvQkFBb0IsQ0FBQyxNQUFNLGdCQUFnQix1QkFBdUIsQ0FBQyxTQUFTLGNBQWMsdUJBQXVCLENBQUMsT0FBTyxhQUFhLHVCQUF1QixFQUFFLENBQUMsQ0FBQztJQUNoTixLQUFLLENBQUMsSUFBSSxDQUFDLG9DQUFvQyx1QkFBdUIsQ0FBQyxNQUFNLGdCQUFnQiwwQkFBMEIsQ0FBQyxTQUFTLGNBQWMsMEJBQTBCLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztJQUNyTCxLQUFLLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxLQUFLLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sYUFBYSxzQkFBc0IsQ0FBQyxNQUFNLGFBQWEsc0JBQXNCLENBQUMsTUFBTSxjQUFjLHNCQUFzQixDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7SUFDL04sS0FBSyxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsS0FBSyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLGFBQWEseUJBQXlCLENBQUMsTUFBTSxhQUFhLHlCQUF5QixDQUFDLE1BQU0sY0FBYyx5QkFBeUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQzNPLEtBQUssQ0FBQyxJQUFJLENBQUMsb0NBQW9DLHVCQUF1QixDQUFDLE9BQU8sR0FBRywwQkFBMEIsQ0FBQyxPQUFPLEdBQUcsc0JBQXNCLENBQUMsTUFBTSxHQUFHLHlCQUF5QixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFFMUwsS0FBSyxDQUFDLElBQUksQ0FBQywwQkFBMEIsb0JBQW9CLENBQUMsTUFBTSxnQkFBZ0IsdUJBQXVCLENBQUMsU0FBUyxjQUFjLHVCQUF1QixDQUFDLE9BQU8sS0FBSyxDQUFDLENBQUM7SUFDckssTUFBTSxxQkFBcUIsR0FBYSxFQUFFLENBQUM7SUFDM0MsS0FBSyxNQUFNLE9BQU8sSUFBSSxDQUFDLDZCQUE2QixFQUFFLGlDQUFpQyxFQUFFLG9DQUFvQyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQztRQUN2SSxnQkFBZ0IsQ0FBQyxxQkFBcUIsRUFBRSxPQUFPLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBQ0QsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLGdCQUFnQixDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQztJQUV2RCxNQUFNLG9CQUFvQixHQUFhLEVBQUUsQ0FBQztJQUMxQyx5QkFBeUIsQ0FBQyxvQkFBb0IsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ2xFLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7SUFFdEQsS0FBSyxDQUFDLElBQUksQ0FBQyw4QkFBOEIsdUJBQXVCLENBQUMsTUFBTSxnQkFBZ0IsMEJBQTBCLENBQUMsU0FBUyxjQUFjLDBCQUEwQixDQUFDLE9BQU8sS0FBSyxDQUFDLENBQUM7SUFDbEwsTUFBTSx3QkFBd0IsR0FBYSxFQUFFLENBQUM7SUFDOUMsS0FBSyxNQUFNLE9BQU8sSUFBSSxDQUFDLGdDQUFnQyxFQUFFLG9DQUFvQyxFQUFFLHVDQUF1QyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQztRQUNoSixnQkFBZ0IsQ0FBQyx3QkFBd0IsRUFBRSxPQUFPLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztJQUMxRSxDQUFDO0lBQ0QsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLGdCQUFnQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQztJQUUxRCxNQUFNLHVCQUF1QixHQUFhLEVBQUUsQ0FBQztJQUM3Qyw0QkFBNEIsQ0FBQyx1QkFBdUIsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO0lBQzNFLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUM7SUFFekQsT0FBTyx3Q0FBd0MsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO0FBQ3ZFLENBQUM7QUFFRCxTQUFTLGdCQUFnQixDQUFDLEtBQWU7SUFDeEMsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDO0lBQ2xCLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7UUFDMUIsU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDN0QsQ0FBQztJQUVELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDdkMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDL0IsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3hCLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN4RCxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsT0FBTyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ2pELENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxLQUFLLENBQUM7QUFDZCxDQUFDO0FBRUQsU0FBUyxvQkFBb0IsQ0FBQyxRQUFrQyxFQUFFLE9BQXNDO0lBQ3ZHLElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQztJQUNoQixJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7SUFFbEIsS0FBSyxNQUFNLE9BQU8sSUFBSSxRQUFRLEVBQUUsQ0FBQztRQUNoQyxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2pELElBQUksV0FBVyxLQUFLLEtBQUssRUFBRSxDQUFDO1lBQzNCLFNBQVM7UUFDVixDQUFDO1FBRUQsU0FBUyxFQUFFLENBQUM7UUFFWixJQUFJLFdBQVcsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUMvQixPQUFPLEVBQUUsQ0FBQztRQUNYLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsQ0FBQztBQUMvQixDQUFDO0FBRUQsU0FBUywyQkFBMkIsQ0FBQyxnQkFBK0I7SUFDbkUsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFDO0lBQ2YsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFDO0lBQ2YsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFDO0lBRWhCLEtBQUssTUFBTSxPQUFPLElBQUksZ0JBQWdCLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDakQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDekMsTUFBTSxFQUFFLENBQUM7UUFDVixDQUFDO1FBQ0QsSUFBSSxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDcEIsTUFBTSxFQUFFLENBQUM7UUFDVixDQUFDO1FBQ0QsSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDckIsT0FBTyxFQUFFLENBQUM7UUFDWCxDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxDQUFDO0FBQ3BDLENBQUM7QUFFRCxTQUFTLDhCQUE4QixDQUFDLG1CQUFrQztJQUN6RSxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFDZixJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFDZixJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUM7SUFFaEIsS0FBSyxNQUFNLE9BQU8sSUFBSSxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNwRCxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLHlCQUF5QixFQUFFLENBQUM7WUFDN0UsTUFBTSxFQUFFLENBQUM7UUFDVixDQUFDO1FBQ0QsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzdCLE1BQU0sRUFBRSxDQUFDO1FBQ1YsQ0FBQztRQUNELElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO1lBQ2hELE9BQU8sRUFBRSxDQUFDO1FBQ1gsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQztBQUNwQyxDQUFDO0FBT0QsU0FBUyxnQkFBZ0IsQ0FBQyxRQUF1RjtJQUNoSCxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO1FBQ3hCLE1BQU0sRUFBRSxHQUFHLHVCQUF1QixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztRQUNuRSxNQUFNLEVBQUUsR0FBRyx1QkFBdUIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7UUFFbkUsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNqRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDcEMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3JCLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakMsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLEVBQUUsQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQztJQUM5QixDQUFDLENBQUMsQ0FBQztJQUVILE9BQU8sUUFBUSxDQUFDO0FBQ2pCLENBQUM7QUFFRCxTQUFTLHVCQUF1QixDQUFDLEdBQVk7SUFDNUMsTUFBTSxTQUFTLEdBQUcsR0FBeUMsQ0FBQztJQUU1RCxPQUFPLE9BQU8sU0FBUyxFQUFFLElBQUksS0FBSyxRQUFRLENBQUM7QUFDNUMsQ0FBQztBQUVELFNBQVMsZ0JBQWdCLENBQUMsS0FBZSxFQUFFLE9BQStCLEVBQUUsT0FBc0M7SUFDakgsTUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFDO0lBQ3ZCLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDL0MsSUFBSSxTQUFTLEtBQUssS0FBSyxFQUFFLENBQUM7UUFDekIsSUFBSSxTQUFTLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDN0IsV0FBVyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBQzNDLENBQUM7YUFBTSxDQUFDO1lBQ1AsV0FBVyxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1FBQy9DLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksc0JBQXNCLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2xJLENBQUM7QUFFRCxTQUFTLHNCQUFzQixDQUFDLE9BQStCO0lBQzlELE9BQU8sYUFBYSxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsZUFBZSxPQUFPLENBQUMsUUFBUSxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sYUFBYSxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLG9CQUFvQixPQUFPLE9BQU8sQ0FBQyxhQUFhLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUM5VSxDQUFDO0FBRUQsU0FBUyx5QkFBeUIsQ0FBQyxLQUFlLEVBQUUsZ0JBQStCO0lBQ2xGLE1BQU0sUUFBUSxHQUFHLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUV6RSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRywyQkFBMkIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ2xGLEtBQUssQ0FBQyxJQUFJLENBQUMsMEJBQTBCLFFBQVEsQ0FBQyxNQUFNLGFBQWEsTUFBTSxhQUFhLE1BQU0sY0FBYyxPQUFPLEtBQUssQ0FBQyxDQUFDO0lBRXRILEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFLENBQUM7UUFDaEMsTUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFDO1FBQ3ZCLElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3BCLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDOUIsQ0FBQztRQUNELElBQUksT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3JCLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDL0IsQ0FBQztRQUNELElBQUksT0FBTyxDQUFDLGtCQUFrQixHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3BDLFdBQVcsQ0FBQyxJQUFJLENBQUMsZUFBZSxPQUFPLENBQUMsa0JBQWtCLEdBQUcsQ0FBQyxDQUFDO1FBQ2hFLENBQUM7UUFDRCxJQUFJLE9BQU8sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDMUIsV0FBVyxDQUFDLElBQUksQ0FBQyxjQUFjLE9BQU8sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDO1FBQ3JELENBQUM7UUFDRCxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksc0JBQXNCLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNsSixDQUFDO0FBQ0YsQ0FBQztBQUVELFNBQVMsNEJBQTRCLENBQUMsS0FBZSxFQUFFLG1CQUFrQztJQUN4RixNQUFNLFdBQVcsR0FBRyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDL0UsTUFBTSxjQUFjLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDOUgsTUFBTSxjQUFjLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDOUUsTUFBTSxlQUFlLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUVsRyxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyw4QkFBOEIsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0lBQ3hGLEtBQUssQ0FBQyxJQUFJLENBQUMsOEJBQThCLFdBQVcsQ0FBQyxNQUFNLGFBQWEsTUFBTSxhQUFhLE1BQU0sY0FBYyxPQUFPLEtBQUssQ0FBQyxDQUFDO0lBRTdILEtBQUssTUFBTSxPQUFPLElBQUksQ0FBQyxjQUFjLEVBQUUsY0FBYyxFQUFFLGVBQWUsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUM7UUFDaEYsTUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFDO1FBQ3ZCLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUM3QixXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzlCLENBQUM7UUFDRCxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMseUJBQXlCLEVBQUUsQ0FBQztZQUNoRCxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQy9CLENBQUM7UUFDRCxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksc0JBQXNCLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNsSixDQUFDO0FBQ0YsQ0FBQyJ9