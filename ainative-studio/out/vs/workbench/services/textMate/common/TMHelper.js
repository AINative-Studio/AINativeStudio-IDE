/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function findMatchingThemeRule(theme, scopes, onlyColorRules = true) {
    for (let i = scopes.length - 1; i >= 0; i--) {
        const parentScopes = scopes.slice(0, i);
        const scope = scopes[i];
        const r = findMatchingThemeRule2(theme, scope, parentScopes, onlyColorRules);
        if (r) {
            return r;
        }
    }
    return null;
}
function findMatchingThemeRule2(theme, scope, parentScopes, onlyColorRules) {
    let result = null;
    // Loop backwards, to ensure the last most specific rule wins
    for (let i = theme.tokenColors.length - 1; i >= 0; i--) {
        const rule = theme.tokenColors[i];
        if (onlyColorRules && !rule.settings.foreground) {
            continue;
        }
        let selectors;
        if (typeof rule.scope === 'string') {
            selectors = rule.scope.split(/,/).map(scope => scope.trim());
        }
        else if (Array.isArray(rule.scope)) {
            selectors = rule.scope;
        }
        else {
            continue;
        }
        for (let j = 0, lenJ = selectors.length; j < lenJ; j++) {
            const rawSelector = selectors[j];
            const themeRule = new ThemeRule(rawSelector, rule.settings);
            if (themeRule.matches(scope, parentScopes)) {
                if (themeRule.isMoreSpecific(result)) {
                    result = themeRule;
                }
            }
        }
    }
    return result;
}
export class ThemeRule {
    constructor(rawSelector, settings) {
        this.rawSelector = rawSelector;
        this.settings = settings;
        const rawSelectorPieces = this.rawSelector.split(/ /);
        this.scope = rawSelectorPieces[rawSelectorPieces.length - 1];
        this.parentScopes = rawSelectorPieces.slice(0, rawSelectorPieces.length - 1);
    }
    matches(scope, parentScopes) {
        return ThemeRule._matches(this.scope, this.parentScopes, scope, parentScopes);
    }
    static _cmp(a, b) {
        if (a === null && b === null) {
            return 0;
        }
        if (a === null) {
            // b > a
            return -1;
        }
        if (b === null) {
            // a > b
            return 1;
        }
        if (a.scope.length !== b.scope.length) {
            // longer scope length > shorter scope length
            return a.scope.length - b.scope.length;
        }
        const aParentScopesLen = a.parentScopes.length;
        const bParentScopesLen = b.parentScopes.length;
        if (aParentScopesLen !== bParentScopesLen) {
            // more parents > less parents
            return aParentScopesLen - bParentScopesLen;
        }
        for (let i = 0; i < aParentScopesLen; i++) {
            const aLen = a.parentScopes[i].length;
            const bLen = b.parentScopes[i].length;
            if (aLen !== bLen) {
                return aLen - bLen;
            }
        }
        return 0;
    }
    isMoreSpecific(other) {
        return (ThemeRule._cmp(this, other) > 0);
    }
    static _matchesOne(selectorScope, scope) {
        const selectorPrefix = selectorScope + '.';
        if (selectorScope === scope || scope.substring(0, selectorPrefix.length) === selectorPrefix) {
            return true;
        }
        return false;
    }
    static _matches(selectorScope, selectorParentScopes, scope, parentScopes) {
        if (!this._matchesOne(selectorScope, scope)) {
            return false;
        }
        let selectorParentIndex = selectorParentScopes.length - 1;
        let parentIndex = parentScopes.length - 1;
        while (selectorParentIndex >= 0 && parentIndex >= 0) {
            if (this._matchesOne(selectorParentScopes[selectorParentIndex], parentScopes[parentIndex])) {
                selectorParentIndex--;
            }
            parentIndex--;
        }
        if (selectorParentIndex === -1) {
            return true;
        }
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVE1IZWxwZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RleHRNYXRlL2NvbW1vbi9UTUhlbHBlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQWtCaEcsTUFBTSxVQUFVLHFCQUFxQixDQUFDLEtBQWtCLEVBQUUsTUFBZ0IsRUFBRSxpQkFBMEIsSUFBSTtJQUN6RyxLQUFLLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUM3QyxNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN4QyxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsTUFBTSxDQUFDLEdBQUcsc0JBQXNCLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDN0UsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNQLE9BQU8sQ0FBQyxDQUFDO1FBQ1YsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNiLENBQUM7QUFFRCxTQUFTLHNCQUFzQixDQUFDLEtBQWtCLEVBQUUsS0FBYSxFQUFFLFlBQXNCLEVBQUUsY0FBdUI7SUFDakgsSUFBSSxNQUFNLEdBQXFCLElBQUksQ0FBQztJQUVwQyw2REFBNkQ7SUFDN0QsS0FBSyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ3hELE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FB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