/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createTrustedTypesPolicy } from '../../../../../../base/browser/trustedTypes.js';
import { applyFontInfo } from '../../../../config/domFontInfo.js';
import { EditorFontLigatures } from '../../../../../common/config/editorOptions.js';
import { StringBuilder } from '../../../../../common/core/stringBuilder.js';
import { LineDecoration } from '../../../../../common/viewLayout/lineDecorations.js';
import { RenderLineInput, renderViewLine } from '../../../../../common/viewLayout/viewLineRenderer.js';
import { ViewLineRenderingData } from '../../../../../common/viewModel.js';
const ttPolicy = createTrustedTypesPolicy('diffEditorWidget', { createHTML: value => value });
export function renderLines(source, options, decorations, domNode, noExtra = false) {
    applyFontInfo(domNode, options.fontInfo);
    const hasCharChanges = (decorations.length > 0);
    const sb = new StringBuilder(10000);
    let maxCharsPerLine = 0;
    let renderedLineCount = 0;
    const viewLineCounts = [];
    for (let lineIndex = 0; lineIndex < source.lineTokens.length; lineIndex++) {
        const lineNumber = lineIndex + 1;
        const lineTokens = source.lineTokens[lineIndex];
        const lineBreakData = source.lineBreakData[lineIndex];
        const actualDecorations = LineDecoration.filter(decorations, lineNumber, 1, Number.MAX_SAFE_INTEGER);
        if (lineBreakData) {
            let lastBreakOffset = 0;
            for (const breakOffset of lineBreakData.breakOffsets) {
                const viewLineTokens = lineTokens.sliceAndInflate(lastBreakOffset, breakOffset, 0);
                maxCharsPerLine = Math.max(maxCharsPerLine, renderOriginalLine(renderedLineCount, viewLineTokens, LineDecoration.extractWrapped(actualDecorations, lastBreakOffset, breakOffset), hasCharChanges, source.mightContainNonBasicASCII, source.mightContainRTL, options, sb, noExtra));
                renderedLineCount++;
                lastBreakOffset = breakOffset;
            }
            viewLineCounts.push(lineBreakData.breakOffsets.length);
        }
        else {
            viewLineCounts.push(1);
            maxCharsPerLine = Math.max(maxCharsPerLine, renderOriginalLine(renderedLineCount, lineTokens, actualDecorations, hasCharChanges, source.mightContainNonBasicASCII, source.mightContainRTL, options, sb, noExtra));
            renderedLineCount++;
        }
    }
    maxCharsPerLine += options.scrollBeyondLastColumn;
    const html = sb.build();
    const trustedhtml = ttPolicy ? ttPolicy.createHTML(html) : html;
    domNode.innerHTML = trustedhtml;
    const minWidthInPx = (maxCharsPerLine * options.typicalHalfwidthCharacterWidth);
    return {
        heightInLines: renderedLineCount,
        minWidthInPx,
        viewLineCounts,
    };
}
export class LineSource {
    constructor(lineTokens, lineBreakData = lineTokens.map(t => null), mightContainNonBasicASCII = true, mightContainRTL = true) {
        this.lineTokens = lineTokens;
        this.lineBreakData = lineBreakData;
        this.mightContainNonBasicASCII = mightContainNonBasicASCII;
        this.mightContainRTL = mightContainRTL;
    }
}
export class RenderOptions {
    static fromEditor(editor) {
        const modifiedEditorOptions = editor.getOptions();
        const fontInfo = modifiedEditorOptions.get(52 /* EditorOption.fontInfo */);
        const layoutInfo = modifiedEditorOptions.get(151 /* EditorOption.layoutInfo */);
        return new RenderOptions(editor.getModel()?.getOptions().tabSize || 0, fontInfo, modifiedEditorOptions.get(33 /* EditorOption.disableMonospaceOptimizations */), fontInfo.typicalHalfwidthCharacterWidth, modifiedEditorOptions.get(109 /* EditorOption.scrollBeyondLastColumn */), modifiedEditorOptions.get(68 /* EditorOption.lineHeight */), layoutInfo.decorationsWidth, modifiedEditorOptions.get(122 /* EditorOption.stopRenderingLineAfter */), modifiedEditorOptions.get(104 /* EditorOption.renderWhitespace */), modifiedEditorOptions.get(99 /* EditorOption.renderControlCharacters */), modifiedEditorOptions.get(53 /* EditorOption.fontLigatures */));
    }
    constructor(tabSize, fontInfo, disableMonospaceOptimizations, typicalHalfwidthCharacterWidth, scrollBeyondLastColumn, lineHeight, lineDecorationsWidth, stopRenderingLineAfter, renderWhitespace, renderControlCharacters, fontLigatures, setWidth = true) {
        this.tabSize = tabSize;
        this.fontInfo = fontInfo;
        this.disableMonospaceOptimizations = disableMonospaceOptimizations;
        this.typicalHalfwidthCharacterWidth = typicalHalfwidthCharacterWidth;
        this.scrollBeyondLastColumn = scrollBeyondLastColumn;
        this.lineHeight = lineHeight;
        this.lineDecorationsWidth = lineDecorationsWidth;
        this.stopRenderingLineAfter = stopRenderingLineAfter;
        this.renderWhitespace = renderWhitespace;
        this.renderControlCharacters = renderControlCharacters;
        this.fontLigatures = fontLigatures;
        this.setWidth = setWidth;
    }
    withSetWidth(setWidth) {
        return new RenderOptions(this.tabSize, this.fontInfo, this.disableMonospaceOptimizations, this.typicalHalfwidthCharacterWidth, this.scrollBeyondLastColumn, this.lineHeight, this.lineDecorationsWidth, this.stopRenderingLineAfter, this.renderWhitespace, this.renderControlCharacters, this.fontLigatures, setWidth);
    }
    withScrollBeyondLastColumn(scrollBeyondLastColumn) {
        return new RenderOptions(this.tabSize, this.fontInfo, this.disableMonospaceOptimizations, this.typicalHalfwidthCharacterWidth, scrollBeyondLastColumn, this.lineHeight, this.lineDecorationsWidth, this.stopRenderingLineAfter, this.renderWhitespace, this.renderControlCharacters, this.fontLigatures, this.setWidth);
    }
}
function renderOriginalLine(viewLineIdx, lineTokens, decorations, hasCharChanges, mightContainNonBasicASCII, mightContainRTL, options, sb, noExtra) {
    sb.appendString('<div class="view-line');
    if (!noExtra && !hasCharChanges) {
        // No char changes
        sb.appendString(' char-delete');
    }
    sb.appendString('" style="top:');
    sb.appendString(String(viewLineIdx * options.lineHeight));
    if (options.setWidth) {
        sb.appendString('px;width:1000000px;">');
    }
    else {
        sb.appendString('px;">');
    }
    const lineContent = lineTokens.getLineContent();
    const isBasicASCII = ViewLineRenderingData.isBasicASCII(lineContent, mightContainNonBasicASCII);
    const containsRTL = ViewLineRenderingData.containsRTL(lineContent, isBasicASCII, mightContainRTL);
    const output = renderViewLine(new RenderLineInput((options.fontInfo.isMonospace && !options.disableMonospaceOptimizations), options.fontInfo.canUseHalfwidthRightwardsArrow, lineContent, false, isBasicASCII, containsRTL, 0, lineTokens, decorations, options.tabSize, 0, options.fontInfo.spaceWidth, options.fontInfo.middotWidth, options.fontInfo.wsmiddotWidth, options.stopRenderingLineAfter, options.renderWhitespace, options.renderControlCharacters, options.fontLigatures !== EditorFontLigatures.OFF, null // Send no selections, original line cannot be selected
    ), sb);
    sb.appendString('</div>');
    return output.characterMapping.getHorizontalOffset(output.characterMapping.length);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyTGluZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvd2lkZ2V0L2RpZmZFZGl0b3IvY29tcG9uZW50cy9kaWZmRWRpdG9yVmlld1pvbmVzL3JlbmRlckxpbmVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUVsRSxPQUFPLEVBQUUsbUJBQW1CLEVBQW1ELE1BQU0sK0NBQStDLENBQUM7QUFFckksT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRzVFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNyRixPQUFPLEVBQUUsZUFBZSxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3ZHLE9BQU8sRUFBb0IscUJBQXFCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUU3RixNQUFNLFFBQVEsR0FBRyx3QkFBd0IsQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLFVBQVUsRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7QUFFOUYsTUFBTSxVQUFVLFdBQVcsQ0FBQyxNQUFrQixFQUFFLE9BQXNCLEVBQUUsV0FBK0IsRUFBRSxPQUFvQixFQUFFLE9BQU8sR0FBRyxLQUFLO0lBQzdJLGFBQWEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBRXpDLE1BQU0sY0FBYyxHQUFHLENBQUMsV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztJQUVoRCxNQUFNLEVBQUUsR0FBRyxJQUFJLGFBQWEsQ0FB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