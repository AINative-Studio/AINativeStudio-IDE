/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { compareBy, numberComparator } from '../../../../../base/common/arrays.js';
import { BugIndicatingError } from '../../../../../base/common/errors.js';
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { DetailedLineRangeMapping } from './mapping.js';
import { LineRangeEdit } from './editing.js';
import { LineRange } from './lineRange.js';
import { ReentrancyBarrier } from '../../../../../base/common/controlFlow.js';
import { autorun, observableSignal, observableValue, transaction } from '../../../../../base/common/observable.js';
export class TextModelDiffs extends Disposable {
    get isApplyingChange() {
        return this._barrier.isOccupied;
    }
    constructor(baseTextModel, textModel, diffComputer) {
        super();
        this.baseTextModel = baseTextModel;
        this.textModel = textModel;
        this.diffComputer = diffComputer;
        this._recomputeCount = 0;
        this._state = observableValue(this, 1 /* TextModelDiffState.initializing */);
        this._diffs = observableValue(this, []);
        this._barrier = new ReentrancyBarrier();
        this._isDisposed = false;
        this._isInitializing = true;
        const recomputeSignal = observableSignal('recompute');
        this._register(autorun(reader => {
            /** @description Update diff state */
            recomputeSignal.read(reader);
            this._recompute(reader);
        }));
        this._register(baseTextModel.onDidChangeContent(this._barrier.makeExclusiveOrSkip(() => {
            recomputeSignal.trigger(undefined);
        })));
        this._register(textModel.onDidChangeContent(this._barrier.makeExclusiveOrSkip(() => {
            recomputeSignal.trigger(undefined);
        })));
        this._register(toDisposable(() => {
            this._isDisposed = true;
        }));
    }
    get state() {
        return this._state;
    }
    /**
     * Diffs from base to input.
    */
    get diffs() {
        return this._diffs;
    }
    _recompute(reader) {
        this._recomputeCount++;
        const currentRecomputeIdx = this._recomputeCount;
        if (this._state.get() === 1 /* TextModelDiffState.initializing */) {
            this._isInitializing = true;
        }
        transaction(tx => {
            /** @description Starting Diff Computation. */
            this._state.set(this._isInitializing ? 1 /* TextModelDiffState.initializing */ : 3 /* TextModelDiffState.updating */, tx, 0 /* TextModelDiffChangeReason.other */);
        });
        const result = this.diffComputer.computeDiff(this.baseTextModel, this.textModel, reader);
        result.then((result) => {
            if (this._isDisposed) {
                return;
            }
            if (currentRecomputeIdx !== this._recomputeCount) {
                // There is a newer recompute call
                return;
            }
            transaction(tx => {
                /** @description Completed Diff Computation */
                if (result.diffs) {
                    this._state.set(2 /* TextModelDiffState.upToDate */, tx, 1 /* TextModelDiffChangeReason.textChange */);
                    this._diffs.set(result.diffs, tx, 1 /* TextModelDiffChangeReason.textChange */);
                }
                else {
                    this._state.set(4 /* TextModelDiffState.error */, tx, 1 /* TextModelDiffChangeReason.textChange */);
                }
                this._isInitializing = false;
            });
        });
    }
    ensureUpToDate() {
        if (this.state.get() !== 2 /* TextModelDiffState.upToDate */) {
            throw new BugIndicatingError('Cannot remove diffs when the model is not up to date');
        }
    }
    removeDiffs(diffToRemoves, transaction, group) {
        this.ensureUpToDate();
        diffToRemoves.sort(compareBy((d) => d.inputRange.startLineNumber, numberComparator));
        diffToRemoves.reverse();
        let diffs = this._diffs.get();
        for (const diffToRemove of diffToRemoves) {
            // TODO improve performance
            const len = diffs.length;
            diffs = diffs.filter((d) => d !== diffToRemove);
            if (len === diffs.length) {
                throw new BugIndicatingError();
            }
            this._barrier.runExclusivelyOrThrow(() => {
                const edits = diffToRemove.getReverseLineEdit().toEdits(this.textModel.getLineCount());
                this.textModel.pushEditOperations(null, edits, () => null, group);
            });
            diffs = diffs.map((d) => d.outputRange.isAfter(diffToRemove.outputRange)
                ? d.addOutputLineDelta(diffToRemove.inputRange.lineCount - diffToRemove.outputRange.lineCount)
                : d);
        }
        this._diffs.set(diffs, transaction, 0 /* TextModelDiffChangeReason.other */);
    }
    /**
     * Edit must be conflict free.
     */
    applyEditRelativeToOriginal(edit, transaction, group) {
        this.ensureUpToDate();
        const editMapping = new DetailedLineRangeMapping(edit.range, this.baseTextModel, new LineRange(edit.range.startLineNumber, edit.newLines.length), this.textModel);
        let firstAfter = false;
        let delta = 0;
        const newDiffs = new Array();
        for (const diff of this.diffs.get()) {
            if (diff.inputRange.touches(edit.range)) {
                throw new BugIndicatingError('Edit must be conflict free.');
            }
            else if (diff.inputRange.isAfter(edit.range)) {
                if (!firstAfter) {
                    firstAfter = true;
                    newDiffs.push(editMapping.addOutputLineDelta(delta));
                }
                newDiffs.push(diff.addOutputLineDelta(edit.newLines.length - edit.range.lineCount));
            }
            else {
                newDiffs.push(diff);
            }
            if (!firstAfter) {
                delta += diff.outputRange.lineCount - diff.inputRange.lineCount;
            }
        }
        if (!firstAfter) {
            firstAfter = true;
            newDiffs.push(editMapping.addOutputLineDelta(delta));
        }
        this._barrier.runExclusivelyOrThrow(() => {
            const edits = new LineRangeEdit(edit.range.delta(delta), edit.newLines).toEdits(this.textModel.getLineCount());
            this.textModel.pushEditOperations(null, edits, () => null, group);
        });
        this._diffs.set(newDiffs, transaction, 0 /* TextModelDiffChangeReason.other */);
    }
    findTouchingDiffs(baseRange) {
        return this.diffs.get().filter(d => d.inputRange.touches(baseRange));
    }
    getResultLine(lineNumber, reader) {
        let offset = 0;
        const diffs = reader ? this.diffs.read(reader) : this.diffs.get();
        for (const diff of diffs) {
            if (diff.inputRange.contains(lineNumber) || diff.inputRange.endLineNumberExclusive === lineNumber) {
                return diff;
            }
            else if (diff.inputRange.endLineNumberExclusive < lineNumber) {
                offset = diff.resultingDeltaFromOriginalToModified;
            }
            else {
                break;
            }
        }
        return lineNumber + offset;
    }
    getResultLineRange(baseRange, reader) {
        let start = this.getResultLine(baseRange.startLineNumber, reader);
        if (typeof start !== 'number') {
            start = start.outputRange.startLineNumber;
        }
        let endExclusive = this.getResultLine(baseRange.endLineNumberExclusive, reader);
        if (typeof endExclusive !== 'number') {
            endExclusive = endExclusive.outputRange.endLineNumberExclusive;
        }
        return LineRange.fromLineNumbers(start, endExclusive);
    }
}
export var TextModelDiffChangeReason;
(function (TextModelDiffChangeReason) {
    TextModelDiffChangeReason[TextModelDiffChangeReason["other"] = 0] = "other";
    TextModelDiffChangeReason[TextModelDiffChangeReason["textChange"] = 1] = "textChange";
})(TextModelDiffChangeReason || (TextModelDiffChangeReason = {}));
export var TextModelDiffState;
(function (TextModelDiffState) {
    TextModelDiffState[TextModelDiffState["initializing"] = 1] = "initializing";
    TextModelDiffState[TextModelDiffState["upToDate"] = 2] = "upToDate";
    TextModelDiffState[TextModelDiffState["updating"] = 3] = "updating";
    TextModelDiffState[TextModelDiffState["error"] = 4] = "error";
})(TextModelDiffState || (TextModelDiffState = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsRGlmZnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvYnJvd3Nlci9tb2RlbC90ZXh0TW9kZWxEaWZmcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDMUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVuRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDeEQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUM3QyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDM0MsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFFOUUsT0FBTyxFQUFFLE9BQU8sRUFBZ0QsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBR2pLLE1BQU0sT0FBTyxjQUFlLFNBQVEsVUFBVTtJQVE3QyxJQUFXLGdCQUFnQjtRQUMxQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDO0lBQ2pDLENBQUM7SUFFRCxZQUNrQixhQUF5QixFQUN6QixTQUFxQixFQUNyQixZQUFnQztRQUVqRCxLQUFLLEVBQUUsQ0FBQztRQUpTLGtCQUFhLEdBQWIsYUFBYSxDQUFZO1FBQ3pCLGNBQVMsR0FBVCxTQUFTLENBQVk7UUFDckIsaUJBQVksR0FBWixZQUFZLENBQW9CO1FBZDFDLG9CQUFlLEdBQUcsQ0FB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