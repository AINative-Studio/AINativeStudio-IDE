/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { equals } from '../../../base/common/arrays.js';
import { RunOnceScheduler } from '../../../base/common/async.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { LineRange } from '../core/lineRange.js';
/**
 * @internal
 */
export class AttachedViews {
    constructor() {
        this._onDidChangeVisibleRanges = new Emitter();
        this.onDidChangeVisibleRanges = this._onDidChangeVisibleRanges.event;
        this._views = new Set();
    }
    attachView() {
        const view = new AttachedViewImpl((state) => {
            this._onDidChangeVisibleRanges.fire({ view, state });
        });
        this._views.add(view);
        return view;
    }
    detachView(view) {
        this._views.delete(view);
        this._onDidChangeVisibleRanges.fire({ view, state: undefined });
    }
}
class AttachedViewImpl {
    constructor(handleStateChange) {
        this.handleStateChange = handleStateChange;
    }
    setVisibleLines(visibleLines, stabilized) {
        const visibleLineRanges = visibleLines.map((line) => new LineRange(line.startLineNumber, line.endLineNumber + 1));
        this.handleStateChange({ visibleLineRanges, stabilized });
    }
}
export class AttachedViewHandler extends Disposable {
    get lineRanges() { return this._lineRanges; }
    constructor(_refreshTokens) {
        super();
        this._refreshTokens = _refreshTokens;
        this.runner = this._register(new RunOnceScheduler(() => this.update(), 50));
        this._computedLineRanges = [];
        this._lineRanges = [];
    }
    update() {
        if (equals(this._computedLineRanges, this._lineRanges, (a, b) => a.equals(b))) {
            return;
        }
        this._computedLineRanges = this._lineRanges;
        this._refreshTokens();
    }
    handleStateChange(state) {
        this._lineRanges = state.visibleLineRanges;
        if (state.stabilized) {
            this.runner.cancel();
            this.update();
        }
        else {
            this.runner.schedule();
        }
    }
}
export class AbstractTokens extends Disposable {
    get backgroundTokenizationState() {
        return this._backgroundTokenizationState;
    }
    constructor(_languageIdCodec, _textModel, getLanguageId) {
        super();
        this._languageIdCodec = _languageIdCodec;
        this._textModel = _textModel;
        this.getLanguageId = getLanguageId;
        this._onDidChangeTokens = this._register(new Emitter());
        /** @internal, should not be exposed by the text model! */
        this.onDidChangeTokens = this._onDidChangeTokens.event;
    }
    tokenizeIfCheap(lineNumber) {
        if (this.isCheapToTokenize(lineNumber)) {
            this.forceTokenization(lineNumber);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwvdG9rZW5zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN4RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQVNqRDs7R0FFRztBQUNILE1BQU0sT0FBTyxhQUFhO0lBQTFCO1FBQ2tCLDhCQUF5QixHQUFHLElBQUksT0FBTyxFQUFrRSxDQUFDO1FBQzNHLDZCQUF3QixHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLENBQUM7UUFFL0QsV0FBTSxHQUFHLElBQUksR0FBRyxFQUFvQixDQUFDO0lBY3ZELENBQUM7SUFaTyxVQUFVO1FBQ2hCLE1BQU0sSUFBSSxHQUFHLElBQUksZ0JBQWdCLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUMzQyxJQUFJLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDdEQsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0QixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFTSxVQUFVLENBQUMsSUFBbUI7UUFDcEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBd0IsQ0FBQyxD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