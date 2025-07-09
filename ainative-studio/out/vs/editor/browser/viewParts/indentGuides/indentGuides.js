/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './indentGuides.css';
import { DynamicViewOverlay } from '../../view/dynamicViewOverlay.js';
import { editorBracketHighlightingForeground1, editorBracketHighlightingForeground2, editorBracketHighlightingForeground3, editorBracketHighlightingForeground4, editorBracketHighlightingForeground5, editorBracketHighlightingForeground6, editorBracketPairGuideActiveBackground1, editorBracketPairGuideActiveBackground2, editorBracketPairGuideActiveBackground3, editorBracketPairGuideActiveBackground4, editorBracketPairGuideActiveBackground5, editorBracketPairGuideActiveBackground6, editorBracketPairGuideBackground1, editorBracketPairGuideBackground2, editorBracketPairGuideBackground3, editorBracketPairGuideBackground4, editorBracketPairGuideBackground5, editorBracketPairGuideBackground6, editorIndentGuide1, editorIndentGuide2, editorIndentGuide3, editorIndentGuide4, editorIndentGuide5, editorIndentGuide6, editorActiveIndentGuide1, editorActiveIndentGuide2, editorActiveIndentGuide3, editorActiveIndentGuide4, editorActiveIndentGuide5, editorActiveIndentGuide6 } from '../../../common/core/editorColorRegistry.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { Position } from '../../../common/core/position.js';
import { ArrayQueue } from '../../../../base/common/arrays.js';
import { isDefined } from '../../../../base/common/types.js';
import { BracketPairGuidesClassNames } from '../../../common/model/guidesTextModelPart.js';
import { IndentGuide, HorizontalGuidesState } from '../../../common/textModelGuides.js';
/**
 * Indent guides are vertical lines that help identify the indentation level of
 * the code.
 */
