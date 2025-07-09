/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isRecursiveWatchRequest } from '../../common/watcher.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { ParcelWatcher } from './parcel/parcelWatcher.js';
import { NodeJSWatcher } from './nodejs/nodejsWatcher.js';
import { Promises } from '../../../../base/common/async.js';
import { computeStats } from './watcherStats.js';
export class UniversalWatcher extends Disposable {
    constructor() {
        super();
        this.recursiveWatcher = this._register(new ParcelWatcher());
        this.nonRecursiveWatcher = this._register(new NodeJSWatcher(this.recursiveWatcher));
        this.onDidChangeFile = Event.any(this.recursiveWatcher.onDidChangeFile, this.nonRecursiveWatcher.onDidChangeFile);
        this.onDidError = Event.any(this.recursiveWatcher.onDidError, this.nonRecursiveWatcher.onDidError);
        this._onDidLogMessage = this._register(new Emitter());
        this.onDidLogMessage = Event.any(this._onDidLogMessage.event, this.recursiveWatcher.onDidLogMessage, this.nonRecursiveWatcher.onDidLogMessage);
        this.requests = [];
        this.failedRecursiveRequests = 0;
        this._register(this.recursiveWatcher.onDidError(e => {
            if (e.request) {
                this.failedRecursiveRequests++;
            }
        }));
    }
    async watch(requests) {
        this.requests = requests;
        this.failedRecursiveRequests = 0;
        // Watch recursively first to give recursive watchers a chance
        // to step in for non-recursive watch requests, thus reducing
        // watcher duplication.
        let error;
        try {
            await this.recursiveWatcher.watch(requests.filter(request => isRecursiveWatchRequest(request)));
        }
        catch (e) {
            error = e;
        }
        try {
            await this.nonRecursiveWatcher.watch(requests.filter(request => !isRecursiveWatchRequest(request)));
        }
        catch (e) {
            if (!error) {
                error = e;
            }
        }
        if (error) {
            throw error;
        }
    }
    async setVerboseLogging(enabled) {
        // Log stats
        if (enabled && this.requests.length > 0) {
            this._onDidLogMessage.fire({ type: 'trace', message: computeStats(this.requests, this.failedRecursiveRequests, this.recursiveWatcher, this.nonRecursiveWatcher) });
        }
        // Forward to watchers
        await Promises.settled([
            this.recursiveWatcher.setVerboseLogging(enabled),
            this.nonRecursiveWatcher.setVerboseLogging(enabled)
        ]);
    }
    async stop() {
        await Promises.settled([
            this.recursiveWatcher.stop(),
            this.nonRecursiveWatcher.stop()
        ]);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2F0Y2hlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9maWxlcy9ub2RlL3dhdGNoZXIvd2F0Y2hlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFlLHVCQUF1QixFQUE2QyxNQUFNLHlCQUF5QixDQUFDO0FBQzFILE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQzFELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDNUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBRWpELE1BQU0sT0FBTyxnQkFBaUIsU0FBUSxVQUFVO0lBYy9DO1FBQ0MsS0FBSyxFQUFFLENBQUM7UUFiUSxxQkFBZ0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksYUFBYSxFQUFFLENBQUMsQ0FBQztRQUN2RCx3QkFBbUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7UUFFdkYsb0JBQWUsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQzdHLGVBQVUsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUs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