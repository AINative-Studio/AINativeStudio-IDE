/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { findLastIdxMonotonous } from '../../../base/common/arraysFind.js';
import { OffsetRange } from './offsetRange.js';
import { Position } from './position.js';
import { Range } from './range.js';
import { TextLength } from './textLength.js';
export class PositionOffsetTransformer {
    constructor(text) {
        this.text = text;
        this.lineStartOffsetByLineIdx = [];
        this.lineEndOffsetByLineIdx = [];
        this.lineStartOffsetByLineIdx.push(0);
        for (let i = 0; i < text.length; i++) {
            if (text.charAt(i) === '\n') {
                this.lineStartOffsetByLineIdx.push(i + 1);
                if (i > 0 && text.charAt(i - 1) === '\r') {
                    this.lineEndOffsetByLineIdx.push(i - 1);
                }
                else {
                    this.lineEndOffsetByLineIdx.push(i);
                }
            }
        }
        this.lineEndOffsetByLineIdx.push(text.length);
    }
    getOffset(position) {
        const valPos = this._validatePosition(position);
        return this.lineStartOffsetByLineIdx[valPos.lineNumber - 1] + valPos.column - 1;
    }
    _validatePosition(position) {
        if (position.lineNumber < 1) {
            return new Position(1, 1);
        }
        const lineCount = this.textLength.lineCount + 1;
        if (position.lineNumber > lineCount) {
            const lineLength = this.getLineLength(lineCount);
            return new Position(lineCount, lineLength + 1);
        }
        if (position.column < 1) {
            return new Position(position.lineNumber, 1);
        }
        const lineLength = this.getLineLength(position.lineNumber);
        if (position.column - 1 > lineLength) {
            return new Position(position.lineNumber, lineLength + 1);
        }
        return position;
    }
    getOffsetRange(range) {
        return new OffsetRange(this.getOffset(range.getStartPosition()), this.getOffset(range.getEndPosition()));
    }
    getPosition(offset) {
        const idx = findLastIdxMonotonous(this.lineStartOffsetByLineIdx, i => i <= offset);
        const lineNumber = idx + 1;
        const column = offset - this.lineStartOffsetByLineIdx[idx] + 1;
        return new Position(lineNumber, column);
    }
    getRange(offsetRange) {
        return Range.fromPositions(this.getPosition(offsetRange.start), this.getPosition(offsetRange.endExclusive));
    }
    getTextLength(offsetRange) {
        return TextLength.ofRange(this.getRange(offsetRange));
    }
    get textLength() {
        const lineIdx = this.lineStartOffsetByLineIdx.length - 1;
        return new TextLength(lineIdx, this.text.length - this.lineStartOffsetByLineIdx[lineIdx]);
    }
    getLineLength(lineNumber) {
        return this.lineEndOffsetByLineIdx[lineNumber - 1] - this.lineStartOffsetByLineIdx[lineNumber - 1];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9zaXRpb25Ub09mZnNldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvcmUvcG9zaXRpb25Ub09mZnNldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMzRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDL0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUN6QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQ25DLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUU3QyxNQUFNLE9BQU8seUJBQXlCO0lBSXJDLFlBQTRCLElBQVk7UUFBWixTQUFJLEdBQUosSUFBSSxDQUFRO1FBQ3ZDLElBQUksQ0FBQyx3QkFBd0IsR0FBRyxFQUFFLENBQUM7UUFDbkMsSUFBSSxDQUFDLHNCQUFzQixHQUFHLEVBQUUsQ0FBQztRQUVqQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdEMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO2dCQUM3QixJQUFJLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDMUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMs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