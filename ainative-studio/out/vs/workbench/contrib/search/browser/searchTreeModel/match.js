/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { memoize } from '../../../../../base/common/decorators.js';
import { lcut } from '../../../../../base/common/strings.js';
import { OneLineRange } from '../../../../services/search/common/search.js';
import { MATCH_PREFIX } from './searchTreeCommon.js';
import { Range } from '../../../../../editor/common/core/range.js';
export function textSearchResultToMatches(rawMatch, fileMatch, isAiContributed) {
    const previewLines = rawMatch.previewText.split('\n');
    return rawMatch.rangeLocations.map((rangeLocation) => {
        const previewRange = rangeLocation.preview;
        return new MatchImpl(fileMatch, previewLines, previewRange, rangeLocation.source, isAiContributed);
    });
}
export class MatchImpl {
    static { this.MAX_PREVIEW_CHARS = 250; }
    constructor(_parent, _fullPreviewLines, _fullPreviewRange, _documentRange, _isReadonly = false) {
        this._parent = _parent;
        this._fullPreviewLines = _fullPreviewLines;
        this._isReadonly = _isReadonly;
        this._oneLinePreviewText = _fullPreviewLines[_fullPreviewRange.startLineNumber];
        const adjustedEndCol = _fullPreviewRange.startLineNumber === _fullPreviewRange.endLineNumber ?
            _fullPreviewRange.endColumn :
            this._oneLinePreviewText.length;
        this._rangeInPreviewText = new OneLineRange(1, _fullPreviewRange.startColumn + 1, adjustedEndCol + 1);
        this._range = new Range(_documentRange.startLineNumber + 1, _documentRange.startColumn + 1, _documentRange.endLineNumber + 1, _documentRange.endColumn + 1);
        this._fullPreviewRange = _fullPreviewRange;
        this._id = MATCH_PREFIX + this._parent.resource.toString() + '>' + this._range + this.getMatchString();
    }
    id() {
        return this._id;
    }
    parent() {
        return this._parent;
    }
    text() {
        return this._oneLinePreviewText;
    }
    range() {
        return this._range;
    }
    preview() {
        const fullBefore = this._oneLinePreviewText.substring(0, this._rangeInPreviewText.startColumn - 1), before = lcut(fullBefore, 26, '…');
        let inside = this.getMatchString(), after = this._oneLinePreviewText.substring(this._rangeInPreviewText.endColumn - 1);
        let charsRemaining = MatchImpl.MAX_PREVIEW_CHARS - before.length;
        inside = inside.substr(0, charsRemaining);
        charsRemaining -= inside.length;
        after = after.substr(0, charsRemaining);
        return {
            before,
            fullBefore,
            inside,
            after,
        };
    }
    get replaceString() {
        const searchModel = this.parent().parent().searchModel;
        if (!searchModel.replacePattern) {
            throw new Error('searchModel.replacePattern must be set before accessing replaceString');
        }
        const fullMatchText = this.fullMatchText();
        let replaceString = searchModel.replacePattern.getReplaceString(fullMatchText, searchModel.preserveCase);
        if (replaceString !== null) {
            return replaceString;
        }
        // Search/find normalize line endings - check whether \r prevents regex from matching
        const fullMatchTextWithoutCR = fullMatchText.replace(/\r\n/g, '\n');
        if (fullMatchTextWithoutCR !== fullMatchText) {
            replaceString = searchModel.replacePattern.getReplaceString(fullMatchTextWithoutCR, searchModel.preserveCase);
            if (replaceString !== null) {
                return replaceString;
            }
        }
        // If match string is not matching then regex pattern has a lookahead expression
        const contextMatchTextWithSurroundingContent = this.fullMatchText(true);
        replaceString = searchModel.replacePattern.getReplaceString(contextMatchTextWithSurroundingContent, searchModel.preserveCase);
        if (replaceString !== null) {
            return replaceString;
        }
        // Search/find normalize line endings, this time in full context
        const contextMatchTextWithoutCR = contextMatchTextWithSurroundingContent.replace(/\r\n/g, '\n');
        if (contextMatchTextWithoutCR !== contextMatchTextWithSurroundingContent) {
            replaceString = searchModel.replacePattern.getReplaceString(contextMatchTextWithoutCR, searchModel.preserveCase);
            if (replaceString !== null) {
                return replaceString;
            }
        }
        // Match string is still not matching. Could be unsupported matches (multi-line).
        return searchModel.replacePattern.pattern;
    }
    fullMatchText(includeSurrounding = false) {
        let thisMatchPreviewLines;
        if (includeSurrounding) {
            thisMatchPreviewLines = this._fullPreviewLines;
        }
        else {
            thisMatchPreviewLines = this._fullPreviewLines.slice(this._fullPreviewRange.startLineNumber, this._fullPreviewRange.endLineNumber + 1);
            thisMatchPreviewLines[thisMatchPreviewLines.length - 1] = thisMatchPreviewLines[thisMatchPreviewLines.length - 1].slice(0, this._fullPreviewRange.endColumn);
            thisMatchPreviewLines[0] = thisMatchPreviewLines[0].slice(this._fullPreviewRange.startColumn);
        }
        return thisMatchPreviewLines.join('\n');
    }
    rangeInPreview() {
        // convert to editor's base 1 positions.
        return {
            ...this._fullPreviewRange,
            startColumn: this._fullPreviewRange.startColumn + 1,
            endColumn: this._fullPreviewRange.endColumn + 1
        };
    }
    fullPreviewLines() {
        return this._fullPreviewLines.slice(this._fullPreviewRange.startLineNumber, this._fullPreviewRange.endLineNumber + 1);
    }
    getMatchString() {
        return this._oneLinePreviewText.substring(this._rangeInPreviewText.startColumn - 1, this._rangeInPreviewText.endColumn - 1);
    }
    get isReadonly() {
        return this._isReadonly;
    }
}
__decorate([
    memoize
], MatchImpl.prototype, "preview", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWF0Y2guanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2Jyb3dzZXIvc2VhcmNoVHJlZU1vZGVsL21hdGNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDN0QsT0FBTyxFQUFrQyxZQUFZLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUM1RyxPQUFPLEVBQTBDLFlBQVksRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzdGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUVuRSxNQUFNLFVBQVUseUJBQXlCLENBQUMsUUFBMEIsRUFBRSxTQUErQixFQUFFLGVBQXdCO0lBQzlILE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3RELE9BQU8sUUFBUSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxhQUFhLEVBQUUsRUFBRTtRQUNwRCxNQUFNLFlBQVksR0FBaUIsYUFBYSxDQUFDLE9BQU8sQ0FBQztRQUN6RCxPQUFPLElBQUksU0FBUyxDQUFDLFNBQVMsRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLGFBQWEsQ0FBQyxNQUFNLEVBQUUsZUFBZSxDQUFDLENBQUM7SUFDcEcsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsTUFBTSxPQUFPLFNBQVM7YUFFRyxzQkFBaUIsR0FBRyxHQUFHLENBQUM7SUFRaEQsWUFBc0IsT0FBNkIsRUFBVSxpQkFBMkIsRUFBRSxpQkFBK0IsRUFBRSxjQUE0QixFQUFtQixj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