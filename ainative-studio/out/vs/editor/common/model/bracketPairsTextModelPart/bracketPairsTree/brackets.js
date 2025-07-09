/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { escapeRegExpCharacters } from '../../../../../base/common/strings.js';
import { BracketAstNode } from './ast.js';
import { toLength } from './length.js';
import { identityKeyProvider, SmallImmutableSet } from './smallImmutableSet.js';
import { Token } from './tokenizer.js';
export class BracketTokens {
    static createFromLanguage(configuration, denseKeyProvider) {
        function getId(bracketInfo) {
            return denseKeyProvider.getKey(`${bracketInfo.languageId}:::${bracketInfo.bracketText}`);
        }
        const map = new Map();
        for (const openingBracket of configuration.bracketsNew.openingBrackets) {
            const length = toLength(0, openingBracket.bracketText.length);
            const openingTextId = getId(openingBracket);
            const bracketIds = SmallImmutableSet.getEmpty().add(openingTextId, identityKeyProvider);
            map.set(openingBracket.bracketText, new Token(length, 1 /* TokenKind.OpeningBracket */, openingTextId, bracketIds, BracketAstNode.create(length, openingBracket, bracketIds)));
        }
        for (const closingBracket of configuration.bracketsNew.closingBrackets) {
            const length = toLength(0, closingBracket.bracketText.length);
            let bracketIds = SmallImmutableSet.getEmpty();
            const closingBrackets = closingBracket.getOpeningBrackets();
            for (const bracket of closingBrackets) {
                bracketIds = bracketIds.add(getId(bracket), identityKeyProvider);
            }
            map.set(closingBracket.bracketText, new Token(length, 2 /* TokenKind.ClosingBracket */, getId(closingBrackets[0]), bracketIds, BracketAstNode.create(length, closingBracket, bracketIds)));
        }
        return new BracketTokens(map);
    }
    constructor(map) {
        this.map = map;
        this.hasRegExp = false;
        this._regExpGlobal = null;
    }
    getRegExpStr() {
        if (this.isEmpty) {
            return null;
        }
        else {
            const keys = [...this.map.keys()];
            keys.sort();
            keys.reverse();
            return keys.map(k => prepareBracketForRegExp(k)).join('|');
        }
    }
    /**
     * Returns null if there is no such regexp (because there are no brackets).
    */
    get regExpGlobal() {
        if (!this.hasRegExp) {
            const regExpStr = this.getRegExpStr();
            this._regExpGlobal = regExpStr ? new RegExp(regExpStr, 'gi') : null;
            this.hasRegExp = true;
        }
        return this._regExpGlobal;
    }
    getToken(value) {
        return this.map.get(value.toLowerCase());
    }
    findClosingTokenText(openingBracketIds) {
        for (const [closingText, info] of this.map) {
            if (info.kind === 2 /* TokenKind.ClosingBracket */ && info.bracketIds.intersects(openingBracketIds)) {
                return closingText;
            }
        }
        return undefined;
    }
    get isEmpty() {
        return this.map.size === 0;
    }
}
function prepareBracketForRegExp(str) {
    let escaped = escapeRegExpCharacters(str);
    // These bracket pair delimiters start or end with letters
    // see https://github.com/microsoft/vscode/issues/132162 https://github.com/microsoft/vscode/issues/150440
    if (/^[\w ]+/.test(str)) {
        escaped = `\\b${escaped}`;
    }
    if (/[\w ]+$/.test(str)) {
        escaped = `${escaped}\\b`;
    }
    return escaped;
}
export class LanguageAgnosticBracketTokens {
    constructor(denseKeyProvider, getLanguageConfiguration) {
        this.denseKeyProvider = denseKeyProvider;
        this.getLanguageConfiguration = getLanguageConfiguration;
        this.languageIdToBracketTokens = new Map();
    }
    didLanguageChange(languageId) {
        // Report a change whenever the language configuration updates.
        return this.languageIdToBracketTokens.has(languageId);
    }
    getSingleLanguageBracketTokens(languageId) {
        let singleLanguageBracketTokens = this.languageIdToBracketTokens.get(languageId);
        if (!singleLanguageBracketTokens) {
            singleLanguageBracketTokens = BracketTokens.createFromLanguage(this.getLanguageConfiguration(languageId), this.denseKeyProvider);
            this.languageIdToBracketTokens.set(languageId, singleLanguageBracketTokens);
        }
        return singleLanguageBracketTokens;
    }
    getToken(value, languageId) {
        const singleLanguageBracketTokens = this.getSingleLanguageBracketTokens(languageId);
        return singleLanguageBracketTokens.getToken(value);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJhY2tldHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC9icmFja2V0UGFpcnNUZXh0TW9kZWxQYXJ0L2JyYWNrZXRQYWlyc1RyZWUvYnJhY2tldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFHL0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUMxQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQ3ZDLE9BQU8sRUFBb0IsbUJBQW1CLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUNsRyxPQUFPLEVBQW9CLEtBQUssRUFBYSxNQUFNLGdCQUFnQixDQUFDO0FBRXBFLE1BQU0sT0FBTyxhQUFhO0lBQ3pCLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxhQUE0QyxFQUFFLGdCQUEwQztRQUNqSCxTQUFTLEtBQUssQ0FBQyxXQUF3QjtZQUN0QyxPQUFPLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxVQUFVLE1BQU0sV0FBVyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFDMUYsQ0FBQztRQUVELE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxFQUFpQixDQUFDO1FBQ3JDLEtBQUssTUFBTSxjQUFjLElBQUksYUFBYSxDQUFDLFdBQVcsQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN4RSxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDOUQsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQzVDLE1BQU0s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