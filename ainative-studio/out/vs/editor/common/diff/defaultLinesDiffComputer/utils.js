/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class Array2D {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.array = [];
        this.array = new Array(width * height);
    }
    get(x, y) {
        return this.array[x + y * this.width];
    }
    set(x, y, value) {
        this.array[x + y * this.width] = value;
    }
}
export function isSpace(charCode) {
    return charCode === 32 /* CharCode.Space */ || charCode === 9 /* CharCode.Tab */;
}
export class LineRangeFragment {
    static { this.chrKeys = new Map(); }
    static getKey(chr) {
        let key = this.chrKeys.get(chr);
        if (key === undefined) {
            key = this.chrKeys.size;
            this.chrKeys.set(chr, key);
        }
        return key;
    }
    constructor(range, lines, source) {
        this.range = range;
        this.lines = lines;
        this.source = source;
        this.histogram = [];
        let counter = 0;
        for (let i = range.startLineNumber - 1; i < range.endLineNumberExclusive - 1; i++) {
            const line = lines[i];
            for (let j = 0; j < line.length; j++) {
                counter++;
                const chr = line[j];
                const key = LineRangeFragment.getKey(chr);
                this.histogram[key] = (this.histogram[key] || 0) + 1;
            }
            counter++;
            const key = LineRangeFragment.getKey('\n');
            this.histogram[key] = (this.histogram[key] || 0) + 1;
        }
        this.totalCount = counter;
    }
    computeSimilarity(other) {
        let sumDifferences = 0;
        const maxLength = Math.max(this.histogram.length, other.histogram.length);
        for (let i = 0; i < maxLength; i++) {
            sumDifferences += Math.abs((this.histogram[i] ?? 0) - (other.histogram[i] ?? 0));
        }
        return 1 - (sumDifferences / (this.totalCount + other.totalCount));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9kaWZmL2RlZmF1bHRMaW5lc0RpZmZDb21wdXRlci91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU1oRyxNQUFNLE9BQU8sT0FBTztJQUduQixZQUE0QixLQUFhLEVBQWtCLE1BQWM7UUFBN0MsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUFrQixXQUFNLEdBQU4sTUFBTSxDQUFRO1FBRnhELFVBQUssR0FBUSxFQUFFLENBQUM7UUFHaEMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBSSxLQUFLLEdBQUcsTUFBTSxDQUFDLENBQUM7SUFDM0MsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFTLEVBQUUsQ0FBUztRQUN2QixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFTLEVBQUUsQ0FBUyxFQUFFLEtBQVE7UUFDakMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxLQUFLLENBQUM7SUFDeEMsQ0FBQztDQUNEO0FBRUQsTUFBTSxVQUFVLE9BQU8sQ0FBQyxRQUFnQjtJQUN2QyxPQUFPLFFBQVEsNEJBQW1CLElBQUksUUFBUSx5QkFBaUIsQ0FBQztBQUNqRSxDQUFDO0FBRUQsTUFBTSxPQUFPLGlCQUFpQjthQUNkLFlBQU8sR0FBRyxJQUFJLEdBQUcsRUFBa0IsQUFBNUIsQ0FBNkI7SUFFM0MsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFXO1FBQ2hDLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMs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