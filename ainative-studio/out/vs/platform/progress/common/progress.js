/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { DeferredPromise } from '../../../base/common/async.js';
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import { Disposable, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const IProgressService = createDecorator('progressService');
export var ProgressLocation;
(function (ProgressLocation) {
    ProgressLocation[ProgressLocation["Explorer"] = 1] = "Explorer";
    ProgressLocation[ProgressLocation["Scm"] = 3] = "Scm";
    ProgressLocation[ProgressLocation["Extensions"] = 5] = "Extensions";
    ProgressLocation[ProgressLocation["Window"] = 10] = "Window";
    ProgressLocation[ProgressLocation["Notification"] = 15] = "Notification";
    ProgressLocation[ProgressLocation["Dialog"] = 20] = "Dialog";
})(ProgressLocation || (ProgressLocation = {}));
export const emptyProgressRunner = Object.freeze({
    total() { },
    worked() { },
    done() { }
});
export class Progress {
    static { this.None = Object.freeze({ report() { } }); }
    get value() { return this._value; }
    constructor(callback) {
        this.callback = callback;
    }
    report(item) {
        this._value = item;
        this.callback(this._value);
    }
}
export class AsyncProgress {
    get value() { return this._value; }
    constructor(callback) {
        this.callback = callback;
    }
    report(item) {
        if (!this._asyncQueue) {
            this._asyncQueue = [item];
        }
        else {
            this._asyncQueue.push(item);
        }
        this._processAsyncQueue();
    }
    async _processAsyncQueue() {
        if (this._processingAsyncQueue) {
            return;
        }
        try {
            this._processingAsyncQueue = true;
            while (this._asyncQueue && this._asyncQueue.length) {
                const item = this._asyncQueue.shift();
                this._value = item;
                await this.callback(this._value);
            }
        }
        finally {
            this._processingAsyncQueue = false;
            const drainListener = this._drainListener;
            this._drainListener = undefined;
            drainListener?.();
        }
    }
    drain() {
        if (this._processingAsyncQueue) {
            return new Promise(resolve => {
                const prevListener = this._drainListener;
                this._drainListener = () => {
                    prevListener?.();
                    resolve();
                };
            });
        }
        return Promise.resolve();
    }
}
/**
 * RAII-style progress instance that allows imperative reporting and hides
 * once `dispose()` is called.
 */
let UnmanagedProgress = class UnmanagedProgress extends Disposable {
    constructor(options, progressService) {
        super();
        this.deferred = new DeferredPromise();
        progressService.withProgress(options, reporter => {
            this.reporter = reporter;
            if (this.lastStep) {
                reporter.report(this.lastStep);
            }
            return this.deferred.p;
        });
        this._register(toDisposable(() => this.deferred.complete()));
    }
    report(step) {
        if (this.reporter) {
            this.reporter.report(step);
        }
        else {
            this.lastStep = step;
        }
    }
};
UnmanagedProgress = __decorate([
    __param(1, IProgressService)
], UnmanagedProgress);
export { UnmanagedProgress };
export class LongRunningOperation extends Disposable {
    constructor(progressIndicator) {
        super();
        this.progressIndicator = progressIndicator;
        this.currentOperationId = 0;
        this.currentOperationDisposables = this._register(new DisposableStore());
    }
    start(progressDelay) {
        // Stop any previous operation
        this.stop();
        // Start new
        const newOperationId = ++this.currentOperationId;
        const newOperationToken = new CancellationTokenSource();
        this.currentProgressTimeout = setTimeout(() => {
            if (newOperationId === this.currentOperationId) {
                this.currentProgressRunner = this.progressIndicator.show(true);
            }
        }, progressDelay);
        this.currentOperationDisposables.add(toDisposable(() => clearTimeout(this.currentProgressTimeout)));
        this.currentOperationDisposables.add(toDisposable(() => newOperationToken.cancel()));
        this.currentOperationDisposables.add(toDisposable(() => this.currentProgressRunner ? this.currentProgressRunner.done() : undefined));
        return {
            id: newOperationId,
            token: newOperationToken.token,
            stop: () => this.doStop(newOperationId),
            isCurrent: () => this.currentOperationId === newOperationId
        };
    }
    stop() {
        this.doStop(this.currentOperationId);
    }
    doStop(operationId) {
        if (this.currentOperationId === operationId) {
            this.currentOperationDisposables.clear();
        }
    }
}
export const IEditorProgressService = createDecorator('editorProgressService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3Jlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcHJvZ3Jlc3MvY29tbW9uL3Byb2dyZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNoRSxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRzlFLE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLGVBQWUsQ0FBbUIsaUJBQWlCLENBQUMsQ0FBQztBQStCckYsTUFBTSxDQUFOLElBQWtCLGdCQU9qQjtBQVBELFdBQWtCLGdCQUFnQjtJQUNqQywrREFBWSxDQUFBO0lBQ1oscURBQU8sQ0FBQTtJQUNQLG1FQUFjLENBQUE7SUFDZCw0REFBVyxDQUFBO0lBQ1gsd0VBQWlCLENBQUE7SUFDakIsNERBQVcsQ0FBQTtBQUNaLENBQUMsRUFQaUIsZ0JBQWdCLEtBQWhCLGdCQUFnQixRQU9qQztBQWlERCxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFrQjtJQUNqRSxLQUFLLEtBQUssQ0FBQztJQUNYLE1BQU0sS0FBSyxDQUFDO0lBQ1osSUFBSSxLQUFLLENBQUM7Q0FDVixDQUFDLENBQUM7QUFNSCxNQUFNLE9BQU8sUUFBUTthQUVKLFNBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFxQixFQUFFLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBRzNFLElBQUksS0FBSyxLQUFv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