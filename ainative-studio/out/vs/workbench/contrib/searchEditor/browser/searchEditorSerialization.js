/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { coalesce } from '../../../../base/common/arrays.js';
import './media/searchEditor.css';
import { Range } from '../../../../editor/common/core/range.js';
import { localize } from '../../../../nls.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { searchMatchComparer } from '../../search/browser/searchCompare.js';
import { isNotebookFileMatch } from '../../search/browser/notebookSearch/notebookSearchModelBase.js';
// Using \r\n on Windows inserts an extra newline between results.
const lineDelimiter = '\n';
const translateRangeLines = (n) => (range) => new Range(range.startLineNumber + n, range.startColumn, range.endLineNumber + n, range.endColumn);
const matchToSearchResultFormat = (match, longestLineNumber) => {
    const getLinePrefix = (i) => `${match.range().startLineNumber + i}`;
    const fullMatchLines = match.fullPreviewLines();
    const results = [];
    fullMatchLines
        .forEach((sourceLine, i) => {
        const lineNumber = getLinePrefix(i);
        const paddingStr = ' '.repeat(longestLineNumber - lineNumber.length);
        const prefix = `  ${paddingStr}${lineNumber}: `;
        const prefixOffset = prefix.length;
        // split instead of replace to avoid creating a new string object
        const line = prefix + (sourceLine.split(/\r?\n?$/, 1)[0] || '');
        const rangeOnThisLine = ({ start, end }) => new Range(1, (start ?? 1) + prefixOffset, 1, (end ?? sourceLine.length + 1) + prefixOffset);
        const matchRange = match.rangeInPreview();
        const matchIsSingleLine = matchRange.startLineNumber === matchRange.endLineNumber;
        let lineRange;
        if (matchIsSingleLine) {
            lineRange = (rangeOnThisLine({ start: matchRange.startColumn, end: matchRange.endColumn }));
        }
        else if (i === 0) {
            lineRange = (rangeOnThisLine({ start: matchRange.startColumn }));
        }
        else if (i === fullMatchLines.length - 1) {
            lineRange = (rangeOnThisLine({ end: matchRange.endColumn }));
        }
        else {
            lineRange = (rangeOnThisLine({}));
        }
        results.push({ lineNumber: lineNumber, line, ranges: [lineRange] });
    });
    return results;
};
function fileMatchToSearchResultFormat(fileMatch, labelFormatter) {
    const textSerializations = fileMatch.textMatches().length > 0 ? matchesToSearchResultFormat(fileMatch.resource, fileMatch.textMatches().sort(searchMatchComparer), fileMatch.context, labelFormatter) : undefined;
    const cellSerializations = (isNotebookFileMatch(fileMatch)) ? fileMatch.cellMatches().sort((a, b) => a.cellIndex - b.cellIndex).sort().filter(cellMatch => cellMatch.contentMatches.length > 0).map((cellMatch, index) => cellMatchToSearchResultFormat(cellMatch, labelFormatter, index === 0)) : [];
    return [textSerializations, ...cellSerializations].filter(x => !!x);
}
function matchesToSearchResultFormat(resource, sortedMatches, matchContext, labelFormatter, shouldUseHeader = true) {
    const longestLineNumber = sortedMatches[sortedMatches.length - 1].range().endLineNumber.toString().length;
    const text = shouldUseHeader ? [`${labelFormatter(resource)}:`] : [];
    const matchRanges = [];
    const targetLineNumberToOffset = {};
    const context = [];
    matchContext.forEach((line, lineNumber) => context.push({ line, lineNumber }));
    context.sort((a, b) => a.lineNumber - b.lineNumber);
    let lastLine = undefined;
    const seenLines = new Set();
    sortedMatches.forEach(match => {
        matchToSearchResultFormat(match, longestLineNumber).forEach(match => {
            if (!seenLines.has(match.lineNumber)) {
                while (context.length && context[0].lineNumber < +match.lineNumber) {
                    const { line, lineNumber } = context.shift();
                    if (lastLine !== undefined && lineNumber !== lastLine + 1) {
                        text.push('');
                    }
                    text.push(`  ${' '.repeat(longestLineNumber - `${lineNumber}`.length)}${lineNumber}  ${line}`);
                    lastLine = lineNumber;
                }
                targetLineNumberToOffset[match.lineNumber] = text.length;
                seenLines.add(match.lineNumber);
                text.push(match.line);
                lastLine = +match.lineNumber;
            }
            matchRanges.push(...match.ranges.map(translateRangeLines(targetLineNumberToOffset[match.lineNumber])));
        });
    });
    while (context.length) {
        const { line, lineNumber } = context.shift();
        text.push(`  ${lineNumber}  ${line}`);
    }
    return { text, matchRanges };
}
function cellMatchToSearchResultFormat(cellMatch, labelFormatter, shouldUseHeader) {
    return matchesToSearchResultFormat(cellMatch.cell?.uri ?? cellMatch.parent.resource, cellMatch.contentMatches.sort(searchMatchComparer), cellMatch.context, labelFormatter, shouldUseHeader);
}
const contentPatternToSearchConfiguration = (pattern, includes, excludes, contextLines) => {
    return {
        query: pattern.contentPattern.pattern,
        isRegexp: !!pattern.contentPattern.isRegExp,
        isCaseSensitive: !!pattern.contentPattern.isCaseSensitive,
        matchWholeWord: !!pattern.contentPattern.isWordMatch,
        filesToExclude: excludes, filesToInclude: includes,
        showIncludesExcludes: !!(includes || excludes || pattern?.userDisabledExcludesAndIgnoreFiles),
        useExcludeSettingsAndIgnoreFiles: (pattern?.userDisabledExcludesAndIgnoreFiles === undefined ? true : !pattern.userDisabledExcludesAndIgnoreFiles),
        contextLines,
        onlyOpenEditors: !!pattern.onlyOpenEditors,
        notebookSearchConfig: {
            includeMarkupInput: !!pattern.contentPattern.notebookInfo?.isInNotebookMarkdownInput,
            includeMarkupPreview: !!pattern.contentPattern.notebookInfo?.isInNotebookMarkdownPreview,
            includeCodeInput: !!pattern.contentPattern.notebookInfo?.isInNotebookCellInput,
            includeOutput: !!pattern.contentPattern.notebookInfo?.isInNotebookCellOutput,
        }
    };
};
export const serializeSearchConfiguration = (config) => {
    const removeNullFalseAndUndefined = (a) => a.filter(a => a !== false && a !== null && a !== undefined);
    const escapeNewlines = (str) => str.replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
    return removeNullFalseAndUndefined([
        `# Query: ${escapeNewlines(config.query ?? '')}`,
        (config.isCaseSensitive || config.matchWholeWord || config.isRegexp || config.useExcludeSettingsAndIgnoreFiles === false)
            && `# Flags: ${coalesce([
                config.isCaseSensitive && 'CaseSensitive',
                config.matchWholeWord && 'WordMatch',
                config.isRegexp && 'RegExp',
                config.onlyOpenEditors && 'OpenEditors',
                (config.useExcludeSettingsAndIgnoreFiles === false) && 'IgnoreExcludeSettings'
            ]).join(' ')}`,
        config.filesToInclude ? `# Including: ${config.filesToInclude}` : undefined,
        config.filesToExclude ? `# Excluding: ${config.filesToExclude}` : undefined,
        config.contextLines ? `# ContextLines: ${config.contextLines}` : undefined,
        ''
    ]).join(lineDelimiter);
};
export const extractSearchQueryFromModel = (model) => extractSearchQueryFromLines(model.getValueInRange(new Range(1, 1, 6, 1)).split(lineDelimiter));
export const defaultSearchConfig = () => ({
    query: '',
    filesToInclude: '',
    filesToExclude: '',
    isRegexp: false,
    isCaseSensitive: false,
    useExcludeSettingsAndIgnoreFiles: true,
    matchWholeWord: false,
    contextLines: 0,
    showIncludesExcludes: false,
    onlyOpenEditors: false,
    notebookSearchConfig: {
        includeMarkupInput: true,
        includeMarkupPreview: false,
        includeCodeInput: true,
        includeOutput: true,
    }
});
export const extractSearchQueryFromLines = (lines) => {
    const query = defaultSearchConfig();
    const unescapeNewlines = (str) => {
        let out = '';
        for (let i = 0; i < str.length; i++) {
            if (str[i] === '\\') {
                i++;
                const escaped = str[i];
                if (escaped === 'n') {
                    out += '\n';
                }
                else if (escaped === '\\') {
                    out += '\\';
                }
                else {
                    throw Error(localize('invalidQueryStringError', "All backslashes in Query string must be escaped (\\\\)"));
                }
            }
            else {
                out += str[i];
            }
        }
        return out;
    };
    const parseYML = /^# ([^:]*): (.*)$/;
    for (const line of lines) {
        const parsed = parseYML.exec(line);
        if (!parsed) {
            continue;
        }
        const [, key, value] = parsed;
        switch (key) {
            case 'Query':
                query.query = unescapeNewlines(value);
                break;
            case 'Including':
                query.filesToInclude = value;
                break;
            case 'Excluding':
                query.filesToExclude = value;
                break;
            case 'ContextLines':
                query.contextLines = +value;
                break;
            case 'Flags': {
                query.isRegexp = value.indexOf('RegExp') !== -1;
                query.isCaseSensitive = value.indexOf('CaseSensitive') !== -1;
                query.useExcludeSettingsAndIgnoreFiles = value.indexOf('IgnoreExcludeSettings') === -1;
                query.matchWholeWord = value.indexOf('WordMatch') !== -1;
                query.onlyOpenEditors = value.indexOf('OpenEditors') !== -1;
            }
        }
    }
    query.showIncludesExcludes = !!(query.filesToInclude || query.filesToExclude || !query.useExcludeSettingsAndIgnoreFiles);
    return query;
};
export const serializeSearchResultForEditor = (searchResult, rawIncludePattern, rawExcludePattern, contextLines, labelFormatter, sortOrder, limitHit) => {
    if (!searchResult.query) {
        throw Error('Internal Error: Expected query, got null');
    }
    const config = contentPatternToSearchConfiguration(searchResult.query, rawIncludePattern, rawExcludePattern, contextLines);
    const filecount = searchResult.fileCount() > 1 ? localize('numFiles', "{0} files", searchResult.fileCount()) : localize('oneFile', "1 file");
    const resultcount = searchResult.count() > 1 ? localize('numResults', "{0} results", searchResult.count()) : localize('oneResult', "1 result");
    const info = [
        searchResult.count()
            ? `${resultcount} - ${filecount}`
            : localize('noResults', "No Results"),
    ];
    if (limitHit) {
        info.push(localize('searchMaxResultsWarning', "The result set only contains a subset of all matches. Be more specific in your search to narrow down the results."));
    }
    info.push('');
    const matchComparer = (a, b) => searchMatchComparer(a, b, sortOrder);
    const allResults = flattenSearchResultSerializations(searchResult.folderMatches().sort(matchComparer)
        .map(folderMatch => folderMatch.allDownstreamFileMatches().sort(matchComparer)
        .flatMap(fileMatch => fileMatchToSearchResultFormat(fileMatch, labelFormatter))).flat());
    return {
        matchRanges: allResults.matchRanges.map(translateRangeLines(info.length)),
        text: info.concat(allResults.text).join(lineDelimiter),
        config
    };
};
const flattenSearchResultSerializations = (serializations) => {
    const text = [];
    const matchRanges = [];
    serializations.forEach(serialized => {
        serialized.matchRanges.map(translateRangeLines(text.length)).forEach(range => matchRanges.push(range));
        serialized.text.forEach(line => text.push(line));
        text.push(''); // new line
    });
    return { text, matchRanges };
};
export const parseSavedSearchEditor = async (accessor, resource) => {
    const textFileService = accessor.get(ITextFileService);
    const text = (await textFileService.read(resource)).value;
    return parseSerializedSearchEditor(text);
};
export const parseSerializedSearchEditor = (text) => {
    const headerlines = [];
    const bodylines = [];
    let inHeader = true;
    for (const line of text.split(/\r?\n/g)) {
        if (inHeader) {
            headerlines.push(line);
            if (line === '') {
                inHeader = false;
            }
        }
        else {
            bodylines.push(line);
        }
    }
    return { config: extractSearchQueryFromLines(headerlines), text: bodylines.join('\n') };
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoRWRpdG9yU2VyaWFsaXphdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2hFZGl0b3IvYnJvd3Nlci9zZWFyY2hFZGl0b3JTZXJpYWxpemF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUU3RCxPQUFPLDBCQUEwQixDQUFDO0FBRWxDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFHOUMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFbEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDNUUsT0FBTyxFQUFjLG1CQUFtQixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFFakgsa0VBQWtFO0FBQ2xFLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQztBQUUzQixNQUFNLG1CQUFtQixHQUN4QixDQUFDLENBQVMsRUFBRSxFQUFFLENBQ2IsQ0FBQyxLQUFZLEVBQUUsRUFBRSxDQUNoQixJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLENBQUMsRUFBRSxLQUFLLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxhQUFhLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUVyRyxNQUFNLHlCQUF5QixHQUFHLENBQUMsS0FBdUIsRUFBRSxpQkFBeUIsRUFBMkQsRUFBRTtJQUNqSixNQUFNLGFBQWEsR0FBRyxDQUFDLENBQVMsRUFBRSxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsS0FB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