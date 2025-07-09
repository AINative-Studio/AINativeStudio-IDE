/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { findLast } from '../../../base/common/arraysFind.js';
import * as strings from '../../../base/common/strings.js';
import { CursorColumns } from '../core/cursorColumns.js';
import { Range } from '../core/range.js';
import { TextModelPart } from './textModelPart.js';
import { computeIndentLevel } from './utils.js';
import { HorizontalGuidesState, IndentGuide, IndentGuideHorizontalLine } from '../textModelGuides.js';
import { BugIndicatingError } from '../../../base/common/errors.js';
export class GuidesTextModelPart extends TextModelPart {
    constructor(textModel, languageConfigurationService) {
        super();
        this.textModel = textModel;
        this.languageConfigurationService = languageConfigurationService;
    }
    getLanguageConfiguration(languageId) {
        return this.languageConfigurationService.getLanguageConfiguration(languageId);
    }
    _computeIndentLevel(lineIndex) {
        return computeIndentLevel(this.textModel.getLineContent(lineIndex + 1), this.textModel.getOptions().tabSize);
    }
    getActiveIndentGuide(lineNumber, minLineNumber, maxLineNumber) {
        this.assertNotDisposed();
        const lineCount = this.textModel.getLineCount();
        if (lineNumber < 1 || lineNumber > lineCount) {
            throw new BugIndicatingError('Illegal value for lineNumber');
        }
        const foldingRules = this.getLanguageConfiguration(this.textModel.getLanguageId()).foldingRules;
        const offSide = Boolean(foldingRules && foldingRules.offSide);
        let up_aboveContentLineIndex = -2; /* -2 is a marker for not having computed it */
        let up_aboveContentLineIndent = -1;
        let up_belowContentLineIndex = -2; /* -2 is a marker for not having computed it */
        let up_belowContentLineIndent = -1;
        const up_resolveIndents = (lineNumber) => {
            if (up_aboveContentLineIndex !== -1 &&
                (up_aboveContentLineIndex === -2 ||
                    up_aboveContentLineIndex > lineNumber - 1)) {
                up_aboveContentLineIndex = -1;
                up_aboveContentLineIndent = -1;
                // must find previous line with content
                for (let lineIndex = lineNumber - 2; lineIndex >= 0; lineIndex--) {
                    const indent = this._computeIndentLevel(lineIndex);
                    if (indent >= 0) {
                        up_aboveContentLineIndex = lineIndex;
                        up_aboveContentLineIndent = indent;
                        break;
                    }
                }
            }
            if (up_belowContentLineIndex === -2) {
                up_belowContentLineIndex = -1;
                up_belowContentLineIndent = -1;
                // must find next line with content
                for (let lineIndex = lineNumber; lineIndex < lineCount; lineIndex++) {
                    const indent = this._computeIndentLevel(lineIndex);
                    if (indent >= 0) {
                        up_belowContentLineIndex = lineIndex;
                        up_belowContentLineIndent = indent;
                        break;
                    }
                }
            }
        };
        let down_aboveContentLineIndex = -2; /* -2 is a marker for not having computed it */
        let down_aboveContentLineIndent = -1;
        let down_belowContentLineIndex = -2; /* -2 is a marker for not having computed it */
        let down_belowContentLineIndent = -1;
        const down_resolveIndents = (lineNumber) => {
            if (down_aboveContentLineIndex === -2) {
                down_aboveContentLineIndex = -1;
                down_aboveContentLineIndent = -1;
                // must find previous line with content
                for (let lineIndex = lineNumber - 2; lineIndex >= 0; lineIndex--) {
                    const indent = this._computeIndentLevel(lineIndex);
                    if (indent >= 0) {
                        down_aboveContentLineIndex = lineIndex;
                        down_aboveContentLineIndent = indent;
                        break;
                    }
                }
            }
            if (down_belowContentLineIndex !== -1 &&
                (down_belowContentLineIndex === -2 ||
                    down_belowContentLineIndex < lineNumber - 1)) {
                down_belowContentLineIndex = -1;
                down_belowContentLineIndent = -1;
                // must find next line with content
                for (let lineIndex = lineNumber; lineIndex < lineCount; lineIndex++) {
                    const indent = this._computeIndentLevel(lineIndex);
                    if (indent >= 0) {
                        down_belowContentLineIndex = lineIndex;
                        down_belowContentLineIndent = indent;
                        break;
                    }
                }
            }
        };
        let startLineNumber = 0;
        let goUp = true;
        let endLineNumber = 0;
        let goDown = true;
        let indent = 0;
        let initialIndent = 0;
        for (let distance = 0; goUp || goDown; distance++) {
            const upLineNumber = lineNumber - distance;
            const downLineNumber = lineNumber + distance;
            if (distance > 1 && (upLineNumber < 1 || upLineNumber < minLineNumber)) {
                goUp = false;
            }
            if (distance > 1 &&
                (downLineNumber > lineCount || downLineNumber > maxLineNumber)) {
                goDown = false;
            }
            if (distance > 50000) {
                // stop processing
                goUp = false;
                goDown = false;
            }
            let upLineIndentLevel = -1;
            if (goUp && upLineNumber >= 1) {
                // compute indent level going up
                const currentIndent = this._computeIndentLevel(upLineNumber - 1);
                if (currentIndent >= 0) {
                    // This line has content (besides whitespace)
                    // Use the line's indent
                    up_belowContentLineIndex = upLineNumber - 1;
                    up_belowContentLineIndent = currentIndent;
                    upLineIndentLevel = Math.ceil(currentIndent / this.textModel.getOptions().indentSize);
                }
                else {
                    up_resolveIndents(upLineNumber);
                    upLineIndentLevel = this._getIndentLevelForWhitespaceLine(offSide, up_aboveContentLineIndent, up_belowContentLineIndent);
                }
            }
            let downLineIndentLevel = -1;
            if (goDown && downLineNumber <= lineCount) {
                // compute indent level going down
                const currentIndent = this._computeIndentLevel(downLineNumber - 1);
                if (currentIndent >= 0) {
                    // This line has content (besides whitespace)
                    // Use the line's indent
                    down_aboveContentLineIndex = downLineNumber - 1;
                    down_aboveContentLineIndent = currentIndent;
                    downLineIndentLevel = Math.ceil(currentIndent / this.textModel.getOptions().indentSize);
                }
                else {
                    down_resolveIndents(downLineNumber);
                    downLineIndentLevel = this._getIndentLevelForWhitespaceLine(offSide, down_aboveContentLineIndent, down_belowContentLineIndent);
                }
            }
            if (distance === 0) {
                initialIndent = upLineIndentLevel;
                continue;
            }
            if (distance === 1) {
                if (downLineNumber <= lineCount &&
                    downLineIndentLevel >= 0 &&
                    initialIndent + 1 === downLineIndentLevel) {
                    // This is the beginning of a scope, we have special handling here, since we want the
                    // child scope indent to be active, not the parent scope
                    goUp = false;
                    startLineNumber = downLineNumber;
                    endLineNumber = downLineNumber;
                    indent = downLineIndentLevel;
                    continue;
                }
                if (upLineNumber >= 1 &&
                    upLineIndentLevel >= 0 &&
                    upLineIndentLevel - 1 === initialIndent) {
                    // This is the end of a scope, just like above
                    goDown = false;
                    startLineNumber = upLineNumber;
                    endLineNumber = upLineNumber;
                    indent = upLineIndentLevel;
                    continue;
                }
                startLineNumber = lineNumber;
                endLineNumber = lineNumber;
                indent = initialIndent;
                if (indent === 0) {
                    // No need to continue
                    return { startLineNumber, endLineNumber, indent };
                }
            }
            if (goUp) {
                if (upLineIndentLevel >= indent) {
                    startLineNumber = upLineNumber;
                }
                else {
                    goUp = false;
                }
            }
            if (goDown) {
                if (downLineIndentLevel >= indent) {
                    endLineNumber = downLineNumber;
                }
                else {
                    goDown = false;
                }
            }
        }
        return { startLineNumber, endLineNumber, indent };
    }
    getLinesBracketGuides(startLineNumber, endLineNumber, activePosition, options) {
        const result = [];
        for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
            result.push([]);
        }
        // If requested, this could be made configurable.
        const includeSingleLinePairs = true;
        const bracketPairs = this.textModel.bracketPairs.getBracketPairsInRangeWithMinIndentation(new Range(startLineNumber, 1, endLineNumber, this.textModel.getLineMaxColumn(endLineNumber))).toArray();
        let activeBracketPairRange = undefined;
        if (activePosition && bracketPairs.length > 0) {
            const bracketsContainingActivePosition = (startLineNumber <= activePosition.lineNumber &&
                activePosition.lineNumber <= endLineNumber
                // We don't need to query the brackets again if the cursor is in the viewport
                ? bracketPairs
                : this.textModel.bracketPairs.getBracketPairsInRange(Range.fromPositions(activePosition)).toArray()).filter((bp) => Range.strictContainsPosition(bp.range, activePosition));
            activeBracketPairRange = findLast(bracketsContainingActivePosition, (i) => includeSingleLinePairs || i.range.startLineNumber !== i.range.endLineNumber)?.range;
        }
        const independentColorPoolPerBracketType = this.textModel.getOptions().bracketPairColorizationOptions.independentColorPoolPerBracketType;
        const colorProvider = new BracketPairGuidesClassNames();
        for (const pair of bracketPairs) {
            /*


                    {
                    |
                    }

                    {
                    |
                    ----}

                ____{
                |test
                ----}

                renderHorizontalEndLineAtTheBottom:
                    {
                    |
                    |x}
                    --
                renderHorizontalEndLineAtTheBottom:
                ____{
                |test
                | x }
                ----
            */
            if (!pair.closingBracketRange) {
                continue;
            }
            const isActive = activeBracketPairRange && pair.range.equalsRange(activeBracketPairRange);
            if (!isActive && !options.includeInactive) {
                continue;
            }
            const className = colorProvider.getInlineClassName(pair.nestingLevel, pair.nestingLevelOfEqualBracketType, independentColorPoolPerBracketType) +
                (options.highlightActive && isActive
                    ? ' ' + colorProvider.activeClassName
                    : '');
            const start = pair.openingBracketRange.getStartPosition();
            const end = pair.closingBracketRange.getStartPosition();
            const horizontalGuides = options.horizontalGuides === HorizontalGuidesState.Enabled || (options.horizontalGuides === HorizontalGuidesState.EnabledForActive && isActive);
            if (pair.range.startLineNumber === pair.range.endLineNumber) {
                if (includeSingleLinePairs && horizontalGuides) {
                    result[pair.range.startLineNumber - startLineNumber].push(new IndentGuide(-1, pair.openingBracketRange.getEndPosition().column, className, new IndentGuideHorizontalLine(false, end.column), -1, -1));
                }
                continue;
            }
            const endVisibleColumn = this.getVisibleColumnFromPosition(end);
            const startVisibleColumn = this.getVisibleColumnFromPosition(pair.openingBracketRange.getStartPosition());
            const guideVisibleColumn = Math.min(startVisibleColumn, endVisibleColumn, pair.minVisibleColumnIndentation + 1);
            let renderHorizontalEndLineAtTheBottom = false;
            const firstNonWsIndex = strings.firstNonWhitespaceIndex(this.textModel.getLineContent(pair.closingBracketRange.startLineNumber));
            const hasTextBeforeClosingBracket = firstNonWsIndex < pair.closingBracketRange.startColumn - 1;
            if (hasTextBeforeClosingBracket) {
                renderHorizontalEndLineAtTheBottom = true;
            }
            const visibleGuideStartLineNumber = Math.max(start.lineNumber, startLineNumber);
            const visibleGuideEndLineNumber = Math.min(end.lineNumber, endLineNumber);
            const offset = renderHorizontalEndLineAtTheBottom ? 1 : 0;
            for (let l = visibleGuideStartLineNumber; l < visibleGuideEndLineNumber + offset; l++) {
                result[l - startLineNumber].push(new IndentGuide(guideVisibleColumn, -1, className, null, l === start.lineNumber ? start.column : -1, l === end.lineNumber ? end.column : -1));
            }
            if (horizontalGuides) {
                if (start.lineNumber >= startLineNumber && startVisibleColumn > guideVisibleColumn) {
                    result[start.lineNumber - startLineNumber].push(new IndentGuide(guideVisibleColumn, -1, className, new IndentGuideHorizontalLine(false, start.column), -1, -1));
                }
                if (end.lineNumber <= endLineNumber && endVisibleColumn > guideVisibleColumn) {
                    result[end.lineNumber - startLineNumber].push(new IndentGuide(guideVisibleColumn, -1, className, new IndentGuideHorizontalLine(!renderHorizontalEndLineAtTheBottom, end.column), -1, -1));
                }
            }
        }
        for (const guides of result) {
            guides.sort((a, b) => a.visibleColumn - b.visibleColumn);
        }
        return result;
    }
    getVisibleColumnFromPosition(position) {
        return (CursorColumns.visibleColumnFromColumn(this.textModel.getLineContent(position.lineNumber), position.column, this.textModel.getOptions().tabSize) + 1);
    }
    getLinesIndentGuides(startLineNumber, endLineNumber) {
        this.assertNotDisposed();
        const lineCount = this.textModel.getLineCount();
        if (startLineNumber < 1 || startLineNumber > lineCount) {
            throw new Error('Illegal value for startLineNumber');
        }
        if (endLineNumber < 1 || endLineNumber > lineCount) {
            throw new Error('Illegal value for endLineNumber');
        }
        const options = this.textModel.getOptions();
        const foldingRules = this.getLanguageConfiguration(this.textModel.getLanguageId()).foldingRules;
        const offSide = Boolean(foldingRules && foldingRules.offSide);
        const result = new Array(endLineNumber - startLineNumber + 1);
        let aboveContentLineIndex = -2; /* -2 is a marker for not having computed it */
        let aboveContentLineIndent = -1;
        let belowContentLineIndex = -2; /* -2 is a marker for not having computed it */
        let belowContentLineIndent = -1;
        for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
            const resultIndex = lineNumber - startLineNumber;
            const currentIndent = this._computeIndentLevel(lineNumber - 1);
            if (currentIndent >= 0) {
                // This line has content (besides whitespace)
                // Use the line's indent
                aboveContentLineIndex = lineNumber - 1;
                aboveContentLineIndent = currentIndent;
                result[resultIndex] = Math.ceil(currentIndent / options.indentSize);
                continue;
            }
            if (aboveContentLineIndex === -2) {
                aboveContentLineIndex = -1;
                aboveContentLineIndent = -1;
                // must find previous line with content
                for (let lineIndex = lineNumber - 2; lineIndex >= 0; lineIndex--) {
                    const indent = this._computeIndentLevel(lineIndex);
                    if (indent >= 0) {
                        aboveContentLineIndex = lineIndex;
                        aboveContentLineIndent = indent;
                        break;
                    }
                }
            }
            if (belowContentLineIndex !== -1 &&
                (belowContentLineIndex === -2 || belowContentLineIndex < lineNumber - 1)) {
                belowContentLineIndex = -1;
                belowContentLineIndent = -1;
                // must find next line with content
                for (let lineIndex = lineNumber; lineIndex < lineCount; lineIndex++) {
                    const indent = this._computeIndentLevel(lineIndex);
                    if (indent >= 0) {
                        belowContentLineIndex = lineIndex;
                        belowContentLineIndent = indent;
                        break;
                    }
                }
            }
            result[resultIndex] = this._getIndentLevelForWhitespaceLine(offSide, aboveContentLineIndent, belowContentLineIndent);
        }
        return result;
    }
    _getIndentLevelForWhitespaceLine(offSide, aboveContentLineIndent, belowContentLineIndent) {
        const options = this.textModel.getOptions();
        if (aboveContentLineIndent === -1 || belowContentLineIndent === -1) {
            // At the top or bottom of the file
            return 0;
        }
        else if (aboveContentLineIndent < belowContentLineIndent) {
            // we are inside the region above
            return 1 + Math.floor(aboveContentLineIndent / options.indentSize);
        }
        else if (aboveContentLineIndent === belowContentLineIndent) {
            // we are in between two regions
            return Math.ceil(belowContentLineIndent / options.indentSize);
        }
        else {
            if (offSide) {
                // same level as region below
                return Math.ceil(belowContentLineIndent / options.indentSize);
            }
            else {
                // we are inside the region that ends below
                return 1 + Math.floor(belowContentLineIndent / options.indentSize);
            }
        }
    }
}
export class BracketPairGuidesClassNames {
    constructor() {
        this.activeClassName = 'indent-active';
    }
    getInlineClassName(nestingLevel, nestingLevelOfEqualBracketType, independentColorPoolPerBracketType) {
        return this.getInlineClassNameOfLevel(independentColorPoolPerBracketType ? nestingLevelOfEqualBracketType : nestingLevel);
    }
    getInlineClassNameOfLevel(level) {
        // To support a dynamic amount of colors up to 6 colors,
        // we use a number that is a lcm of all numbers from 1 to 6.
        return `bracket-indent-guide lvl-${level % 30}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3VpZGVzVGV4dE1vZGVsUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL21vZGVsL2d1aWRlc1RleHRNb2RlbFBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzlELE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUM7QUFDM0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRXpELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUV6QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDbkQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRWhELE9BQU8sRUFBdUIscUJBQXFCLEVBQWdELFdBQVcsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3pLLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRXBFLE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxhQUFhO0lBQ3JELFlBQ2tCLFNBQW9CLEVBQ3BCLDRCQUEyRDtRQUU1RSxLQUFLLEVBQUUsQ0FBQztRQUhTLGNBQVMsR0FBVCxTQUFTLENBQVc7UUFDcEIsaUNBQTRCLEdBQTVCLDRCQUE0QixDQUErQjtJQUc3RSxDQUFDO0lBRU8sd0JBQXdCLENBQy9CLFVBQWtCO1FBRWxCLE9BQU8sSUFBSSxDQUFDLDRCQUE0QixDQUFDLHdCQUF3QixDQUNoRSxVQUFVLENBQ1YsQ0FBQztJQUNILENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxTQUFpQjtRQUM1QyxPQUFPLGtCQUFrQixDQUN4QixJQUFJLENBQUMsU0FBUyxD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