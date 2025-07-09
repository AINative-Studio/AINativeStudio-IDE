/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditOperation } from '../../../common/core/editOperation.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
export class BlockCommentCommand {
    constructor(selection, insertSpace, languageConfigurationService) {
        this.languageConfigurationService = languageConfigurationService;
        this._selection = selection;
        this._insertSpace = insertSpace;
        this._usedEndToken = null;
    }
    static _haystackHasNeedleAtOffset(haystack, needle, offset) {
        if (offset < 0) {
            return false;
        }
        const needleLength = needle.length;
        const haystackLength = haystack.length;
        if (offset + needleLength > haystackLength) {
            return false;
        }
        for (let i = 0; i < needleLength; i++) {
            const codeA = haystack.charCodeAt(offset + i);
            const codeB = needle.charCodeAt(i);
            if (codeA === codeB) {
                continue;
            }
            if (codeA >= 65 /* CharCode.A */ && codeA <= 90 /* CharCode.Z */ && codeA + 32 === codeB) {
                // codeA is upper-case variant of codeB
                continue;
            }
            if (codeB >= 65 /* CharCode.A */ && codeB <= 90 /* CharCode.Z */ && codeB + 32 === codeA) {
                // codeB is upper-case variant of codeA
                continue;
            }
            return false;
        }
        return true;
    }
    _createOperationsForBlockComment(selection, startToken, endToken, insertSpace, model, builder) {
        const startLineNumber = selection.startLineNumber;
        const startColumn = selection.startColumn;
        const endLineNumber = selection.endLineNumber;
        const endColumn = selection.endColumn;
        const startLineText = model.getLineContent(startLineNumber);
        const endLineText = model.getLineContent(endLineNumber);
        let startTokenIndex = startLineText.lastIndexOf(startToken, startColumn - 1 + startToken.length);
        let endTokenIndex = endLineText.indexOf(endToken, endColumn - 1 - endToken.length);
        if (startTokenIndex !== -1 && endTokenIndex !== -1) {
            if (startLineNumber === endLineNumber) {
                const lineBetweenTokens = startLineText.substring(startTokenIndex + startToken.length, endTokenIndex);
                if (lineBetweenTokens.indexOf(endToken) >= 0) {
                    // force to add a block comment
                    startTokenIndex = -1;
                    endTokenIndex = -1;
                }
            }
            else {
                const startLineAfterStartToken = startLineText.substring(startTokenIndex + startToken.length);
                const endLineBeforeEndToken = endLineText.substring(0, endTokenIndex);
                if (startLineAfterStartToken.indexOf(endToken) >= 0 || endLineBeforeEndToken.indexOf(endToken) >= 0) {
                    // force to add a block comment
                    startTokenIndex = -1;
                    endTokenIndex = -1;
                }
            }
        }
        let ops;
        if (startTokenIndex !== -1 && endTokenIndex !== -1) {
            // Consider spaces as part of the comment tokens
            if (insertSpace && startTokenIndex + startToken.length < startLineText.length && startLineText.charCodeAt(startTokenIndex + startToken.length) === 32 /* CharCode.Space */) {
                // Pretend the start token contains a trailing space
                startToken = startToken + ' ';
            }
            if (insertSpace && endTokenIndex > 0 && endLineText.charCodeAt(endTokenIndex - 1) === 32 /* CharCode.Space */) {
                // Pretend the end token contains a leading space
                endToken = ' ' + endToken;
                endTokenIndex -= 1;
            }
            ops = BlockCommentCommand._createRemoveBlockCommentOperations(new Range(startLineNumber, startTokenIndex + startToken.length + 1, endLineNumber, endTokenIndex + 1), startToken, endToken);
        }
        else {
            ops = BlockCommentCommand._createAddBlockCommentOperations(selection, startToken, endToken, this._insertSpace);
            this._usedEndToken = ops.length === 1 ? endToken : null;
        }
        for (const op of ops) {
            builder.addTrackedEditOperation(op.range, op.text);
        }
    }
    static _createRemoveBlockCommentOperations(r, startToken, endToken) {
        const res = [];
        if (!Range.isEmpty(r)) {
            // Remove block comment start
            res.push(EditOperation.delete(new Range(r.startLineNumber, r.startColumn - startToken.length, r.startLineNumber, r.startColumn)));
            // Remove block comment end
            res.push(EditOperation.delete(new Range(r.endLineNumber, r.endColumn, r.endLineNumber, r.endColumn + endToken.length)));
        }
        else {
            // Remove both continuously
            res.push(EditOperation.delete(new Range(r.startLineNumber, r.startColumn - startToken.length, r.endLineNumber, r.endColumn + endToken.length)));
        }
        return res;
    }
    static _createAddBlockCommentOperations(r, startToken, endToken, insertSpace) {
        const res = [];
        if (!Range.isEmpty(r)) {
            // Insert block comment start
            res.push(EditOperation.insert(new Position(r.startLineNumber, r.startColumn), startToken + (insertSpace ? ' ' : '')));
            // Insert block comment end
            res.push(EditOperation.insert(new Position(r.endLineNumber, r.endColumn), (insertSpace ? ' ' : '') + endToken));
        }
        else {
            // Insert both continuously
            res.push(EditOperation.replace(new Range(r.startLineNumber, r.startColumn, r.endLineNumber, r.endColumn), startToken + '  ' + endToken));
        }
        return res;
    }
    getEditOperations(model, builder) {
        const startLineNumber = this._selection.startLineNumber;
        const startColumn = this._selection.startColumn;
        model.tokenization.tokenizeIfCheap(startLineNumber);
        const languageId = model.getLanguageIdAtPosition(startLineNumber, startColumn);
        const config = this.languageConfigurationService.getLanguageConfiguration(languageId).comments;
        if (!config || !config.blockCommentStartToken || !config.blockCommentEndToken) {
            // Mode does not support block comments
            return;
        }
        this._createOperationsForBlockComment(this._selection, config.blockCommentStartToken, config.blockCommentEndToken, this._insertSpace, model, builder);
    }
    computeCursorState(model, helper) {
        const inverseEditOperations = helper.getInverseEditOperations();
        if (inverseEditOperations.length === 2) {
            const startTokenEditOperation = inverseEditOperations[0];
            const endTokenEditOperation = inverseEditOperations[1];
            return new Selection(startTokenEditOperation.range.endLineNumber, startTokenEditOperation.range.endColumn, endTokenEditOperation.range.startLineNumber, endTokenEditOperation.range.startColumn);
        }
        else {
            const srcRange = inverseEditOperations[0].range;
            const deltaColumn = this._usedEndToken ? -this._usedEndToken.length - 1 : 0; // minus 1 space before endToken
            return new Selection(srcRange.endLineNumber, srcRange.endColumn + deltaColumn, srcRange.endLineNumber, srcRange.endColumn + deltaColumn);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmxvY2tDb21tZW50Q29tbWFuZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jb21tZW50L2Jyb3dzZXIvYmxvY2tDb21tZW50Q29tbWFuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsYUFBYSxFQUF3QixNQUFNLHVDQUF1QyxDQUFDO0FBQzVGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBSzlELE1BQU0sT0FBTyxtQkFBbUI7SUFNL0IsWUFDQyxTQUFvQixFQUNwQixXQUFvQixFQUNILDRCQUEyRDtRQUEzRCxpQ0FBNEIsR0FBNUIsNEJBQTRCLENBQStCO1FBRTVFLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO1FBQzVCLElBQUksQ0FBQyxZQUFZLEdBQUcsV0FBVyxDQUFDO1FBQ2hDLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO0lBQzNCLENBQUM7SUFFTSxNQUFNLENBQUMsMEJBQTBCLENBQUMsUUFBZ0IsRUFBRSxNQUFjLEVBQUUsTUFBYztRQUN4RixJQUFJLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNoQixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFDRCxNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO1FBQ25DLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUM7UUFDdkMsSUFBSSxNQUFNLEdBQUcsWUFBWSxHQUFHLGNBQWMsRUFBRSxDQUFDO1lBQzVDLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztR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