/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { findFirstIdxMonotonousOrArrLen } from '../../../../base/common/arraysFind.js';
import { Emitter } from '../../../../base/common/event.js';
import { Range } from '../../../common/core/range.js';
import { countEOL } from '../../../common/core/eolCounter.js';
export class HiddenRangeModel {
    get onDidChange() { return this._updateEventEmitter.event; }
    get hiddenRanges() { return this._hiddenRanges; }
    constructor(model) {
        this._updateEventEmitter = new Emitter();
        this._hasLineChanges = false;
        this._foldingModel = model;
        this._foldingModelListener = model.onDidChange(_ => this.updateHiddenRanges());
        this._hiddenRanges = [];
        if (model.regions.length) {
            this.updateHiddenRanges();
        }
    }
    notifyChangeModelContent(e) {
        if (this._hiddenRanges.length && !this._hasLineChanges) {
            this._hasLineChanges = e.changes.some(change => {
                return change.range.endLineNumber !== change.range.startLineNumber || countEOL(change.text)[0] !== 0;
            });
        }
    }
    updateHiddenRanges() {
        let updateHiddenAreas = false;
        const newHiddenAreas = [];
        let i = 0; // index into hidden
        let k = 0;
        let lastCollapsedStart = Number.MAX_VALUE;
        let lastCollapsedEnd = -1;
        const ranges = this._foldingModel.regions;
        for (; i < ranges.length; i++) {
            if (!ranges.isCollapsed(i)) {
                continue;
            }
            const startLineNumber = ranges.getStartLineNumber(i) + 1; // the first line is not hidden
            const endLineNumber = ranges.getEndLineNumber(i);
            if (lastCollapsedStart <= startLineNumber && endLineNumber <= lastCollapsedEnd) {
                // ignore ranges contained in collapsed regions
                continue;
            }
            if (!updateHiddenAreas && k < this._hiddenRanges.length && this._hiddenRanges[k].startLineNumber === startLineNumber && this._hiddenRanges[k].endLineNumber === endLineNumber) {
                // reuse the old ranges
                newHiddenAreas.push(this._hiddenRanges[k]);
                k++;
            }
            else {
                updateHiddenAreas = true;
                newHiddenAreas.push(new Range(startLineNumber, 1, endLineNumber, 1));
            }
            lastCollapsedStart = startLineNumber;
            lastCollapsedEnd = endLineNumber;
        }
        if (this._hasLineChanges || updateHiddenAreas || k < this._hiddenRanges.length) {
            this.applyHiddenRanges(newHiddenAreas);
        }
    }
    applyHiddenRanges(newHiddenAreas) {
        this._hiddenRanges = newHiddenAreas;
        this._hasLineChanges = false;
        this._updateEventEmitter.fire(newHiddenAreas);
    }
    hasRanges() {
        return this._hiddenRanges.length > 0;
    }
    isHidden(line) {
        return findRange(this._hiddenRanges, line) !== null;
    }
    adjustSelections(selections) {
        let hasChanges = false;
        const editorModel = this._foldingModel.textModel;
        let lastRange = null;
        const adjustLine = (line) => {
            if (!lastRange || !isInside(line, lastRange)) {
                lastRange = findRange(this._hiddenRanges, line);
            }
            if (lastRange) {
                return lastRange.startLineNumber - 1;
            }
            return null;
        };
        for (let i = 0, len = selections.length; i < len; i++) {
            let selection = selections[i];
            const adjustedStartLine = adjustLine(selection.startLineNumber);
            if (adjustedStartLine) {
                selection = selection.setStartPosition(adjustedStartLine, editorModel.getLineMaxColumn(adjustedStartLine));
                hasChanges = true;
            }
            const adjustedEndLine = adjustLine(selection.endLineNumber);
            if (adjustedEndLine) {
                selection = selection.setEndPosition(adjustedEndLine, editorModel.getLineMaxColumn(adjustedEndLine));
                hasChanges = true;
            }
            selections[i] = selection;
        }
        return hasChanges;
    }
    dispose() {
        if (this.hiddenRanges.length > 0) {
            this._hiddenRanges = [];
            this._updateEventEmitter.fire(this._hiddenRanges);
        }
        if (this._foldingModelListener) {
            this._foldingModelListener.dispose();
            this._foldingModelListener = null;
        }
    }
}
function isInside(line, range) {
    return line >= range.startLineNumber && line <= range.endLineNumber;
}
function findRange(ranges, line) {
    const i = findFirstIdxMonotonousOrArrLen(ranges, r => line < r.startLineNumber) - 1;
    if (i >= 0 && ranges[i].endLineNumber >= line) {
        return ranges[i];
    }
    return null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlkZGVuUmFuZ2VNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9mb2xkaW5nL2Jyb3dzZXIvaGlkZGVuUmFuZ2VNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUV2RixPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFFbEUsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUc5RCxNQUFNLE9BQU8sZ0JBQWdCO0lBUTVCLElBQVcsV0FBVyxLQUFzQixPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ3BGLElBQVcsWUFBWSxLQUFLLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7SUFFeEQsWUFBbUIsS0FBbUI7UUFOckIsd0JBQW1CLEdBQUcsSUFBSSxPQUFPLEVBQVksQ0FBQztRQUN2RCxvQkFBZSxHQUFZLEtBQUssQ0FBQztRQU14QyxJQUFJLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQztRQUMzQixJQUFJLENBQUMscUJBQXFCLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUM7UUFDL0UsSUFBSSxDQUFDLGFBQWEsR0FBRyxFQUFFLENBQUM7UUFDeEIsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1FBQzNCLENBQUM7SUFDRixD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