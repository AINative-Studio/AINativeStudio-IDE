/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { equals } from './arrays.js';
import { isThenable } from './async.js';
import { isEqualOrParent } from './extpath.js';
import { LRUCache } from './map.js';
import { basename, extname, posix, sep } from './path.js';
import { isLinux } from './platform.js';
import { escapeRegExpCharacters, ltrim } from './strings.js';
export function getEmptyExpression() {
    return Object.create(null);
}
export const GLOBSTAR = '**';
export const GLOB_SPLIT = '/';
const PATH_REGEX = '[/\\\\]'; // any slash or backslash
const NO_PATH_REGEX = '[^/\\\\]'; // any non-slash and non-backslash
const ALL_FORWARD_SLASHES = /\//g;
function starsToRegExp(starCount, isLastPattern) {
    switch (starCount) {
        case 0:
            return '';
        case 1:
            return `${NO_PATH_REGEX}*?`; // 1 star matches any number of characters except path separator (/ and \) - non greedy (?)
        default:
            // Matches:  (Path Sep OR Path Val followed by Path Sep) 0-many times except when it's the last pattern
            //           in which case also matches (Path Sep followed by Path Val)
            // Group is non capturing because we don't need to capture at all (?:...)
            // Overall we use non-greedy matching because it could be that we match too much
            return `(?:${PATH_REGEX}|${NO_PATH_REGEX}+${PATH_REGEX}${isLastPattern ? `|${PATH_REGEX}${NO_PATH_REGEX}+` : ''})*?`;
    }
}
export function splitGlobAware(pattern, splitChar) {
    if (!pattern) {
        return [];
    }
    const segments = [];
    let inBraces = false;
    let inBrackets = false;
    let curVal = '';
    for (const char of pattern) {
        switch (char) {
            case splitChar:
                if (!inBraces && !inBrackets) {
                    segments.push(curVal);
                    curVal = '';
                    continue;
                }
                break;
            case '{':
                inBraces = true;
                break;
            case '}':
                inBraces = false;
                break;
            case '[':
                inBrackets = true;
                break;
            case ']':
                inBrackets = false;
                break;
        }
        curVal += char;
    }
    // Tail
    if (curVal) {
        segments.push(curVal);
    }
    return segments;
}
function parseRegExp(pattern) {
    if (!pattern) {
        return '';
    }
    let regEx = '';
    // Split up into segments for each slash found
    const segments = splitGlobAware(pattern, GLOB_SPLIT);
    // Special case where we only have globstars
    if (segments.every(segment => segment === GLOBSTAR)) {
        regEx = '.*';
    }
    // Build regex over segments
    else {
        let previousSegmentWasGlobStar = false;
        segments.forEach((segment, index) => {
            // Treat globstar specially
            if (segment === GLOBSTAR) {
                // if we have more than one globstar after another, just ignore it
                if (previousSegmentWasGlobStar) {
                    return;
                }
                regEx += starsToRegExp(2, index === segments.length - 1);
            }
            // Anything else, not globstar
            else {
                // States
                let inBraces = false;
                let braceVal = '';
                let inBrackets = false;
                let bracketVal = '';
                for (const char of segment) {
                    // Support brace expansion
                    if (char !== '}' && inBraces) {
                        braceVal += char;
                        continue;
                    }
                    // Support brackets
                    if (inBrackets && (char !== ']' || !bracketVal) /* ] is literally only allowed as first character in brackets to match it */) {
                        let res;
                        // range operator
                        if (char === '-') {
                            res = char;
                        }
                        // negation operator (only valid on first index in bracket)
                        else if ((char === '^' || char === '!') && !bracketVal) {
                            res = '^';
                        }
                        // glob split matching is not allowed within character ranges
                        // see http://man7.org/linux/man-pages/man7/glob.7.html
                        else if (char === GLOB_SPLIT) {
                            res = '';
                        }
                        // anything else gets escaped
                        else {
                            res = escapeRegExpCharacters(char);
                        }
                        bracketVal += res;
                        continue;
                    }
                    switch (char) {
                        case '{':
                            inBraces = true;
                            continue;
                        case '[':
                            inBrackets = true;
                            continue;
                        case '}': {
                            const choices = splitGlobAware(braceVal, ',');
                            // Converts {foo,bar} => [foo|bar]
                            const braceRegExp = `(?:${choices.map(choice => parseRegExp(choice)).join('|')})`;
                            regEx += braceRegExp;
                            inBraces = false;
                            braceVal = '';
                            break;
                        }
                        case ']': {
                            regEx += ('[' + bracketVal + ']');
                            inBrackets = false;
                            bracketVal = '';
                            break;
                        }
                        case '?':
                            regEx += NO_PATH_REGEX; // 1 ? matches any single character except path separator (/ and \)
                            continue;
                        case '*':
                            regEx += starsToRegExp(1);
                            continue;
                        default:
                            regEx += escapeRegExpCharacters(char);
                    }
                }
                // Tail: Add the slash we had split on if there is more to
                // come and the remaining pattern is not a globstar
                // For example if pattern: some/**/*.js we want the "/" after
                // some to be included in the RegEx to prevent a folder called
                // "something" to match as well.
                if (index < segments.length - 1 && // more segments to come after this
                    (segments[index + 1] !== GLOBSTAR || // next segment is not **, or...
                        index + 2 < segments.length // ...next segment is ** but there is more segments after that
                    )) {
                    regEx += PATH_REGEX;
                }
            }
            // update globstar state
            previousSegmentWasGlobStar = (segment === GLOBSTAR);
        });
    }
    return regEx;
}
// regexes to check for trivial glob patterns that just check for String#endsWith
const T1 = /^\*\*\/\*\.[\w\.-]+$/; // **/*.something
const T2 = /^\*\*\/([\w\.-]+)\/?$/; // **/something
const T3 = /^{\*\*\/\*?[\w\.-]+\/?(,\*\*\/\*?[\w\.-]+\/?)*}$/; // {**/*.something,**/*.else} or {**/package.json,**/project.json}
const T3_2 = /^{\*\*\/\*?[\w\.-]+(\/(\*\*)?)?(,\*\*\/\*?[\w\.-]+(\/(\*\*)?)?)*}$/; // Like T3, with optional trailing /**
const T4 = /^\*\*((\/[\w\.-]+)+)\/?$/; // **/something/else
const T5 = /^([\w\.-]+(\/[\w\.-]+)*)\/?$/; // something/else
const CACHE = new LRUCache(10000); // bounded to 10000 elements
const FALSE = function () {
    return false;
};
const NULL = function () {
    return null;
};
function parsePattern(arg1, options) {
    if (!arg1) {
        return NULL;
    }
    // Handle relative patterns
    let pattern;
    if (typeof arg1 !== 'string') {
        pattern = arg1.pattern;
    }
    else {
        pattern = arg1;
    }
    // Whitespace trimming
    pattern = pattern.trim();
    // Check cache
    const patternKey = `${pattern}_${!!options.trimForExclusions}`;
    let parsedPattern = CACHE.get(patternKey);
    if (parsedPattern) {
        return wrapRelativePattern(parsedPattern, arg1);
    }
    // Check for Trivials
    let match;
    if (T1.test(pattern)) {
        parsedPattern = trivia1(pattern.substr(4), pattern); // common pattern: **/*.txt just need endsWith check
    }
    else if (match = T2.exec(trimForExclusions(pattern, options))) { // common pattern: **/some.txt just need basename check
        parsedPattern = trivia2(match[1], pattern);
    }
    else if ((options.trimForExclusions ? T3_2 : T3).test(pattern)) { // repetition of common patterns (see above) {**/*.txt,**/*.png}
        parsedPattern = trivia3(pattern, options);
    }
    else if (match = T4.exec(trimForExclusions(pattern, options))) { // common pattern: **/something/else just need endsWith check
        parsedPattern = trivia4and5(match[1].substr(1), pattern, true);
    }
    else if (match = T5.exec(trimForExclusions(pattern, options))) { // common pattern: something/else just need equals check
        parsedPattern = trivia4and5(match[1], pattern, false);
    }
    // Otherwise convert to pattern
    else {
        parsedPattern = toRegExp(pattern);
    }
    // Cache
    CACHE.set(patternKey, parsedPattern);
    return wrapRelativePattern(parsedPattern, arg1);
}
function wrapRelativePattern(parsedPattern, arg2) {
    if (typeof arg2 === 'string') {
        return parsedPattern;
    }
    const wrappedPattern = function (path, basename) {
        if (!isEqualOrParent(path, arg2.base, !isLinux)) {
            // skip glob matching if `base` is not a parent of `path`
            return null;
        }
        // Given we have checked `base` being a parent of `path`,
        // we can now remove the `base` portion of the `path`
        // and only match on the remaining path components
        // For that we try to extract the portion of the `path`
        // that comes after the `base` portion. We have to account
        // for the fact that `base` might end in a path separator
        // (https://github.com/microsoft/vscode/issues/162498)
        return parsedPattern(ltrim(path.substr(arg2.base.length), sep), basename);
    };
    // Make sure to preserve associated metadata
    wrappedPattern.allBasenames = parsedPattern.allBasenames;
    wrappedPattern.allPaths = parsedPattern.allPaths;
    wrappedPattern.basenames = parsedPattern.basenames;
    wrappedPattern.patterns = parsedPattern.patterns;
    return wrappedPattern;
}
function trimForExclusions(pattern, options) {
    return options.trimForExclusions && pattern.endsWith('/**') ? pattern.substr(0, pattern.length - 2) : pattern; // dropping **, tailing / is dropped later
}
// common pattern: **/*.txt just need endsWith check
function trivia1(base, pattern) {
    return function (path, basename) {
        return typeof path === 'string' && path.endsWith(base) ? pattern : null;
    };
}
// common pattern: **/some.txt just need basename check
function trivia2(base, pattern) {
    const slashBase = `/${base}`;
    const backslashBase = `\\${base}`;
    const parsedPattern = function (path, basename) {
        if (typeof path !== 'string') {
            return null;
        }
        if (basename) {
            return basename === base ? pattern : null;
        }
        return path === base || path.endsWith(slashBase) || path.endsWith(backslashBase) ? pattern : null;
    };
    const basenames = [base];
    parsedPattern.basenames = basenames;
    parsedPattern.patterns = [pattern];
    parsedPattern.allBasenames = basenames;
    return parsedPattern;
}
// repetition of common patterns (see above) {**/*.txt,**/*.png}
function trivia3(pattern, options) {
    const parsedPatterns = aggregateBasenameMatches(pattern.slice(1, -1)
        .split(',')
        .map(pattern => parsePattern(pattern, options))
        .filter(pattern => pattern !== NULL), pattern);
    const patternsLength = parsedPatterns.length;
    if (!patternsLength) {
        return NULL;
    }
    if (patternsLength === 1) {
        return parsedPatterns[0];
    }
    const parsedPattern = function (path, basename) {
        for (let i = 0, n = parsedPatterns.length; i < n; i++) {
            if (parsedPatterns[i](path, basename)) {
                return pattern;
            }
        }
        return null;
    };
    const withBasenames = parsedPatterns.find(pattern => !!pattern.allBasenames);
    if (withBasenames) {
        parsedPattern.allBasenames = withBasenames.allBasenames;
    }
    const allPaths = parsedPatterns.reduce((all, current) => current.allPaths ? all.concat(current.allPaths) : all, []);
    if (allPaths.length) {
        parsedPattern.allPaths = allPaths;
    }
    return parsedPattern;
}
// common patterns: **/something/else just need endsWith check, something/else just needs and equals check
function trivia4and5(targetPath, pattern, matchPathEnds) {
    const usingPosixSep = sep === posix.sep;
    const nativePath = usingPosixSep ? targetPath : targetPath.replace(ALL_FORWARD_SLASHES, sep);
    const nativePathEnd = sep + nativePath;
    const targetPathEnd = posix.sep + targetPath;
    let parsedPattern;
    if (matchPathEnds) {
        parsedPattern = function (path, basename) {
            return typeof path === 'string' && ((path === nativePath || path.endsWith(nativePathEnd)) || !usingPosixSep && (path === targetPath || path.endsWith(targetPathEnd))) ? pattern : null;
        };
    }
    else {
        parsedPattern = function (path, basename) {
            return typeof path === 'string' && (path === nativePath || (!usingPosixSep && path === targetPath)) ? pattern : null;
        };
    }
    parsedPattern.allPaths = [(matchPathEnds ? '*/' : './') + targetPath];
    return parsedPattern;
}
function toRegExp(pattern) {
    try {
        const regExp = new RegExp(`^${parseRegExp(pattern)}$`);
        return function (path) {
            regExp.lastIndex = 0; // reset RegExp to its initial state to reuse it!
            return typeof path === 'string' && regExp.test(path) ? pattern : null;
        };
    }
    catch (error) {
        return NULL;
    }
}
export function match(arg1, path, hasSibling) {
    if (!arg1 || typeof path !== 'string') {
        return false;
    }
    return parse(arg1)(path, undefined, hasSibling);
}
export function parse(arg1, options = {}) {
    if (!arg1) {
        return FALSE;
    }
    // Glob with String
    if (typeof arg1 === 'string' || isRelativePattern(arg1)) {
        const parsedPattern = parsePattern(arg1, options);
        if (parsedPattern === NULL) {
            return FALSE;
        }
        const resultPattern = function (path, basename) {
            return !!parsedPattern(path, basename);
        };
        if (parsedPattern.allBasenames) {
            resultPattern.allBasenames = parsedPattern.allBasenames;
        }
        if (parsedPattern.allPaths) {
            resultPattern.allPaths = parsedPattern.allPaths;
        }
        return resultPattern;
    }
    // Glob with Expression
    return parsedExpression(arg1, options);
}
export function isRelativePattern(obj) {
    const rp = obj;
    if (!rp) {
        return false;
    }
    return typeof rp.base === 'string' && typeof rp.pattern === 'string';
}
export function getBasenameTerms(patternOrExpression) {
    return patternOrExpression.allBasenames || [];
}
export function getPathTerms(patternOrExpression) {
    return patternOrExpression.allPaths || [];
}
function parsedExpression(expression, options) {
    const parsedPatterns = aggregateBasenameMatches(Object.getOwnPropertyNames(expression)
        .map(pattern => parseExpressionPattern(pattern, expression[pattern], options))
        .filter(pattern => pattern !== NULL));
    const patternsLength = parsedPatterns.length;
    if (!patternsLength) {
        return NULL;
    }
    if (!parsedPatterns.some(parsedPattern => !!parsedPattern.requiresSiblings)) {
        if (patternsLength === 1) {
            return parsedPatterns[0];
        }
        const resultExpression = function (path, basename) {
            let resultPromises = undefined;
            for (let i = 0, n = parsedPatterns.length; i < n; i++) {
                const result = parsedPatterns[i](path, basename);
                if (typeof result === 'string') {
                    return result; // immediately return as soon as the first expression matches
                }
                // If the result is a promise, we have to keep it for
                // later processing and await the result properly.
                if (isThenable(result)) {
                    if (!resultPromises) {
                        resultPromises = [];
                    }
                    resultPromises.push(result);
                }
            }
            // With result promises, we have to loop over each and
            // await the result before we can return any result.
            if (resultPromises) {
                return (async () => {
                    for (const resultPromise of resultPromises) {
                        const result = await resultPromise;
                        if (typeof result === 'string') {
                            return result;
                        }
                    }
                    return null;
                })();
            }
            return null;
        };
        const withBasenames = parsedPatterns.find(pattern => !!pattern.allBasenames);
        if (withBasenames) {
            resultExpression.allBasenames = withBasenames.allBasenames;
        }
        const allPaths = parsedPatterns.reduce((all, current) => current.allPaths ? all.concat(current.allPaths) : all, []);
        if (allPaths.length) {
            resultExpression.allPaths = allPaths;
        }
        return resultExpression;
    }
    const resultExpression = function (path, base, hasSibling) {
        let name = undefined;
        let resultPromises = undefined;
        for (let i = 0, n = parsedPatterns.length; i < n; i++) {
            // Pattern matches path
            const parsedPattern = parsedPatterns[i];
            if (parsedPattern.requiresSiblings && hasSibling) {
                if (!base) {
                    base = basename(path);
                }
                if (!name) {
                    name = base.substr(0, base.length - extname(path).length);
                }
            }
            const result = parsedPattern(path, base, name, hasSibling);
            if (typeof result === 'string') {
                return result; // immediately return as soon as the first expression matches
            }
            // If the result is a promise, we have to keep it for
            // later processing and await the result properly.
            if (isThenable(result)) {
                if (!resultPromises) {
                    resultPromises = [];
                }
                resultPromises.push(result);
            }
        }
        // With result promises, we have to loop over each and
        // await the result before we can return any result.
        if (resultPromises) {
            return (async () => {
                for (const resultPromise of resultPromises) {
                    const result = await resultPromise;
                    if (typeof result === 'string') {
                        return result;
                    }
                }
                return null;
            })();
        }
        return null;
    };
    const withBasenames = parsedPatterns.find(pattern => !!pattern.allBasenames);
    if (withBasenames) {
        resultExpression.allBasenames = withBasenames.allBasenames;
    }
    const allPaths = parsedPatterns.reduce((all, current) => current.allPaths ? all.concat(current.allPaths) : all, []);
    if (allPaths.length) {
        resultExpression.allPaths = allPaths;
    }
    return resultExpression;
}
function parseExpressionPattern(pattern, value, options) {
    if (value === false) {
        return NULL; // pattern is disabled
    }
    const parsedPattern = parsePattern(pattern, options);
    if (parsedPattern === NULL) {
        return NULL;
    }
    // Expression Pattern is <boolean>
    if (typeof value === 'boolean') {
        return parsedPattern;
    }
    // Expression Pattern is <SiblingClause>
    if (value) {
        const when = value.when;
        if (typeof when === 'string') {
            const result = (path, basename, name, hasSibling) => {
                if (!hasSibling || !parsedPattern(path, basename)) {
                    return null;
                }
                const clausePattern = when.replace('$(basename)', () => name);
                const matched = hasSibling(clausePattern);
                return isThenable(matched) ?
                    matched.then(match => match ? pattern : null) :
                    matched ? pattern : null;
            };
            result.requiresSiblings = true;
            return result;
        }
    }
    // Expression is anything
    return parsedPattern;
}
function aggregateBasenameMatches(parsedPatterns, result) {
    const basenamePatterns = parsedPatterns.filter(parsedPattern => !!parsedPattern.basenames);
    if (basenamePatterns.length < 2) {
        return parsedPatterns;
    }
    const basenames = basenamePatterns.reduce((all, current) => {
        const basenames = current.basenames;
        return basenames ? all.concat(basenames) : all;
    }, []);
    let patterns;
    if (result) {
        patterns = [];
        for (let i = 0, n = basenames.length; i < n; i++) {
            patterns.push(result);
        }
    }
    else {
        patterns = basenamePatterns.reduce((all, current) => {
            const patterns = current.patterns;
            return patterns ? all.concat(patterns) : all;
        }, []);
    }
    const aggregate = function (path, basename) {
        if (typeof path !== 'string') {
            return null;
        }
        if (!basename) {
            let i;
            for (i = path.length; i > 0; i--) {
                const ch = path.charCodeAt(i - 1);
                if (ch === 47 /* CharCode.Slash */ || ch === 92 /* CharCode.Backslash */) {
                    break;
                }
            }
            basename = path.substr(i);
        }
        const index = basenames.indexOf(basename);
        return index !== -1 ? patterns[index] : null;
    };
    aggregate.basenames = basenames;
    aggregate.patterns = patterns;
    aggregate.allBasenames = basenames;
    const aggregatedPatterns = parsedPatterns.filter(parsedPattern => !parsedPattern.basenames);
    aggregatedPatterns.push(aggregate);
    return aggregatedPatterns;
}
export function patternsEquals(patternsA, patternsB) {
    return equals(patternsA, patternsB, (a, b) => {
        if (typeof a === 'string' && typeof b === 'string') {
            return a === b;
        }
        if (typeof a !== 'string' && typeof b !== 'string') {
            return a.base === b.base && a.pattern === b.pattern;
        }
        return false;
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xvYi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9nbG9iLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDckMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUV4QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQy9DLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDcEMsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUMxRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3hDLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxLQUFLLEVBQUUsTUFBTSxjQUFjLENBQUM7QUF1QjdELE1BQU0sVUFBVSxrQkFBa0I7SUFDakMsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzVCLENBQUM7QUFNRCxNQUFNLENBQUMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDO0FBQzdCLE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUM7QUFFOUIsTUFBTSxVQUFVLEdBQUcsU0FBUyxDQUFDLENBQUUseUJBQXlCO0FBQ3hELE1BQU0sYUFBYSxHQUFHLFVBQVUsQ0FBQyxDQUFDLGtDQUFrQztBQUNwRSxNQUFNLG1CQUFtQixHQUFHLEtBQUssQ0FBQztBQUVsQyxTQUFTLGFBQWEsQ0FBQyxTQUFpQixFQUFFLGFBQXVCO0lBQ2hFLFFBQVEsU0FBUyxFQUFFLENBQUM7UUFDbkIsS0FBSyxDQUFDO1lBQ0wsT0FBTyxFQUFFLENBQUM7UUFDWCxL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