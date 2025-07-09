/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as arrays from '../../../base/common/arrays.js';
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
import { IndentGuide, IndentGuideHorizontalLine } from '../textModelGuides.js';
import { ModelDecorationOptions } from '../model/textModel.js';
import { LineInjectedText } from '../textModelEvents.js';
import * as viewEvents from '../viewEvents.js';
import { createModelLineProjection } from './modelLineProjection.js';
import { ConstantTimePrefixSumComputer } from '../model/prefixSumComputer.js';
import { ViewLineData } from '../viewModel.js';
export class ViewModelLinesFromProjectedModel {
    constructor(editorId, model, domLineBreaksComputerFactory, monospaceLineBreaksComputerFactory, fontInfo, tabSize, wrappingStrategy, wrappingColumn, wrappingIndent, wordBreak) {
        this._editorId = editorId;
        this.model = model;
        this._validModelVersionId = -1;
        this._domLineBreaksComputerFactory = domLineBreaksComputerFactory;
        this._monospaceLineBreaksComputerFactory = monospaceLineBreaksComputerFactory;
        this.fontInfo = fontInfo;
        this.tabSize = tabSize;
        this.wrappingStrategy = wrappingStrategy;
        this.wrappingColumn = wrappingColumn;
        this.wrappingIndent = wrappingIndent;
        this.wordBreak = wordBreak;
        this._constructLines(/*resetHiddenAreas*/ true, null);
    }
    dispose() {
        this.hiddenAreasDecorationIds = this.model.deltaDecorations(this.hiddenAreasDecorationIds, []);
    }
    createCoordinatesConverter() {
        return new CoordinatesConverter(this);
    }
    _constructLines(resetHiddenAreas, previousLineBreaks) {
        this.modelLineProjections = [];
        if (resetHiddenAreas) {
            this.hiddenAreasDecorationIds = this.model.deltaDecorations(this.hiddenAreasDecorationIds, []);
        }
        const linesContent = this.model.getLinesContent();
        const injectedTextDecorations = this.model.getInjectedTextDecorations(this._editorId);
        const lineCount = linesContent.length;
        const lineBreaksComputer = this.createLineBreaksComputer();
        const injectedTextQueue = new arrays.ArrayQueue(LineInjectedText.fromDecorations(injectedTextDecorations));
        for (let i = 0; i < lineCount; i++) {
            const lineInjectedText = injectedTextQueue.takeWhile(t => t.lineNumber === i + 1);
            lineBreaksComputer.addRequest(linesContent[i], lineInjectedText, previousLineBreaks ? previousLineBreaks[i] : null);
        }
        const linesBreaks = lineBreaksComputer.finalize();
        const values = [];
        const hiddenAreas = this.hiddenAreasDecorationIds.map((areaId) => this.model.getDecorationRange(areaId)).sort(Range.compareRangesUsingStarts);
        let hiddenAreaStart = 1, hiddenAreaEnd = 0;
        let hiddenAreaIdx = -1;
        let nextLineNumberToUpdateHiddenArea = (hiddenAreaIdx + 1 < hiddenAreas.length) ? hiddenAreaEnd + 1 : lineCount + 2;
        for (let i = 0; i < lineCount; i++) {
            const lineNumber = i + 1;
            if (lineNumber === nextLineNumberToUpdateHiddenArea) {
                hiddenAreaIdx++;
                hiddenAreaStart = hiddenAreas[hiddenAreaIdx].startLineNumber;
                hiddenAreaEnd = hiddenAreas[hiddenAreaIdx].endLineNumber;
                nextLineNumberToUpdateHiddenArea = (hiddenAreaIdx + 1 < hiddenAreas.length) ? hiddenAreaEnd + 1 : lineCount + 2;
            }
            const isInHiddenArea = (lineNumber >= hiddenAreaStart && lineNumber <= hiddenAreaEnd);
            const line = createModelLineProjection(linesBreaks[i], !isInHiddenArea);
            values[i] = line.getViewLineCount();
            this.modelLineProjections[i] = line;
        }
        this._validModelVersionId = this.model.getVersionId();
        this.projectedModelLineLineCounts = new ConstantTimePrefixSumComputer(values);
    }
    getHiddenAreas() {
        return this.hiddenAreasDecorationIds.map((decId) => this.model.getDecorationRange(decId));
    }
    setHiddenAreas(_ranges) {
        const validatedRanges = _ranges.map(r => this.model.validateRange(r));
        const newRanges = normalizeLineRanges(validatedRanges);
        // TODO@Martin: Please stop calling this method on each model change!
        // This checks if there really was a change
        const oldRanges = this.hiddenAreasDecorationIds.map((areaId) => this.model.getDecorationRange(areaId)).sort(Range.compareRangesUsingStarts);
        if (newRanges.length === oldRanges.length) {
            let hasDifference = false;
            for (let i = 0; i < newRanges.length; i++) {
                if (!newRanges[i].equalsRange(oldRanges[i])) {
                    hasDifference = true;
                    break;
                }
            }
            if (!hasDifference) {
                return false;
            }
        }
        const newDecorations = newRanges.map((r) => ({
            range: r,
            options: ModelDecorationOptions.EMPTY,
        }));
        this.hiddenAreasDecorationIds = this.model.deltaDecorations(this.hiddenAreasDecorationIds, newDecorations);
        const hiddenAreas = newRanges;
        let hiddenAreaStart = 1, hiddenAreaEnd = 0;
        let hiddenAreaIdx = -1;
        let nextLineNumberToUpdateHiddenArea = (hiddenAreaIdx + 1 < hiddenAreas.length) ? hiddenAreaEnd + 1 : this.modelLineProjections.length + 2;
        let hasVisibleLine = false;
        for (let i = 0; i < this.modelLineProjections.length; i++) {
            const lineNumber = i + 1;
            if (lineNumber === nextLineNumberToUpdateHiddenArea) {
                hiddenAreaIdx++;
                hiddenAreaStart = hiddenAreas[hiddenAreaIdx].startLineNumber;
                hiddenAreaEnd = hiddenAreas[hiddenAreaIdx].endLineNumber;
                nextLineNumberToUpdateHiddenArea = (hiddenAreaIdx + 1 < hiddenAreas.length) ? hiddenAreaEnd + 1 : this.modelLineProjections.length + 2;
            }
            let lineChanged = false;
            if (lineNumber >= hiddenAreaStart && lineNumber <= hiddenAreaEnd) {
                // Line should be hidden
                if (this.modelLineProjections[i].isVisible()) {
                    this.modelLineProjections[i] = this.modelLineProjections[i].setVisible(false);
                    lineChanged = true;
                }
            }
            else {
                hasVisibleLine = true;
                // Line should be visible
                if (!this.modelLineProjections[i].isVisible()) {
                    this.modelLineProjections[i] = this.modelLineProjections[i].setVisible(true);
                    lineChanged = true;
                }
            }
            if (lineChanged) {
                const newOutputLineCount = this.modelLineProjections[i].getViewLineCount();
                this.projectedModelLineLineCounts.setValue(i, newOutputLineCount);
            }
        }
        if (!hasVisibleLine) {
            // Cannot have everything be hidden => reveal everything!
            this.setHiddenAreas([]);
        }
        return true;
    }
    modelPositionIsVisible(modelLineNumber, _modelColumn) {
        if (modelLineNumber < 1 || modelLineNumber > this.modelLineProjections.length) {
            // invalid arguments
            return false;
        }
        return this.modelLineProjections[modelLineNumber - 1].isVisible();
    }
    getModelLineViewLineCount(modelLineNumber) {
        if (modelLineNumber < 1 || modelLineNumber > this.modelLineProjections.length) {
            // invalid arguments
            return 1;
        }
        return this.modelLineProjections[modelLineNumber - 1].getViewLineCount();
    }
    setTabSize(newTabSize) {
        if (this.tabSize === newTabSize) {
            return false;
        }
        this.tabSize = newTabSize;
        this._constructLines(/*resetHiddenAreas*/ false, null);
        return true;
    }
    setWrappingSettings(fontInfo, wrappingStrategy, wrappingColumn, wrappingIndent, wordBreak) {
        const equalFontInfo = this.fontInfo.equals(fontInfo);
        const equalWrappingStrategy = (this.wrappingStrategy === wrappingStrategy);
        const equalWrappingColumn = (this.wrappingColumn === wrappingColumn);
        const equalWrappingIndent = (this.wrappingIndent === wrappingIndent);
        const equalWordBreak = (this.wordBreak === wordBreak);
        if (equalFontInfo && equalWrappingStrategy && equalWrappingColumn && equalWrappingIndent && equalWordBreak) {
            return false;
        }
        const onlyWrappingColumnChanged = (equalFontInfo && equalWrappingStrategy && !equalWrappingColumn && equalWrappingIndent && equalWordBreak);
        this.fontInfo = fontInfo;
        this.wrappingStrategy = wrappingStrategy;
        this.wrappingColumn = wrappingColumn;
        this.wrappingIndent = wrappingIndent;
        this.wordBreak = wordBreak;
        let previousLineBreaks = null;
        if (onlyWrappingColumnChanged) {
            previousLineBreaks = [];
            for (let i = 0, len = this.modelLineProjections.length; i < len; i++) {
                previousLineBreaks[i] = this.modelLineProjections[i].getProjectionData();
            }
        }
        this._constructLines(/*resetHiddenAreas*/ false, previousLineBreaks);
        return true;
    }
    createLineBreaksComputer() {
        const lineBreaksComputerFactory = (this.wrappingStrategy === 'advanced'
            ? this._domLineBreaksComputerFactory
            : this._monospaceLineBreaksComputerFactory);
        return lineBreaksComputerFactory.createLineBreaksComputer(this.fontInfo, this.tabSize, this.wrappingColumn, this.wrappingIndent, this.wordBreak);
    }
    onModelFlushed() {
        this._constructLines(/*resetHiddenAreas*/ true, null);
    }
    onModelLinesDeleted(versionId, fromLineNumber, toLineNumber) {
        if (!versionId || versionId <= this._validModelVersionId) {
            // Here we check for versionId in case the lines were reconstructed in the meantime.
            // We don't want to apply stale change events on top of a newer read model state.
            return null;
        }
        const outputFromLineNumber = (fromLineNumber === 1 ? 1 : this.projectedModelLineLineCounts.getPrefixSum(fromLineNumber - 1) + 1);
        const outputToLineNumber = this.projectedModelLineLineCounts.getPrefixSum(toLineNumber);
        this.modelLineProjections.splice(fromLineNumber - 1, toLineNumber - fromLineNumber + 1);
        this.projectedModelLineLineCounts.removeValues(fromLineNumber - 1, toLineNumber - fromLineNumber + 1);
        return new viewEvents.ViewLinesDeletedEvent(outputFromLineNumber, outputToLineNumber);
    }
    onModelLinesInserted(versionId, fromLineNumber, _toLineNumber, lineBreaks) {
        if (!versionId || versionId <= this._validModelVersionId) {
            // Here we check for versionId in case the lines were reconstructed in the meantime.
            // We don't want to apply stale change events on top of a newer read model state.
            return null;
        }
        // cannot use this.getHiddenAreas() because those decorations have already seen the effect of this model change
        const isInHiddenArea = (fromLineNumber > 2 && !this.modelLineProjections[fromLineNumber - 2].isVisible());
        const outputFromLineNumber = (fromLineNumber === 1 ? 1 : this.projectedModelLineLineCounts.getPrefixSum(fromLineNumber - 1) + 1);
        let totalOutputLineCount = 0;
        const insertLines = [];
        const insertPrefixSumValues = [];
        for (let i = 0, len = lineBreaks.length; i < len; i++) {
            const line = createModelLineProjection(lineBreaks[i], !isInHiddenArea);
            insertLines.push(line);
            const outputLineCount = line.getViewLineCount();
            totalOutputLineCount += outputLineCount;
            insertPrefixSumValues[i] = outputLineCount;
        }
        // TODO@Alex: use arrays.arrayInsert
        this.modelLineProjections =
            this.modelLineProjections.slice(0, fromLineNumber - 1)
                .concat(insertLines)
                .concat(this.modelLineProjections.slice(fromLineNumber - 1));
        this.projectedModelLineLineCounts.insertValues(fromLineNumber - 1, insertPrefixSumValues);
        return new viewEvents.ViewLinesInsertedEvent(outputFromLineNumber, outputFromLineNumber + totalOutputLineCount - 1);
    }
    onModelLineChanged(versionId, lineNumber, lineBreakData) {
        if (versionId !== null && versionId <= this._validModelVersionId) {
            // Here we check for versionId in case the lines were reconstructed in the meantime.
            // We don't want to apply stale change events on top of a newer read model state.
            return [false, null, null, null];
        }
        const lineIndex = lineNumber - 1;
        const oldOutputLineCount = this.modelLineProjections[lineIndex].getViewLineCount();
        const isVisible = this.modelLineProjections[lineIndex].isVisible();
        const line = createModelLineProjection(lineBreakData, isVisible);
        this.modelLineProjections[lineIndex] = line;
        const newOutputLineCount = this.modelLineProjections[lineIndex].getViewLineCount();
        let lineMappingChanged = false;
        let changeFrom = 0;
        let changeTo = -1;
        let insertFrom = 0;
        let insertTo = -1;
        let deleteFrom = 0;
        let deleteTo = -1;
        if (oldOutputLineCount > newOutputLineCount) {
            changeFrom = this.projectedModelLineLineCounts.getPrefixSum(lineNumber - 1) + 1;
            changeTo = changeFrom + newOutputLineCount - 1;
            deleteFrom = changeTo + 1;
            deleteTo = deleteFrom + (oldOutputLineCount - newOutputLineCount) - 1;
            lineMappingChanged = true;
        }
        else if (oldOutputLineCount < newOutputLineCount) {
            changeFrom = this.projectedModelLineLineCounts.getPrefixSum(lineNumber - 1) + 1;
            changeTo = changeFrom + oldOutputLineCount - 1;
            insertFrom = changeTo + 1;
            insertTo = insertFrom + (newOutputLineCount - oldOutputLineCount) - 1;
            lineMappingChanged = true;
        }
        else {
            changeFrom = this.projectedModelLineLineCounts.getPrefixSum(lineNumber - 1) + 1;
            changeTo = changeFrom + newOutputLineCount - 1;
        }
        this.projectedModelLineLineCounts.setValue(lineIndex, newOutputLineCount);
        const viewLinesChangedEvent = (changeFrom <= changeTo ? new viewEvents.ViewLinesChangedEvent(changeFrom, changeTo - changeFrom + 1) : null);
        const viewLinesInsertedEvent = (insertFrom <= insertTo ? new viewEvents.ViewLinesInsertedEvent(insertFrom, insertTo) : null);
        const viewLinesDeletedEvent = (deleteFrom <= deleteTo ? new viewEvents.ViewLinesDeletedEvent(deleteFrom, deleteTo) : null);
        return [lineMappingChanged, viewLinesChangedEvent, viewLinesInsertedEvent, viewLinesDeletedEvent];
    }
    acceptVersionId(versionId) {
        this._validModelVersionId = versionId;
        if (this.modelLineProjections.length === 1 && !this.modelLineProjections[0].isVisible()) {
            // At least one line must be visible => reset hidden areas
            this.setHiddenAreas([]);
        }
    }
    getViewLineCount() {
        return this.projectedModelLineLineCounts.getTotalSum();
    }
    _toValidViewLineNumber(viewLineNumber) {
        if (viewLineNumber < 1) {
            return 1;
        }
        const viewLineCount = this.getViewLineCount();
        if (viewLineNumber > viewLineCount) {
            return viewLineCount;
        }
        return viewLineNumber | 0;
    }
    getActiveIndentGuide(viewLineNumber, minLineNumber, maxLineNumber) {
        viewLineNumber = this._toValidViewLineNumber(viewLineNumber);
        minLineNumber = this._toValidViewLineNumber(minLineNumber);
        maxLineNumber = this._toValidViewLineNumber(maxLineNumber);
        const modelPosition = this.convertViewPositionToModelPosition(viewLineNumber, this.getViewLineMinColumn(viewLineNumber));
        const modelMinPosition = this.convertViewPositionToModelPosition(minLineNumber, this.getViewLineMinColumn(minLineNumber));
        const modelMaxPosition = this.convertViewPositionToModelPosition(maxLineNumber, this.getViewLineMinColumn(maxLineNumber));
        const result = this.model.guides.getActiveIndentGuide(modelPosition.lineNumber, modelMinPosition.lineNumber, modelMaxPosition.lineNumber);
        const viewStartPosition = this.convertModelPositionToViewPosition(result.startLineNumber, 1);
        const viewEndPosition = this.convertModelPositionToViewPosition(result.endLineNumber, this.model.getLineMaxColumn(result.endLineNumber));
        return {
            startLineNumber: viewStartPosition.lineNumber,
            endLineNumber: viewEndPosition.lineNumber,
            indent: result.indent
        };
    }
    // #region ViewLineInfo
    getViewLineInfo(viewLineNumber) {
        viewLineNumber = this._toValidViewLineNumber(viewLineNumber);
        const r = this.projectedModelLineLineCounts.getIndexOf(viewLineNumber - 1);
        const lineIndex = r.index;
        const remainder = r.remainder;
        return new ViewLineInfo(lineIndex + 1, remainder);
    }
    getMinColumnOfViewLine(viewLineInfo) {
        return this.modelLineProjections[viewLineInfo.modelLineNumber - 1].getViewLineMinColumn(this.model, viewLineInfo.modelLineNumber, viewLineInfo.modelLineWrappedLineIdx);
    }
    getMaxColumnOfViewLine(viewLineInfo) {
        return this.modelLineProjections[viewLineInfo.modelLineNumber - 1].getViewLineMaxColumn(this.model, viewLineInfo.modelLineNumber, viewLineInfo.modelLineWrappedLineIdx);
    }
    getModelStartPositionOfViewLine(viewLineInfo) {
        const line = this.modelLineProjections[viewLineInfo.modelLineNumber - 1];
        const minViewColumn = line.getViewLineMinColumn(this.model, viewLineInfo.modelLineNumber, viewLineInfo.modelLineWrappedLineIdx);
        const column = line.getModelColumnOfViewPosition(viewLineInfo.modelLineWrappedLineIdx, minViewColumn);
        return new Position(viewLineInfo.modelLineNumber, column);
    }
    getModelEndPositionOfViewLine(viewLineInfo) {
        const line = this.modelLineProjections[viewLineInfo.modelLineNumber - 1];
        const maxViewColumn = line.getViewLineMaxColumn(this.model, viewLineInfo.modelLineNumber, viewLineInfo.modelLineWrappedLineIdx);
        const column = line.getModelColumnOfViewPosition(viewLineInfo.modelLineWrappedLineIdx, maxViewColumn);
        return new Position(viewLineInfo.modelLineNumber, column);
    }
    getViewLineInfosGroupedByModelRanges(viewStartLineNumber, viewEndLineNumber) {
        const startViewLine = this.getViewLineInfo(viewStartLineNumber);
        const endViewLine = this.getViewLineInfo(viewEndLineNumber);
        const result = new Array();
        let lastVisibleModelPos = this.getModelStartPositionOfViewLine(startViewLine);
        let viewLines = new Array();
        for (let curModelLine = startViewLine.modelLineNumber; curModelLine <= endViewLine.modelLineNumber; curModelLine++) {
            const line = this.modelLineProjections[curModelLine - 1];
            if (line.isVisible()) {
                const startOffset = curModelLine === startViewLine.modelLineNumber
                    ? startViewLine.modelLineWrappedLineIdx
                    : 0;
                const endOffset = curModelLine === endViewLine.modelLineNumber
                    ? endViewLine.modelLineWrappedLineIdx + 1
                    : line.getViewLineCount();
                for (let i = startOffset; i < endOffset; i++) {
                    viewLines.push(new ViewLineInfo(curModelLine, i));
                }
            }
            if (!line.isVisible() && lastVisibleModelPos) {
                const lastVisibleModelPos2 = new Position(curModelLine - 1, this.model.getLineMaxColumn(curModelLine - 1) + 1);
                const modelRange = Range.fromPositions(lastVisibleModelPos, lastVisibleModelPos2);
                result.push(new ViewLineInfoGroupedByModelRange(modelRange, viewLines));
                viewLines = [];
                lastVisibleModelPos = null;
            }
            else if (line.isVisible() && !lastVisibleModelPos) {
                lastVisibleModelPos = new Position(curModelLine, 1);
            }
        }
        if (lastVisibleModelPos) {
            const modelRange = Range.fromPositions(lastVisibleModelPos, this.getModelEndPositionOfViewLine(endViewLine));
            result.push(new ViewLineInfoGroupedByModelRange(modelRange, viewLines));
        }
        return result;
    }
    // #endregion
    getViewLinesBracketGuides(viewStartLineNumber, viewEndLineNumber, activeViewPosition, options) {
        const modelActivePosition = activeViewPosition ? this.convertViewPositionToModelPosition(activeViewPosition.lineNumber, activeViewPosition.column) : null;
        const resultPerViewLine = [];
        for (const group of this.getViewLineInfosGroupedByModelRanges(viewStartLineNumber, viewEndLineNumber)) {
            const modelRangeStartLineNumber = group.modelRange.startLineNumber;
            const bracketGuidesPerModelLine = this.model.guides.getLinesBracketGuides(modelRangeStartLineNumber, group.modelRange.endLineNumber, modelActivePosition, options);
            for (const viewLineInfo of group.viewLines) {
                const bracketGuides = bracketGuidesPerModelLine[viewLineInfo.modelLineNumber - modelRangeStartLineNumber];
                // visibleColumns stay as they are (this is a bug and needs to be fixed, but it is not a regression)
                // model-columns must be converted to view-model columns.
                const result = bracketGuides.map(g => {
                    if (g.forWrappedLinesAfterColumn !== -1) {
                        const p = this.modelLineProjections[viewLineInfo.modelLineNumber - 1].getViewPositionOfModelPosition(0, g.forWrappedLinesAfterColumn);
                        if (p.lineNumber >= viewLineInfo.modelLineWrappedLineIdx) {
                            return undefined;
                        }
                    }
                    if (g.forWrappedLinesBeforeOrAtColumn !== -1) {
                        const p = this.modelLineProjections[viewLineInfo.modelLineNumber - 1].getViewPositionOfModelPosition(0, g.forWrappedLinesBeforeOrAtColumn);
                        if (p.lineNumber < viewLineInfo.modelLineWrappedLineIdx) {
                            return undefined;
                        }
                    }
                    if (!g.horizontalLine) {
                        return g;
                    }
                    let column = -1;
                    if (g.column !== -1) {
                        const p = this.modelLineProjections[viewLineInfo.modelLineNumber - 1].getViewPositionOfModelPosition(0, g.column);
                        if (p.lineNumber === viewLineInfo.modelLineWrappedLineIdx) {
                            column = p.column;
                        }
                        else if (p.lineNumber < viewLineInfo.modelLineWrappedLineIdx) {
                            column = this.getMinColumnOfViewLine(viewLineInfo);
                        }
                        else if (p.lineNumber > viewLineInfo.modelLineWrappedLineIdx) {
                            return undefined;
                        }
                    }
                    const viewPosition = this.convertModelPositionToViewPosition(viewLineInfo.modelLineNumber, g.horizontalLine.endColumn);
                    const p = this.modelLineProjections[viewLineInfo.modelLineNumber - 1].getViewPositionOfModelPosition(0, g.horizontalLine.endColumn);
                    if (p.lineNumber === viewLineInfo.modelLineWrappedLineIdx) {
                        return new IndentGuide(g.visibleColumn, column, g.className, new IndentGuideHorizontalLine(g.horizontalLine.top, viewPosition.column), -1, -1);
                    }
                    else if (p.lineNumber < viewLineInfo.modelLineWrappedLineIdx) {
                        return undefined;
                    }
                    else {
                        if (g.visibleColumn !== -1) {
                            // Don't repeat horizontal lines that use visibleColumn for unrelated lines.
                            return undefined;
                        }
                        return new IndentGuide(g.visibleColumn, column, g.className, new IndentGuideHorizontalLine(g.horizontalLine.top, this.getMaxColumnOfViewLine(viewLineInfo)), -1, -1);
                    }
                });
                resultPerViewLine.push(result.filter((r) => !!r));
            }
        }
        return resultPerViewLine;
    }
    getViewLinesIndentGuides(viewStartLineNumber, viewEndLineNumber) {
        // TODO: Use the same code as in `getViewLinesBracketGuides`.
        // Future TODO: Merge with `getViewLinesBracketGuides`.
        // However, this requires more refactoring of indent guides.
        viewStartLineNumber = this._toValidViewLineNumber(viewStartLineNumber);
        viewEndLineNumber = this._toValidViewLineNumber(viewEndLineNumber);
        const modelStart = this.convertViewPositionToModelPosition(viewStartLineNumber, this.getViewLineMinColumn(viewStartLineNumber));
        const modelEnd = this.convertViewPositionToModelPosition(viewEndLineNumber, this.getViewLineMaxColumn(viewEndLineNumber));
        let result = [];
        const resultRepeatCount = [];
        const resultRepeatOption = [];
        const modelStartLineIndex = modelStart.lineNumber - 1;
        const modelEndLineIndex = modelEnd.lineNumber - 1;
        let reqStart = null;
        for (let modelLineIndex = modelStartLineIndex; modelLineIndex <= modelEndLineIndex; modelLineIndex++) {
            const line = this.modelLineProjections[modelLineIndex];
            if (line.isVisible()) {
                const viewLineStartIndex = line.getViewLineNumberOfModelPosition(0, modelLineIndex === modelStartLineIndex ? modelStart.column : 1);
                const viewLineEndIndex = line.getViewLineNumberOfModelPosition(0, this.model.getLineMaxColumn(modelLineIndex + 1));
                const count = viewLineEndIndex - viewLineStartIndex + 1;
                let option = 0 /* IndentGuideRepeatOption.BlockNone */;
                if (count > 1 && line.getViewLineMinColumn(this.model, modelLineIndex + 1, viewLineEndIndex) === 1) {
                    // wrapped lines should block indent guides
                    option = (viewLineStartIndex === 0 ? 1 /* IndentGuideRepeatOption.BlockSubsequent */ : 2 /* IndentGuideRepeatOption.BlockAll */);
                }
                resultRepeatCount.push(count);
                resultRepeatOption.push(option);
                // merge into previous request
                if (reqStart === null) {
                    reqStart = new Position(modelLineIndex + 1, 0);
                }
            }
            else {
                // hit invisible line => flush request
                if (reqStart !== null) {
                    result = result.concat(this.model.guides.getLinesIndentGuides(reqStart.lineNumber, modelLineIndex));
                    reqStart = null;
                }
            }
        }
        if (reqStart !== null) {
            result = result.concat(this.model.guides.getLinesIndentGuides(reqStart.lineNumber, modelEnd.lineNumber));
            reqStart = null;
        }
        const viewLineCount = viewEndLineNumber - viewStartLineNumber + 1;
        const viewIndents = new Array(viewLineCount);
        let currIndex = 0;
        for (let i = 0, len = result.length; i < len; i++) {
            let value = result[i];
            const count = Math.min(viewLineCount - currIndex, resultRepeatCount[i]);
            const option = resultRepeatOption[i];
            let blockAtIndex;
            if (option === 2 /* IndentGuideRepeatOption.BlockAll */) {
                blockAtIndex = 0;
            }
            else if (option === 1 /* IndentGuideRepeatOption.BlockSubsequent */) {
                blockAtIndex = 1;
            }
            else {
                blockAtIndex = count;
            }
            for (let j = 0; j < count; j++) {
                if (j === blockAtIndex) {
                    value = 0;
                }
                viewIndents[currIndex++] = value;
            }
        }
        return viewIndents;
    }
    getViewLineContent(viewLineNumber) {
        const info = this.getViewLineInfo(viewLineNumber);
        return this.modelLineProjections[info.modelLineNumber - 1].getViewLineContent(this.model, info.modelLineNumber, info.modelLineWrappedLineIdx);
    }
    getViewLineLength(viewLineNumber) {
        const info = this.getViewLineInfo(viewLineNumber);
        return this.modelLineProjections[info.modelLineNumber - 1].getViewLineLength(this.model, info.modelLineNumber, info.modelLineWrappedLineIdx);
    }
    getViewLineMinColumn(viewLineNumber) {
        const info = this.getViewLineInfo(viewLineNumber);
        return this.modelLineProjections[info.modelLineNumber - 1].getViewLineMinColumn(this.model, info.modelLineNumber, info.modelLineWrappedLineIdx);
    }
    getViewLineMaxColumn(viewLineNumber) {
        const info = this.getViewLineInfo(viewLineNumber);
        return this.modelLineProjections[info.modelLineNumber - 1].getViewLineMaxColumn(this.model, info.modelLineNumber, info.modelLineWrappedLineIdx);
    }
    getViewLineData(viewLineNumber) {
        const info = this.getViewLineInfo(viewLineNumber);
        return this.modelLineProjections[info.modelLineNumber - 1].getViewLineData(this.model, info.modelLineNumber, info.modelLineWrappedLineIdx);
    }
    getViewLinesData(viewStartLineNumber, viewEndLineNumber, needed) {
        viewStartLineNumber = this._toValidViewLineNumber(viewStartLineNumber);
        viewEndLineNumber = this._toValidViewLineNumber(viewEndLineNumber);
        const start = this.projectedModelLineLineCounts.getIndexOf(viewStartLineNumber - 1);
        let viewLineNumber = viewStartLineNumber;
        const startModelLineIndex = start.index;
        const startRemainder = start.remainder;
        const result = [];
        for (let modelLineIndex = startModelLineIndex, len = this.model.getLineCount(); modelLineIndex < len; modelLineIndex++) {
            const line = this.modelLineProjections[modelLineIndex];
            if (!line.isVisible()) {
                continue;
            }
            const fromViewLineIndex = (modelLineIndex === startModelLineIndex ? startRemainder : 0);
            let remainingViewLineCount = line.getViewLineCount() - fromViewLineIndex;
            let lastLine = false;
            if (viewLineNumber + remainingViewLineCount > viewEndLineNumber) {
                lastLine = true;
                remainingViewLineCount = viewEndLineNumber - viewLineNumber + 1;
            }
            line.getViewLinesData(this.model, modelLineIndex + 1, fromViewLineIndex, remainingViewLineCount, viewLineNumber - viewStartLineNumber, needed, result);
            viewLineNumber += remainingViewLineCount;
            if (lastLine) {
                break;
            }
        }
        return result;
    }
    validateViewPosition(viewLineNumber, viewColumn, expectedModelPosition) {
        viewLineNumber = this._toValidViewLineNumber(viewLineNumber);
        const r = this.projectedModelLineLineCounts.getIndexOf(viewLineNumber - 1);
        const lineIndex = r.index;
        const remainder = r.remainder;
        const line = this.modelLineProjections[lineIndex];
        const minColumn = line.getViewLineMinColumn(this.model, lineIndex + 1, remainder);
        const maxColumn = line.getViewLineMaxColumn(this.model, lineIndex + 1, remainder);
        if (viewColumn < minColumn) {
            viewColumn = minColumn;
        }
        if (viewColumn > maxColumn) {
            viewColumn = maxColumn;
        }
        const computedModelColumn = line.getModelColumnOfViewPosition(remainder, viewColumn);
        const computedModelPosition = this.model.validatePosition(new Position(lineIndex + 1, computedModelColumn));
        if (computedModelPosition.equals(expectedModelPosition)) {
            return new Position(viewLineNumber, viewColumn);
        }
        return this.convertModelPositionToViewPosition(expectedModelPosition.lineNumber, expectedModelPosition.column);
    }
    validateViewRange(viewRange, expectedModelRange) {
        const validViewStart = this.validateViewPosition(viewRange.startLineNumber, viewRange.startColumn, expectedModelRange.getStartPosition());
        const validViewEnd = this.validateViewPosition(viewRange.endLineNumber, viewRange.endColumn, expectedModelRange.getEndPosition());
        return new Range(validViewStart.lineNumber, validViewStart.column, validViewEnd.lineNumber, validViewEnd.column);
    }
    convertViewPositionToModelPosition(viewLineNumber, viewColumn) {
        const info = this.getViewLineInfo(viewLineNumber);
        const inputColumn = this.modelLineProjections[info.modelLineNumber - 1].getModelColumnOfViewPosition(info.modelLineWrappedLineIdx, viewColumn);
        // console.log('out -> in ' + viewLineNumber + ',' + viewColumn + ' ===> ' + (lineIndex+1) + ',' + inputColumn);
        return this.model.validatePosition(new Position(info.modelLineNumber, inputColumn));
    }
    convertViewRangeToModelRange(viewRange) {
        const start = this.convertViewPositionToModelPosition(viewRange.startLineNumber, viewRange.startColumn);
        const end = this.convertViewPositionToModelPosition(viewRange.endLineNumber, viewRange.endColumn);
        return new Range(start.lineNumber, start.column, end.lineNumber, end.column);
    }
    convertModelPositionToViewPosition(_modelLineNumber, _modelColumn, affinity = 2 /* PositionAffinity.None */, allowZeroLineNumber = false, belowHiddenRanges = false) {
        const validPosition = this.model.validatePosition(new Position(_modelLineNumber, _modelColumn));
        const inputLineNumber = validPosition.lineNumber;
        const inputColumn = validPosition.column;
        let lineIndex = inputLineNumber - 1, lineIndexChanged = false;
        if (belowHiddenRanges) {
            while (lineIndex < this.modelLineProjections.length && !this.modelLineProjections[lineIndex].isVisible()) {
                lineIndex++;
                lineIndexChanged = true;
            }
        }
        else {
            while (lineIndex > 0 && !this.modelLineProjections[lineIndex].isVisible()) {
                lineIndex--;
                lineIndexChanged = true;
            }
        }
        if (lineIndex === 0 && !this.modelLineProjections[lineIndex].isVisible()) {
            // Could not reach a real line
            // console.log('in -> out ' + inputLineNumber + ',' + inputColumn + ' ===> ' + 1 + ',' + 1);
            // TODO@alexdima@hediet this isn't soo pretty
            return new Position(allowZeroLineNumber ? 0 : 1, 1);
        }
        const deltaLineNumber = 1 + this.projectedModelLineLineCounts.getPrefixSum(lineIndex);
        let r;
        if (lineIndexChanged) {
            if (belowHiddenRanges) {
                r = this.modelLineProjections[lineIndex].getViewPositionOfModelPosition(deltaLineNumber, 1, affinity);
            }
            else {
                r = this.modelLineProjections[lineIndex].getViewPositionOfModelPosition(deltaLineNumber, this.model.getLineMaxColumn(lineIndex + 1), affinity);
            }
        }
        else {
            r = this.modelLineProjections[inputLineNumber - 1].getViewPositionOfModelPosition(deltaLineNumber, inputColumn, affinity);
        }
        // console.log('in -> out ' + inputLineNumber + ',' + inputColumn + ' ===> ' + r.lineNumber + ',' + r);
        return r;
    }
    /**
     * @param affinity The affinity in case of an empty range. Has no effect for non-empty ranges.
    */
    convertModelRangeToViewRange(modelRange, affinity = 0 /* PositionAffinity.Left */) {
        if (modelRange.isEmpty()) {
            const start = this.convertModelPositionToViewPosition(modelRange.startLineNumber, modelRange.startColumn, affinity);
            return Range.fromPositions(start);
        }
        else {
            const start = this.convertModelPositionToViewPosition(modelRange.startLineNumber, modelRange.startColumn, 1 /* PositionAffinity.Right */);
            const end = this.convertModelPositionToViewPosition(modelRange.endLineNumber, modelRange.endColumn, 0 /* PositionAffinity.Left */);
            return new Range(start.lineNumber, start.column, end.lineNumber, end.column);
        }
    }
    getViewLineNumberOfModelPosition(modelLineNumber, modelColumn) {
        let lineIndex = modelLineNumber - 1;
        if (this.modelLineProjections[lineIndex].isVisible()) {
            // this model line is visible
            const deltaLineNumber = 1 + this.projectedModelLineLineCounts.getPrefixSum(lineIndex);
            return this.modelLineProjections[lineIndex].getViewLineNumberOfModelPosition(deltaLineNumber, modelColumn);
        }
        // this model line is not visible
        while (lineIndex > 0 && !this.modelLineProjections[lineIndex].isVisible()) {
            lineIndex--;
        }
        if (lineIndex === 0 && !this.modelLineProjections[lineIndex].isVisible()) {
            // Could not reach a real line
            return 1;
        }
        const deltaLineNumber = 1 + this.projectedModelLineLineCounts.getPrefixSum(lineIndex);
        return this.modelLineProjections[lineIndex].getViewLineNumberOfModelPosition(deltaLineNumber, this.model.getLineMaxColumn(lineIndex + 1));
    }
    getDecorationsInRange(range, ownerId, filterOutValidation, onlyMinimapDecorations, onlyMarginDecorations) {
        const modelStart = this.convertViewPositionToModelPosition(range.startLineNumber, range.startColumn);
        const modelEnd = this.convertViewPositionToModelPosition(range.endLineNumber, range.endColumn);
        if (modelEnd.lineNumber - modelStart.lineNumber <= range.endLineNumber - range.startLineNumber) {
            // most likely there are no hidden lines => fast path
            // fetch decorations from column 1 to cover the case of wrapped lines that have whole line decorations at column 1
            return this.model.getDecorationsInRange(new Range(modelStart.lineNumber, 1, modelEnd.lineNumber, modelEnd.column), ownerId, filterOutValidation, onlyMinimapDecorations, onlyMarginDecorations);
        }
        let result = [];
        const modelStartLineIndex = modelStart.lineNumber - 1;
        const modelEndLineIndex = modelEnd.lineNumber - 1;
        let reqStart = null;
        for (let modelLineIndex = modelStartLineIndex; modelLineIndex <= modelEndLineIndex; modelLineIndex++) {
            const line = this.modelLineProjections[modelLineIndex];
            if (line.isVisible()) {
                // merge into previous request
                if (reqStart === null) {
                    reqStart = new Position(modelLineIndex + 1, modelLineIndex === modelStartLineIndex ? modelStart.column : 1);
                }
            }
            else {
                // hit invisible line => flush request
                if (reqStart !== null) {
                    const maxLineColumn = this.model.getLineMaxColumn(modelLineIndex);
                    result = result.concat(this.model.getDecorationsInRange(new Range(reqStart.lineNumber, reqStart.column, modelLineIndex, maxLineColumn), ownerId, filterOutValidation, onlyMinimapDecorations));
                    reqStart = null;
                }
            }
        }
        if (reqStart !== null) {
            result = result.concat(this.model.getDecorationsInRange(new Range(reqStart.lineNumber, reqStart.column, modelEnd.lineNumber, modelEnd.column), ownerId, filterOutValidation, onlyMinimapDecorations));
            reqStart = null;
        }
        result.sort((a, b) => {
            const res = Range.compareRangesUsingStarts(a.range, b.range);
            if (res === 0) {
                if (a.id < b.id) {
                    return -1;
                }
                if (a.id > b.id) {
                    return 1;
                }
                return 0;
            }
            return res;
        });
        // Eliminate duplicate decorations that might have intersected our visible ranges multiple times
        const finalResult = [];
        let finalResultLen = 0;
        let prevDecId = null;
        for (const dec of result) {
            const decId = dec.id;
            if (prevDecId === decId) {
                // skip
                continue;
            }
            prevDecId = decId;
            finalResult[finalResultLen++] = dec;
        }
        return finalResult;
    }
    getInjectedTextAt(position) {
        const info = this.getViewLineInfo(position.lineNumber);
        return this.modelLineProjections[info.modelLineNumber - 1].getInjectedTextAt(info.modelLineWrappedLineIdx, position.column);
    }
    normalizePosition(position, affinity) {
        const info = this.getViewLineInfo(position.lineNumber);
        return this.modelLineProjections[info.modelLineNumber - 1].normalizePosition(info.modelLineWrappedLineIdx, position, affinity);
    }
    getLineIndentColumn(lineNumber) {
        const info = this.getViewLineInfo(lineNumber);
        if (info.modelLineWrappedLineIdx === 0) {
            return this.model.getLineIndentColumn(info.modelLineNumber);
        }
        // wrapped lines have no indentation.
        // We deliberately don't handle the case that indentation is wrapped
        // to avoid two view lines reporting indentation for the very same model line.
        return 0;
    }
}
/**
 * Overlapping unsorted ranges:
 * [   )      [ )       [  )
 *    [    )      [       )
 * ->
 * Non overlapping sorted ranges:
 * [       )  [ ) [        )
 *
 * Note: This function only considers line information! Columns are ignored.
*/
function normalizeLineRanges(ranges) {
    if (ranges.length === 0) {
        return [];
    }
    const sortedRanges = ranges.slice();
    sortedRanges.sort(Range.compareRangesUsingStarts);
    const result = [];
    let currentRangeStart = sortedRanges[0].startLineNumber;
    let currentRangeEnd = sortedRanges[0].endLineNumber;
    for (let i = 1, len = sortedRanges.length; i < len; i++) {
        const range = sortedRanges[i];
        if (range.startLineNumber > currentRangeEnd + 1) {
            result.push(new Range(currentRangeStart, 1, currentRangeEnd, 1));
            currentRangeStart = range.startLineNumber;
            currentRangeEnd = range.endLineNumber;
        }
        else if (range.endLineNumber > currentRangeEnd) {
            currentRangeEnd = range.endLineNumber;
        }
    }
    result.push(new Range(currentRangeStart, 1, currentRangeEnd, 1));
    return result;
}
/**
 * Represents a view line. Can be used to efficiently query more information about it.
 */
