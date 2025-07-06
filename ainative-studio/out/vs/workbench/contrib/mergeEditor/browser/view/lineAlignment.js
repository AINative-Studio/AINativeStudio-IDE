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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZUFsaWdubWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21lcmdlRWRpdG9yL2Jyb3dzZXIvdmlldy9saW5lQWxpZ25tZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDcEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzdFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUVuRCxPQUFPLEVBQUUsU0FBUyxFQUFFLHNCQUFzQixFQUFFLGFBQWEsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBSTFGLE1BQU0sVUFBVSxhQUFhLENBQUMsQ0FBb0I7SUFDakQsTUFBTSxZQUFZLEdBQUcsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7SUFDdkksTUFBTSxZQUFZLEdBQUcsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVB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