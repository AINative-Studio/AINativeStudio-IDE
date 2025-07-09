/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertNever } from '../../base/common/assert.js';
import { Position } from './core/position.js';
import { InjectedTextCursorStops } from './model.js';
/**
 * *input*:
 * ```
 * xxxxxxxxxxxxxxxxxxxxxxxxxxx
 * ```
 *
 * -> Applying injections `[i...i]`, *inputWithInjections*:
 * ```
 * xxxxxx[iiiiiiiiii]xxxxxxxxxxxxxxxxx[ii]xxxx
 * ```
 *
 * -> breaking at offsets `|` in `xxxxxx[iiiiiii|iii]xxxxxxxxxxx|xxxxxx[ii]xxxx|`:
 * ```
 * xxxxxx[iiiiiii
 * iii]xxxxxxxxxxx
 * xxxxxx[ii]xxxx
 * ```
 *
 * -> applying wrappedTextIndentLength, *output*:
 * ```
 * xxxxxx[iiiiiii
 *    iii]xxxxxxxxxxx
 *    xxxxxx[ii]xxxx
 * ```
 */
export class ModelLineProjectionData {
    constructor(injectionOffsets, 
    /**
     * `injectionOptions.length` must equal `injectionOffsets.length`
     */
    injectionOptions, 
    /**
     * Refers to offsets after applying injections to the source.
     * The last break offset indicates the length of the source after applying injections.
     */
    breakOffsets, 
    /**
     * Refers to offsets after applying injections
     */
    breakOffsetsVisibleColumn, wrappedTextIndentLength) {
        this.injectionOffsets = injectionOffsets;
        this.injectionOptions = injectionOptions;
        this.breakOffsets = breakOffsets;
        this.breakOffsetsVisibleColumn = breakOffsetsVisibleColumn;
        this.wrappedTextIndentLength = wrappedTextIndentLength;
    }
    getOutputLineCount() {
        return this.breakOffsets.length;
    }
    getMinOutputOffset(outputLineIndex) {
        if (outputLineIndex > 0) {
            return this.wrappedTextIndentLength;
        }
        return 0;
    }
    getLineLength(outputLineIndex) {
        // These offsets refer to model text with injected text.
        const startOffset = outputLineIndex > 0 ? this.breakOffsets[outputLineIndex - 1] : 0;
        const endOffset = this.breakOffsets[outputLineIndex];
        let lineLength = endOffset - startOffset;
        if (outputLineIndex > 0) {
            lineLength += this.wrappedTextIndentLength;
        }
        return lineLength;
    }
    getMaxOutputOffset(outputLineIndex) {
        return this.getLineLength(outputLineIndex);
    }
    translateToInputOffset(outputLineIndex, outputOffset) {
        if (outputLineIndex > 0) {
            outputOffset = Math.max(0, outputOffset - this.wrappedTextIndentLength);
        }
        const offsetInInputWithInjection = outputLineIndex === 0 ? outputOffset : this.breakOffsets[outputLineIndex - 1] + outputOffset;
        let offsetInInput = offsetInInputWithInjection;
        if (this.injectionOffsets !== null) {
            for (let i = 0; i < this.injectionOffsets.length; i++) {
                if (offsetInInput > this.injectionOffsets[i]) {
                    if (offsetInInput < this.injectionOffsets[i] + this.injectionOptions[i].content.length) {
                        // `inputOffset` is within injected text
                        offsetInInput = this.injectionOffsets[i];
                    }
                    else {
                        offsetInInput -= this.injectionOptions[i].content.length;
                    }
                }
                else {
                    break;
                }
            }
        }
        return offsetInInput;
    }
    translateToOutputPosition(inputOffset, affinity = 2 /* PositionAffinity.None */) {
        let inputOffsetInInputWithInjection = inputOffset;
        if (this.injectionOffsets !== null) {
            for (let i = 0; i < this.injectionOffsets.length; i++) {
                if (inputOffset < this.injectionOffsets[i]) {
                    break;
                }
                if (affinity !== 1 /* PositionAffinity.Right */ && inputOffset === this.injectionOffsets[i]) {
                    break;
                }
                inputOffsetInInputWithInjection += this.injectionOptions[i].content.length;
            }
        }
        return this.offsetInInputWithInjectionsToOutputPosition(inputOffsetInInputWithInjection, affinity);
    }
    offsetInInputWithInjectionsToOutputPosition(offsetInInputWithInjections, affinity = 2 /* PositionAffinity.None */) {
        let low = 0;
        let high = this.breakOffsets.length - 1;
        let mid = 0;
        let midStart = 0;
        while (low <= high) {
            mid = low + ((high - low) / 2) | 0;
            const midStop = this.breakOffsets[mid];
            midStart = mid > 0 ? this.breakOffsets[mid - 1] : 0;
            if (affinity === 0 /* PositionAffinity.Left */) {
                if (offsetInInputWithInjections <= midStart) {
                    high = mid - 1;
                }
                else if (offsetInInputWithInjections > midStop) {
                    low = mid + 1;
                }
                else {
                    break;
                }
            }
            else {
                if (offsetInInputWithInjections < midStart) {
                    high = mid - 1;
                }
                else if (offsetInInputWithInjections >= midStop) {
                    low = mid + 1;
                }
                else {
                    break;
                }
            }
        }
        let outputOffset = offsetInInputWithInjections - midStart;
        if (mid > 0) {
            outputOffset += this.wrappedTextIndentLength;
        }
        return new OutputPosition(mid, outputOffset);
    }
    normalizeOutputPosition(outputLineIndex, outputOffset, affinity) {
        if (this.injectionOffsets !== null) {
            const offsetInInputWithInjections = this.outputPositionToOffsetInInputWithInjections(outputLineIndex, outputOffset);
            const normalizedOffsetInUnwrappedLine = this.normalizeOffsetInInputWithInjectionsAroundInjections(offsetInInputWithInjections, affinity);
            if (normalizedOffsetInUnwrappedLine !== offsetInInputWithInjections) {
                // injected text caused a change
                return this.offsetInInputWithInjectionsToOutputPosition(normalizedOffsetInUnwrappedLine, affinity);
            }
        }
        if (affinity === 0 /* PositionAffinity.Left */) {
            if (outputLineIndex > 0 && outputOffset === this.getMinOutputOffset(outputLineIndex)) {
                return new OutputPosition(outputLineIndex - 1, this.getMaxOutputOffset(outputLineIndex - 1));
            }
        }
        else if (affinity === 1 /* PositionAffinity.Right */) {
            const maxOutputLineIndex = this.getOutputLineCount() - 1;
            if (outputLineIndex < maxOutputLineIndex && outputOffset === this.getMaxOutputOffset(outputLineIndex)) {
                return new OutputPosition(outputLineIndex + 1, this.getMinOutputOffset(outputLineIndex + 1));
            }
        }
        return new OutputPosition(outputLineIndex, outputOffset);
    }
    outputPositionToOffsetInInputWithInjections(outputLineIndex, outputOffset) {
        if (outputLineIndex > 0) {
            outputOffset = Math.max(0, outputOffset - this.wrappedTextIndentLength);
        }
        const result = (outputLineIndex > 0 ? this.breakOffsets[outputLineIndex - 1] : 0) + outputOffset;
        return result;
    }
    normalizeOffsetInInputWithInjectionsAroundInjections(offsetInInputWithInjections, affinity) {
        const injectedText = this.getInjectedTextAtOffset(offsetInInputWithInjections);
        if (!injectedText) {
            return offsetInInputWithInjections;
        }
        if (affinity === 2 /* PositionAffinity.None */) {
            if (offsetInInputWithInjections === injectedText.offsetInInputWithInjections + injectedText.length
                && hasRightCursorStop(this.injectionOptions[injectedText.injectedTextIndex].cursorStops)) {
                return injectedText.offsetInInputWithInjections + injectedText.length;
            }
            else {
                let result = injectedText.offsetInInputWithInjections;
                if (hasLeftCursorStop(this.injectionOptions[injectedText.injectedTextIndex].cursorStops)) {
                    return result;
                }
                let index = injectedText.injectedTextIndex - 1;
                while (index >= 0 && this.injectionOffsets[index] === this.injectionOffsets[injectedText.injectedTextIndex]) {
                    if (hasRightCursorStop(this.injectionOptions[index].cursorStops)) {
                        break;
                    }
                    result -= this.injectionOptions[index].content.length;
                    if (hasLeftCursorStop(this.injectionOptions[index].cursorStops)) {
                        break;
                    }
                    index--;
                }
                return result;
            }
        }
        else if (affinity === 1 /* PositionAffinity.Right */ || affinity === 4 /* PositionAffinity.RightOfInjectedText */) {
            let result = injectedText.offsetInInputWithInjections + injectedText.length;
            let index = injectedText.injectedTextIndex;
            // traverse all injected text that touch each other
            while (index + 1 < this.injectionOffsets.length && this.injectionOffsets[index + 1] === this.injectionOffsets[index]) {
                result += this.injectionOptions[index + 1].content.length;
                index++;
            }
            return result;
        }
        else if (affinity === 0 /* PositionAffinity.Left */ || affinity === 3 /* PositionAffinity.LeftOfInjectedText */) {
            // affinity is left
            let result = injectedText.offsetInInputWithInjections;
            let index = injectedText.injectedTextIndex;
            // traverse all injected text that touch each other
            while (index - 1 >= 0 && this.injectionOffsets[index - 1] === this.injectionOffsets[index]) {
                result -= this.injectionOptions[index - 1].content.length;
                index--;
            }
            return result;
        }
        assertNever(affinity);
    }
    getInjectedText(outputLineIndex, outputOffset) {
        const offset = this.outputPositionToOffsetInInputWithInjections(outputLineIndex, outputOffset);
        const injectedText = this.getInjectedTextAtOffset(offset);
        if (!injectedText) {
            return null;
        }
        return {
            options: this.injectionOptions[injectedText.injectedTextIndex]
        };
    }
    getInjectedTextAtOffset(offsetInInputWithInjections) {
        const injectionOffsets = this.injectionOffsets;
        const injectionOptions = this.injectionOptions;
        if (injectionOffsets !== null) {
            let totalInjectedTextLengthBefore = 0;
            for (let i = 0; i < injectionOffsets.length; i++) {
                const length = injectionOptions[i].content.length;
                const injectedTextStartOffsetInInputWithInjections = injectionOffsets[i] + totalInjectedTextLengthBefore;
                const injectedTextEndOffsetInInputWithInjections = injectionOffsets[i] + totalInjectedTextLengthBefore + length;
                if (injectedTextStartOffsetInInputWithInjections > offsetInInputWithInjections) {
                    // Injected text starts later.
                    break; // All later injected texts have an even larger offset.
                }
                if (offsetInInputWithInjections <= injectedTextEndOffsetInInputWithInjections) {
                    // Injected text ends after or with the given position (but also starts with or before it).
                    return {
                        injectedTextIndex: i,
                        offsetInInputWithInjections: injectedTextStartOffsetInInputWithInjections,
                        length
                    };
                }
                totalInjectedTextLengthBefore += length;
            }
        }
        return undefined;
    }
}
function hasRightCursorStop(cursorStop) {
    if (cursorStop === null || cursorStop === undefined) {
        return true;
    }
    return cursorStop === InjectedTextCursorStops.Right || cursorStop === InjectedTextCursorStops.Both;
}
function hasLeftCursorStop(cursorStop) {
    if (cursorStop === null || cursorStop === undefined) {
        return true;
    }
    return cursorStop === InjectedTextCursorStops.Left || cursorStop === InjectedTextCursorStops.Both;
}
export class InjectedText {
    constructor(options) {
        this.options = options;
    }
}
export class OutputPosition {
    constructor(outputLineIndex, outputOffset) {
        this.outputLineIndex = outputLineIndex;
        this.outputOffset = outputOffset;
    }
    toString() {
        return `${this.outputLineIndex}:${this.outputOffset}`;
    }
    toPosition(baseLineNumber) {
        return new Position(baseLineNumber + this.outputLineIndex, this.outputOffset + 1);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxMaW5lUHJvamVjdGlvbkRhdGEuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbExpbmVQcm9qZWN0aW9uRGF0YS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFHMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSx1QkFBdUIsRUFBeUMsTUFBTSxZQUFZLENBQUM7QUFHNUY7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQXdCRztBQUNILE1BQU0sT0FBTyx1QkFBdUI7SUFDbkMsWUFDUSxnQkFBaUM7SUFDeEM7O09BRUc7SUFDSSxnQkFBOEM7SUFDckQ7OztPQUdHO0lBQ0ksWUFBc0I7SUFDN0I7O09BRUc7SUFDSSx5QkFBbUMsRUFDbkMsdUJBQStCO1FBZC9CLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBaUI7UUFJakMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUE4QjtRQUs5QyxpQkFBWSxHQUFaLFlBQVksQ0FBVTtRQUl0Qiw4QkFBeUIsR0FBekIseUJBQXlCLENBQVU7UUFDbkMsNEJBQXVCLEdBQXZCLHVCQUF1QixDQUFRO0lBRXZDLENBQUM7SUFFTSxrQkFBa0I7UUFDeEIsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQztJQUNqQyxDQUFDO0lBRU0sa0JBQWtCLENBQUMsZUFBdUI7UUFDaEQsSUFBSSxlQUFlLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDekIsT0FBTyxJQUFJLENBQUMsdUJBQXVCLENBQUM7UUFDckMsQ0FBQztRQUNELE9BQU8sQ0FBQyxDQUFDO0lBQ1YsQ0FBQztJQUVNLGFBQWEsQ0FBQyxlQUF1QjtRQUMz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