/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { coalesce } from '../../../../base/common/arrays.js';
import { AsyncIterableObject } from '../../../../base/common/async.js';
export class ContentHoverComputer {
    constructor(_editor, _participants) {
        this._editor = _editor;
        this._participants = _participants;
    }
    static _getLineDecorations(editor, anchor) {
        if (anchor.type !== 1 /* HoverAnchorType.Range */ && !anchor.supportsMarkerHover) {
            return [];
        }
        const model = editor.getModel();
        const lineNumber = anchor.range.startLineNumber;
        if (lineNumber > model.getLineCount()) {
            // invalid line
            return [];
        }
        const maxColumn = model.getLineMaxColumn(lineNumber);
        return editor.getLineDecorations(lineNumber).filter((d) => {
            if (d.options.isWholeLine) {
                return true;
            }
            const startColumn = (d.range.startLineNumber === lineNumber) ? d.range.startColumn : 1;
            const endColumn = (d.range.endLineNumber === lineNumber) ? d.range.endColumn : maxColumn;
            if (d.options.showIfCollapsed) {
                // Relax check around `showIfCollapsed` decorations to also include +/- 1 character
                if (startColumn > anchor.range.startColumn + 1 || anchor.range.endColumn - 1 > endColumn) {
                    return false;
                }
            }
            else {
                if (startColumn > anchor.range.startColumn || anchor.range.endColumn > endColumn) {
                    return false;
                }
            }
            return true;
        });
    }
    computeAsync(options, token) {
        const anchor = options.anchor;
        if (!this._editor.hasModel() || !anchor) {
            return AsyncIterableObject.EMPTY;
        }
        const lineDecorations = ContentHoverComputer._getLineDecorations(this._editor, anchor);
        return AsyncIterableObject.merge(this._participants.map((participant) => {
            if (!participant.computeAsync) {
                return AsyncIterableObject.EMPTY;
            }
            return participant.computeAsync(anchor, lineDecorations, options.source, token);
        }));
    }
    computeSync(options) {
        if (!this._editor.hasModel()) {
            return [];
        }
        const anchor = options.anchor;
        const lineDecorations = ContentHoverComputer._getLineDecorations(this._editor, anchor);
        let result = [];
        for (const participant of this._participants) {
            result = result.concat(participant.computeSync(anchor, lineDecorations, options.source));
        }
        return coalesce(result);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudEhvdmVyQ29tcHV0ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaG92ZXIvYnJvd3Nlci9jb250ZW50SG92ZXJDb21wdXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFNN0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFTdkUsTUFBTSxPQUFPLG9CQUFvQjtJQUVoQyxZQUNrQixPQUFvQixFQUNwQixhQUFpRDtRQURqRCxZQUFPLEdBQVAsT0FBTyxDQUFhO1FBQ3BCLGtCQUFhLEdBQWIsYUFBYSxDQUFvQztJQUVuRSxDQUFDO0lBRU8sTUFBTSxDQUFDLG1CQUFtQixDQUFDLE1BQXlCLEVBQUUsTUFBbUI7UUFDaEYsSUFBSSxNQUFNLENBQUMsSUFBSSxrQ0FBMEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQzFFLE9BQU8sRUFBRSxDQUFDO1FBQ1gsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNoQyxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQztRQUVoRCxJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQztZQUN2QyxlQUFlO1lBQ2YsT0FBTyxFQUFFLENBQUM7UUFDWCxDQUFDO1FBRUQsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRXJELE9BQU8sTUFBTSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFB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