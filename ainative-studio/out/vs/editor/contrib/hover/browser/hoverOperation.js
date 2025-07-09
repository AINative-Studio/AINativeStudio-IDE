/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createCancelableAsyncIterable, RunOnceScheduler } from '../../../../base/common/async.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
var HoverOperationState;
(function (HoverOperationState) {
    HoverOperationState[HoverOperationState["Idle"] = 0] = "Idle";
    HoverOperationState[HoverOperationState["FirstWait"] = 1] = "FirstWait";
    HoverOperationState[HoverOperationState["SecondWait"] = 2] = "SecondWait";
    HoverOperationState[HoverOperationState["WaitingForAsync"] = 3] = "WaitingForAsync";
    HoverOperationState[HoverOperationState["WaitingForAsyncShowingLoading"] = 4] = "WaitingForAsyncShowingLoading";
})(HoverOperationState || (HoverOperationState = {}));
export var HoverStartMode;
(function (HoverStartMode) {
    HoverStartMode[HoverStartMode["Delayed"] = 0] = "Delayed";
    HoverStartMode[HoverStartMode["Immediate"] = 1] = "Immediate";
})(HoverStartMode || (HoverStartMode = {}));
export var HoverStartSource;
(function (HoverStartSource) {
    HoverStartSource[HoverStartSource["Mouse"] = 0] = "Mouse";
    HoverStartSource[HoverStartSource["Click"] = 1] = "Click";
    HoverStartSource[HoverStartSource["Keyboard"] = 2] = "Keyboard";
})(HoverStartSource || (HoverStartSource = {}));
export class HoverResult {
    constructor(value, isComplete, hasLoadingMessage, options) {
        this.value = value;
        this.isComplete = isComplete;
        this.hasLoadingMessage = hasLoadingMessage;
        this.options = options;
    }
}
/**
 * Computing the hover is very fine tuned.
 *
 * Suppose the hover delay is 300ms (the default). Then, when resting the mouse at an anchor:
 * - at 150ms, the async computation is triggered (i.e. semantic hover)
 *   - if async results already come in, they are not rendered yet.
 * - at 300ms, the sync computation is triggered (i.e. decorations, markers)
 *   - if there are sync or async results, they are rendered.
 * - at 900ms, if the async computation hasn't finished, a "Loading..." result is added.
 */
