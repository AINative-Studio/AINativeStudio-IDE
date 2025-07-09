/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { emptyProgressRunner } from '../../../../platform/progress/common/progress.js';
export class EditorProgressIndicator extends Disposable {
    constructor(progressBar, group) {
        super();
        this.progressBar = progressBar;
        this.group = group;
        this.registerListeners();
    }
    registerListeners() {
        // Stop any running progress when the active editor changes or
        // the group becomes empty.
        // In contrast to the composite progress indicator, we do not
        // track active editor progress and replay it later (yet).
        this._register(this.group.onDidModelChange(e => {
            if (e.kind === 8 /* GroupModelChangeKind.EDITOR_ACTIVE */ ||
                (e.kind === 6 /* GroupModelChangeKind.EDITOR_CLOSE */ && this.group.isEmpty)) {
                this.progressBar.stop().hide();
            }
        }));
    }
    show(infiniteOrTotal, delay) {
        // No editor open: ignore any progress reporting
        if (this.group.isEmpty) {
            return emptyProgressRunner;
        }
        if (infiniteOrTotal === true) {
            return this.doShow(true, delay);
        }
        return this.doShow(infiniteOrTotal, delay);
    }
    doShow(infiniteOrTotal, delay) {
        if (typeof infiniteOrTotal === 'boolean') {
            this.progressBar.infinite().show(delay);
        }
        else {
            this.progressBar.total(infiniteOrTotal).show(delay);
        }
        return {
            total: (total) => {
                this.progressBar.total(total);
            },
            worked: (worked) => {
                if (this.progressBar.hasTotal()) {
                    this.progressBar.worked(worked);
                }
                else {
                    this.progressBar.infinite().show();
                }
            },
            done: () => {
                this.progressBar.stop().hide();
            }
        };
    }
    async showWhile(promise, delay) {
        // No editor open: ignore any progress reporting
        if (this.group.isEmpty) {
            try {
                await promise;
            }
            catch (error) {
                // ignore
            }
        }
        return this.doShowWhile(promise, delay);
    }
    async doShowWhile(promise, delay) {
        try {
            this.progressBar.infinite().show(delay);
            await promise;
        }
        catch (error) {
            // ignore
        }
        finally {
            this.progressBar.stop().hide();
        }
    }
}
var ProgressIndicatorState;
(function (ProgressIndicatorState) {
    let Type;
    (function (Type) {
        Type[Type["None"] = 0] = "None";
        Type[Type["Done"] = 1] = "Done";
        Type[Type["Infinite"] = 2] = "Infinite";
        Type[Type["While"] = 3] = "While";
        Type[Type["Work"] = 4] = "Work";
    })(Type = ProgressIndicatorState.Type || (ProgressIndicatorState.Type = {}));
    ProgressIndicatorState.None = { type: 0 /* Type.None */ };
    ProgressIndicatorState.Done = { type: 1 /* Type.Done */ };
    ProgressIndicatorState.Infinite = { type: 2 /* Type.Infinite */ };
    class While {
        constructor(whilePromise, whileStart, whileDelay) {
            this.whilePromise = whilePromise;
            this.whileStart = whileStart;
            this.whileDelay = whileDelay;
            this.type = 3 /* Type.While */;
        }
    }
    ProgressIndicatorState.While = While;
    class Work {
        constructor(total, worked) {
            this.total = total;
            this.worked = worked;
            this.type = 4 /* Type.Work */;
        }
    }
    ProgressIndicatorState.Work = Work;
})(ProgressIndicatorState || (ProgressIndicatorState = {}));
export class ScopedProgressIndicator extends Disposable {
    constructor(progressBar, scope) {
        super();
        this.progressBar = progressBar;
        this.scope = scope;
        this.progressState = ProgressIndicatorState.None;
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.scope.onDidChangeActive(() => {
            if (this.scope.isActive) {
                this.onDidScopeActivate();
            }
            else {
                this.onDidScopeDeactivate();
            }
        }));
    }
    onDidScopeActivate() {
        // Return early if progress state indicates that progress is done
        if (this.progressState.type === ProgressIndicatorState.Done.type) {
            return;
        }
        // Replay Infinite Progress from Promise
        if (this.progressState.type === 3 /* ProgressIndicatorState.Type.While */) {
            let delay;
            if (this.progressState.whileDelay > 0) {
                const remainingDelay = this.progressState.whileDelay - (Date.now() - this.progressState.whileStart);
                if (remainingDelay > 0) {
                    delay = remainingDelay;
                }
            }
            this.doShowWhile(delay);
        }
        // Replay Infinite Progress
        else if (this.progressState.type === 2 /* ProgressIndicatorState.Type.Infinite */) {
            this.progressBar.infinite().show();
        }
        // Replay Finite Progress (Total & Worked)
        else if (this.progressState.type === 4 /* ProgressIndicatorState.Type.Work */) {
            if (this.progressState.total) {
                this.progressBar.total(this.progressState.total).show();
            }
            if (this.progressState.worked) {
                this.progressBar.worked(this.progressState.worked).show();
            }
        }
    }
    onDidScopeDeactivate() {
        this.progressBar.stop().hide();
    }
    show(infiniteOrTotal, delay) {
        // Sort out Arguments
        if (typeof infiniteOrTotal === 'boolean') {
            this.progressState = ProgressIndicatorState.Infinite;
        }
        else {
            this.progressState = new ProgressIndicatorState.Work(infiniteOrTotal, undefined);
        }
        // Active: Show Progress
        if (this.scope.isActive) {
            // Infinite: Start Progressbar and Show after Delay
            if (this.progressState.type === 2 /* ProgressIndicatorState.Type.Infinite */) {
                this.progressBar.infinite().show(delay);
            }
            // Finite: Start Progressbar and Show after Delay
            else if (this.progressState.type === 4 /* ProgressIndicatorState.Type.Work */ && typeof this.progressState.total === 'number') {
                this.progressBar.total(this.progressState.total).show(delay);
            }
        }
        return {
            total: (total) => {
                this.progressState = new ProgressIndicatorState.Work(total, this.progressState.type === 4 /* ProgressIndicatorState.Type.Work */ ? this.progressState.worked : undefined);
                if (this.scope.isActive) {
                    this.progressBar.total(total);
                }
            },
            worked: (worked) => {
                // Verify first that we are either not active or the progressbar has a total set
                if (!this.scope.isActive || this.progressBar.hasTotal()) {
                    this.progressState = new ProgressIndicatorState.Work(this.progressState.type === 4 /* ProgressIndicatorState.Type.Work */ ? this.progressState.total : undefined, this.progressState.type === 4 /* ProgressIndicatorState.Type.Work */ && typeof this.progressState.worked === 'number' ? this.progressState.worked + worked : worked);
                    if (this.scope.isActive) {
                        this.progressBar.worked(worked);
                    }
                }
                // Otherwise the progress bar does not support worked(), we fallback to infinite() progress
                else {
                    this.progressState = ProgressIndicatorState.Infinite;
                    this.progressBar.infinite().show();
                }
            },
            done: () => {
                this.progressState = ProgressIndicatorState.Done;
                if (this.scope.isActive) {
                    this.progressBar.stop().hide();
                }
            }
        };
    }
    async showWhile(promise, delay) {
        // Join with existing running promise to ensure progress is accurate
        if (this.progressState.type === 3 /* ProgressIndicatorState.Type.While */) {
            promise = Promise.allSettled([promise, this.progressState.whilePromise]);
        }
        // Keep Promise in State
        this.progressState = new ProgressIndicatorState.While(promise, delay || 0, Date.now());
        try {
            this.doShowWhile(delay);
            await promise;
        }
        catch (error) {
            // ignore
        }
        finally {
            // If this is not the last promise in the list of joined promises, skip this
            if (this.progressState.type !== 3 /* ProgressIndicatorState.Type.While */ || this.progressState.whilePromise === promise) {
                // The while promise is either null or equal the promise we last hooked on
                this.progressState = ProgressIndicatorState.None;
                if (this.scope.isActive) {
                    this.progressBar.stop().hide();
                }
            }
        }
    }
    doShowWhile(delay) {
        // Show Progress when active
        if (this.scope.isActive) {
            this.progressBar.infinite().show(delay);
        }
    }
}
export class AbstractProgressScope extends Disposable {
    get isActive() { return this._isActive; }
    constructor(scopeId, _isActive) {
        super();
        this.scopeId = scopeId;
        this._isActive = _isActive;
        this._onDidChangeActive = this._register(new Emitter());
        this.onDidChangeActive = this._onDidChangeActive.event;
    }
    onScopeOpened(scopeId) {
        if (scopeId === this.scopeId) {
            if (!this._isActive) {
                this._isActive = true;
                this._onDidChangeActive.fire();
            }
        }
    }
    onScopeClosed(scopeId) {
        if (scopeId === this.scopeId) {
            if (this._isActive) {
                this._isActive = false;
                this._onDidChangeActive.fire();
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3Jlc3NJbmRpY2F0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3Byb2dyZXNzL2Jyb3dzZXIvcHJvZ3Jlc3NJbmRpY2F0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVsRSxPQUFPLEVBQXVDLG1CQUFtQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFJNUgsTUFBTSxPQUFPLHVCQUF3QixTQUFRLFVBQVU7SUFFdEQsWUFDa0IsV0FBd0IsRUFDeEIsS0FBdUI7UUFFeEMsS0FBSyxFQUFFLENBQUM7UUFIUyxnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQUN4QixVQUFLLEdBQUwsS0FBSyxDQUFrQjtRQUl4QyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRU8saUJBQWlCO1FBRXhCLDhEQUE4RDtRQUM5RCwyQkFBMkI7UUFDM0IsNkRBQTZEO1FBQzdELDBEQUEwRDtRQUMxRCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDOUMsSUFDQyxDQUFDLENBQUMsSUFBSSwrQ0FBdUM7Z0JBQzdDLENBQUMsQ0FBQyxDQUFDLElBQUksOENBQXNDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFDbkUsQ0FBQztnQkFDRixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJ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