class ViewLineInfo {
    get isWrappedLineContinuation() {
        return this.modelLineWrappedLineIdx > 0;
    }
    constructor(modelLineNumber, modelLineWrappedLineIdx) {
        this.modelLineNumber = modelLineNumber;
        this.modelLineWrappedLineIdx = modelLineWrappedLineIdx;
    }
}
/**
 * A list of view lines that have a contiguous span in the model.
*/
class ViewLineInfoGroupedByModelRange {
    constructor(modelRange, viewLines) {
        this.modelRange = modelRange;
        this.viewLines = viewLines;
    }
}
class CoordinatesConverter {
    constructor(lines) {
        this._lines = lines;
    }
    // View -> Model conversion and related methods
    convertViewPositionToModelPosition(viewPosition) {
        return this._lines.convertViewPositionToModelPosition(viewPosition.lineNumber, viewPosition.column);
    }
    convertViewRangeToModelRange(viewRange) {
        return this._lines.convertViewRangeToModelRange(viewRange);
    }
    validateViewPosition(viewPosition, expectedModelPosition) {
        return this._lines.validateViewPosition(viewPosition.lineNumber, viewPosition.column, expectedModelPosition);
    }
    validateViewRange(viewRange, expectedModelRange) {
        return this._lines.validateViewRange(viewRange, expectedModelRange);
    }
    // Model -> View conversion and related methods
    convertModelPositionToViewPosition(modelPosition, affinity, allowZero, belowHiddenRanges) {
        return this._lines.convertModelPositionToViewPosition(modelPosition.lineNumber, modelPosition.column, affinity, allowZero, belowHiddenRanges);
    }
    convertModelRangeToViewRange(modelRange, affinity) {
        return this._lines.convertModelRangeToViewRange(modelRange, affinity);
    }
    modelPositionIsVisible(modelPosition) {
        return this._lines.modelPositionIsVisible(modelPosition.lineNumber, modelPosition.column);
    }
    getModelLineViewLineCount(modelLineNumber) {
        return this._lines.getModelLineViewLineCount(modelLineNumber);
    }
    getViewLineNumberOfModelPosition(modelLineNumber, modelColumn) {
        return this._lines.getViewLineNumberOfModelPosition(modelLineNumber, modelColumn);
    }
}
var IndentGuideRepeatOption;
(function (IndentGuideRepeatOption) {
    IndentGuideRepeatOption[IndentGuideRepeatOption["BlockNone"] = 0] = "BlockNone";
    IndentGuideRepeatOption[IndentGuideRepeatOption["BlockSubsequent"] = 1] = "BlockSubsequent";
    IndentGuideRepeatOption[IndentGuideRepeatOption["BlockAll"] = 2] = "BlockAll";
})(IndentGuideRepeatOption || (IndentGuideRepeatOption = {}));
export class ViewModelLinesFromModelAsIs {
    constructor(model) {
        this.model = model;
    }
    dispose() {
    }
    createCoordinatesConverter() {
        return new IdentityCoordinatesConverter(this);
    }
    getHiddenAreas() {
        return [];
    }
    setHiddenAreas(_ranges) {
        return false;
    }
    setTabSize(_newTabSize) {
        return false;
    }
    setWrappingSettings(_fontInfo, _wrappingStrategy, _wrappingColumn, _wrappingIndent) {
        return false;
    }
    createLineBreaksComputer() {
        const result = [];
        return {
            addRequest: (lineText, injectedText, previousLineBreakData) => {
                result.push(null);
            },
            finalize: () => {
                return result;
            }
        };
    }
    onModelFlushed() {
    }
    onModelLinesDeleted(_versionId, fromLineNumber, toLineNumber) {
        return new viewEvents.ViewLinesDeletedEvent(fromLineNumber, toLineNumber);
    }
    onModelLinesInserted(_versionId, fromLineNumber, toLineNumber, lineBreaks) {
        return new viewEvents.ViewLinesInsertedEvent(fromLineNumber, toLineNumber);
    }
    onModelLineChanged(_versionId, lineNumber, lineBreakData) {
        return [false, new viewEvents.ViewLinesChangedEvent(lineNumber, 1), null, null];
    }
    acceptVersionId(_versionId) {
    }
    getViewLineCount() {
        return this.model.getLineCount();
    }
    getActiveIndentGuide(viewLineNumber, _minLineNumber, _maxLineNumber) {
        return {
            startLineNumber: viewLineNumber,
            endLineNumber: viewLineNumber,
            indent: 0
        };
    }
    getViewLinesBracketGuides(startLineNumber, endLineNumber, activePosition) {
        return new Array(endLineNumber - startLineNumber + 1).fill([]);
    }
    getViewLinesIndentGuides(viewStartLineNumber, viewEndLineNumber) {
        const viewLineCount = viewEndLineNumber - viewStartLineNumber + 1;
        const result = new Array(viewLineCount);
        for (let i = 0; i < viewLineCount; i++) {
            result[i] = 0;
        }
        return result;
    }
    getViewLineContent(viewLineNumber) {
        return this.model.getLineContent(viewLineNumber);
    }
    getViewLineLength(viewLineNumber) {
        return this.model.getLineLength(viewLineNumber);
    }
    getViewLineMinColumn(viewLineNumber) {
        return this.model.getLineMinColumn(viewLineNumber);
    }
    getViewLineMaxColumn(viewLineNumber) {
        return this.model.getLineMaxColumn(viewLineNumber);
    }
    getViewLineData(viewLineNumber) {
        const lineTokens = this.model.tokenization.getLineTokens(viewLineNumber);
        const lineContent = lineTokens.getLineContent();
        return new ViewLineData(lineContent, false, 1, lineContent.length + 1, 0, lineTokens.inflate(), null);
    }
    getViewLinesData(viewStartLineNumber, viewEndLineNumber, needed) {
        const lineCount = this.model.getLineCount();
        viewStartLineNumber = Math.min(Math.max(1, viewStartLineNumber), lineCount);
        viewEndLineNumber = Math.min(Math.max(1, viewEndLineNumber), lineCount);
        const result = [];
        for (let lineNumber = viewStartLineNumber; lineNumber <= viewEndLineNumber; lineNumber++) {
            const idx = lineNumber - viewStartLineNumber;
            result[idx] = needed[idx] ? this.getViewLineData(lineNumber) : null;
        }
        return result;
    }
    getDecorationsInRange(range, ownerId, filterOutValidation, onlyMinimapDecorations, onlyMarginDecorations) {
        return this.model.getDecorationsInRange(range, ownerId, filterOutValidation, onlyMinimapDecorations, onlyMarginDecorations);
    }
    normalizePosition(position, affinity) {
        return this.model.normalizePosition(position, affinity);
    }
    getLineIndentColumn(lineNumber) {
        return this.model.getLineIndentColumn(lineNumber);
    }
    getInjectedTextAt(position) {
        // Identity lines collection does not support injected text.
        return null;
    }
}
class IdentityCoordinatesConverter {
    constructor(lines) {
        this._lines = lines;
    }
    _validPosition(pos) {
        return this._lines.model.validatePosition(pos);
    }
    _validRange(range) {
        return this._lines.model.validateRange(range);
    }
    // View -> Model conversion and related methods
    convertViewPositionToModelPosition(viewPosition) {
        return this._validPosition(viewPosition);
    }
    convertViewRangeToModelRange(viewRange) {
        return this._validRange(viewRange);
    }
    validateViewPosition(_viewPosition, expectedModelPosition) {
        return this._validPosition(expectedModelPosition);
    }
    validateViewRange(_viewRange, expectedModelRange) {
        return this._validRange(expectedModelRange);
    }
    // Model -> View conversion and related methods
    convertModelPositionToViewPosition(modelPosition) {
        return this._validPosition(modelPosition);
    }
    convertModelRangeToViewRange(modelRange) {
        return this._validRange(modelRange);
    }
    modelPositionIsVisible(modelPosition) {
        const lineCount = this._lines.model.getLineCount();
        if (modelPosition.lineNumber < 1 || modelPosition.lineNumber > lineCount) {
            // invalid arguments
            return false;
        }
        return true;
    }
    modelRangeIsVisible(modelRange) {
        const lineCount = this._lines.model.getLineCount();
        if (modelRange.startLineNumber < 1 || modelRange.startLineNumber > lineCount) {
            // invalid arguments
            return false;
        }
        if (modelRange.endLineNumber < 1 || modelRange.endLineNumber > lineCount) {
            // invalid arguments
            return false;
        }
        return true;
    }
    getModelLineViewLineCount(modelLineNumber) {
        return 1;
    }
    getViewLineNumberOfModelPosition(modelLineNumber, modelColumn) {
        return modelLineNumber;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld01vZGVsTGluZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi92aWV3TW9kZWwvdmlld01vZGVsTGluZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxnQ0FBZ0MsQ0FBQztBQUl6RCxPQUFPLEVBQWEsUUFBUSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDMUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBRXpDLE9BQU8sRUFBK0MsV0FBVyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDNUgsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDL0QsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDekQsT0FBTyxLQUFLLFVBQVUsTUFBTSxrQkFBa0IsQ0FBQztBQUMvQyxPQUFPLEVBQUUseUJBQXlCLEVBQXdCLE1BQU0sMEJBQTBCLENBQUM7QUFFM0YsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDOUUsT0FBTyxFQUF5QixZQUFZLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQXdDdEUsTUFBTSxPQUFPLGdDQUFnQztJQXdCNUMsWUFDQyxRQUFnQixFQUNoQixLQUFpQixFQUNqQiw0QkFBd0QsRUFDeEQsa0NBQThELEVBQzlELFFBQWtCLEVBQ2xCLE9BQWUsRUFDZixnQkFBdUMsRUFDdkMsY0FBc0IsRUFDdEIsY0FBOEIsRUFDOUIsU0FBK0I7UUFFL0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUM7UUFDMUIsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbkIsSUFBSSxDQUFDLG9C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