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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmlwZ3JlcFRleHRTZWFyY2hFbmdpbmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC9ub2RlL3JpcGdyZXBUZXh0U2VhcmNoRW5naW5lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3BDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDdEMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFNUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsWUFBWSxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDMUYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRXJELE9BQU8sRUFBRSwwQkFBMEIsRUFBOEQsV0FBVyxFQUFFLGVBQWUsRUFBRSxvQkFBb0IsRUFBRSxlQUFlLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNsTSxPQUFPLEVBQUUsS0FBSyxFQUF1QixrQkFBa0IsRUFBRSxnQkFBZ0IsRUFBa0UsTUFBTSw2QkFBNkIsQ0FBQztBQUMvSyxPQUFPLEVBQWdCLFlBQVksRUFBRSxhQUFhLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUMzRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDekMsT0FBTyxFQUFFLFVBQVUsRUFBeUIsa0JBQWtCLEVBQUUsa0JBQWtCLEVB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