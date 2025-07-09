/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../common/core/range.js';
import * as nls from '../../../../nls.js';
export class PagedScreenReaderStrategy {
    static _getPageOfLine(lineNumber, linesPerPage) {
        return Math.floor((lineNumber - 1) / linesPerPage);
    }
    static _getRangeForPage(page, linesPerPage) {
        const offset = page * linesPerPage;
        const startLineNumber = offset + 1;
        const endLineNumber = offset + linesPerPage;
        return new Range(startLineNumber, 1, endLineNumber + 1, 1);
    }
    static fromEditorSelection(model, selection, linesPerPage, trimLongText) {
        // Chromium handles very poorly text even of a few thousand chars
        // Cut text to avoid stalling the entire UI
        const LIMIT_CHARS = 500;
        const selectionStartPage = PagedScreenReaderStrategy._getPageOfLine(selection.startLineNumber, linesPerPage);
        const selectionStartPageRange = PagedScreenReaderStrategy._getRangeForPage(selectionStartPage, linesPerPage);
        const selectionEndPage = PagedScreenReaderStrategy._getPageOfLine(selection.endLineNumber, linesPerPage);
        const selectionEndPageRange = PagedScreenReaderStrategy._getRangeForPage(selectionEndPage, linesPerPage);
        let pretextRange = selectionStartPageRange.intersectRanges(new Range(1, 1, selection.startLineNumber, selection.startColumn));
        if (trimLongText && model.getValueLengthInRange(pretextRange, 1 /* EndOfLinePreference.LF */) > LIMIT_CHARS) {
            const pretextStart = model.modifyPosition(pretextRange.getEndPosition(), -LIMIT_CHARS);
            pretextRange = Range.fromPositions(pretextStart, pretextRange.getEndPosition());
        }
        const pretext = model.getValueInRange(pretextRange, 1 /* EndOfLinePreference.LF */);
        const lastLine = model.getLineCount();
        const lastLineMaxColumn = model.getLineMaxColumn(lastLine);
        let posttextRange = selectionEndPageRange.intersectRanges(new Range(selection.endLineNumber, selection.endColumn, lastLine, lastLineMaxColumn));
        if (trimLongText && model.getValueLengthInRange(posttextRange, 1 /* EndOfLinePreference.LF */) > LIMIT_CHARS) {
            const posttextEnd = model.modifyPosition(posttextRange.getStartPosition(), LIMIT_CHARS);
            posttextRange = Range.fromPositions(posttextRange.getStartPosition(), posttextEnd);
        }
        const posttext = model.getValueInRange(posttextRange, 1 /* EndOfLinePreference.LF */);
        let text;
        if (selectionStartPage === selectionEndPage || selectionStartPage + 1 === selectionEndPage) {
            // take full selection
            text = model.getValueInRange(selection, 1 /* EndOfLinePreference.LF */);
        }
        else {
            const selectionRange1 = selectionStartPageRange.intersectRanges(selection);
            const selectionRange2 = selectionEndPageRange.intersectRanges(selection);
            text = (model.getValueInRange(selectionRange1, 1 /* EndOfLinePreference.LF */)
                + String.fromCharCode(8230)
                + model.getValueInRange(selectionRange2, 1 /* EndOfLinePreference.LF */));
        }
        if (trimLongText && text.length > 2 * LIMIT_CHARS) {
            text = text.substring(0, LIMIT_CHARS) + String.fromCharCode(8230) + text.substring(text.length - LIMIT_CHARS, text.length);
        }
        return {
            value: pretext + text + posttext,
            selection: selection,
            selectionStart: pretext.length,
            selectionEnd: pretext.length + text.length,
            startPositionWithinEditor: pretextRange.getStartPosition(),
            newlineCountBeforeSelection: pretextRange.endLineNumber - pretextRange.startLineNumber,
        };
    }
}
export function ariaLabelForScreenReaderContent(options, keybindingService) {
    const accessibilitySupport = options.get(2 /* EditorOption.accessibilitySupport */);
    if (accessibilitySupport === 1 /* AccessibilitySupport.Disabled */) {
        const toggleKeybindingLabel = keybindingService.lookupKeybinding('editor.action.toggleScreenReaderAccessibilityMode')?.getAriaLabel();
        const runCommandKeybindingLabel = keybindingService.lookupKeybinding('workbench.action.showCommands')?.getAriaLabel();
        const keybindingEditorKeybindingLabel = keybindingService.lookupKeybinding('workbench.action.openGlobalKeybindings')?.getAriaLabel();
        const editorNotAccessibleMessage = nls.localize('accessibilityModeOff', "The editor is not accessible at this time.");
        if (toggleKeybindingLabel) {
            return nls.localize('accessibilityOffAriaLabel', "{0} To enable screen reader optimized mode, use {1}", editorNotAccessibleMessage, toggleKeybindingLabel);
        }
        else if (runCommandKeybindingLabel) {
            return nls.localize('accessibilityOffAriaLabelNoKb', "{0} To enable screen reader optimized mode, open the quick pick with {1} and run the command Toggle Screen Reader Accessibility Mode, which is currently not triggerable via keyboard.", editorNotAccessibleMessage, runCommandKeybindingLabel);
        }
        else if (keybindingEditorKeybindingLabel) {
            return nls.localize('accessibilityOffAriaLabelNoKbs', "{0} Please assign a keybinding for the command Toggle Screen Reader Accessibility Mode by accessing the keybindings editor with {1} and run it.", editorNotAccessibleMessage, keybindingEditorKeybindingLabel);
        }
        else {
            // SOS
            return editorNotAccessibleMessage;
        }
    }
    return options.get(4 /* EditorOption.ariaLabel */);
}
export function newlinecount(text) {
    let result = 0;
    let startIndex = -1;
    do {
        startIndex = text.indexOf('\n', startIndex + 1);
        if (startIndex === -1) {
            break;
        }
        result++;
    } while (true);
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyZWVuUmVhZGVyVXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvY29udHJvbGxlci9lZGl0Q29udGV4dC9zY3JlZW5SZWFkZXJVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFJdEQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQTZCMUMsTUFBTSxPQUFPLHlCQUF5QjtJQUM3QixNQUFNLENBQUMsY0FBYyxDQUFDLFVBQWtCLEVBQUUsWUFBb0I7UUFDckUsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxHQUFHLFlBQVksQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFFTyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsSUFBWSxFQUFFLFlBQW9CO1FBQ2pFLE1BQU0sTUFBTSxHQUFHLElBQUksR0FBRyxZQUFZLENBQUM7UUFDbkMsTUFBTSxlQUFlLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQztRQUNuQyxNQUFNLGFBQWEsR0FBRyxNQUFNLEdBQUcsWUFBWSxDQUFDO1FBQzVDLE9BQU8sSUFBSSxLQUFLLENBQUMsZUFBZSxFQUFFLENBQUMsRUFBRSxhQUFhLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzVELENBQUM7SUFFTSxNQUFNLENBQUMsbUJBQW1CLENBQUMsS0FBbUIsRUFBRSxTQUFnQixFQUFFLFlBQW9CLEVBQUUsWUFBcUI7UUFDbkgsaUVBQWlFO1FBQ2pFLDJDQUEyQztRQUMzQyxNQUFNLFdBQVcsR0FBRyxHQUFHLENBQUM7UUFFeEIsTUFBTSxrQkFBa0IsR0FBRyx5QkFBeUIsQ0FBQyxjQUFjLENBQUMsU0FB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