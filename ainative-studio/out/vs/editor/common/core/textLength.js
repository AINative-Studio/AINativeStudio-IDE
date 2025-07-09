/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LineRange } from './lineRange.js';
import { Position } from './position.js';
import { Range } from './range.js';
/**
 * Represents a non-negative length of text in terms of line and column count.
*/
export class TextLength {
    static { this.zero = new TextLength(0, 0); }
    static lengthDiffNonNegative(start, end) {
        if (end.isLessThan(start)) {
            return TextLength.zero;
        }
        if (start.lineCount === end.lineCount) {
            return new TextLength(0, end.columnCount - start.columnCount);
        }
        else {
            return new TextLength(end.lineCount - start.lineCount, end.columnCount);
        }
    }
    static betweenPositions(position1, position2) {
        if (position1.lineNumber === position2.lineNumber) {
            return new TextLength(0, position2.column - position1.column);
        }
        else {
            return new TextLength(position2.lineNumber - position1.lineNumber, position2.column - 1);
        }
    }
    static fromPosition(pos) {
        return new TextLength(pos.lineNumber - 1, pos.column - 1);
    }
    static ofRange(range) {
        return TextLength.betweenPositions(range.getStartPosition(), range.getEndPosition());
    }
    static ofText(text) {
        let line = 0;
        let column = 0;
        for (const c of text) {
            if (c === '\n') {
                line++;
                column = 0;
            }
            else {
                column++;
            }
        }
        return new TextLength(line, column);
    }
    constructor(lineCount, columnCount) {
        this.lineCount = lineCount;
        this.columnCount = columnCount;
    }
    isZero() {
        return this.lineCount === 0 && this.columnCount === 0;
    }
    isLessThan(other) {
        if (this.lineCount !== other.lineCount) {
            return this.lineCount < other.lineCount;
        }
        return this.columnCount < other.columnCount;
    }
    isGreaterThan(other) {
        if (this.lineCount !== other.lineCount) {
            return this.lineCount > other.lineCount;
        }
        return this.columnCount > other.columnCount;
    }
    isGreaterThanOrEqualTo(other) {
        if (this.lineCount !== other.lineCount) {
            return this.lineCount > other.lineCount;
        }
        return this.columnCount >= other.columnCount;
    }
    equals(other) {
        return this.lineCount === other.lineCount && this.columnCount === other.columnCount;
    }
    compare(other) {
        if (this.lineCount !== other.lineCount) {
            return this.lineCount - other.lineCount;
        }
        return this.columnCount - other.columnCount;
    }
    add(other) {
        if (other.lineCount === 0) {
            return new TextLength(this.lineCount, this.columnCount + other.columnCount);
        }
        else {
            return new TextLength(this.lineCount + other.lineCount, other.columnCount);
        }
    }
    createRange(startPosition) {
        if (this.lineCount === 0) {
            return new Range(startPosition.lineNumber, startPosition.column, startPosition.lineNumber, startPosition.column + this.columnCount);
        }
        else {
            return new Range(startPosition.lineNumber, startPosition.column, startPosition.lineNumber + this.lineCount, this.columnCount + 1);
        }
    }
    toRange() {
        return new Range(1, 1, this.lineCount + 1, this.columnCount + 1);
    }
    toLineRange() {
        return LineRange.ofLength(1, this.lineCount + 1);
    }
    addToPosition(position) {
        if (this.lineCount === 0) {
            return new Position(position.lineNumber, position.column + this.columnCount);
        }
        else {
            return new Position(position.lineNumber + this.lineCount, this.columnCount + 1);
        }
    }
    addToRange(range) {
        return Range.fromPositions(this.addToPosition(range.getStartPosition()), this.addToPosition(range.getEndPosition()));
    }
    toString() {
        return `${this.lineCount},${this.columnCount}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dExlbmd0aC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvcmUvdGV4dExlbmd0aC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDM0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUN6QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRW5DOztFQUVFO0FBQ0YsTUFBTSxPQUFPLFVBQVU7YUFDUixTQUFJLEdBQUcsSUFBSSxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBRW5DLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxLQUFpQixFQUFFLEdBQWU7UUFDckUsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDM0IsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDO1FBQ3hCLENBQUM7UUFDRCxJQUFJLEtBQUssQ0FBQyxTQUFTLEtBQUssR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3ZDLE9BQU8sSUFBSSxVQUFVLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQy9ELENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxJQUFJLFVBQVUsQ0FBQyxHQUFHLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3pFLENBQUM7SUFDRixDQUFDO0lBRU0sTUFBTSxDQUFDLGdCQUFnQixDQUFDLFNBQW1CLEVBQUUsU0FBbUI7UUFDdEUsSUFBSSxTQUFTLENBQUMsVUFBVSxLQUFLLFNBQVMs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