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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyTGluZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci93aWRnZXQvZGlmZkVkaXRvci9jb21wb25lbnRzL2RpZmZFZGl0b3JWaWV3Wm9uZXMvcmVuZGVyTGluZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDMUYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxtQkFBbUIsRUFBbUQsTUFBTSwrQ0FBK0MsQ0FBQztBQUVySSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFHNUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxlQUFlLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdkcsT0FBTyxFQUFvQixxQkFBcUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTdGLE1BQU0sUUFBUSxHQUFHLHdCQUF3QixDQUFDLGtCQUFrQixFQUFFLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztBQUU5RixNQUFNLFVBQVUsV0FBVyxDQUFDLE1BQWtCLEVBQUUsT0FBc0IsRUFBRSxXQUErQixFQUFFLE9BQW9CLEVBQUUsT0FBTyxHQUFHLEtBQUs7SUFDN0ksYUFBYSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7SUFFekMsTUFBTSxjQUFjLEdBQUcsQ0FBQyxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBRWhELE1BQU0sRUFBRSxHQUFHLElBQUksYUFBYSxDQUFD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