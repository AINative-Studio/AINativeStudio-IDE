/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { compareBy } from '../../../../../base/common/arrays.js';
import { assertFn, checkAdjacentItems } from '../../../../../base/common/assert.js';
import { isDefined } from '../../../../../base/common/types.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { TextLength } from '../../../../../editor/common/core/textLength.js';
import { RangeMapping } from '../model/mapping.js';
import { addLength, lengthBetweenPositions, lengthOfRange } from '../model/rangeUtils.js';
export function getAlignments(m) {
    const equalRanges1 = toEqualRangeMappings(m.input1Diffs.flatMap(d => d.rangeMappings), m.baseRange.toRange(), m.input1Range.toRange());
    const equalRanges2 = toEqualRangeMappings(m.input2Diffs.flatMap(d => d.rangeMappings), m.baseRange.toRange(), m.input2Range.toRange());
    const commonRanges = splitUpCommonEqualRangeMappings(equalRanges1, equalRanges2);
    let result = [];
    result.push([m.input1Range.startLineNumber - 1, m.baseRange.startLineNumber - 1, m.input2Range.startLineNumber - 1]);
    function isFullSync(lineAlignment) {
        return lineAlignment.every((i) => i !== undefined);
    }
    // One base line has either up to one full sync or up to two half syncs.
    for (const m of commonRanges) {
        const lineAlignment = [m.output1Pos?.lineNumber, m.inputPos.lineNumber, m.output2Pos?.lineNumber];
        const alignmentIsFullSync = isFullSync(lineAlignment);
        let shouldAdd = true;
        if (alignmentIsFullSync) {
            const isNewFullSyncAlignment = !result.some(r => isFullSync(r) && r.some((v, idx) => v !== undefined && v === lineAlignment[idx]));
            if (isNewFullSyncAlignment) {
                // Remove half syncs
                result = result.filter(r => !r.some((v, idx) => v !== undefined && v === lineAlignment[idx]));
            }
            shouldAdd = isNewFullSyncAlignment;
        }
        else {
            const isNew = !result.some(r => r.some((v, idx) => v !== undefined && v === lineAlignment[idx]));
            shouldAdd = isNew;
        }
        if (shouldAdd) {
            result.push(lineAlignment);
        }
        else {
            if (m.length.isGreaterThan(new TextLength(1, 0))) {
                result.push([
                    m.output1Pos ? m.output1Pos.lineNumber + 1 : undefined,
                    m.inputPos.lineNumber + 1,
                    m.output2Pos ? m.output2Pos.lineNumber + 1 : undefined
                ]);
            }
        }
    }
    const finalLineAlignment = [m.input1Range.endLineNumberExclusive, m.baseRange.endLineNumberExclusive, m.input2Range.endLineNumberExclusive];
    result = result.filter(r => r.every((v, idx) => v !== finalLineAlignment[idx]));
    result.push(finalLineAlignment);
    assertFn(() => checkAdjacentItems(result.map(r => r[0]).filter(isDefined), (a, b) => a < b)
        && checkAdjacentItems(result.map(r => r[1]).filter(isDefined), (a, b) => a <= b)
        && checkAdjacentItems(result.map(r => r[2]).filter(isDefined), (a, b) => a < b)
        && result.every(alignment => alignment.filter(isDefined).length >= 2));
    return result;
}
function toEqualRangeMappings(diffs, inputRange, outputRange) {
    const result = [];
    let equalRangeInputStart = inputRange.getStartPosition();
    let equalRangeOutputStart = outputRange.getStartPosition();
    for (const d of diffs) {
        const equalRangeMapping = new RangeMapping(Range.fromPositions(equalRangeInputStart, d.inputRange.getStartPosition()), Range.fromPositions(equalRangeOutputStart, d.outputRange.getStartPosition()));
        assertFn(() => lengthOfRange(equalRangeMapping.inputRange).equals(lengthOfRange(equalRangeMapping.outputRange)));
        if (!equalRangeMapping.inputRange.isEmpty()) {
            result.push(equalRangeMapping);
        }
        equalRangeInputStart = d.inputRange.getEndPosition();
        equalRangeOutputStart = d.outputRange.getEndPosition();
    }
    const equalRangeMapping = new RangeMapping(Range.fromPositions(equalRangeInputStart, inputRange.getEndPosition()), Range.fromPositions(equalRangeOutputStart, outputRange.getEndPosition()));
    assertFn(() => lengthOfRange(equalRangeMapping.inputRange).equals(lengthOfRange(equalRangeMapping.outputRange)));
    if (!equalRangeMapping.inputRange.isEmpty()) {
        result.push(equalRangeMapping);
    }
    return result;
}
/**
 * It is `result[i][0].inputRange.equals(result[i][1].inputRange)`.
*/
function splitUpCommonEqualRangeMappings(equalRangeMappings1, equalRangeMappings2) {
    const result = [];
    const events = [];
    for (const [input, rangeMappings] of [[0, equalRangeMappings1], [1, equalRangeMappings2]]) {
        for (const rangeMapping of rangeMappings) {
            events.push({
                input: input,
                start: true,
                inputPos: rangeMapping.inputRange.getStartPosition(),
                outputPos: rangeMapping.outputRange.getStartPosition()
            });
            events.push({
                input: input,
                start: false,
                inputPos: rangeMapping.inputRange.getEndPosition(),
                outputPos: rangeMapping.outputRange.getEndPosition()
            });
        }
    }
    events.sort(compareBy((m) => m.inputPos, Position.compare));
    const starts = [undefined, undefined];
    let lastInputPos;
    for (const event of events) {
        if (lastInputPos && starts.some(s => !!s)) {
            const length = lengthBetweenPositions(lastInputPos, event.inputPos);
            if (!length.isZero()) {
                result.push({
                    inputPos: lastInputPos,
                    length,
                    output1Pos: starts[0],
                    output2Pos: starts[1]
                });
                if (starts[0]) {
                    starts[0] = addLength(starts[0], length);
                }
                if (starts[1]) {
                    starts[1] = addLength(starts[1], length);
                }
            }
        }
        starts[event.input] = event.start ? event.outputPos : undefined;
        lastInputPos = event.inputPos;
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZUFsaWdubWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9icm93c2VyL3ZpZXcvbGluZUFsaWdubWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDekUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUM3RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFbkQsT0FBTyxFQUFFLFNBQVMsRUFBRSxzQkFBc0IsRUFBRSxhQUFhLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUkxRixNQUFNLFVBQVUsYUFBYSxDQUFDLENBQW9CO0lBQ2pELE1BQU0sWUFBWSxHQUFHLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZJLE1BQU0sWUFBWSxHQUFHLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxF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