/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CachedFunction } from '../../../../base/common/cache.js';
import { createBracketOrRegExp } from './richEditBrackets.js';
/**
 * Captures all bracket related configurations for a single language.
 * Immutable.
*/
export class LanguageBracketsConfiguration {
    constructor(languageId, config) {
        this.languageId = languageId;
        const bracketPairs = config.brackets ? filterValidBrackets(config.brackets) : [];
        const openingBracketInfos = new CachedFunction((bracket) => {
            const closing = new Set();
            return {
                info: new OpeningBracketKind(this, bracket, closing),
                closing,
            };
        });
        const closingBracketInfos = new CachedFunction((bracket) => {
            const opening = new Set();
            const openingColorized = new Set();
            return {
                info: new ClosingBracketKind(this, bracket, opening, openingColorized),
                opening,
                openingColorized,
            };
        });
        for (const [open, close] of bracketPairs) {
            const opening = openingBracketInfos.get(open);
            const closing = closingBracketInfos.get(close);
            opening.closing.add(closing.info);
            closing.opening.add(opening.info);
        }
        // Treat colorized brackets as brackets, and mark them as colorized.
        const colorizedBracketPairs = config.colorizedBracketPairs
            ? filterValidBrackets(config.colorizedBracketPairs)
            // If not configured: Take all brackets except `<` ... `>`
            // Many languages set < ... > as bracket pair, even though they also use it as comparison operator.
            // This leads to problems when colorizing this bracket, so we exclude it if not explicitly configured otherwise.
            // https://github.com/microsoft/vscode/issues/132476
            : bracketPairs.filter((p) => !(p[0] === '<' && p[1] === '>'));
        for (const [open, close] of colorizedBracketPairs) {
            const opening = openingBracketInfos.get(open);
            const closing = closingBracketInfos.get(close);
            opening.closing.add(closing.info);
            closing.openingColorized.add(opening.info);
            closing.opening.add(opening.info);
        }
        this._openingBrackets = new Map([...openingBracketInfos.cachedValues].map(([k, v]) => [k, v.info]));
        this._closingBrackets = new Map([...closingBracketInfos.cachedValues].map(([k, v]) => [k, v.info]));
    }
    /**
     * No two brackets have the same bracket text.
    */
    get openingBrackets() {
        return [...this._openingBrackets.values()];
    }
    /**
     * No two brackets have the same bracket text.
    */
    get closingBrackets() {
        return [...this._closingBrackets.values()];
    }
    getOpeningBracketInfo(bracketText) {
        return this._openingBrackets.get(bracketText);
    }
    getClosingBracketInfo(bracketText) {
        return this._closingBrackets.get(bracketText);
    }
    getBracketInfo(bracketText) {
        return this.getOpeningBracketInfo(bracketText) || this.getClosingBracketInfo(bracketText);
    }
    getBracketRegExp(options) {
        const brackets = Array.from([...this._openingBrackets.keys(), ...this._closingBrackets.keys()]);
        return createBracketOrRegExp(brackets, options);
    }
}
function filterValidBrackets(bracketPairs) {
    return bracketPairs.filter(([open, close]) => open !== '' && close !== '');
}
export class BracketKindBase {
    constructor(config, bracketText) {
        this.config = config;
        this.bracketText = bracketText;
    }
    get languageId() {
        return this.config.languageId;
    }
}
export class OpeningBracketKind extends BracketKindBase {
    constructor(config, bracketText, openedBrackets) {
        super(config, bracketText);
        this.openedBrackets = openedBrackets;
        this.isOpeningBracket = true;
    }
}
export class ClosingBracketKind extends BracketKindBase {
    constructor(config, bracketText, 
    /**
     * Non empty array of all opening brackets this bracket closes.
    */
    openingBrackets, openingColorizedBrackets) {
        super(config, bracketText);
        this.openingBrackets = openingBrackets;
        this.openingColorizedBrackets = openingColorizedBrackets;
        this.isOpeningBracket = false;
    }
    /**
     * Checks if this bracket closes the given other bracket.
     * If the bracket infos come from different configurations, this method will return false.
    */
    closes(other) {
        if (other['config'] !== this.config) {
            return false;
        }
        return this.openingBrackets.has(other);
    }
    closesColorized(other) {
        if (other['config'] !== this.config) {
            return false;
        }
        return this.openingColorizedBrackets.has(other);
    }
    getOpeningBrackets() {
        return [...this.openingBrackets];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VCcmFja2V0c0NvbmZpZ3VyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9sYW5ndWFnZXMvc3VwcG9ydHMvbGFuZ3VhZ2VCcmFja2V0c0NvbmZpZ3VyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBR2xFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRTlEOzs7RUFHRTtBQUNGLE1BQU0sT0FBTyw2QkFBNkI7SUFJekMsWUFDaUIsVUFBa0IsRUFDbEMsTUFBNkI7UUFEYixlQUFVLEdBQVYsVUFBVSxDQUFRO1FBR2xDLE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ2pGLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxjQUFjLENBQUMsQ0FBQyxPQUFlLEVBQUUsRUFBRTtZQUNsRSxNQUFNLE9BQU8sR0FBRyxJQUFJLEdBQUcsRUFBc0IsQ0FBQztZQUU5QyxPQUFPO2dCQUNOLElBQUksRUFBRSxJQUFJLGtCQUFrQixDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDO2dCQUNwRCxPQUFPO2FBQ1AsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLGNBQWMsQ0FBQyxDQUFDLE9BQWUsRUFBRSxFQUFFO1lBQ2xFLE1BQU0sT0FBTyxHQUFHLElBQUksR0FBRyxFQUFzQixDQUFDO1lBQzlDLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxHQUFHLEVBQXNCLENBQUM7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