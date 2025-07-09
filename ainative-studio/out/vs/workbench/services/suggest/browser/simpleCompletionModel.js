/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { quickSelect } from '../../../../base/common/arrays.js';
import { FuzzyScore, fuzzyScore, fuzzyScoreGracefulAggressive, FuzzyScoreOptions } from '../../../../base/common/filters.js';
export class LineContext {
    constructor(leadingLineContent, characterCountDelta) {
        this.leadingLineContent = leadingLineContent;
        this.characterCountDelta = characterCountDelta;
    }
}
var Refilter;
(function (Refilter) {
    Refilter[Refilter["Nothing"] = 0] = "Nothing";
    Refilter[Refilter["All"] = 1] = "All";
    Refilter[Refilter["Incr"] = 2] = "Incr";
})(Refilter || (Refilter = {}));
export class SimpleCompletionModel {
    constructor(_items, _lineContext, _rawCompareFn) {
        this._items = _items;
        this._lineContext = _lineContext;
        this._rawCompareFn = _rawCompareFn;
        this._refilterKind = 1 /* Refilter.All */;
        this._fuzzyScoreOptions = {
            ...FuzzyScoreOptions.default,
            firstMatchCanBeWeak: true
        };
        // TODO: Pass in options
        this._options = {};
    }
    get items() {
        this._ensureCachedState();
        return this._filteredItems;
    }
    get stats() {
        this._ensureCachedState();
        return this._stats;
    }
    get lineContext() {
        return this._lineContext;
    }
    set lineContext(value) {
        if (this._lineContext.leadingLineContent !== value.leadingLineContent
            || this._lineContext.characterCountDelta !== value.characterCountDelta) {
            this._refilterKind = this._lineContext.characterCountDelta < value.characterCountDelta && this._filteredItems ? 2 /* Refilter.Incr */ : 1 /* Refilter.All */;
            this._lineContext = value;
        }
    }
    forceRefilterAll() {
        this._refilterKind = 1 /* Refilter.All */;
    }
    _ensureCachedState() {
        if (this._refilterKind !== 0 /* Refilter.Nothing */) {
            this._createCachedState();
        }
    }
    _createCachedState() {
        // this._providerInfo = new Map();
        const labelLengths = [];
        const { leadingLineContent, characterCountDelta } = this._lineContext;
        let word = '';
        let wordLow = '';
        // incrementally filter less
        const source = this._refilterKind === 1 /* Refilter.All */ ? this._items : this._filteredItems;
        const target = [];
        // picks a score function based on the number of
        // items that we have to score/filter and based on the
        // user-configuration
        const scoreFn = (!this._options.filterGraceful || source.length > 2000) ? fuzzyScore : fuzzyScoreGracefulAggressive;
        for (let i = 0; i < source.length; i++) {
            const item = source[i];
            if (item.isInvalid) {
                continue; // SKIP invalid items
            }
            // collect all support, know if their result is incomplete
            // this._providerInfo.set(item.provider, Boolean(item.container.incomplete));
            // 'word' is that remainder of the current line that we
            // filter and score against. In theory each suggestion uses a
            // different word, but in practice not - that's why we cache
            // TODO: Fix
            const overwriteBefore = item.completion.replacementLength; // item.position.column - item.editStart.column;
            const wordLen = overwriteBefore + characterCountDelta; // - (item.position.column - this._column);
            if (word.length !== wordLen) {
                word = wordLen === 0 ? '' : leadingLineContent.slice(-wordLen);
                wordLow = word.toLowerCase();
            }
            // remember the word against which this item was
            // scored. If word is undefined, then match against the empty string.
            item.word = word;
            if (wordLen === 0) {
                // when there is nothing to score against, don't
                // event try to do. Use a const rank and rely on
                // the fallback-sort using the initial sort order.
                // use a score of `-100` because that is out of the
                // bound of values `fuzzyScore` will return
                item.score = FuzzyScore.Default;
            }
            else {
                // skip word characters that are whitespace until
                // we have hit the replace range (overwriteBefore)
                let wordPos = 0;
                while (wordPos < overwriteBefore) {
                    const ch = word.charCodeAt(wordPos);
                    if (ch === 32 /* CharCode.Space */ || ch === 9 /* CharCode.Tab */) {
                        wordPos += 1;
                    }
                    else {
                        break;
                    }
                }
                if (wordPos >= wordLen) {
                    // the wordPos at which scoring starts is the whole word
                    // and therefore the same rules as not having a word apply
                    item.score = FuzzyScore.Default;
                    // } else if (typeof item.completion.filterText === 'string') {
                    // 	// when there is a `filterText` it must match the `word`.
                    // 	// if it matches we check with the label to compute highlights
                    // 	// and if that doesn't yield a result we have no highlights,
                    // 	// despite having the match
                    // 	const match = scoreFn(word, wordLow, wordPos, item.completion.filterText, item.filterTextLow!, 0, this._fuzzyScoreOptions);
                    // 	if (!match) {
                    // 		continue; // NO match
                    // 	}
                    // 	if (compareIgnoreCase(item.completion.filterText, item.textLabel) === 0) {
                    // 		// filterText and label are actually the same -> use good highlights
                    // 		item.score = match;
                    // 	} else {
                    // 		// re-run the scorer on the label in the hope of a result BUT use the rank
                    // 		// of the filterText-match
                    // 		item.score = anyScore(word, wordLow, wordPos, item.textLabel, item.labelLow, 0);
                    // 		item.score[0] = match[0]; // use score from filterText
                    // 	}
                }
                else {
                    // by default match `word` against the `label`
                    const match = scoreFn(word, wordLow, wordPos, item.textLabel, item.labelLow, 0, this._fuzzyScoreOptions);
                    if (!match && word !== '') {
                        continue; // NO match
                    }
                    // Use default sorting when word is empty
                    item.score = match || FuzzyScore.Default;
                }
            }
            item.idx = i;
            target.push(item);
            // update stats
            labelLengths.push(item.textLabel.length);
        }
        this._filteredItems = target.sort(this._rawCompareFn?.bind(undefined, leadingLineContent));
        this._refilterKind = 0 /* Refilter.Nothing */;
        this._stats = {
            pLabelLen: labelLengths.length ?
                quickSelect(labelLengths.length - .85, labelLengths, (a, b) => a - b)
                : 0
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlQ29tcGxldGlvbk1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zdWdnZXN0L2Jyb3dzZXIvc2ltcGxlQ29tcGxldGlvbk1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUVoRSxPQUFPLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSw0QkFBNEIsRUFBRSxpQkFBaUIsRUFBZSxNQUFNLG9DQUFvQyxDQUFDO0FBTTFJLE1BQU0sT0FBTyxXQUFXO0lBQ3ZCLFlBQ1Usa0JBQTBCLEVBQzFCLG1CQUEyQjtRQUQzQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQVE7UUFDMUIsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFRO0lBQ2pDLENBQUM7Q0FDTDtBQUVELElBQVcsUUFJVjtBQUpELFdBQVcsUUFBUTtJQUNsQiw2Q0FBVyxDQUFBO0lBQ1gscUNBQU8sQ0FBQTtJQUNQLHVDQUFRLENBQUE7QUFDVCxDQUFDLEVBSlUsUUFBUSxLQUFSLFFBQVEsUUFJbEI7QUFFRCxNQUFNLE9BQU8scUJBQXFCO0lBY2pDLFlBQ2tCLE1BQVcsRUFDcEIsWUFBeUIsRUFDaEIsYUFBa0U7UUFGbEUsV0FBTSxHQUFOLE1BQU0sQ0FBSztRQUNwQixpQkFBWSxHQUFaLFlBQVksQ0FBYTtRQUNoQixrQkFBYSxHQUFiLGFBQWEsQ0FBcUQ7UUFkNUUsa0JBQWEsd0JBQTBCO1FBQ3ZDLHVCQUFrQixHQUFrQztZQUMzRCxHQUFHLGlCQUFpQixDQUFDLE9BQU87WUFDNUIsbUJBQW1CLEVBQUUsSUFBSTtTQUN6QixDQUFDO1FBRUYsd0JBQXdCO1FBQ2hCLGFBQVEsR0FFWixFQUFFLENBQUM7SUFPUCxDQUFDO0lB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