export class HoverOperation extends Disposable {
    constructor(_editor, _computer) {
        super();
        this._editor = _editor;
        this._computer = _computer;
        this._onResult = this._register(new Emitter());
        this.onResult = this._onResult.event;
        this._asyncComputationScheduler = this._register(new Debouncer((options) => this._triggerAsyncComputation(options), 0));
        this._syncComputationScheduler = this._register(new Debouncer((options) => this._triggerSyncComputation(options), 0));
        this._loadingMessageScheduler = this._register(new Debouncer((options) => this._triggerLoadingMessage(options), 0));
        this._state = 0 /* HoverOperationState.Idle */;
        this._asyncIterable = null;
        this._asyncIterableDone = false;
        this._result = [];
    }
    dispose() {
        if (this._asyncIterable) {
            this._asyncIterable.cancel();
            this._asyncIterable = null;
        }
        this._options = undefined;
        super.dispose();
    }
    get _hoverTime() {
        return this._editor.getOption(62 /* EditorOption.hover */).delay;
    }
    get _firstWaitTime() {
        return this._hoverTime / 2;
    }
    get _secondWaitTime() {
        return this._hoverTime - this._firstWaitTime;
    }
    get _loadingMessageTime() {
        return 3 * this._hoverTime;
    }
    _setState(state, options) {
        this._options = options;
        this._state = state;
        this._fireResult(options);
    }
    _triggerAsyncComputation(options) {
        this._setState(2 /* HoverOperationState.SecondWait */, options);
        this._syncComputationScheduler.schedule(options, this._secondWaitTime);
        if (this._computer.computeAsync) {
            this._asyncIterableDone = false;
            this._asyncIterable = createCancelableAsyncIterable(token => this._computer.computeAsync(options, token));
            (async () => {
                try {
                    for await (const item of this._asyncIterable) {
                        if (item) {
                            this._result.push(item);
                            this._fireResult(options);
                        }
                    }
                    this._asyncIterableDone = true;
                    if (this._state === 3 /* HoverOperationState.WaitingForAsync */ || this._state === 4 /* HoverOperationState.WaitingForAsyncShowingLoading */) {
                        this._setState(0 /* HoverOperationState.Idle */, options);
                    }
                }
                catch (e) {
                    onUnexpectedError(e);
                }
            })();
        }
        else {
            this._asyncIterableDone = true;
        }
    }
    _triggerSyncComputation(options) {
        if (this._computer.computeSync) {
            this._result = this._result.concat(this._computer.computeSync(options));
        }
        this._setState(this._asyncIterableDone ? 0 /* HoverOperationState.Idle */ : 3 /* HoverOperationState.WaitingForAsync */, options);
    }
    _triggerLoadingMessage(options) {
        if (this._state === 3 /* HoverOperationState.WaitingForAsync */) {
            this._setState(4 /* HoverOperationState.WaitingForAsyncShowingLoading */, options);
        }
    }
    _fireResult(options) {
        if (this._state === 1 /* HoverOperationState.FirstWait */ || this._state === 2 /* HoverOperationState.SecondWait */) {
            // Do not send out results before the hover time
            return;
        }
        const isComplete = (this._state === 0 /* HoverOperationState.Idle */);
        const hasLoadingMessage = (this._state === 4 /* HoverOperationState.WaitingForAsyncShowingLoading */);
        this._onResult.fire(new HoverResult(this._result.slice(0), isComplete, hasLoadingMessage, options));
    }
    start(mode, options) {
        if (mode === 0 /* HoverStartMode.Delayed */) {
            if (this._state === 0 /* HoverOperationState.Idle */) {
                this._setState(1 /* HoverOperationState.FirstWait */, options);
                this._asyncComputationScheduler.schedule(options, this._firstWaitTime);
                this._loadingMessageScheduler.schedule(options, this._loadingMessageTime);
            }
        }
        else {
            switch (this._state) {
                case 0 /* HoverOperationState.Idle */:
                    this._triggerAsyncComputation(options);
                    this._syncComputationScheduler.cancel();
                    this._triggerSyncComputation(options);
                    break;
                case 2 /* HoverOperationState.SecondWait */:
                    this._syncComputationScheduler.cancel();
                    this._triggerSyncComputation(options);
                    break;
            }
        }
    }
    cancel() {
        this._asyncComputationScheduler.cancel();
        this._syncComputationScheduler.cancel();
        this._loadingMessageScheduler.cancel();
        if (this._asyncIterable) {
            this._asyncIterable.cancel();
            this._asyncIterable = null;
        }
        this._result = [];
        this._options = undefined;
        this._state = 0 /* HoverOperationState.Idle */;
    }
    get options() {
        return this._options;
    }
}
class Debouncer extends Disposable {
    constructor(runner, debounceTimeMs) {
        super();
        this._scheduler = this._register(new RunOnceScheduler(() => runner(this._options), debounceTimeMs));
    }
    schedule(options, debounceTimeMs) {
        this._options = options;
        this._scheduler.schedule(debounceTimeMs);
    }
    cancel() {
        this._scheduler.cancel();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJPcGVyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaG92ZXIvYnJvd3Nlci9ob3Zlck9wZXJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQXNELDZCQUE2QixFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFdkosT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQWVsRSxJQUFXLG1CQU1WO0FBTkQsV0FBVyxtQkFBbUI7SUFDN0IsNkRBQUksQ0FBQTtJQUNKLHVFQUFTLENBQUE7SUFDVCx5RUFBVSxDQUFBO0lBQ1YsbUZBQW1CLENBQUE7SUFDbkIsK0dBQWlDLENBQUE7QUFDbEMsQ0FBQyxFQU5VLG1CQUFtQixLQUFuQixtQkFBbUIsUUFNN0I7QUFFRCxNQUFNLENBQU4sSUFBa0IsY0FHakI7QUFIRCxXQUFrQixjQUFjO0lBQy9CLHlEQUFXLENBQUE7SUFDWCw2REFBYSxDQUFBO0FBQ2QsQ0FBQyxFQUhpQixjQUFjLEtBQWQsY0FBYyxRQUcvQjtBQUVELE1BQU0sQ0FBTixJQUFrQixnQkFJakI7QUFKRCxXQUFrQixnQkFBZ0I7SUFDakMseURBQVMsQ0FBQTtJQUNULHlEQUFTLENBQUE7SUFDVCwrREFBWSxDQUFBO0FBQ2IsQ0FBQyxFQUppQixnQkFBZ0IsS0FBaEIsZ0JBQWdCLFFBSWpDO0FBRUQsTUFBTSxPQUFPLFdBQVc7SUFDdkIsWUFDaUIsS0FBZ0IsRUFDaEIsVUFBbUIsRUFDbkIsaUJBQTBCLEVBQzFCLE9BQWM7UUFIZCxV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