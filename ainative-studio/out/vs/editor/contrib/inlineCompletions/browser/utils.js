/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Permutation, compareBy } from '../../../../base/common/arrays.js';
import { BugIndicatingError } from '../../../../base/common/errors.js';
import { observableValue, autorun, transaction } from '../../../../base/common/observable.js';
import { bindContextKey } from '../../../../platform/observable/common/platformObservableUtils.js';
import { Position } from '../../../common/core/position.js';
import { PositionOffsetTransformer } from '../../../common/core/positionToOffset.js';
import { Range } from '../../../common/core/range.js';
import { TextEdit } from '../../../common/core/textEdit.js';
const array = [];
export function getReadonlyEmptyArray() {
    return array;
}
export class ColumnRange {
    constructor(startColumn, endColumnExclusive) {
        this.startColumn = startColumn;
        this.endColumnExclusive = endColumnExclusive;
        if (startColumn > endColumnExclusive) {
            throw new BugIndicatingError(`startColumn ${startColumn} cannot be after endColumnExclusive ${endColumnExclusive}`);
        }
    }
    toRange(lineNumber) {
        return new Range(lineNumber, this.startColumn, lineNumber, this.endColumnExclusive);
    }
    equals(other) {
        return this.startColumn === other.startColumn
            && this.endColumnExclusive === other.endColumnExclusive;
    }
}
export function addPositions(pos1, pos2) {
    return new Position(pos1.lineNumber + pos2.lineNumber - 1, pos2.lineNumber === 1 ? pos1.column + pos2.column - 1 : pos2.column);
}
export function subtractPositions(pos1, pos2) {
    return new Position(pos1.lineNumber - pos2.lineNumber + 1, pos1.lineNumber - pos2.lineNumber === 0 ? pos1.column - pos2.column + 1 : pos1.column);
}
export function substringPos(text, pos) {
    const transformer = new PositionOffsetTransformer(text);
    const offset = transformer.getOffset(pos);
    return text.substring(offset);
}
export function getEndPositionsAfterApplying(edits) {
    const newRanges = getModifiedRangesAfterApplying(edits);
    return newRanges.map(range => range.getEndPosition());
}
export function getModifiedRangesAfterApplying(edits) {
    const sortPerm = Permutation.createSortPermutation(edits, compareBy(e => e.range, Range.compareRangesUsingStarts));
    const edit = new TextEdit(sortPerm.apply(edits));
    const sortedNewRanges = edit.getNewRanges();
    return sortPerm.inverse().apply(sortedNewRanges);
}
export function convertItemsToStableObservables(items, store) {
    const result = observableValue('result', []);
    const innerObservables = [];
    store.add(autorun(reader => {
        const itemsValue = items.read(reader);
        transaction(tx => {
            if (itemsValue.length !== innerObservables.length) {
                innerObservables.length = itemsValue.length;
                for (let i = 0; i < innerObservables.length; i++) {
                    if (!innerObservables[i]) {
                        innerObservables[i] = observableValue('item', itemsValue[i]);
                    }
                }
                result.set([...innerObservables], tx);
            }
            innerObservables.forEach((o, i) => o.set(itemsValue[i], tx));
        });
    }));
    return result;
}
export class ObservableContextKeyService {
    constructor(_contextKeyService) {
        this._contextKeyService = _contextKeyService;
    }
    bind(key, obs) {
        return bindContextKey(key, this._contextKeyService, obs instanceof Function ? obs : reader => obs.read(reader));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRXZFLE9BQU8sRUFBZSxlQUFlLEVBQXVCLE9BQU8sRUFBRSxXQUFXLEVBQVcsTUFBTSx1Q0FBdUMsQ0FBQztBQUV6SSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDbkcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzVELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RCxPQUFPLEVBQWtCLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTVFLE1BQU0sS0FBSyxHQUF1QixFQUFFLENBQUM7QUFDckMsTUFBTSxVQUFVLHFCQUFxQjtJQUNwQyxPQUFPLEtBQUssQ0FBQztBQUNkLENBQUM7QUFFRCxNQUFNLE9BQU8sV0FBVztJQUN2QixZQUNpQixXQUFtQixFQUNuQixrQkFBMEI7UUFEMUIsZ0JBQVcsR0FBWCxXQUFXLENBQVE7UUFDbkIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFRO1FBRTFDLElBQUksV0FBVyxHQUFHLGtCQUFrQixFQUFFLENBQUM7WUFDdEMsTUFBTSxJQUFJLGtCQUFrQixDQUFDLGVBQWUsV0FBVyx1Q0FBdUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO1FBQ3JI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