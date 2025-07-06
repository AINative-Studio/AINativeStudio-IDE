/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as cp from 'child_process';
import { EventEmitter } from 'events';
import { StringDecoder } from 'string_decoder';
import { coalesce, mapArrayOrNot } from '../../../../base/common/arrays.js';
import { groupBy } from '../../../../base/common/collections.js';
import { splitGlobAware } from '../../../../base/common/glob.js';
import { createRegExp, escapeRegExpCharacters } from '../../../../base/common/strings.js';
import { URI } from '../../../../base/common/uri.js';
import { DEFAULT_MAX_SEARCH_RESULTS, SearchError, SearchErrorCode, serializeSearchError, TextSearchMatch } from '../common/search.js';
import { Range, TextSearchContext2, TextSearchMatch2 } from '../common/searchExtTypes.js';
import { RegExpParser, RegExpVisitor } from 'vscode-regexpp';
import { rgPath } from '@vscode/ripgrep';
import { anchorGlob, rangeToSearchRange, searchRangeToRange } from './ripgrepSearchUtils.js';
import { newToOldPreviewOptions } from '../common/searchExtConversionTypes.js';
// If @vscode/ripgrep is in an .asar file, then the binary is unpacked.
const rgDiskPath = rgPath.replace(/\bnode_modules\.asar\b/, 'node_modules.asar.unpacked');
export class RipgrepTextSearchEngine {
    constructor(outputChannel, _numThreads) {
        this.outputChannel = outputChannel;
        this._numThreads = _numThreads;
    }
    provideTextSearchResults(query, options, progress, token) {
        return Promise.all(options.folderOptions.map(folderOption => {
            const extendedOptions = {
                folderOptions: folderOption,
                numThreads: this._numThreads,
                maxResults: options.maxResults,
                previewOptions: options.previewOptions,
                maxFileSize: options.maxFileSize,
                surroundingContext: options.surroundingContext
            };
            return this.provideTextSearchResultsWithRgOptions(query, extendedOptions, progress, token);
        })).then((e => {
            const complete = {
                // todo: get this to actually check
                limitHit: e.some(complete => !!complete && complete.limitHit)
            };
            return complete;
        }));
    }
    provideTextSearchResultsWithRgOptions(query, options, progress, token) {
        this.outputChannel.appendLine(`provideTextSearchResults ${query.pattern}, ${JSON.stringify({
            ...options,
            ...{
                folder: options.folderOptions.folder.toString()
            }
        })}`);
        return new Promise((resolve, reject) => {
            token.onCancellationRequested(() => cancel());
            const extendedOptions = {
                ...options,
                numThreads: this._numThreads
            };
            const rgArgs = getRgArgs(query, extendedOptions);
            const cwd = options.folderOptions.folder.fsPath;
            const escapedArgs = rgArgs
                .map(arg => arg.match(/^-/) ? arg : `'${arg}'`)
                .join(' ');
            this.outputChannel.appendLine(`${rgDiskPath} ${escapedArgs}\n - cwd: ${cwd}`);
            let rgProc = cp.spawn(rgDiskPath, rgArgs, { cwd });
            rgProc.on('error', e => {
                console.error(e);
                this.outputChannel.appendLine('Error: ' + (e && e.message));
                reject(serializeSearchError(new SearchError(e && e.message, SearchErrorCode.rgProcessError)));
            });
            let gotResult = false;
            const ripgrepParser = new RipgrepParser(options.maxResults ?? DEFAULT_MAX_SEARCH_RESULTS, options.folderOptions.folder, newToOldPreviewOptions(options.previewOptions));
            ripgrepParser.on('result', (match) => {
                gotResult = true;
                dataWithoutResult = '';
                progress.report(match);
            });
            let isDone = false;
            const cancel = () => {
                isDone = true;
                rgProc?.kill();
                ripgrepParser?.cancel();
            };
            let limitHit = false;
            ripgrepParser.on('hitLimit', () => {
                limitHit = true;
                cancel();
            });
            let dataWithoutResult = '';
            rgProc.stdout.on('data', data => {
                ripgrepParser.handleData(data);
                if (!gotResult) {
                    dataWithoutResult += data;
                }
            });
            let gotData = false;
            rgProc.stdout.once('data', () => gotData = true);
            let stderr = '';
            rgProc.stderr.on('data', data => {
                const message = data.toString();
                this.outputChannel.appendLine(message);
                if (stderr.length + message.length < 1e6) {
                    stderr += message;
                }
            });
            rgProc.on('close', () => {
                this.outputChannel.appendLine(gotData ? 'Got data from stdout' : 'No data from stdout');
                this.outputChannel.appendLine(gotResult ? 'Got result from parser' : 'No result from parser');
                if (dataWithoutResult) {
                    this.outputChannel.appendLine(`Got data without result: ${dataWithoutResult}`);
                }
                this.outputChannel.appendLine('');
                if (isDone) {
                    resolve({ limitHit });
                }
                else {
                    // Trigger last result
                    ripgrepParser.flush();
                    rgProc = null;
                    let searchError;
                    if (stderr && !gotData && (searchError = rgErrorMsgForDisplay(stderr))) {
                        reject(serializeSearchError(new SearchError(searchError.message, searchError.code)));
                    }
                    else {
                        resolve({ limitHit });
                    }
                }
            });
        });
    }
}
/**
 * Read the first line of stderr and return an error for display or undefined, based on a list of
 * allowed properties.
 * Ripgrep produces stderr output which is not from a fatal error, and we only want the search to be
 * "failed" when a fatal error was produced.
 */
