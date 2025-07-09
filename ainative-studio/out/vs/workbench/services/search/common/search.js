/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { mapArrayOrNot } from '../../../../base/common/arrays.js';
import * as glob from '../../../../base/common/glob.js';
import * as objects from '../../../../base/common/objects.js';
import * as extpath from '../../../../base/common/extpath.js';
import { fuzzyContains, getNLines } from '../../../../base/common/strings.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import * as paths from '../../../../base/common/path.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { TextSearchCompleteMessageType } from './searchExtTypes.js';
import { isThenable } from '../../../../base/common/async.js';
export { TextSearchCompleteMessageType };
export const VIEWLET_ID = 'workbench.view.search';
export const PANEL_ID = 'workbench.panel.search';
export const VIEW_ID = 'workbench.view.search';
export const SEARCH_RESULT_LANGUAGE_ID = 'search-result';
export const SEARCH_EXCLUDE_CONFIG = 'search.exclude';
export const DEFAULT_MAX_SEARCH_RESULTS = 20000;
// Warning: this pattern is used in the search editor to detect offsets. If you
// change this, also change the search-result built-in extension
const SEARCH_ELIDED_PREFIX = '⟪ ';
const SEARCH_ELIDED_SUFFIX = ' characters skipped ⟫';
const SEARCH_ELIDED_MIN_LEN = (SEARCH_ELIDED_PREFIX.length + SEARCH_ELIDED_SUFFIX.length + 5) * 2;
export const ISearchService = createDecorator('searchService');
/**
 * TODO@roblou - split text from file search entirely, or share code in a more natural way.
 */
