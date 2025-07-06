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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlQ29tcGxldGlvbk1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3N1Z2dlc3QvYnJvd3Nlci9zaW1wbGVDb21wbGV0aW9uTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRWhFLE9BQU8sRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLDRCQUE0QixFQUFFLGlCQUFpQixFQUFlLE1BQU0sb0NBQW9DLENBQUM7QUFNMUksTUFBTSxPQUFPLFdBQVc7SUFDdkIsWUFDVSxrQkFBMEIsRUFDMUIsbUJBQTJCO1FBRDNCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBUTtRQUMxQix3QkFBbUIsR0FBbkIsbUJBQW1CLENBQVE7SUFDakMsQ0FBQztDQUNMO0FBRUQsSUFBVyxRQUlWO0FBSkQsV0FBVyxRQUFRO0lBQ2xCLDZDQUFXLENBQUE7SUFDWCxxQ0FBTyxDQUFBO0lBQ1AsdUNBQVEsQ0FBQTtBQUNULENBQUMsRUFKVSxRQUFRLEtBQVIsUUFBUSxRQUlsQjtBQUVELE1BQU0sT0FBTyxxQkFBcUI7SUFjakMsWUFDa0IsTUFBVyxFQUNwQixZQUF5QixFQUNoQixhQUFrRTtRQUZsRSxXQUFNLEdBQU4sTUFBTSxDQUFLO1FBQ3BCLGlCQUFZLEdBQVosWUFBWSxDQUFhO1FBQ2hCLGtCQUFhLEdBQWIsYUFBYSxDQUFxRDtRQWQ1RSxrQkFBYSx3QkFBMEI7UUFDdkMsdUJBQWtCLEdBQWtDO1lBQzNELEdBQUcsaUJBQWlCLENBQUMsT0FBTztZQUM1QixtQkFBbUIsRUFBRSxJQUFJO1NBQ3pCLENBQUM7UUFFRix3QkFBd0I7UUFDaEIsYUFBUSxHQUVaLEVBQUUsQ0FBQztJQU9QLENBQUM7SUFF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