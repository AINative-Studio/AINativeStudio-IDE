/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { matchesFuzzy, matchesFuzzy2 } from '../../../../base/common/filters.js';
import { splitGlobAware, getEmptyExpression, parse } from '../../../../base/common/glob.js';
import * as strings from '../../../../base/common/strings.js';
import { relativePath } from '../../../../base/common/resources.js';
import { TernarySearchTree } from '../../../../base/common/ternarySearchTree.js';
export class ResourceGlobMatcher {
    constructor(globalExpression, rootExpressions, uriIdentityService) {
        this.globalExpression = parse(globalExpression);
        this.expressionsByRoot = TernarySearchTree.forUris(uri => uriIdentityService.extUri.ignorePathCasing(uri));
        for (const expression of rootExpressions) {
            this.expressionsByRoot.set(expression.root, { root: expression.root, expression: parse(expression.expression) });
        }
    }
    matches(resource) {
        const rootExpression = this.expressionsByRoot.findSubstr(resource);
        if (rootExpression) {
            const path = relativePath(rootExpression.root, resource);
            if (path && !!rootExpression.expression(path)) {
                return true;
            }
        }
        return !!this.globalExpression(resource.path);
    }
}
export class FilterOptions {
    static { this._filter = matchesFuzzy2; }
    static { this._messageFilter = matchesFuzzy; }
    static EMPTY(uriIdentityService) { return new FilterOptions('', [], false, false, false, uriIdentityService); }
    constructor(filter, filesExclude, showWarnings, showErrors, showInfos, uriIdentityService) {
        this.filter = filter;
        this.showWarnings = false;
        this.showErrors = false;
        this.showInfos = false;
        filter = filter.trim();
        this.showWarnings = showWarnings;
        this.showErrors = showErrors;
        this.showInfos = showInfos;
        const filesExcludeByRoot = Array.isArray(filesExclude) ? filesExclude : [];
        const excludesExpression = Array.isArray(filesExclude) ? getEmptyExpression() : filesExclude;
        for (const { expression } of filesExcludeByRoot) {
            for (const pattern of Object.keys(expression)) {
                if (!pattern.endsWith('/**')) {
                    // Append `/**` to pattern to match a parent folder #103631
                    expression[`${strings.rtrim(pattern, '/')}/**`] = expression[pattern];
                }
            }
        }
        const negate = filter.startsWith('!');
        this.textFilter = { text: (negate ? strings.ltrim(filter, '!') : filter).trim(), negate };
        const includeExpression = getEmptyExpression();
        if (filter) {
            const filters = splitGlobAware(filter, ',').map(s => s.trim()).filter(s => !!s.length);
            for (const f of filters) {
                if (f.startsWith('!')) {
                    const filterText = strings.ltrim(f, '!');
                    if (filterText) {
                        this.setPattern(excludesExpression, filterText);
                    }
                }
                else {
                    this.setPattern(includeExpression, f);
                }
            }
        }
        this.excludesMatcher = new ResourceGlobMatcher(excludesExpression, filesExcludeByRoot, uriIdentityService);
        this.includesMatcher = new ResourceGlobMatcher(includeExpression, [], uriIdentityService);
    }
    setPattern(expression, pattern) {
        if (pattern[0] === '.') {
            pattern = '*' + pattern; // convert ".js" to "*.js"
        }
        expression[`**/${pattern}/**`] = true;
        expression[`**/${pattern}`] = true;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Vyc0ZpbHRlck9wdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWFya2Vycy9icm93c2VyL21hcmtlcnNGaWx0ZXJPcHRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBVyxZQUFZLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDMUYsT0FBTyxFQUFlLGNBQWMsRUFBRSxrQkFBa0IsRUFBb0IsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDM0gsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUU5RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDcEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFHakYsTUFBTSxPQUFPLG1CQUFtQjtJQUsvQixZQUNDLGdCQUE2QixFQUM3QixlQUF5RCxFQUN6RCxrQkFBdUM7UUFFdkMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ2hELElBQUksQ0FBQyxpQkFBaUIsR0FBRyxpQkFBaUIsQ0FBQyxPQUFPLENBQThDLEdBQUcsQ0FBQyxFQUFFLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDeEosS0FBSyxNQUFNLFVBQVUsSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUMxQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsVUFBVSxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUUsS0FBSyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENB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