export var SearchProviderType;
(function (SearchProviderType) {
    SearchProviderType[SearchProviderType["file"] = 0] = "file";
    SearchProviderType[SearchProviderType["text"] = 1] = "text";
    SearchProviderType[SearchProviderType["aiText"] = 2] = "aiText";
})(SearchProviderType || (SearchProviderType = {}));
export var QueryType;
(function (QueryType) {
    QueryType[QueryType["File"] = 1] = "File";
    QueryType[QueryType["Text"] = 2] = "Text";
    QueryType[QueryType["aiText"] = 3] = "aiText";
})(QueryType || (QueryType = {}));
export function resultIsMatch(result) {
    return !!result.rangeLocations && !!result.previewText;
}
export function isFileMatch(p) {
    return !!p.resource;
}
export function isProgressMessage(p) {
    return !!p.message;
}
export var SearchCompletionExitCode;
(function (SearchCompletionExitCode) {
    SearchCompletionExitCode[SearchCompletionExitCode["Normal"] = 0] = "Normal";
    SearchCompletionExitCode[SearchCompletionExitCode["NewSearchStarted"] = 1] = "NewSearchStarted";
})(SearchCompletionExitCode || (SearchCompletionExitCode = {}));
export class FileMatch {
    constructor(resource) {
        this.resource = resource;
        this.results = [];
        // empty
    }
}
export class TextSearchMatch {
    constructor(text, ranges, previewOptions, webviewIndex) {
        this.rangeLocations = [];
        this.webviewIndex = webviewIndex;
        // Trim preview if this is one match and a single-line match with a preview requested.
        // Otherwise send the full text, like for replace or for showing multiple previews.
        // TODO this is fishy.
        const rangesArr = Array.isArray(ranges) ? ranges : [ranges];
        if (previewOptions && previewOptions.matchLines === 1 && isSingleLineRangeList(rangesArr)) {
            // 1 line preview requested
            text = getNLines(text, previewOptions.matchLines);
            let result = '';
            let shift = 0;
            let lastEnd = 0;
            const leadingChars = Math.floor(previewOptions.charsPerLine / 5);
            for (const range of rangesArr) {
                const previewStart = Math.max(range.startColumn - leadingChars, 0);
                const previewEnd = range.startColumn + previewOptions.charsPerLine;
                if (previewStart > lastEnd + leadingChars + SEARCH_ELIDED_MIN_LEN) {
                    const elision = SEARCH_ELIDED_PREFIX + (previewStart - lastEnd) + SEARCH_ELIDED_SUFFIX;
                    result += elision + text.slice(previewStart, previewEnd);
                    shift += previewStart - (lastEnd + elision.length);
                }
                else {
                    result += text.slice(lastEnd, previewEnd);
                }
                lastEnd = previewEnd;
                this.rangeLocations.push({
                    source: range,
                    preview: new OneLineRange(0, range.startColumn - shift, range.endColumn - shift)
                });
            }
            this.previewText = result;
        }
        else {
            const firstMatchLine = Array.isArray(ranges) ? ranges[0].startLineNumber : ranges.startLineNumber;
            const rangeLocs = mapArrayOrNot(ranges, r => ({
                preview: new SearchRange(r.startLineNumber - firstMatchLine, r.startColumn, r.endLineNumber - firstMatchLine, r.endColumn),
                source: r
            }));
            this.rangeLocations = Array.isArray(rangeLocs) ? rangeLocs : [rangeLocs];
            this.previewText = text;
        }
    }
}
function isSingleLineRangeList(ranges) {
    const line = ranges[0].startLineNumber;
    for (const r of ranges) {
        if (r.startLineNumber !== line || r.endLineNumber !== line) {
            return false;
        }
    }
    return true;
}
export class SearchRange {
    constructor(startLineNumber, startColumn, endLineNumber, endColumn) {
        this.startLineNumber = startLineNumber;
        this.startColumn = startColumn;
        this.endLineNumber = endLineNumber;
        this.endColumn = endColumn;
    }
}
export class OneLineRange extends SearchRange {
    constructor(lineNumber, startColumn, endColumn) {
        super(lineNumber, startColumn, lineNumber, endColumn);
    }
}
export var ViewMode;
(function (ViewMode) {
    ViewMode["List"] = "list";
    ViewMode["Tree"] = "tree";
})(ViewMode || (ViewMode = {}));
export var SearchSortOrder;
(function (SearchSortOrder) {
    SearchSortOrder["Default"] = "default";
    SearchSortOrder["FileNames"] = "fileNames";
    SearchSortOrder["Type"] = "type";
    SearchSortOrder["Modified"] = "modified";
    SearchSortOrder["CountDescending"] = "countDescending";
    SearchSortOrder["CountAscending"] = "countAscending";
})(SearchSortOrder || (SearchSortOrder = {}));
export function getExcludes(configuration, includeSearchExcludes = true) {
    const fileExcludes = configuration && configuration.files && configuration.files.exclude;
    const searchExcludes = includeSearchExcludes && configuration && configuration.search && configuration.search.exclude;
    if (!fileExcludes && !searchExcludes) {
        return undefined;
    }
    if (!fileExcludes || !searchExcludes) {
        return fileExcludes || searchExcludes || undefined;
    }
    let allExcludes = Object.create(null);
    // clone the config as it could be frozen
    allExcludes = objects.mixin(allExcludes, objects.deepClone(fileExcludes));
    allExcludes = objects.mixin(allExcludes, objects.deepClone(searchExcludes), true);
    return allExcludes;
}
export function pathIncludedInQuery(queryProps, fsPath) {
    if (queryProps.excludePattern && glob.match(queryProps.excludePattern, fsPath)) {
        return false;
    }
    if (queryProps.includePattern || queryProps.usingSearchPaths) {
        if (queryProps.includePattern && glob.match(queryProps.includePattern, fsPath)) {
            return true;
        }
        // If searchPaths are being used, the extra file must be in a subfolder and match the pattern, if present
        if (queryProps.usingSearchPaths) {
            return !!queryProps.folderQueries && queryProps.folderQueries.some(fq => {
                const searchPath = fq.folder.fsPath;
                if (extpath.isEqualOrParent(fsPath, searchPath)) {
                    const relPath = paths.relative(searchPath, fsPath);
                    return !fq.includePattern || !!glob.match(fq.includePattern, relPath);
                }
                else {
                    return false;
                }
            });
        }
        return false;
    }
    return true;
}
export var SearchErrorCode;
(function (SearchErrorCode) {
    SearchErrorCode[SearchErrorCode["unknownEncoding"] = 1] = "unknownEncoding";
    SearchErrorCode[SearchErrorCode["regexParseError"] = 2] = "regexParseError";
    SearchErrorCode[SearchErrorCode["globParseError"] = 3] = "globParseError";
    SearchErrorCode[SearchErrorCode["invalidLiteral"] = 4] = "invalidLiteral";
    SearchErrorCode[SearchErrorCode["rgProcessError"] = 5] = "rgProcessError";
    SearchErrorCode[SearchErrorCode["other"] = 6] = "other";
    SearchErrorCode[SearchErrorCode["canceled"] = 7] = "canceled";
})(SearchErrorCode || (SearchErrorCode = {}));
export class SearchError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
    }
}
export function deserializeSearchError(error) {
    const errorMsg = error.message;
    if (isCancellationError(error)) {
        return new SearchError(errorMsg, SearchErrorCode.canceled);
    }
    try {
        const details = JSON.parse(errorMsg);
        return new SearchError(details.message, details.code);
    }
    catch (e) {
        return new SearchError(errorMsg, SearchErrorCode.other);
    }
}
export function serializeSearchError(searchError) {
    const details = { message: searchError.message, code: searchError.code };
    return new Error(JSON.stringify(details));
}
export function isSerializedSearchComplete(arg) {
    if (arg.type === 'error') {
        return true;
    }
    else if (arg.type === 'success') {
        return true;
    }
    else {
        return false;
    }
}
export function isSerializedSearchSuccess(arg) {
    return arg.type === 'success';
}
export function isSerializedFileMatch(arg) {
    return !!arg.path;
}
export function isFilePatternMatch(candidate, filePatternToUse, fuzzy = true) {
    const pathToMatch = candidate.searchPath ? candidate.searchPath : candidate.relativePath;
    return fuzzy ?
        fuzzyContains(pathToMatch, filePatternToUse) :
        glob.match(filePatternToUse, pathToMatch);
}
export class SerializableFileMatch {
    constructor(path) {
        this.path = path;
        this.results = [];
    }
    addMatch(match) {
        this.results.push(match);
    }
    serialize() {
        return {
            path: this.path,
            results: this.results,
            numMatches: this.results.length
        };
    }
}
/**
 *  Computes the patterns that the provider handles. Discards sibling clauses and 'false' patterns
 */
