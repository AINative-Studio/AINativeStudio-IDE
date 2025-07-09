/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { safeIntl } from '../../../base/common/date.js';
import { LRUCache } from '../../../base/common/map.js';
import { CharacterClassifier } from './characterClassifier.js';
export var WordCharacterClass;
(function (WordCharacterClass) {
    WordCharacterClass[WordCharacterClass["Regular"] = 0] = "Regular";
    WordCharacterClass[WordCharacterClass["Whitespace"] = 1] = "Whitespace";
    WordCharacterClass[WordCharacterClass["WordSeparator"] = 2] = "WordSeparator";
})(WordCharacterClass || (WordCharacterClass = {}));
export class WordCharacterClassifier extends CharacterClassifier {
    constructor(wordSeparators, intlSegmenterLocales) {
        super(0 /* WordCharacterClass.Regular */);
        this._segmenter = null;
        this._cachedLine = null;
        this._cachedSegments = [];
        this.intlSegmenterLocales = intlSegmenterLocales;
        if (this.intlSegmenterLocales.length > 0) {
            this._segmenter = safeIntl.Segmenter(this.intlSegmenterLocales, { granularity: 'word' });
        }
        else {
            this._segmenter = null;
        }
        for (let i = 0, len = wordSeparators.length; i < len; i++) {
            this.set(wordSeparators.charCodeAt(i), 2 /* WordCharacterClass.WordSeparator */);
        }
        this.set(32 /* CharCode.Space */, 1 /* WordCharacterClass.Whitespace */);
        this.set(9 /* CharCode.Tab */, 1 /* WordCharacterClass.Whitespace */);
    }
    findPrevIntlWordBeforeOrAtOffset(line, offset) {
        let candidate = null;
        for (const segment of this._getIntlSegmenterWordsOnLine(line)) {
            if (segment.index > offset) {
                break;
            }
            candidate = segment;
        }
        return candidate;
    }
    findNextIntlWordAtOrAfterOffset(lineContent, offset) {
        for (const segment of this._getIntlSegmenterWordsOnLine(lineContent)) {
            if (segment.index < offset) {
                continue;
            }
            return segment;
        }
        return null;
    }
    _getIntlSegmenterWordsOnLine(line) {
        if (!this._segmenter) {
            return [];
        }
        // Check if the line has changed from the previous call
        if (this._cachedLine === line) {
            return this._cachedSegments;
        }
        // Update the cache with the new line
        this._cachedLine = line;
        this._cachedSegments = this._filterWordSegments(this._segmenter.segment(line));
        return this._cachedSegments;
    }
    _filterWordSegments(segments) {
        const result = [];
        for (const segment of segments) {
            if (this._isWordLike(segment)) {
                result.push(segment);
            }
        }
        return result;
    }
    _isWordLike(segment) {
        if (segment.isWordLike) {
            return true;
        }
        return false;
    }
}
const wordClassifierCache = new LRUCache(10);
export function getMapForWordSeparators(wordSeparators, intlSegmenterLocales) {
    const key = `${wordSeparators}/${intlSegmenterLocales.join(',')}`;
    let result = wordClassifierCache.get(key);
    if (!result) {
        result = new WordCharacterClassifier(wordSeparators, intlSegmenterLocales);
        wordClassifierCache.set(key, result);
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZENoYXJhY3RlckNsYXNzaWZpZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb3JlL3dvcmRDaGFyYWN0ZXJDbGFzc2lmaWVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDdkQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFL0QsTUFBTSxDQUFOLElBQWtCLGtCQUlqQjtBQUpELFdBQWtCLGtCQUFrQjtJQUNuQyxpRUFBVyxDQUFBO0lBQ1gsdUVBQWMsQ0FBQTtJQUNkLDZFQUFpQixDQUFBO0FBQ2xCLENBQUMsRUFKaUIsa0JBQWtCLEtBQWxCLGtCQUFrQixRQUluQztBQUVELE1BQU0sT0FBTyx1QkFBd0IsU0FBUSxtQkFBdUM7SUFPbkYsWUFBWSxjQUFzQixFQUFFLG9CQUF5RDtRQUM1RixLQUFLLG9DQUE0QixDQUFDO1FBTGxCLGVBQVUsR0FBMEIsSUFBSSxDQUFDO1FBQ2xELGdCQUFXLEdBQWtCLElBQUksQ0FBQztRQUNsQyxvQkFBZSxHQUEwQixFQUFFLENBQUM7UUFJbkQsSUFBSSxDQUFDLG9CQUFvQixHQUFHLG9CQUFvQixDQUFDO1FBQ2pELElBQUksSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUMxQyxJQUFJLENBQUMsVUFBVSxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDMUYsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJ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