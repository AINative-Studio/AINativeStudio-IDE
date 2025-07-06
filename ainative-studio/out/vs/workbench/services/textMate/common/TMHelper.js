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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVE1IZWxwZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZXh0TWF0ZS9jb21tb24vVE1IZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFrQmhHLE1BQU0sVUFBVSxxQkFBcUIsQ0FBQyxLQUFrQixFQUFFLE1BQWdCLEVBQUUsaUJBQTBCLElBQUk7SUFDekcsS0FBSyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDN0MsTUFBTSxZQUFZLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDeEMsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLE1BQU0sQ0FBQyxHQUFHLHNCQUFzQixDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQzdFLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDUCxPQUFPLENBQUMsQ0FBQztRQUNWLENBQUM7SUFDRixDQUFDO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDYixDQUFDO0FBRUQsU0FBUyxzQkFBc0IsQ0FBQyxLQUFrQixFQUFFLEtBQWEsRUFBRSxZQUFzQixFQUFFLGNBQXVCO0lBQ2pILElBQUksTUFBTSxHQUFxQixJQUFJLENBQUM7SUFFcEMsNkRBQTZEO0lBQzdELEtBQUssSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUN4RCxNQUFNLElBQUksR0FBRyxLQUFL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