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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3VpZGVzVGV4dE1vZGVsUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC9ndWlkZXNUZXh0TW9kZWxQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RCxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUV6RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFFekMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ25ELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUVoRCxPQUFPLEVBQXVCLHFCQUFxQixFQUFnRCxXQUFXLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUN6SyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVwRSxNQUFNLE9BQU8sbUJBQW9CLFNBQVEsYUFBYTtJQUNyRCxZQUNrQixTQUFvQixFQUNwQiw0QkFBMkQ7UUFFNUUsS0FBSyxFQUFFLENBQUM7UUFIUyxjQUFTLEdBQVQsU0FBUyxDQUFXO1FBQ3BCLGlDQUE0QixHQUE1Qiw0QkFBNEIsQ0FBK0I7SUFHN0UsQ0FBQztJQUVPLHdCQUF3QixDQUMvQixVQUFrQjtRQUVsQixPQUFPLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyx3QkFBd0IsQ0FDaEUsVUFBVSxDQUNWLENBQUM7SUFDSCxDQUFDO0lBRU8sbUJBQW1CLENBQUMsU0FBaUI7UUFDNUMsT0FBTyxrQkFBa0IsQ0FDeEIsSUFBSSxDQUFDLFNB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