function rgErrorMsgForDisplay(msg) {
    const lines = msg.split('\n');
    const firstLine = lines[0].trim();
    if (lines.some(l => l.startsWith('regex parse error'))) {
        return new SearchError(buildRegexParseError(lines), SearchErrorCode.regexParseError);
    }
    const match = firstLine.match(/grep config error: unknown encoding: (.*)/);
    if (match) {
        return new SearchError(`Unknown encoding: ${match[1]}`, SearchErrorCode.unknownEncoding);
    }
    if (firstLine.startsWith('error parsing glob')) {
        // Uppercase first letter
        return new SearchError(firstLine.charAt(0).toUpperCase() + firstLine.substr(1), SearchErrorCode.globParseError);
    }
    if (firstLine.startsWith('the literal')) {
        // Uppercase first letter
        return new SearchError(firstLine.charAt(0).toUpperCase() + firstLine.substr(1), SearchErrorCode.invalidLiteral);
    }
    if (firstLine.startsWith('PCRE2: error compiling pattern')) {
        return new SearchError(firstLine, SearchErrorCode.regexParseError);
    }
    return undefined;
}
function buildRegexParseError(lines) {
    const errorMessage = ['Regex parse error'];
    const pcre2ErrorLine = lines.filter(l => (l.startsWith('PCRE2:')));
    if (pcre2ErrorLine.length >= 1) {
        const pcre2ErrorMessage = pcre2ErrorLine[0].replace('PCRE2:', '');
        if (pcre2ErrorMessage.indexOf(':') !== -1 && pcre2ErrorMessage.split(':').length >= 2) {
            const pcre2ActualErrorMessage = pcre2ErrorMessage.split(':')[1];
            errorMessage.push(':' + pcre2ActualErrorMessage);
        }
    }
    return errorMessage.join('');
}
export class RipgrepParser extends EventEmitter {
    constructor(maxResults, root, previewOptions) {
        super();
        this.maxResults = maxResults;
        this.root = root;
        this.previewOptions = previewOptions;
        this.remainder = '';
        this.isDone = false;
        this.hitLimit = false;
        this.numResults = 0;
        this.stringDecoder = new StringDecoder();
    }
    cancel() {
        this.isDone = true;
    }
    flush() {
        this.handleDecodedData(this.stringDecoder.end());
    }
    on(event, listener) {
        super.on(event, listener);
        return this;
    }
    handleData(data) {
        if (this.isDone) {
            return;
        }
        const dataStr = typeof data === 'string' ? data : this.stringDecoder.write(data);
        this.handleDecodedData(dataStr);
    }
    handleDecodedData(decodedData) {
        // check for newline before appending to remainder
        let newlineIdx = decodedData.indexOf('\n');
        // If the previous data chunk didn't end in a newline, prepend it to this chunk
        const dataStr = this.remainder + decodedData;
        if (newlineIdx >= 0) {
            newlineIdx += this.remainder.length;
        }
        else {
            // Shortcut
            this.remainder = dataStr;
            return;
        }
        let prevIdx = 0;
        while (newlineIdx >= 0) {
            this.handleLine(dataStr.substring(prevIdx, newlineIdx).trim());
            prevIdx = newlineIdx + 1;
            newlineIdx = dataStr.indexOf('\n', prevIdx);
        }
        this.remainder = dataStr.substring(prevIdx);
    }
    handleLine(outputLine) {
        if (this.isDone || !outputLine) {
            return;
        }
        let parsedLine;
        try {
            parsedLine = JSON.parse(outputLine);
        }
        catch (e) {
            throw new Error(`malformed line from rg: ${outputLine}`);
        }
        if (parsedLine.type === 'match') {
            const matchPath = bytesOrTextToString(parsedLine.data.path);
            const uri = URI.joinPath(this.root, matchPath);
            const result = this.createTextSearchMatch(parsedLine.data, uri);
            this.onResult(result);
            if (this.hitLimit) {
                this.cancel();
                this.emit('hitLimit');
            }
        }
        else if (parsedLine.type === 'context') {
            const contextPath = bytesOrTextToString(parsedLine.data.path);
            const uri = URI.joinPath(this.root, contextPath);
            const result = this.createTextSearchContexts(parsedLine.data, uri);
            result.forEach(r => this.onResult(r));
        }
    }
    createTextSearchMatch(data, uri) {
        const lineNumber = data.line_number - 1;
        const fullText = bytesOrTextToString(data.lines);
        const fullTextBytes = Buffer.from(fullText);
        let prevMatchEnd = 0;
        let prevMatchEndCol = 0;
        let prevMatchEndLine = lineNumber;
        // it looks like certain regexes can match a line, but cause rg to not
        // emit any specific submatches for that line.
        // https://github.com/microsoft/vscode/issues/100569#issuecomment-738496991
        if (data.submatches.length === 0) {
            data.submatches.push(fullText.length
                ? { start: 0, end: 1, match: { text: fullText[0] } }
                : { start: 0, end: 0, match: { text: '' } });
        }
        const ranges = coalesce(data.submatches.map((match, i) => {
            if (this.hitLimit) {
                return null;
            }
            this.numResults++;
            if (this.numResults >= this.maxResults) {
                // Finish the line, then report the result below
                this.hitLimit = true;
            }
            const matchText = bytesOrTextToString(match.match);
            const inBetweenText = fullTextBytes.slice(prevMatchEnd, match.start).toString();
            const inBetweenStats = getNumLinesAndLastNewlineLength(inBetweenText);
            const startCol = inBetweenStats.numLines > 0 ?
                inBetweenStats.lastLineLength :
                inBetweenStats.lastLineLength + prevMatchEndCol;
            const stats = getNumLinesAndLastNewlineLength(matchText);
            const startLineNumber = inBetweenStats.numLines + prevMatchEndLine;
            const endLineNumber = stats.numLines + startLineNumber;
            const endCol = stats.numLines > 0 ?
                stats.lastLineLength :
                stats.lastLineLength + startCol;
            prevMatchEnd = match.end;
            prevMatchEndCol = endCol;
            prevMatchEndLine = endLineNumber;
            return new Range(startLineNumber, startCol, endLineNumber, endCol);
        }));
        const searchRange = mapArrayOrNot(ranges, rangeToSearchRange);
        const internalResult = new TextSearchMatch(fullText, searchRange, this.previewOptions);
        return new TextSearchMatch2(uri, internalResult.rangeLocations.map(e => ({
            sourceRange: searchRangeToRange(e.source),
            previewRange: searchRangeToRange(e.preview),
        })), internalResult.previewText);
    }
    createTextSearchContexts(data, uri) {
        const text = bytesOrTextToString(data.lines);
        const startLine = data.line_number;
        return text
            .replace(/\r?\n$/, '')
            .split('\n')
            .map((line, i) => new TextSearchContext2(uri, line, startLine + i));
    }
    onResult(match) {
        this.emit('result', match);
    }
}
function bytesOrTextToString(obj) {
    return obj.bytes ?
        Buffer.from(obj.bytes, 'base64').toString() :
        obj.text;
}
function getNumLinesAndLastNewlineLength(text) {
    const re = /\n/g;
    let numLines = 0;
    let lastNewlineIdx = -1;
    let match;
    while (match = re.exec(text)) {
        numLines++;
        lastNewlineIdx = match.index;
    }
    const lastLineLength = lastNewlineIdx >= 0 ?
        text.length - lastNewlineIdx - 1 :
        text.length;
    return { numLines, lastLineLength };
}
// exported for testing
export function getRgArgs(query, options) {
    const args = ['--hidden', '--no-require-git'];
    args.push(query.isCaseSensitive ? '--case-sensitive' : '--ignore-case');
    const { doubleStarIncludes, otherIncludes } = groupBy(options.folderOptions.includes, (include) => include.startsWith('**') ? 'doubleStarIncludes' : 'otherIncludes');
    if (otherIncludes && otherIncludes.length) {
        const uniqueOthers = new Set();
        otherIncludes.forEach(other => { uniqueOthers.add(other); });
        args.push('-g', '!*');
        uniqueOthers
            .forEach(otherIncude => {
            spreadGlobComponents(otherIncude)
                .map(anchorGlob)
                .forEach(globArg => {
                args.push('-g', globArg);
            });
        });
    }
    if (doubleStarIncludes && doubleStarIncludes.length) {
        doubleStarIncludes.forEach(globArg => {
            args.push('-g', globArg);
        });
    }
    options.folderOptions.excludes.map(e => typeof (e) === 'string' ? e : e.pattern)
        .map(anchorGlob)
        .forEach(rgGlob => args.push('-g', `!${rgGlob}`));
    if (options.maxFileSize) {
        args.push('--max-filesize', options.maxFileSize + '');
    }
    if (options.folderOptions.useIgnoreFiles.local) {
        if (!options.folderOptions.useIgnoreFiles.parent) {
            args.push('--no-ignore-parent');
        }
    }
    else {
        // Don't use .gitignore or .ignore
        args.push('--no-ignore');
    }
    if (options.folderOptions.followSymlinks) {
        args.push('--follow');
    }
    if (options.folderOptions.encoding && options.folderOptions.encoding !== 'utf8') {
        args.push('--encoding', options.folderOptions.encoding);
    }
    if (options.numThreads) {
        args.push('--threads', `${options.numThreads}`);
    }
    // Ripgrep handles -- as a -- arg separator. Only --.
    // - is ok, --- is ok, --some-flag is also ok. Need to special case.
    if (query.pattern === '--') {
        query.isRegExp = true;
        query.pattern = '\\-\\-';
    }
    if (query.isMultiline && !query.isRegExp) {
        query.pattern = escapeRegExpCharacters(query.pattern);
        query.isRegExp = true;
    }
    if (options.usePCRE2) {
        args.push('--pcre2');
    }
    // Allow $ to match /r/n
    args.push('--crlf');
    if (query.isRegExp) {
        query.pattern = unicodeEscapesToPCRE2(query.pattern);
        args.push('--engine', 'auto');
    }
    let searchPatternAfterDoubleDashes;
    if (query.isWordMatch) {
        const regexp = createRegExp(query.pattern, !!query.isRegExp, { wholeWord: query.isWordMatch });
        const regexpStr = regexp.source.replace(/\\\//g, '/'); // RegExp.source arbitrarily returns escaped slashes. Search and destroy.
        args.push('--regexp', regexpStr);
    }
    else if (query.isRegExp) {
        let fixedRegexpQuery = fixRegexNewline(query.pattern);
        fixedRegexpQuery = fixNewline(fixedRegexpQuery);
        args.push('--regexp', fixedRegexpQuery);
    }
    else {
        searchPatternAfterDoubleDashes = query.pattern;
        args.push('--fixed-strings');
    }
    args.push('--no-config');
    if (!options.folderOptions.useIgnoreFiles.global) {
        args.push('--no-ignore-global');
    }
    args.push('--json');
    if (query.isMultiline) {
        args.push('--multiline');
    }
    if (options.surroundingContext) {
        args.push('--before-context', options.surroundingContext + '');
        args.push('--after-context', options.surroundingContext + '');
    }
    // Folder to search
    args.push('--');
    if (searchPatternAfterDoubleDashes) {
        // Put the query after --, in case the query starts with a dash
        args.push(searchPatternAfterDoubleDashes);
    }
    args.push('.');
    return args;
}
/**
 * `"foo/*bar/something"` -> `["foo", "foo/*bar", "foo/*bar/something", "foo/*bar/something/**"]`
 */
function spreadGlobComponents(globComponent) {
    const globComponentWithBraceExpansion = performBraceExpansionForRipgrep(globComponent);
    return globComponentWithBraceExpansion.flatMap((globArg) => {
        const components = splitGlobAware(globArg, '/');
        return components.map((_, i) => components.slice(0, i + 1).join('/'));
    });
}
export function unicodeEscapesToPCRE2(pattern) {
    // Match \u1234
    const unicodePattern = /((?:[^\\]|^)(?:\\\\)*)\\u([a-z0-9]{4})/gi;
    while (pattern.match(unicodePattern)) {
        pattern = pattern.replace(unicodePattern, `$1\\x{$2}`);
    }
    // Match \u{1234}
    // \u with 5-6 characters will be left alone because \x only takes 4 characters.
    const unicodePatternWithBraces = /((?:[^\\]|^)(?:\\\\)*)\\u\{([a-z0-9]{4})\}/gi;
    while (pattern.match(unicodePatternWithBraces)) {
        pattern = pattern.replace(unicodePatternWithBraces, `$1\\x{$2}`);
    }
    return pattern;
}
const isLookBehind = (node) => node.type === 'Assertion' && node.kind === 'lookbehind';
export function fixRegexNewline(pattern) {
    // we parse the pattern anew each tiem
    let re;
    try {
        re = new RegExpParser().parsePattern(pattern);
    }
    catch {
        return pattern;
    }
    let output = '';
    let lastEmittedIndex = 0;
    const replace = (start, end, text) => {
        output += pattern.slice(lastEmittedIndex, start) + text;
        lastEmittedIndex = end;
    };
    const context = [];
    const visitor = new RegExpVisitor({
        onCharacterEnter(char) {
            if (char.raw !== '\\n') {
                return;
            }
            const parent = context[0];
            if (!parent) {
                // simple char, \n -> \r?\n
                replace(char.start, char.end, '\\r?\\n');
            }
            else if (context.some(isLookBehind)) {
                // no-op in a lookbehind, see #100569
            }
            else if (parent.type === 'CharacterClass') {
                if (parent.negate) {
                    // negative bracket expr, [^a-z\n] -> (?![a-z]|\r?\n)
                    const otherContent = pattern.slice(parent.start + 2, char.start) + pattern.slice(char.end, parent.end - 1);
                    if (parent.parent?.type === 'Quantifier') {
                        // If quantified, we can't use a negative lookahead in a quantifier.
                        // But `.` already doesn't match new lines, so we can just use that
                        // (with any other negations) instead.
                        replace(parent.start, parent.end, otherContent ? `[^${otherContent}]` : '.');
                    }
                    else {
                        replace(parent.start, parent.end, '(?!\\r?\\n' + (otherContent ? `|[${otherContent}]` : '') + ')');
                    }
                }
                else {
                    // positive bracket expr, [a-z\n] -> (?:[a-z]|\r?\n)
                    const otherContent = pattern.slice(parent.start + 1, char.start) + pattern.slice(char.end, parent.end - 1);
                    replace(parent.start, parent.end, otherContent === '' ? '\\r?\\n' : `(?:[${otherContent}]|\\r?\\n)`);
                }
            }
            else if (parent.type === 'Quantifier') {
                replace(char.start, char.end, '(?:\\r?\\n)');
            }
        },
        onQuantifierEnter(node) {
            context.unshift(node);
        },
        onQuantifierLeave() {
            context.shift();
        },
        onCharacterClassRangeEnter(node) {
            context.unshift(node);
        },
        onCharacterClassRangeLeave() {
            context.shift();
        },
        onCharacterClassEnter(node) {
            context.unshift(node);
        },
        onCharacterClassLeave() {
            context.shift();
        },
        onAssertionEnter(node) {
            if (isLookBehind(node)) {
                context.push(node);
            }
        },
        onAssertionLeave(node) {
            if (context[0] === node) {
                context.shift();
            }
        },
    });
    visitor.visit(re);
    output += pattern.slice(lastEmittedIndex);
    return output;
}
export function fixNewline(pattern) {
    return pattern.replace(/\n/g, '\\r?\\n');
}
// brace expansion for ripgrep
/**
 * Split string given first opportunity for brace expansion in the string.
 * - If the brace is prepended by a \ character, then it is escaped.
 * - Does not process escapes that are within the sub-glob.
 * - If two unescaped `{` occur before `}`, then ripgrep will return an error for brace nesting, so don't split on those.
 */
function getEscapeAwareSplitStringForRipgrep(pattern) {
    let inBraces = false;
    let escaped = false;
    let fixedStart = '';
    let strInBraces = '';
    for (let i = 0; i < pattern.length; i++) {
        const char = pattern[i];
        switch (char) {
            case '\\':
                if (escaped) {
                    // If we're already escaped, then just leave the escaped slash and the preceeding slash that escapes it.
                    // The two escaped slashes will result in a single slash and whatever processes the glob later will properly process the escape
                    if (inBraces) {
                        strInBraces += '\\' + char;
                    }
                    else {
                        fixedStart += '\\' + char;
                    }
                    escaped = false;
                }
                else {
                    escaped = true;
                }
                break;
            case '{':
                if (escaped) {
                    // if we escaped this opening bracket, then it is to be taken literally. Remove the `\` because we've acknowleged it and add the `{` to the appropriate string
                    if (inBraces) {
                        strInBraces += char;
                    }
                    else {
                        fixedStart += char;
                    }
                    escaped = false;
                }
                else {
                    if (inBraces) {
                        // ripgrep treats this as attempting to do a nested alternate group, which is invalid. Return with pattern including changes from escaped braces.
                        return { strInBraces: fixedStart + '{' + strInBraces + '{' + pattern.substring(i + 1) };
                    }
                    else {
                        inBraces = true;
                    }
                }
                break;
            case '}':
                if (escaped) {
                    // same as `}`, but for closing bracket
                    if (inBraces) {
                        strInBraces += char;
                    }
                    else {
                        fixedStart += char;
                    }
                    escaped = false;
                }
                else if (inBraces) {
                    // we found an end bracket to a valid opening bracket. Return the appropriate strings.
                    return { fixedStart, strInBraces, fixedEnd: pattern.substring(i + 1) };
                }
                else {
                    // if we're not in braces and not escaped, then this is a literal `}` character and we're still adding to fixedStart.
                    fixedStart += char;
                }
                break;
            default:
                // similar to the `\\` case, we didn't do anything with the escape, so we should re-insert it into the appropriate string
                // to be consumed later when individual parts of the glob are processed
                if (inBraces) {
                    strInBraces += (escaped ? '\\' : '') + char;
                }
                else {
                    fixedStart += (escaped ? '\\' : '') + char;
                }
                escaped = false;
                break;
        }
    }
    // we are haven't hit the last brace, so no splitting should occur. Return with pattern including changes from escaped braces.
    return { strInBraces: fixedStart + (inBraces ? ('{' + strInBraces) : '') };
}
/**
 * Parses out curly braces and returns equivalent globs. Only supports one level of nesting.
 * Exported for testing.
 */
export function performBraceExpansionForRipgrep(pattern) {
    const { fixedStart, strInBraces, fixedEnd } = getEscapeAwareSplitStringForRipgrep(pattern);
    if (fixedStart === undefined || fixedEnd === undefined) {
        return [strInBraces];
    }
    let arr = splitGlobAware(strInBraces, ',');
    if (!arr.length) {
        // occurs if the braces are empty.
        arr = [''];
    }
    const ends = performBraceExpansionForRipgrep(fixedEnd);
    return arr.flatMap((elem) => {
        const start = fixedStart + elem;
        return ends.map((end) => {
            return start + end;
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmlwZ3JlcFRleHRTZWFyY2hFbmdpbmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL25vZGUvcmlwZ3JlcFRleHRTZWFyY2hFbmdpbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDcEMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUN0QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDL0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUU1RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxZQUFZLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFckQsT0FBTyxFQUFFLDBCQUEwQixFQUE4RCxXQUFXLEVBQUUsZUFBZSxFQUFFLG9CQUFvQixFQUFFLGVBQWUsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ2xNLE9BQU8sRUFBRSxLQUFLLEVBQXVCLGtCQUFrQixFQUFFLGdCQUFnQixFQUFrRSxNQUFNLDZCQUE2QixDQUFDO0FBQy9LLE9BQU8sRUFBZ0IsWUFBWSxFQUFFLGFBQWEsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQzNFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUN6QyxPQUFPLEVBQUUsVUFBVSxFQUF5QixrQkFBa0IsRUFBRSxrQkFBa0IsRUFB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