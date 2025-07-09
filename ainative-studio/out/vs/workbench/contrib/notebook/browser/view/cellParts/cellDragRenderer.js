/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as DOM from '../../../../../../base/browser/dom.js';
import { createTrustedTypesPolicy } from '../../../../../../base/browser/trustedTypes.js';
import { Color } from '../../../../../../base/common/color.js';
import * as platform from '../../../../../../base/common/platform.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import * as languages from '../../../../../../editor/common/languages.js';
import { tokenizeLineToHTML } from '../../../../../../editor/common/languages/textToHtmlTokenizer.js';
class EditorTextRenderer {
    static { this._ttPolicy = createTrustedTypesPolicy('cellRendererEditorText', {
        createHTML(input) { return input; }
    }); }
    getRichText(editor, modelRange) {
        const model = editor.getModel();
        if (!model) {
            return null;
        }
        const colorMap = this.getDefaultColorMap();
        const fontInfo = editor.getOptions().get(52 /* EditorOption.fontInfo */);
        const fontFamilyVar = '--notebook-editor-font-family';
        const fontSizeVar = '--notebook-editor-font-size';
        const fontWeightVar = '--notebook-editor-font-weight';
        const style = ``
            + `color: ${colorMap[1 /* ColorId.DefaultForeground */]};`
            + `background-color: ${colorMap[2 /* ColorId.DefaultBackground */]};`
            + `font-family: var(${fontFamilyVar});`
            + `font-weight: var(${fontWeightVar});`
            + `font-size: var(${fontSizeVar});`
            + `line-height: ${fontInfo.lineHeight}px;`
            + `white-space: pre;`;
        const element = DOM.$('div', { style });
        const fontSize = fontInfo.fontSize;
        const fontWeight = fontInfo.fontWeight;
        element.style.setProperty(fontFamilyVar, fontInfo.fontFamily);
        element.style.setProperty(fontSizeVar, `${fontSize}px`);
        element.style.setProperty(fontWeightVar, fontWeight);
        const linesHtml = this.getRichTextLinesAsHtml(model, modelRange, colorMap);
        element.innerHTML = linesHtml;
        return element;
    }
    getRichTextLinesAsHtml(model, modelRange, colorMap) {
        const startLineNumber = modelRange.startLineNumber;
        const startColumn = modelRange.startColumn;
        const endLineNumber = modelRange.endLineNumber;
        const endColumn = modelRange.endColumn;
        const tabSize = model.getOptions().tabSize;
        let result = '';
        for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
            const lineTokens = model.tokenization.getLineTokens(lineNumber);
            const lineContent = lineTokens.getLineContent();
            const startOffset = (lineNumber === startLineNumber ? startColumn - 1 : 0);
            const endOffset = (lineNumber === endLineNumber ? endColumn - 1 : lineContent.length);
            if (lineContent === '') {
                result += '<br>';
            }
            else {
                result += tokenizeLineToHTML(lineContent, lineTokens.inflate(), colorMap, startOffset, endOffset, tabSize, platform.isWindows);
            }
        }
        return EditorTextRenderer._ttPolicy?.createHTML(result) ?? result;
    }
    getDefaultColorMap() {
        const colorMap = languages.TokenizationRegistry.getColorMap();
        const result = ['#000000'];
        if (colorMap) {
            for (let i = 1, len = colorMap.length; i < len; i++) {
                result[i] = Color.Format.CSS.formatHex(colorMap[i]);
            }
        }
        return result;
    }
}
export class CodeCellDragImageRenderer {
    getDragImage(templateData, editor, type) {
        let dragImage = this.getDragImageImpl(templateData, editor, type);
        if (!dragImage) {
            // TODO@roblourens I don't think this can happen
            dragImage = document.createElement('div');
            dragImage.textContent = '1 cell';
        }
        return dragImage;
    }
    getDragImageImpl(templateData, editor, type) {
        const dragImageContainer = templateData.container.cloneNode(true);
        dragImageContainer.classList.forEach(c => dragImageContainer.classList.remove(c));
        dragImageContainer.classList.add('cell-drag-image', 'monaco-list-row', 'focused', `${type}-cell-row`);
        const editorContainer = dragImageContainer.querySelector('.cell-editor-container');
        if (!editorContainer) {
            return null;
        }
        const richEditorText = new EditorTextRenderer().getRichText(editor, new Range(1, 1, 1, 1000));
        if (!richEditorText) {
            return null;
        }
        DOM.reset(editorContainer, richEditorText);
        return dragImageContainer;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbERyYWdSZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXcvY2VsbFBhcnRzL2NlbGxEcmFnUmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1Q0FBdUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDL0QsT0FBTyxLQUFLLFFBQVEsTUFBTSwyQ0FBMkMsQ0FBQztBQUd0RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFFdEUsT0FBTyxLQUFLLFNBQVMsTUFBTSw4Q0FBOEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUl0RyxNQUFNLGtCQUFrQjthQUVSLGNBQVMsR0FBRyx3QkFBd0IsQ0FBQyx3QkFBd0IsRUFBRTtRQUM3RSxVQUFVLENBQUMsS0FBSyxJQUFJLE9BQU8sS0FBSyxDQUFDLENBQUMsQ0FBQztLQUNuQyxDQUFDLENBQUM7SUFFSCxXQUFXLENBQUMsTUFBbUIsRUFBRSxVQUFpQjtRQUNqRCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDaEMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7UUFDM0MsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDLEdBQUcsZ0NB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