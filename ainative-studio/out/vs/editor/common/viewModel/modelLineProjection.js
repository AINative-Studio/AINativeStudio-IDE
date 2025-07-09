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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxMaW5lUHJvamVjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3ZpZXdNb2RlbC9tb2RlbExpbmVQcm9qZWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFHL0MsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFekQsT0FBTyxFQUFFLDBCQUEwQixFQUFFLFlBQVksRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBc0MzRSxNQUFNLFVBQVUseUJBQXlCLENBQUMsYUFBNkMsRUFBRSxTQUFrQjtJQUMxRyxJQUFJLGFBQWEsS0FBSyxJQUFJLEVBQUUsQ0FBQztRQUM1QixvQkFBb0I7UUFDcEIsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNmLE9BQU8sMkJBQTJCLENBQUMsUUFBUSxDQUFDO1FBQzdDLENBQUM7UUFDRCxPQUFPLHlCQUF5QixDQUFDLFFBQVEsQ0FBQztJQUMzQyxDQUFDO1NBQU0sQ0FBQztRQUNQLE9BQU8sSUFBSSxtQkFBbUIsQ0FBQyxhQUFhLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDMUQsQ0FBQztBQUNGLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsTUFBTSxtQkFBbUI7SUFJeEIsWUFBWSxhQUFzQyxFQUFFLFNBQWtCO1FBQ3JFLElBQUksQ0FBQyxlQUFlLEdBQUcsYUFBYSxDQUFDO1FBQ3JDLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO0lBQzdCLENBQUM7SUFFTSxTQUFTO1FBQ2YsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDO0lBQ3hCLENBQUM7SUFFTSxV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