/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../base/common/strings.js';
import { EditOperation } from '../core/editOperation.js';
import { Range } from '../core/range.js';
export class TrimTrailingWhitespaceCommand {
    constructor(selection, cursors, trimInRegexesAndStrings) {
        this._selection = selection;
        this._cursors = cursors;
        this._selectionId = null;
        this._trimInRegexesAndStrings = trimInRegexesAndStrings;
    }
    getEditOperations(model, builder) {
        const ops = trimTrailingWhitespace(model, this._cursors, this._trimInRegexesAndStrings);
        for (let i = 0, len = ops.length; i < len; i++) {
            const op = ops[i];
            builder.addEditOperation(op.range, op.text);
        }
        this._selectionId = builder.trackSelection(this._selection);
    }
    computeCursorState(model, helper) {
        return helper.getTrackedSelection(this._selectionId);
    }
}
/**
 * Generate commands for trimming trailing whitespace on a model and ignore lines on which cursors are sitting.
 */
export function trimTrailingWhitespace(model, cursors, trimInRegexesAndStrings) {
    // Sort cursors ascending
    cursors.sort((a, b) => {
        if (a.lineNumber === b.lineNumber) {
            return a.column - b.column;
        }
        return a.lineNumber - b.lineNumber;
    });
    // Reduce multiple cursors on the same line and only keep the last one on the line
    for (let i = cursors.length - 2; i >= 0; i--) {
        if (cursors[i].lineNumber === cursors[i + 1].lineNumber) {
            // Remove cursor at `i`
            cursors.splice(i, 1);
        }
    }
    const r = [];
    let rLen = 0;
    let cursorIndex = 0;
    const cursorLen = cursors.length;
    for (let lineNumber = 1, lineCount = model.getLineCount(); lineNumber <= lineCount; lineNumber++) {
        const lineContent = model.getLineContent(lineNumber);
        const maxLineColumn = lineContent.length + 1;
        let minEditColumn = 0;
        if (cursorIndex < cursorLen && cursors[cursorIndex].lineNumber === lineNumber) {
            minEditColumn = cursors[cursorIndex].column;
            cursorIndex++;
            if (minEditColumn === maxLineColumn) {
                // The cursor is at the end of the line => no edits for sure on this line
                continue;
            }
        }
        if (lineContent.length === 0) {
            continue;
        }
        const lastNonWhitespaceIndex = strings.lastNonWhitespaceIndex(lineContent);
        let fromColumn = 0;
        if (lastNonWhitespaceIndex === -1) {
            // Entire line is whitespace
            fromColumn = 1;
        }
        else if (lastNonWhitespaceIndex !== lineContent.length - 1) {
            // There is trailing whitespace
            fromColumn = lastNonWhitespaceIndex + 2;
        }
        else {
            // There is no trailing whitespace
            continue;
        }
        if (!trimInRegexesAndStrings) {
            if (!model.tokenization.hasAccurateTokensForLine(lineNumber)) {
                // We don't want to force line tokenization, as that can be expensive, but we also don't want to trim
                // trailing whitespace in lines that are not tokenized yet, as that can be wrong and trim whitespace from
                // lines that the user requested we don't. So we bail out if the tokens are not accurate for this line.
                continue;
            }
            const lineTokens = model.tokenization.getLineTokens(lineNumber);
            const fromColumnType = lineTokens.getStandardTokenType(lineTokens.findTokenIndexAtOffset(fromColumn));
            if (fromColumnType === 2 /* StandardTokenType.String */ || fromColumnType === 3 /* StandardTokenType.RegEx */) {
                continue;
            }
        }
        fromColumn = Math.max(minEditColumn, fromColumn);
        r[rLen++] = EditOperation.delete(new Range(lineNumber, fromColumn, lineNumber, maxLineColumn));
    }
    return r;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJpbVRyYWlsaW5nV2hpdGVzcGFjZUNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb21tYW5kcy90cmltVHJhaWxpbmdXaGl0ZXNwYWNlQ29tbWFuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxhQUFhLEVBQXdCLE1BQU0sMEJBQTBCLENBQUM7QUFFL0UsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBTXpDLE1BQU0sT0FBTyw2QkFBNkI7SUFPekMsWUFBWSxTQUFvQixFQUFFLE9BQW1CLEVBQUUsdUJBQWdDO1FBQ3RGLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO1FBQzVCLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO1FBQ3pCLElBQUksQ0FBQyx3QkFBd0IsR0FBRyx1QkFBdUIsQ0FBQztJQUN6RCxDQUFDO0lBRU0saUJBQWlCLENBQUMsS0FBaUIsRUFBRSxPQUE4QjtRQUN6RSxNQUFNLEdBQUcsR0FBRyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUN4RixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDaEQsTUFBTSxFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRWxCLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFF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