export function resolvePatternsForProvider(globalPattern, folderPattern) {
    const merged = {
        ...(globalPattern || {}),
        ...(folderPattern || {})
    };
    return Object.keys(merged)
        .filter(key => {
        const value = merged[key];
        return typeof value === 'boolean' && value;
    });
}
export class QueryGlobTester {
    constructor(config, folderQuery) {
        this._parsedIncludeExpression = null;
        // todo: try to incorporate folderQuery.excludePattern.folder if available
        this._excludeExpression = folderQuery.excludePattern?.map(excludePattern => {
            return {
                ...(config.excludePattern || {}),
                ...(excludePattern.pattern || {})
            };
        }) ?? [];
        if (this._excludeExpression.length === 0) {
            // even if there are no folderQueries, we want to observe  the global excludes
            this._excludeExpression = [config.excludePattern || {}];
        }
        this._parsedExcludeExpression = this._excludeExpression.map(e => glob.parse(e));
        // Empty includeExpression means include nothing, so no {} shortcuts
        let includeExpression = config.includePattern;
        if (folderQuery.includePattern) {
            if (includeExpression) {
                includeExpression = {
                    ...includeExpression,
                    ...folderQuery.includePattern
                };
            }
            else {
                includeExpression = folderQuery.includePattern;
            }
        }
        if (includeExpression) {
            this._parsedIncludeExpression = glob.parse(includeExpression);
        }
    }
    _evalParsedExcludeExpression(testPath, basename, hasSibling) {
        // todo: less hacky way of evaluating sync vs async sibling clauses
        let result = null;
        for (const folderExclude of this._parsedExcludeExpression) {
            // find first non-null result
            const evaluation = folderExclude(testPath, basename, hasSibling);
            if (typeof evaluation === 'string') {
                result = evaluation;
                break;
            }
        }
        return result;
    }
    matchesExcludesSync(testPath, basename, hasSibling) {
        if (this._parsedExcludeExpression && this._evalParsedExcludeExpression(testPath, basename, hasSibling)) {
            return true;
        }
        return false;
    }
    /**
     * Guaranteed sync - siblingsFn should not return a promise.
     */
    includedInQuerySync(testPath, basename, hasSibling) {
        if (this._parsedExcludeExpression && this._evalParsedExcludeExpression(testPath, basename, hasSibling)) {
            return false;
        }
        if (this._parsedIncludeExpression && !this._parsedIncludeExpression(testPath, basename, hasSibling)) {
            return false;
        }
        return true;
    }
    /**
     * Evaluating the exclude expression is only async if it includes sibling clauses. As an optimization, avoid doing anything with Promises
     * unless the expression is async.
     */
    includedInQuery(testPath, basename, hasSibling) {
        const isIncluded = () => {
            return this._parsedIncludeExpression ?
                !!(this._parsedIncludeExpression(testPath, basename, hasSibling)) :
                true;
        };
        return Promise.all(this._parsedExcludeExpression.map(e => {
            const excluded = e(testPath, basename, hasSibling);
            if (isThenable(excluded)) {
                return excluded.then(excluded => {
                    if (excluded) {
                        return false;
                    }
                    return isIncluded();
                });
            }
            return isIncluded();
        })).then(e => e.some(e => !!e));
    }
    hasSiblingExcludeClauses() {
        return this._excludeExpression.reduce((prev, curr) => hasSiblingClauses(curr) || prev, false);
    }
}
function hasSiblingClauses(pattern) {
    for (const key in pattern) {
        if (typeof pattern[key] !== 'boolean') {
            return true;
        }
    }
    return false;
}
export function hasSiblingPromiseFn(siblingsFn) {
    if (!siblingsFn) {
        return undefined;
    }
    let siblings;
    return (name) => {
        if (!siblings) {
            siblings = (siblingsFn() || Promise.resolve([]))
                .then(list => list ? listToMap(list) : {});
        }
        return siblings.then(map => !!map[name]);
    };
}
export function hasSiblingFn(siblingsFn) {
    if (!siblingsFn) {
        return undefined;
    }
    let siblings;
    return (name) => {
        if (!siblings) {
            const list = siblingsFn();
            siblings = list ? listToMap(list) : {};
        }
        return !!siblings[name];
    };
}
function listToMap(list) {
    const map = {};
    for (const key of list) {
        map[key] = true;
    }
    return map;
}
export function excludeToGlobPattern(excludesForFolder) {
    return excludesForFolder.flatMap(exclude => exclude.patterns.map(pattern => {
        return exclude.baseUri ?
            {
                baseUri: exclude.baseUri,
                pattern: pattern
            } : pattern;
    }));
}
export const DEFAULT_TEXT_SEARCH_PREVIEW_OPTIONS = {
    matchLines: 100,
    charsPerLine: 10000
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvY29tbW9uL3NlYXJjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFbEUsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQztBQUV4RCxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFDO0FBQzlELE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUc5RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFHN0YsT0FBTyxLQUFLLEtBQUssTUFBTSxpQ0FBaUMsQ0FBQztBQUN6RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RSxPQUFPLEVBQWUsNkJBQTZCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNqRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFHOUQsT0FBTyxFQUFFLDZCQUE2QixFQUFFLENBQUM7QUFFekMsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHLHVCQUF1QixDQUFDO0FBQ2xELE1BQU0sQ0FBQyxNQUFNLFFBQVEsR0FBRyx3QkFBd0IsQ0FBQztBQUNqRCxNQUFNLENBQUMsTUFBTSxPQUFPLEdBQUcsdUJBQXVCLENBQUM7QUFDL0MsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsZUFBZSxDQUFDO0FBRXpELE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLGdCQUFnQixDQUFDO0FBQ3RELE1BQU0sQ0FBQyxN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