/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ok } from '../../../base/common/assert.js';
import { Schemas } from '../../../base/common/network.js';
import { regExpLeadsToEndlessLoop } from '../../../base/common/strings.js';
import { MirrorTextModel } from '../../../editor/common/model/mirrorTextModel.js';
import { ensureValidWordDefinition, getWordAtText } from '../../../editor/common/core/wordHelper.js';
import { EndOfLine, Position, Range } from './extHostTypes.js';
import { equals } from '../../../base/common/arrays.js';
const _languageId2WordDefinition = new Map();
export function setWordDefinitionFor(languageId, wordDefinition) {
    if (!wordDefinition) {
        _languageId2WordDefinition.delete(languageId);
    }
    else {
        _languageId2WordDefinition.set(languageId, wordDefinition);
    }
}
function getWordDefinitionFor(languageId) {
    return _languageId2WordDefinition.get(languageId);
}
export class ExtHostDocumentData extends MirrorTextModel {
    constructor(_proxy, uri, lines, eol, versionId, _languageId, _isDirty, _encoding) {
        super(uri, lines, eol, versionId);
        this._proxy = _proxy;
        this._languageId = _languageId;
        this._isDirty = _isDirty;
        this._encoding = _encoding;
        this._isDisposed = false;
    }
    // eslint-disable-next-line local/code-must-use-super-dispose
    dispose() {
        // we don't really dispose documents but let
        // extensions still read from them. some
        // operations, live saving, will now error tho
        ok(!this._isDisposed);
        this._isDisposed = true;
        this._isDirty = false;
    }
    equalLines(lines) {
        return equals(this._lines, lines);
    }
    get document() {
        if (!this._document) {
            const that = this;
            this._document = {
                get uri() { return that._uri; },
                get fileName() { return that._uri.fsPath; },
                get isUntitled() { return that._uri.scheme === Schemas.untitled; },
                get languageId() { return that._languageId; },
                get version() { return that._versionId; },
                get isClosed() { return that._isDisposed; },
                get isDirty() { return that._isDirty; },
                get encoding() { return that._encoding; },
                save() { return that._save(); },
                getText(range) { return range ? that._getTextInRange(range) : that.getText(); },
                get eol() { return that._eol === '\n' ? EndOfLine.LF : EndOfLine.CRLF; },
                get lineCount() { return that._lines.length; },
                lineAt(lineOrPos) { return that._lineAt(lineOrPos); },
                offsetAt(pos) { return that._offsetAt(pos); },
                positionAt(offset) { return that._positionAt(offset); },
                validateRange(ran) { return that._validateRange(ran); },
                validatePosition(pos) { return that._validatePosition(pos); },
                getWordRangeAtPosition(pos, regexp) { return that._getWordRangeAtPosition(pos, regexp); },
                [Symbol.for('debug.description')]() {
                    return `TextDocument(${that._uri.toString()})`;
                }
            };
        }
        return Object.freeze(this._document);
    }
    _acceptLanguageId(newLanguageId) {
        ok(!this._isDisposed);
        this._languageId = newLanguageId;
    }
    _acceptIsDirty(isDirty) {
        ok(!this._isDisposed);
        this._isDirty = isDirty;
    }
    _acceptEncoding(encoding) {
        ok(!this._isDisposed);
        this._encoding = encoding;
    }
    _save() {
        if (this._isDisposed) {
            return Promise.reject(new Error('Document has been closed'));
        }
        return this._proxy.$trySaveDocument(this._uri);
    }
    _getTextInRange(_range) {
        const range = this._validateRange(_range);
        if (range.isEmpty) {
            return '';
        }
        if (range.isSingleLine) {
            return this._lines[range.start.line].substring(range.start.character, range.end.character);
        }
        const lineEnding = this._eol, startLineIndex = range.start.line, endLineIndex = range.end.line, resultLines = [];
        resultLines.push(this._lines[startLineIndex].substring(range.start.character));
        for (let i = startLineIndex + 1; i < endLineIndex; i++) {
            resultLines.push(this._lines[i]);
        }
        resultLines.push(this._lines[endLineIndex].substring(0, range.end.character));
        return resultLines.join(lineEnding);
    }
    _lineAt(lineOrPosition) {
        let line;
        if (lineOrPosition instanceof Position) {
            line = lineOrPosition.line;
        }
        else if (typeof lineOrPosition === 'number') {
            line = lineOrPosition;
        }
        if (typeof line !== 'number' || line < 0 || line >= this._lines.length || Math.floor(line) !== line) {
            throw new Error('Illegal value for `line`');
        }
        return new ExtHostDocumentLine(line, this._lines[line], line === this._lines.length - 1);
    }
    _offsetAt(position) {
        position = this._validatePosition(position);
        this._ensureLineStarts();
        return this._lineStarts.getPrefixSum(position.line - 1) + position.character;
    }
    _positionAt(offset) {
        offset = Math.floor(offset);
        offset = Math.max(0, offset);
        this._ensureLineStarts();
        const out = this._lineStarts.getIndexOf(offset);
        const lineLength = this._lines[out.index].length;
        // Ensure we return a valid position
        return new Position(out.index, Math.min(out.remainder, lineLength));
    }
    // ---- range math
    _validateRange(range) {
        if (!(range instanceof Range)) {
            throw new Error('Invalid argument');
        }
        const start = this._validatePosition(range.start);
        const end = this._validatePosition(range.end);
        if (start === range.start && end === range.end) {
            return range;
        }
        return new Range(start.line, start.character, end.line, end.character);
    }
    _validatePosition(position) {
        if (!(position instanceof Position)) {
            throw new Error('Invalid argument');
        }
        if (this._lines.length === 0) {
            return position.with(0, 0);
        }
        let { line, character } = position;
        let hasChanged = false;
        if (line < 0) {
            line = 0;
            character = 0;
            hasChanged = true;
        }
        else if (line >= this._lines.length) {
            line = this._lines.length - 1;
            character = this._lines[line].length;
            hasChanged = true;
        }
        else {
            const maxCharacter = this._lines[line].length;
            if (character < 0) {
                character = 0;
                hasChanged = true;
            }
            else if (character > maxCharacter) {
                character = maxCharacter;
                hasChanged = true;
            }
        }
        if (!hasChanged) {
            return position;
        }
        return new Position(line, character);
    }
    _getWordRangeAtPosition(_position, regexp) {
        const position = this._validatePosition(_position);
        if (!regexp) {
            // use default when custom-regexp isn't provided
            regexp = getWordDefinitionFor(this._languageId);
        }
        else if (regExpLeadsToEndlessLoop(regexp)) {
            // use default when custom-regexp is bad
            throw new Error(`[getWordRangeAtPosition]: ignoring custom regexp '${regexp.source}' because it matches the empty string.`);
        }
        const wordAtText = getWordAtText(position.character + 1, ensureValidWordDefinition(regexp), this._lines[position.line], 0);
        if (wordAtText) {
            return new Range(position.line, wordAtText.startColumn - 1, position.line, wordAtText.endColumn - 1);
        }
        return undefined;
    }
}
export class ExtHostDocumentLine {
    constructor(line, text, isLastLine) {
        this._line = line;
        this._text = text;
        this._isLastLine = isLastLine;
    }
    get lineNumber() {
        return this._line;
    }
    get text() {
        return this._text;
    }
    get range() {
        return new Range(this._line, 0, this._line, this._text.length);
    }
    get rangeIncludingLineBreak() {
        if (this._isLastLine) {
            return this.range;
        }
        return new Range(this._line, 0, this._line + 1, 0);
    }
    get firstNonWhitespaceCharacterIndex() {
        //TODO@api, rename to 'leadingWhitespaceLength'
        return /^(\s*)/.exec(this._text)[1].length;
    }
    get isEmptyOrWhitespace() {
        return this.firstNonWhitespaceCharacterIndex === this._text.length;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERvY3VtZW50RGF0YS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0RG9jdW1lbnREYXRhLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNwRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFM0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxhQUFhLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUVyRyxPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUUvRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFeEQsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztBQUM3RCxNQUFNLFVBQVUsb0JBQW9CLENBQUMsVUFBa0IsRUFBRSxjQUFrQztJQUMxRixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDckIsMEJBQTBCLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQy9DLENBQUM7U0FBTSxDQUFDO1FBQ1AsMEJBQTBCLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxjQUFjLENBQUMsQ0FBQztJQUM1RCxDQUFDO0FBQ0YsQ0FBQztBQUVELFNBQVMsb0JBQW9CLENBQUMsVUFBa0I7SUFDL0MsT0FBTywwQkFBMEIsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDbkQsQ0FB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