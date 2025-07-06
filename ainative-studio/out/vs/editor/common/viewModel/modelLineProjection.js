/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LineTokens } from '../tokens/lineTokens.js';
import { Position } from '../core/position.js';
import { LineInjectedText } from '../textModelEvents.js';
import { SingleLineInlineDecoration, ViewLineData } from '../viewModel.js';
export function createModelLineProjection(lineBreakData, isVisible) {
    if (lineBreakData === null) {
        // No mapping needed
        if (isVisible) {
            return IdentityModelLineProjection.INSTANCE;
        }
        return HiddenModelLineProjection.INSTANCE;
    }
    else {
        return new ModelLineProjection(lineBreakData, isVisible);
    }
}
/**
 * This projection is used to
 * * wrap model lines
 * * inject text
 */
class ModelLineProjection {
    constructor(lineBreakData, isVisible) {
        this._projectionData = lineBreakData;
        this._isVisible = isVisible;
    }
    isVisible() {
        return this._isVisible;
    }
    setVisible(isVisible) {
        this._isVisible = isVisible;
        return this;
    }
    getProjectionData() {
        return this._projectionData;
    }
    getViewLineCount() {
        if (!this._isVisible) {
            return 0;
        }
        return this._projectionData.getOutputLineCount();
    }
    getViewLineContent(model, modelLineNumber, outputLineIndex) {
        this._assertVisible();
        const startOffsetInInputWithInjections = outputLineIndex > 0 ? this._projectionData.breakOffsets[outputLineIndex - 1] : 0;
        const endOffsetInInputWithInjections = this._projectionData.breakOffsets[outputLineIndex];
        let r;
        if (this._projectionData.injectionOffsets !== null) {
            const injectedTexts = this._projectionData.injectionOffsets.map((offset, idx) => new LineInjectedText(0, 0, offset + 1, this._projectionData.injectionOptions[idx], 0));
            const lineWithInjections = LineInjectedText.applyInjectedText(model.getLineContent(modelLineNumber), injectedTexts);
            r = lineWithInjections.substring(startOffsetInInputWithInjections, endOffsetInInputWithInjections);
        }
        else {
            r = model.getValueInRange({
                startLineNumber: modelLineNumber,
                startColumn: startOffsetInInputWithInjections + 1,
                endLineNumber: modelLineNumber,
                endColumn: endOffsetInInputWithInjections + 1
            });
        }
        if (outputLineIndex > 0) {
            r = spaces(this._projectionData.wrappedTextIndentLength) + r;
        }
        return r;
    }
    getViewLineLength(model, modelLineNumber, outputLineIndex) {
        this._assertVisible();
        return this._projectionData.getLineLength(outputLineIndex);
    }
    getViewLineMinColumn(_model, _modelLineNumber, outputLineIndex) {
        this._assertVisible();
        return this._projectionData.getMinOutputOffset(outputLineIndex) + 1;
    }
    getViewLineMaxColumn(model, modelLineNumber, outputLineIndex) {
        this._assertVisible();
        return this._projectionData.getMaxOutputOffset(outputLineIndex) + 1;
    }
    /**
     * Try using {@link getViewLinesData} instead.
    */
    getViewLineData(model, modelLineNumber, outputLineIndex) {
        const arr = new Array();
        this.getViewLinesData(model, modelLineNumber, outputLineIndex, 1, 0, [true], arr);
        return arr[0];
    }
    getViewLinesData(model, modelLineNumber, outputLineIdx, lineCount, globalStartIndex, needed, result) {
        this._assertVisible();
        const lineBreakData = this._projectionData;
        const injectionOffsets = lineBreakData.injectionOffsets;
        const injectionOptions = lineBreakData.injectionOptions;
        let inlineDecorationsPerOutputLine = null;
        if (injectionOffsets) {
            inlineDecorationsPerOutputLine = [];
            let totalInjectedTextLengthBefore = 0;
            let currentInjectedOffset = 0;
            for (let outputLineIndex = 0; outputLineIndex < lineBreakData.getOutputLineCount(); outputLineIndex++) {
                const inlineDecorations = new Array();
                inlineDecorationsPerOutputLine[outputLineIndex] = inlineDecorations;
                const lineStartOffsetInInputWithInjections = outputLineIndex > 0 ? lineBreakData.breakOffsets[outputLineIndex - 1] : 0;
                const lineEndOffsetInInputWithInjections = lineBreakData.breakOffsets[outputLineIndex];
                while (currentInjectedOffset < injectionOffsets.length) {
                    const length = injectionOptions[currentInjectedOffset].content.length;
                    const injectedTextStartOffsetInInputWithInjections = injectionOffsets[currentInjectedOffset] + totalInjectedTextLengthBefore;
                    const injectedTextEndOffsetInInputWithInjections = injectedTextStartOffsetInInputWithInjections + length;
                    if (injectedTextStartOffsetInInputWithInjections > lineEndOffsetInInputWithInjections) {
                        // Injected text only starts in later wrapped lines.
                        break;
                    }
                    if (lineStartOffsetInInputWithInjections < injectedTextEndOffsetInInputWithInjections) {
                        // Injected text ends after or in this line (but also starts in or before this line).
                        const options = injectionOptions[currentInjectedOffset];
                        if (options.inlineClassName) {
                            const offset = (outputLineIndex > 0 ? lineBreakData.wrappedTextIndentLength : 0);
                            const start = offset + Math.max(injectedTextStartOffsetInInputWithInjections - lineStartOffsetInInputWithInjections, 0);
                            const end = offset + Math.min(injectedTextEndOffsetInInputWithInjections - lineStartOffsetInInputWithInjections, lineEndOffsetInInputWithInjections - lineStartOffsetInInputWithInjections);
                            if (start !== end) {
                                inlineDecorations.push(new SingleLineInlineDecoration(start, end, options.inlineClassName, options.inlineClassNameAffectsLetterSpacing));
                            }
                        }
                    }
                    if (injectedTextEndOffsetInInputWithInjections <= lineEndOffsetInInputWithInjections) {
                        totalInjectedTextLengthBefore += length;
                        currentInjectedOffset++;
                    }
                    else {
                        // injected text breaks into next line, process it again
                        break;
                    }
                }
            }
        }
        let lineWithInjections;
        if (injectionOffsets) {
            const tokensToInsert = [];
            for (let idx = 0; idx < injectionOffsets.length; idx++) {
                const offset = injectionOffsets[idx];
                const tokens = injectionOptions[idx].tokens;
                if (tokens) {
                    tokens.forEach((range, info) => {
                        tokensToInsert.push({
                            offset,
                            text: range.substring(injectionOptions[idx].content),
                            tokenMetadata: info.metadata,
                        });
                    });
                }
                else {
                    tokensToInsert.push({
                        offset,
                        text: injectionOptions[idx].content,
                        tokenMetadata: LineTokens.defaultTokenMetadata,
                    });
                }
            }
            lineWithInjections = model.tokenization.getLineTokens(modelLineNumber).withInserted(tokensToInsert);
        }
        else {
            lineWithInjections = model.tokenization.getLineTokens(modelLineNumber);
        }
        for (let outputLineIndex = outputLineIdx; outputLineIndex < outputLineIdx + lineCount; outputLineIndex++) {
            const globalIndex = globalStartIndex + outputLineIndex - outputLineIdx;
            if (!needed[globalIndex]) {
                result[globalIndex] = null;
                continue;
            }
            result[globalIndex] = this._getViewLineData(lineWithInjections, inlineDecorationsPerOutputLine ? inlineDecorationsPerOutputLine[outputLineIndex] : null, outputLineIndex);
        }
    }
    _getViewLineData(lineWithInjections, inlineDecorations, outputLineIndex) {
        this._assertVisible();
        const lineBreakData = this._projectionData;
        const deltaStartIndex = (outputLineIndex > 0 ? lineBreakData.wrappedTextIndentLength : 0);
        const lineStartOffsetInInputWithInjections = outputLineIndex > 0 ? lineBreakData.breakOffsets[outputLineIndex - 1] : 0;
        const lineEndOffsetInInputWithInjections = lineBreakData.breakOffsets[outputLineIndex];
        const tokens = lineWithInjections.sliceAndInflate(lineStartOffsetInInputWithInjections, lineEndOffsetInInputWithInjections, deltaStartIndex);
        let lineContent = tokens.getLineContent();
        if (outputLineIndex > 0) {
            lineContent = spaces(lineBreakData.wrappedTextIndentLength) + lineContent;
        }
        const minColumn = this._projectionData.getMinOutputOffset(outputLineIndex) + 1;
        const maxColumn = lineContent.length + 1;
        const continuesWithWrappedLine = (outputLineIndex + 1 < this.getViewLineCount());
        const startVisibleColumn = (outputLineIndex === 0 ? 0 : lineBreakData.breakOffsetsVisibleColumn[outputLineIndex - 1]);
        return new ViewLineData(lineContent, continuesWithWrappedLine, minColumn, maxColumn, startVisibleColumn, tokens, inlineDecorations);
    }
    getModelColumnOfViewPosition(outputLineIndex, outputColumn) {
        this._assertVisible();
        return this._projectionData.translateToInputOffset(outputLineIndex, outputColumn - 1) + 1;
    }
    getViewPositionOfModelPosition(deltaLineNumber, inputColumn, affinity = 2 /* PositionAffinity.None */) {
        this._assertVisible();
        const r = this._projectionData.translateToOutputPosition(inputColumn - 1, affinity);
        return r.toPosition(deltaLineNumber);
    }
    getViewLineNumberOfModelPosition(deltaLineNumber, inputColumn) {
        this._assertVisible();
        const r = this._projectionData.translateToOutputPosition(inputColumn - 1);
        return deltaLineNumber + r.outputLineIndex;
    }
    normalizePosition(outputLineIndex, outputPosition, affinity) {
        const baseViewLineNumber = outputPosition.lineNumber - outputLineIndex;
        const normalizedOutputPosition = this._projectionData.normalizeOutputPosition(outputLineIndex, outputPosition.column - 1, affinity);
        const result = normalizedOutputPosition.toPosition(baseViewLineNumber);
        return result;
    }
    getInjectedTextAt(outputLineIndex, outputColumn) {
        return this._projectionData.getInjectedText(outputLineIndex, outputColumn - 1);
    }
    _assertVisible() {
        if (!this._isVisible) {
            throw new Error('Not supported');
        }
    }
}
/**
 * This projection does not change the model line.
*/
class IdentityModelLineProjection {
    static { this.INSTANCE = new IdentityModelLineProjection(); }
    constructor() { }
    isVisible() {
        return true;
    }
    setVisible(isVisible) {
        if (isVisible) {
            return this;
        }
        return HiddenModelLineProjection.INSTANCE;
    }
    getProjectionData() {
        return null;
    }
    getViewLineCount() {
        return 1;
    }
    getViewLineContent(model, modelLineNumber, _outputLineIndex) {
        return model.getLineContent(modelLineNumber);
    }
    getViewLineLength(model, modelLineNumber, _outputLineIndex) {
        return model.getLineLength(modelLineNumber);
    }
    getViewLineMinColumn(model, modelLineNumber, _outputLineIndex) {
        return model.getLineMinColumn(modelLineNumber);
    }
    getViewLineMaxColumn(model, modelLineNumber, _outputLineIndex) {
        return model.getLineMaxColumn(modelLineNumber);
    }
    getViewLineData(model, modelLineNumber, _outputLineIndex) {
        const lineTokens = model.tokenization.getLineTokens(modelLineNumber);
        const lineContent = lineTokens.getLineContent();
        return new ViewLineData(lineContent, false, 1, lineContent.length + 1, 0, lineTokens.inflate(), null);
    }
    getViewLinesData(model, modelLineNumber, _fromOuputLineIndex, _toOutputLineIndex, globalStartIndex, needed, result) {
        if (!needed[globalStartIndex]) {
            result[globalStartIndex] = null;
            return;
        }
        result[globalStartIndex] = this.getViewLineData(model, modelLineNumber, 0);
    }
    getModelColumnOfViewPosition(_outputLineIndex, outputColumn) {
        return outputColumn;
    }
    getViewPositionOfModelPosition(deltaLineNumber, inputColumn) {
        return new Position(deltaLineNumber, inputColumn);
    }
    getViewLineNumberOfModelPosition(deltaLineNumber, _inputColumn) {
        return deltaLineNumber;
    }
    normalizePosition(outputLineIndex, outputPosition, affinity) {
        return outputPosition;
    }
    getInjectedTextAt(_outputLineIndex, _outputColumn) {
        return null;
    }
}
/**
 * This projection hides the model line.
 */