export class IndentGuidesOverlay extends DynamicViewOverlay {
    constructor(context) {
        super();
        this._context = context;
        this._primaryPosition = null;
        const options = this._context.configuration.options;
        const wrappingInfo = options.get(152 /* EditorOption.wrappingInfo */);
        const fontInfo = options.get(52 /* EditorOption.fontInfo */);
        this._spaceWidth = fontInfo.spaceWidth;
        this._maxIndentLeft = wrappingInfo.wrappingColumn === -1 ? -1 : (wrappingInfo.wrappingColumn * fontInfo.typicalHalfwidthCharacterWidth);
        this._bracketPairGuideOptions = options.get(16 /* EditorOption.guides */);
        this._renderResult = null;
        this._context.addEventHandler(this);
    }
    dispose() {
        this._context.removeEventHandler(this);
        this._renderResult = null;
        super.dispose();
    }
    // --- begin event handlers
    onConfigurationChanged(e) {
        const options = this._context.configuration.options;
        const wrappingInfo = options.get(152 /* EditorOption.wrappingInfo */);
        const fontInfo = options.get(52 /* EditorOption.fontInfo */);
        this._spaceWidth = fontInfo.spaceWidth;
        this._maxIndentLeft = wrappingInfo.wrappingColumn === -1 ? -1 : (wrappingInfo.wrappingColumn * fontInfo.typicalHalfwidthCharacterWidth);
        this._bracketPairGuideOptions = options.get(16 /* EditorOption.guides */);
        return true;
    }
    onCursorStateChanged(e) {
        const selection = e.selections[0];
        const newPosition = selection.getPosition();
        if (!this._primaryPosition?.equals(newPosition)) {
            this._primaryPosition = newPosition;
            return true;
        }
        return false;
    }
    onDecorationsChanged(e) {
        // true for inline decorations
        return true;
    }
    onFlushed(e) {
        return true;
    }
    onLinesChanged(e) {
        return true;
    }
    onLinesDeleted(e) {
        return true;
    }
    onLinesInserted(e) {
        return true;
    }
    onScrollChanged(e) {
        return e.scrollTopChanged; // || e.scrollWidthChanged;
    }
    onZonesChanged(e) {
        return true;
    }
    onLanguageConfigurationChanged(e) {
        return true;
    }
    // --- end event handlers
    prepareRender(ctx) {
        if (!this._bracketPairGuideOptions.indentation && this._bracketPairGuideOptions.bracketPairs === false) {
            this._renderResult = null;
            return;
        }
        const visibleStartLineNumber = ctx.visibleRange.startLineNumber;
        const visibleEndLineNumber = ctx.visibleRange.endLineNumber;
        const scrollWidth = ctx.scrollWidth;
        const activeCursorPosition = this._primaryPosition;
        const indents = this.getGuidesByLine(visibleStartLineNumber, Math.min(visibleEndLineNumber + 1, this._context.viewModel.getLineCount()), activeCursorPosition);
        const output = [];
        for (let lineNumber = visibleStartLineNumber; lineNumber <= visibleEndLineNumber; lineNumber++) {
            const lineIndex = lineNumber - visibleStartLineNumber;
            const indent = indents[lineIndex];
            let result = '';
            const leftOffset = ctx.visibleRangeForPosition(new Position(lineNumber, 1))?.left ?? 0;
            for (const guide of indent) {
                const left = guide.column === -1
                    ? leftOffset + (guide.visibleColumn - 1) * this._spaceWidth
                    : ctx.visibleRangeForPosition(new Position(lineNumber, guide.column)).left;
                if (left > scrollWidth || (this._maxIndentLeft > 0 && left > this._maxIndentLeft)) {
                    break;
                }
                const className = guide.horizontalLine ? (guide.horizontalLine.top ? 'horizontal-top' : 'horizontal-bottom') : 'vertical';
                const width = guide.horizontalLine
                    ? (ctx.visibleRangeForPosition(new Position(lineNumber, guide.horizontalLine.endColumn))?.left ?? (left + this._spaceWidth)) - left
                    : this._spaceWidth;
                result += `<div class="core-guide ${guide.className} ${className}" style="left:${left}px;width:${width}px"></div>`;
            }
            output[lineIndex] = result;
        }
        this._renderResult = output;
    }
    getGuidesByLine(visibleStartLineNumber, visibleEndLineNumber, activeCursorPosition) {
        const bracketGuides = this._bracketPairGuideOptions.bracketPairs !== false
            ? this._context.viewModel.getBracketGuidesInRangeByLine(visibleStartLineNumber, visibleEndLineNumber, activeCursorPosition, {
                highlightActive: this._bracketPairGuideOptions.highlightActiveBracketPair,
                horizontalGuides: this._bracketPairGuideOptions.bracketPairsHorizontal === true
                    ? HorizontalGuidesState.Enabled
                    : this._bracketPairGuideOptions.bracketPairsHorizontal === 'active'
                        ? HorizontalGuidesState.EnabledForActive
                        : HorizontalGuidesState.Disabled,
                includeInactive: this._bracketPairGuideOptions.bracketPairs === true,
            })
            : null;
        const indentGuides = this._bracketPairGuideOptions.indentation
            ? this._context.viewModel.getLinesIndentGuides(visibleStartLineNumber, visibleEndLineNumber)
            : null;
        let activeIndentStartLineNumber = 0;
        let activeIndentEndLineNumber = 0;
        let activeIndentLevel = 0;
        if (this._bracketPairGuideOptions.highlightActiveIndentation !== false && activeCursorPosition) {
            const activeIndentInfo = this._context.viewModel.getActiveIndentGuide(activeCursorPosition.lineNumber, visibleStartLineNumber, visibleEndLineNumber);
            activeIndentStartLineNumber = activeIndentInfo.startLineNumber;
            activeIndentEndLineNumber = activeIndentInfo.endLineNumber;
            activeIndentLevel = activeIndentInfo.indent;
        }
        const { indentSize } = this._context.viewModel.model.getOptions();
        const result = [];
        for (let lineNumber = visibleStartLineNumber; lineNumber <= visibleEndLineNumber; lineNumber++) {
            const lineGuides = new Array();
            result.push(lineGuides);
            const bracketGuidesInLine = bracketGuides ? bracketGuides[lineNumber - visibleStartLineNumber] : [];
            const bracketGuidesInLineQueue = new ArrayQueue(bracketGuidesInLine);
            const indentGuidesInLine = indentGuides ? indentGuides[lineNumber - visibleStartLineNumber] : 0;
            for (let indentLvl = 1; indentLvl <= indentGuidesInLine; indentLvl++) {
                const indentGuide = (indentLvl - 1) * indentSize + 1;
                const isActive = 
                // Disable active indent guide if there are bracket guides.
                (this._bracketPairGuideOptions.highlightActiveIndentation === 'always' || bracketGuidesInLine.length === 0) &&
                    activeIndentStartLineNumber <= lineNumber &&
                    lineNumber <= activeIndentEndLineNumber &&
                    indentLvl === activeIndentLevel;
                lineGuides.push(...bracketGuidesInLineQueue.takeWhile(g => g.visibleColumn < indentGuide) || []);
                const peeked = bracketGuidesInLineQueue.peek();
                if (!peeked || peeked.visibleColumn !== indentGuide || peeked.horizontalLine) {
                    lineGuides.push(new IndentGuide(indentGuide, -1, `core-guide-indent lvl-${(indentLvl - 1) % 30}` + (isActive ? ' indent-active' : ''), null, -1, -1));
                }
            }
            lineGuides.push(...bracketGuidesInLineQueue.takeWhile(g => true) || []);
        }
        return result;
    }
    render(startLineNumber, lineNumber) {
        if (!this._renderResult) {
            return '';
        }
        const lineIndex = lineNumber - startLineNumber;
        if (lineIndex < 0 || lineIndex >= this._renderResult.length) {
            return '';
        }
        return this._renderResult[lineIndex];
    }
}
function transparentToUndefined(color) {
    if (color && color.isTransparent()) {
        return undefined;
    }
    return color;
}
registerThemingParticipant((theme, collector) => {
    const colors = [
        { bracketColor: editorBracketHighlightingForeground1, guideColor: editorBracketPairGuideBackground1, guideColorActive: editorBracketPairGuideActiveBackground1 },
        { bracketColor: editorBracketHighlightingForeground2, guideColor: editorBracketPairGuideBackground2, guideColorActive: editorBracketPairGuideActiveBackground2 },
        { bracketColor: editorBracketHighlightingForeground3, guideColor: editorBracketPairGuideBackground3, guideColorActive: editorBracketPairGuideActiveBackground3 },
        { bracketColor: editorBracketHighlightingForeground4, guideColor: editorBracketPairGuideBackground4, guideColorActive: editorBracketPairGuideActiveBackground4 },
        { bracketColor: editorBracketHighlightingForeground5, guideColor: editorBracketPairGuideBackground5, guideColorActive: editorBracketPairGuideActiveBackground5 },
        { bracketColor: editorBracketHighlightingForeground6, guideColor: editorBracketPairGuideBackground6, guideColorActive: editorBracketPairGuideActiveBackground6 }
    ];
    const colorProvider = new BracketPairGuidesClassNames();
    const indentColors = [
        { indentColor: editorIndentGuide1, indentColorActive: editorActiveIndentGuide1 },
        { indentColor: editorIndentGuide2, indentColorActive: editorActiveIndentGuide2 },
        { indentColor: editorIndentGuide3, indentColorActive: editorActiveIndentGuide3 },
        { indentColor: editorIndentGuide4, indentColorActive: editorActiveIndentGuide4 },
        { indentColor: editorIndentGuide5, indentColorActive: editorActiveIndentGuide5 },
        { indentColor: editorIndentGuide6, indentColorActive: editorActiveIndentGuide6 },
    ];
    const colorValues = colors
        .map(c => {
        const bracketColor = theme.getColor(c.bracketColor);
        const guideColor = theme.getColor(c.guideColor);
        const guideColorActive = theme.getColor(c.guideColorActive);
        const effectiveGuideColor = transparentToUndefined(transparentToUndefined(guideColor) ?? bracketColor?.transparent(0.3));
        const effectiveGuideColorActive = transparentToUndefined(transparentToUndefined(guideColorActive) ?? bracketColor);
        if (!effectiveGuideColor || !effectiveGuideColorActive) {
            return undefined;
        }
        return {
            guideColor: effectiveGuideColor,
            guideColorActive: effectiveGuideColorActive,
        };
    })
        .filter(isDefined);
    const indentColorValues = indentColors
        .map(c => {
        const indentColor = theme.getColor(c.indentColor);
        const indentColorActive = theme.getColor(c.indentColorActive);
        const effectiveIndentColor = transparentToUndefined(indentColor);
        const effectiveIndentColorActive = transparentToUndefined(indentColorActive);
        if (!effectiveIndentColor || !effectiveIndentColorActive) {
            return undefined;
        }
        return {
            indentColor: effectiveIndentColor,
            indentColorActive: effectiveIndentColorActive,
        };
    })
        .filter(isDefined);
    if (colorValues.length > 0) {
        for (let level = 0; level < 30; level++) {
            const colors = colorValues[level % colorValues.length];
            collector.addRule(`.monaco-editor .${colorProvider.getInlineClassNameOfLevel(level).replace(/ /g, '.')} { --guide-color: ${colors.guideColor}; --guide-color-active: ${colors.guideColorActive}; }`);
        }
        collector.addRule(`.monaco-editor .vertical { box-shadow: 1px 0 0 0 var(--guide-color) inset; }`);
        collector.addRule(`.monaco-editor .horizontal-top { border-top: 1px solid var(--guide-color); }`);
        collector.addRule(`.monaco-editor .horizontal-bottom { border-bottom: 1px solid var(--guide-color); }`);
        collector.addRule(`.monaco-editor .vertical.${colorProvider.activeClassName} { box-shadow: 1px 0 0 0 var(--guide-color-active) inset; }`);
        collector.addRule(`.monaco-editor .horizontal-top.${colorProvider.activeClassName} { border-top: 1px solid var(--guide-color-active); }`);
        collector.addRule(`.monaco-editor .horizontal-bottom.${colorProvider.activeClassName} { border-bottom: 1px solid var(--guide-color-active); }`);
    }
    if (indentColorValues.length > 0) {
        for (let level = 0; level < 30; level++) {
            const colors = indentColorValues[level % indentColorValues.length];
            collector.addRule(`.monaco-editor .lines-content .core-guide-indent.lvl-${level} { --indent-color: ${colors.indentColor}; --indent-color-active: ${colors.indentColorActive}; }`);
        }
        collector.addRule(`.monaco-editor .lines-content .core-guide-indent { box-shadow: 1px 0 0 0 var(--indent-color) inset; }`);
        collector.addRule(`.monaco-editor .lines-content .core-guide-indent.indent-active { box-shadow: 1px 0 0 0 var(--indent-color-active) inset; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZW50R3VpZGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3ZpZXdQYXJ0cy9pbmRlbnRHdWlkZXMvaW5kZW50R3VpZGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sb0JBQW9CLENBQUM7QUFDNUIsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDdEUsT0FBTyxFQUFFLG9DQUFvQyxFQUFFLG9DQUFvQyxFQUFFLG9DQUFvQyxFQUFFLG9DQUFvQyxFQUFFLG9DQUFvQyxFQUFFLG9DQUFvQyxFQUFFLHVDQUF1QyxFQUFFLHVDQUF1QyxFQUFFLHVDQUF1QyxFQUFFLHVDQUF1QyxFQUFFLHVDQUF1QyxFQUFFLHVDQUF1QyxFQUFFLGlDQUFpQyxFQUFFLGlDQUFpQyxFQUFFLGlDQUFpQyxFQUFFLGlDQUFpQyxFQUFFLGlDQUFpQyxFQUFFLGlDQUFpQyxFQUFFLGtCQUFrQixFQUFFLGtCQUFrQixFQUFFLGtCQUFrQixFQUFFLGtCQUFrQixFQUFFLGtCQUFrQixFQUFFLGtCQUFrQixFQUFFLHdCQUF3QixFQUFFLHdCQUF3QixFQUFFLHdCQUF3QixFQUFFLHdCQUF3QixFQUFFLHdCQUF3QixFQUFFLHdCQUF3QixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFJNy9CLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRS9GLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFL0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzdELE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDhDQUE4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