class HiddenModelLineProjection {
    static { this.INSTANCE = new HiddenModelLineProjection(); }
    constructor() { }
    isVisible() {
        return false;
    }
    setVisible(isVisible) {
        if (!isVisible) {
            return this;
        }
        return IdentityModelLineProjection.INSTANCE;
    }
    getProjectionData() {
        return null;
    }
    getViewLineCount() {
        return 0;
    }
    getViewLineContent(_model, _modelLineNumber, _outputLineIndex) {
        throw new Error('Not supported');
    }
    getViewLineLength(_model, _modelLineNumber, _outputLineIndex) {
        throw new Error('Not supported');
    }
    getViewLineMinColumn(_model, _modelLineNumber, _outputLineIndex) {
        throw new Error('Not supported');
    }
    getViewLineMaxColumn(_model, _modelLineNumber, _outputLineIndex) {
        throw new Error('Not supported');
    }
    getViewLineData(_model, _modelLineNumber, _outputLineIndex) {
        throw new Error('Not supported');
    }
    getViewLinesData(_model, _modelLineNumber, _fromOuputLineIndex, _toOutputLineIndex, _globalStartIndex, _needed, _result) {
        throw new Error('Not supported');
    }
    getModelColumnOfViewPosition(_outputLineIndex, _outputColumn) {
        throw new Error('Not supported');
    }
    getViewPositionOfModelPosition(_deltaLineNumber, _inputColumn) {
        throw new Error('Not supported');
    }
    getViewLineNumberOfModelPosition(_deltaLineNumber, _inputColumn) {
        throw new Error('Not supported');
    }
    normalizePosition(outputLineIndex, outputPosition, affinity) {
        throw new Error('Not supported');
    }
    getInjectedTextAt(_outputLineIndex, _outputColumn) {
        throw new Error('Not supported');
    }
}
const _spaces = [''];
function spaces(count) {
    if (count >= _spaces.length) {
        for (let i = 1; i <= count; i++) {
            _spaces[i] = _makeSpaces(i);
        }
    }
    return _spaces[count];
}
function _makeSpaces(count) {
    return new Array(count + 1).join(' ');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxMaW5lUHJvamVjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vdmlld01vZGVsL21vZGVsTGluZVByb2plY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3JELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUcvQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUV6RCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsWUFBWSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFzQzNFLE1BQU0sVUFBVSx5QkFBeUIsQ0FBQyxhQUE2QyxFQUFFLFNBQWtCO0lBQzFHLElBQUksYUFBYSxLQUFLLElBQUksRUFBRSxDQUFDO1FBQzVCLG9CQUFvQjtRQUNwQixJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsT0FBTywyQkFBMkIsQ0FBQyxRQUFRLENBQUM7UUFDN0MsQ0FBQztRQUNELE9BQU8seUJBQXlCLENBQUMsUUFBUSxDQUFDO0lBQzNDLENBQUM7U0FBTSxDQUFDO1FBQ1AsT0FBTyxJQUFJLG1CQUFtQixDQUFDLGFBQWEsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUMxRCxDQUFDO0FBQ0YsQ0FBQztBQUVEOzs7O0dBSUc7QUFDSCxNQUFNLG1CQUFtQjtJQUl4QixZQUFZLGFBQXNDLEVBQUUsU0FBa0I7UUFDckUsSUFBSSxDQUFDLGVBQWUsR0FBRyxhQUFhLENBQUM7UUFDckMsSUFBSSxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUM7SUFDN0IsQ0FBQztJQUVNLFNBQVM7UUFDZixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUM7SUFDeEIsQ0FBQztJQUVNLFVBQVUsQ0FBQyxTQUFrQjtRQUNuQyxJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQztRQUM1QixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFTSxpQkFBaUI7UUFDdkIsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDO0lBQzdCLENBQUM7SUFFTSxnQkFBZ0I7UUFDdEIsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUN0QixPQUFPLENBQUMsQ0FBQztRQUNWLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztJQUNsRCxDQUFDO0lBRU0sa0JBQWtCLENBQUMsS0FBbUIsRUFBRSxlQUF1QixFQUFFLGVBQXVCO1FBQzlGLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUV0QixNQUFNLGdDQUFnQyxHQUFHLGVBQWUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzFILE1BQU0sOEJBQThCLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDLENBQUM7UUFFMUYsSUFBSSxDQUFTLENBQUM7UUFDZCxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDcEQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQzlELENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxnQkFBZ0IsQ0FDcEMsQ0FBQyxFQUNELENBQUMsRUFDRCxNQUFNLEdBQUcsQ0FBQyxFQUNWLElBQUksQ0FBQyxlQUFlLENBQUMsZ0JBQWlCLENBQUMsR0FBRyxDQUFDLEVBQzNDLENBQUMsQ0FDRCxDQUNELENBQUM7WUFDRixNQUFNLGtCQUFrQixHQUFHLGdCQUFnQixDQUFDLGlCQUFpQixDQUM1RCxLQUFLLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxFQUNyQyxhQUFhLENBQ2IsQ0FBQztZQUNGLENBQUMsR0FBRyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsZ0NBQWdDLEVBQUUsOEJBQThCLENBQUMsQ0FBQztRQUNwRyxDQUFDO2FBQU0sQ0FBQztZQUNQLENBQUMsR0FBRyxLQUFLLENBQUMsZUFBZSxDQUFDO2dCQUN6QixlQUFlLEVBQUUsZUFBZTtnQkFDaEMsV0FBVyxFQUFFLGdDQUFnQyxHQUFHLENBQUM7Z0JBQ2pELGFBQWEsRUFBRSxlQUFlO2dCQUM5QixTQUFTLEVBQUUsOEJBQThCLEdBQUcsQ0FBQzthQUM3QyxDQUFDLENBQUM7UUFDSixDQUFDO1FBRUQsSUFBSSxlQUFlLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDekIsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzlELENBQUM7UUFFRCxPQUFPLENBQUMsQ0FBQztJQUNWLENBQUM7SUFFTSxpQkFBaUIsQ0FBQyxLQUFtQixFQUFFLGVBQXVCLEVBQUUsZUFBdUI7UUFDN0YsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDNUQsQ0FBQztJQUVNLG9CQUFvQixDQUFDLE1BQWtCLEVBQUUsZ0JBQXdCLEVBQUUsZUFBdUI7UUFDaEcsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDckUsQ0FBQztJQUVNLG9CQUFvQixDQUFDLEtBQW1CLEVBQUUsZUFBdUIsRUFBRSxlQUF1QjtRQUNoRyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDdEIsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNyRSxDQUFDO0lBRUQ7O01BRUU7SUFDSyxlQUFlLENBQUMsS0FBbUIsRUFBRSxlQUF1QixFQUFFLGVBQXVCO1FBQzNGLE1BQU0sR0FBRyxHQUFHLElBQUksS0FBSyxFQUFnQixDQUFDO1FBQ3RDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsZUFBZSxFQUFFLGVBQWUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDbEYsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDZixDQUFDO0lBRU0sZ0JBQWdCLENBQUMsS0FBbUIsRUFBRSxlQUF1QixFQUFFLGFBQXFCLEVBQUUsU0FBaUIsRUFBRSxnQkFBd0IsRUFBRSxNQUFpQixFQUFFLE1BQWtDO1FBQzlMLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUV0QixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDO1FBRTNDLE1BQU0sZ0JBQWdCLEdBQUcsYUFBYSxDQUFDLGdCQUFnQixDQUFDO1FBQ3hELE1BQU0sZ0JBQWdCLEdBQUcsYUFBYSxDQUFDLGdCQUFnQixDQUFDO1FBRXhELElBQUksOEJBQThCLEdBQTBDLElBQUksQ0FBQztRQUVqRixJQUFJLGdCQUFnQixFQUFFLENBQUM7WUFDdEIsOEJBQThCLEdBQUcsRUFBRSxDQUFDO1lBQ3BDLElBQUksNkJBQTZCLEdBQUcsQ0FBQyxDQUFDO1lBQ3RDLElBQUkscUJBQXFCLEdBQUcsQ0FBQyxDQUFDO1lBRTlCLEtBQUssSUFBSSxlQUFlLEdBQUcsQ0FBQyxFQUFFLGVBQWUsR0FBRyxhQUFhLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxlQUFlLEVBQUUsRUFBRSxDQUFDO2dCQUN2RyxNQUFNLGlCQUFpQixHQUFHLElBQUksS0FBSyxFQUE4QixDQUFDO2dCQUNsRSw4QkFBOEIsQ0FBQyxlQUFlLENBQUMsR0FBRyxpQkFBaUIsQ0FBQztnQkFFcEUsTUFBTSxvQ0FBb0MsR0FBRyxlQUFlLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN2SCxNQUFNLGtDQUFrQyxHQUFHLGFBQWEsQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDLENBQUM7Z0JBRXZGLE9BQU8scUJBQXFCLEdBQUcsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ3hELE1BQU0sTUFBTSxHQUFHLGdCQUFpQixDQUFDLHFCQUFxQixDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQztvQkFDdkUsTUFBTSw0Q0FBNEMsR0FBRyxnQkFBZ0IsQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLDZCQUE2QixDQUFDO29CQUM3SCxNQUFNLDBDQUEwQyxHQUFHLDRDQUE0QyxHQUFHLE1BQU0sQ0FBQztvQkFFekcsSUFBSSw0Q0FBNEMsR0FBRyxrQ0FBa0MsRUFBRSxDQUFDO3dCQUN2RixvREFBb0Q7d0JBQ3BELE1BQU07b0JBQ1AsQ0FBQztvQkFFRCxJQUFJLG9DQUFvQyxHQUFHLDBDQUEwQyxFQUFFLENBQUM7d0JBQ3ZGLHFGQUFxRjt3QkFDckYsTUFBTSxPQUFPLEdBQUcsZ0JBQWlCLENBQUMscUJBQXFCLENBQUMsQ0FBQzt3QkFDekQsSUFBSSxPQUFPLENBQUMsZUFBZSxFQUFFLENBQUM7NEJBQzdCLE1BQU0sTUFBTSxHQUFHLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDakYsTUFBTSxLQUFLLEdBQUcsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsNENBQTRDLEdBQUcsb0NBQW9DLEVBQUUsQ0FBQyxDQUFDLENBQUM7NEJBQ3hILE1BQU0sR0FBRyxHQUFHLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLDBDQUEwQyxHQUFHLG9DQUFvQyxFQUFFLGtDQUFrQyxHQUFHLG9DQUFvQyxDQUFDLENBQUM7NEJBQzVMLElBQUksS0FBSyxLQUFLLEdBQUcsRUFBRSxDQUFDO2dDQUNuQixpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSwwQkFBMEIsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLE9BQU8sQ0FBQyxlQUFlLEVBQUUsT0FBTyxDQUFDLG1DQUFvQyxDQUFDLENBQUMsQ0FBQzs0QkFDM0ksQ0FBQzt3QkFDRixDQUFDO29CQUNGLENBQUM7b0JBRUQsSUFBSSwwQ0FBMEMsSUFBSSxrQ0FBa0MsRUFBRSxDQUFDO3dCQUN0Riw2QkFBNkIsSUFBSSxNQUFNLENBQUM7d0JBQ3hDLHFCQUFxQixFQUFFLENBQUM7b0JBQ3pCLENBQUM7eUJBQU0sQ0FBQzt3QkFDUCx3REFBd0Q7d0JBQ3hELE1BQU07b0JBQ1AsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLGtCQUE4QixDQUFDO1FBQ25DLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUN0QixNQUFNLGNBQWMsR0FBOEQsRUFBRSxDQUFDO1lBRXJGLEtBQUssSUFBSSxHQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQztnQkFDeEQsTUFBTSxNQUFNLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3JDLE1BQU0sTUFBTSxHQUFHLGdCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQztnQkFDN0MsSUFBSSxNQUFNLEVBQUUsQ0FBQztvQkFDWixNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFO3dCQUM5QixjQUFjLENBQUMsSUFBSSxDQUFDOzRCQUNuQixNQUFNOzRCQUNOLElBQUksRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLGdCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQzs0QkFDckQsYUFBYSxFQUFFLElBQUksQ0FBQyxRQUFRO3lCQUM1QixDQUFDLENBQUM7b0JBQ0osQ0FBQyxDQUFDLENBQUM7Z0JBQ0osQ0FBQztxQkFBTSxDQUFDO29CQUNQLGNBQWMsQ0FBQyxJQUFJLENBQUM7d0JBQ25CLE1BQU07d0JBQ04sSUFBSSxFQUFFLGdCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU87d0JBQ3BDLGFBQWEsRUFBRSxVQUFVLENBQUMsb0JBQW9CO3FCQUM5QyxDQUFDLENBQUM7Z0JBQ0osQ0FBQztZQUNGLENBQUM7WUFFRCxrQkFBa0IsR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDckcsQ0FBQzthQUFNLENBQUM7WUFDUCxrQkFBa0IsR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUN4RSxDQUFDO1FBRUQsS0FBSyxJQUFJLGVBQWUsR0FBRyxhQUFhLEVBQUUsZUFBZSxHQUFHLGFBQWEsR0FBRyxTQUFTLEVBQUUsZUFBZSxFQUFFLEVBQUUsQ0FBQztZQUMxRyxNQUFNLFdBQVcsR0FBRyxnQkFBZ0IsR0FBRyxlQUFlLEdBQUcsYUFBYSxDQUFDO1lBQ3ZFLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztnQkFDMUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLElBQUksQ0FBQztnQkFDM0IsU0FBUztZQUNWLENBQUM7WUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGtCQUFrQixFQUFFLDhCQUE4QixDQUFDLENBQUMsQ0FBQyw4QkFBOEIsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQzNLLENBQUM7SUFDRixDQUFDO0lBRU8sZ0JBQWdCLENBQUMsa0JBQThCLEVBQUUsaUJBQXNELEVBQUUsZUFBdUI7UUFDdkksSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ3RCLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUM7UUFDM0MsTUFBTSxlQUFlLEdBQUcsQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTFGLE1BQU0sb0NBQW9DLEdBQUcsZUFBZSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2SCxNQUFNLGtDQUFrQyxHQUFHLGFBQWEsQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDdkYsTUFBTSxNQUFNLEdBQUcsa0JBQWtCLENBQUMsZUFBZSxDQUFDLG9DQUFvQyxFQUFFLGtDQUFrQyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBRTdJLElBQUksV0FBVyxHQUFHLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUMxQyxJQUFJLGVBQWUsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN6QixXQUFXLEdBQUcsTUFBTSxDQUFDLGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLFdBQVcsQ0FBQztRQUMzRSxDQUFDO1FBRUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDL0UsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDekMsTUFBTSx3QkFBd0IsR0FBRyxDQUFDLGVBQWUsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQztRQUNqRixNQUFNLGtCQUFrQixHQUFHLENBQUMsZUFBZSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMseUJBQXlCLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdEgsT0FBTyxJQUFJLFlBQVksQ0FDdEIsV0FBVyxFQUNYLHdCQUF3QixFQUN4QixTQUFTLEVBQ1QsU0FBUyxFQUNULGtCQUFrQixFQUNsQixNQUFNLEVBQ04saUJBQWlCLENBQ2pCLENBQUM7SUFDSCxDQUFDO0lBRU0sNEJBQTRCLENBQUMsZUFBdUIsRUFBRSxZQUFvQjtRQUNoRixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDdEIsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLHNCQUFzQixDQUFDLGVBQWUsRUFBRSxZQUFZLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzNGLENBQUM7SUFFTSw4QkFBOEIsQ0FBQyxlQUF1QixFQUFFLFdBQW1CLEVBQUUsd0NBQWtEO1FBQ3JJLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUN0QixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLHlCQUF5QixDQUFDLFdBQVcsR0FBRyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDcEYsT0FBTyxDQUFDLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFFTSxnQ0FBZ0MsQ0FBQyxlQUF1QixFQUFFLFdBQW1CO1FBQ25GLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUN0QixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLHlCQUF5QixDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMxRSxPQUFPLGVBQWUsR0FBRyxDQUFDLENBQUMsZUFBZSxDQUFDO0lBQzVDLENBQUM7SUFFTSxpQkFBaUIsQ0FBQyxlQUF1QixFQUFFLGNBQXdCLEVBQUUsUUFBMEI7UUFDckcsTUFBTSxrQkFBa0IsR0FBRyxjQUFjLENBQUMsVUFBVSxHQUFHLGVBQWUsQ0FBQztRQUN2RSxNQUFNLHdCQUF3QixHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsdUJBQXVCLENBQUMsZUFBZSxFQUFFLGNBQWMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3BJLE1BQU0sTUFBTSxHQUFHLHdCQUF3QixDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3ZFLE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUVNLGlCQUFpQixDQUFDLGVBQXVCLEVBQUUsWUFBb0I7UUFDckUsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxlQUFlLEVBQUUsWUFBWSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ2hGLENBQUM7SUFFTyxjQUFjO1FBQ3JCLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDdEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNsQyxDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBRUQ7O0VBRUU7QUFDRixNQUFNLDJCQUEyQjthQUNULGFBQVEsR0FBRyxJQUFJLDJCQUEyQixFQUFFLENBQUM7SUFFcEUsZ0JBQXdCLENBQUM7SUFFbEIsU0FBUztRQUNmLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVNLFVBQVUsQ0FBQyxTQUFrQjtRQUNuQyxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBQ0QsT0FBTyx5QkFBeUIsQ0FBQyxRQUFRLENBQUM7SUFDM0MsQ0FBQztJQUVNLGlCQUFpQjtRQUN2QixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFTSxnQkFBZ0I7UUFDdEIsT0FBTyxDQUFDLENBQUM7SUFDVixDQUFDO0lBRU0sa0JBQWtCLENBQUMsS0FBbUIsRUFBRSxlQUF1QixFQUFFLGdCQUF3QjtRQUMvRixPQUFPLEtBQUssQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUVNLGlCQUFpQixDQUFDLEtBQW1CLEVBQUUsZUFBdUIsRUFBRSxnQkFBd0I7UUFDOUYsT0FBTyxLQUFLLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFFTSxvQkFBb0IsQ0FBQyxLQUFtQixFQUFFLGVBQXVCLEVBQUUsZ0JBQXdCO1FBQ2pHLE9BQU8sS0FBSyxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFFTSxvQkFBb0IsQ0FBQyxLQUFtQixFQUFFLGVBQXVCLEVBQUUsZ0JBQXdCO1FBQ2pHLE9BQU8sS0FBSyxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFFTSxlQUFlLENBQUMsS0FBbUIsRUFBRSxlQUF1QixFQUFFLGdCQUF3QjtRQUM1RixNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNyRSxNQUFNLFdBQVcsR0FBRyxVQUFVLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDaEQsT0FBTyxJQUFJLFlBQVksQ0FDdEIsV0FBVyxFQUNYLEtBQUssRUFDTCxDQUFDLEVBQ0QsV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQ3RCLENBQUMsRUFDRCxVQUFVLENBQUMsT0FBTyxFQUFFLEVBQ3BCLElBQUksQ0FDSixDQUFDO0lBQ0gsQ0FBQztJQUVNLGdCQUFnQixDQUFDLEtBQW1CLEVBQUUsZUFBdUIsRUFBRSxtQkFBMkIsRUFBRSxrQkFBMEIsRUFBRSxnQkFBd0IsRUFBRSxNQUFpQixFQUFFLE1BQWtDO1FBQzdNLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDO1lBQy9CLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLElBQUksQ0FBQztZQUNoQyxPQUFPO1FBQ1IsQ0FBQztRQUNELE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLGVBQWUsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUM1RSxDQUFDO0lBRU0sNEJBQTRCLENBQUMsZ0JBQXdCLEVBQUUsWUFBb0I7UUFDakYsT0FBTyxZQUFZLENBQUM7SUFDckIsQ0FBQztJQUVNLDhCQUE4QixDQUFDLGVBQXVCLEVBQUUsV0FBbUI7UUFDakYsT0FBTyxJQUFJLFFBQVEsQ0FBQyxlQUFlLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUVNLGdDQUFnQyxDQUFDLGVBQXVCLEVBQUUsWUFBb0I7UUFDcEYsT0FBTyxlQUFlLENBQUM7SUFDeEIsQ0FBQztJQUVNLGlCQUFpQixDQUFDLGVBQXVCLEVBQUUsY0FBd0IsRUFBRSxRQUEwQjtRQUNyRyxPQUFPLGNBQWMsQ0FBQztJQUN2QixDQUFDO0lBRU0saUJBQWlCLENBQUMsZ0JBQXdCLEVBQUUsYUFBcUI7UUFDdkUsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDOztBQUdGOztHQUVHO0FBQ0gsTUFBTSx5QkFBeUI7YUFDUCxhQUFRLEdBQUcsSUFBSSx5QkFBeUIsRUFBRSxDQUFDO0lBRWxFLGdCQUF3QixDQUFDO0lBRWxCLFNBQVM7UUFDZixPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFTSxVQUFVLENBQUMsU0FBa0I7UUFDbkMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2hCLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUNELE9BQU8sMkJBQTJCLENBQUMsUUFBUSxDQUFDO0lBQzdDLENBQUM7SUFFTSxpQkFBaUI7UUFDdkIsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRU0sZ0JBQWdCO1FBQ3RCLE9BQU8sQ0FBQyxDQUFDO0lBQ1YsQ0FBQztJQUVNLGtCQUFrQixDQUFDLE1BQW9CLEVBQUUsZ0JBQXdCLEVBQUUsZ0JBQXdCO1FBQ2pHLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVNLGlCQUFpQixDQUFDLE1BQW9CLEVBQUUsZ0JBQXdCLEVBQUUsZ0JBQXdCO1FBQ2hHLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVNLG9CQUFvQixDQUFDLE1BQW9CLEVBQUUsZ0JBQXdCLEVBQUUsZ0JBQXdCO1FBQ25HLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVNLG9CQUFvQixDQUFDLE1BQW9CLEVBQUUsZ0JBQXdCLEVBQUUsZ0JBQXdCO1FBQ25HLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVNLGVBQWUsQ0FBQyxNQUFvQixFQUFFLGdCQUF3QixFQUFFLGdCQUF3QjtRQUM5RixNQUFNLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFFTSxnQkFBZ0IsQ0FBQyxNQUFvQixFQUFFLGdCQUF3QixFQUFFLG1CQUEyQixFQUFFLGtCQUEwQixFQUFFLGlCQUF5QixFQUFFLE9BQWtCLEVBQUUsT0FBdUI7UUFDdE0sTUFBTSxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUNsQyxDQUFDO0lBRU0sNEJBQTRCLENBQUMsZ0JBQXdCLEVBQUUsYUFBcUI7UUFDbEYsTUFBTSxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUNsQyxDQUFDO0lBRU0sOEJBQThCLENBQUMsZ0JBQXdCLEVBQUUsWUFBb0I7UUFDbkYsTUFBTSxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUNsQyxDQUFDO0lBRU0sZ0NBQWdDLENBQUMsZ0JBQXdCLEVBQUUsWUFBb0I7UUFDckYsTUFBTSxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUNsQyxDQUFDO0lBRU0saUJBQWlCLENBQUMsZUFBdUIsRUFBRSxjQUF3QixFQUFFLFFBQTBCO1FBQ3JHLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVNLGlCQUFpQixDQUFDLGdCQUF3QixFQUFFLGFBQXFCO1FBQ3ZFLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDbEMsQ0FBQzs7QUFHRixNQUFNLE9BQU8sR0FBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQy9CLFNBQVMsTUFBTSxDQUFDLEtBQWE7SUFDNUIsSUFBSSxLQUFLLElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQzdCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNqQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdCLENBQUM7SUFDRixDQUFDO0lBQ0QsT0FBTyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDdkIsQ0FBQztBQUVELFNBQVMsV0FBVyxDQUFDLEtBQWE7SUFDakMsT0FBTyxJQUFJLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3ZDLENBQUMifQ==