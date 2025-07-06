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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoRWRpdG9yU2VyaWFsaXphdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoRWRpdG9yL2Jyb3dzZXIvc2VhcmNoRWRpdG9yU2VyaWFsaXphdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFN0QsT0FBTywwQkFBMEIsQ0FBQztBQUVsQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRzlDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRWxGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzVFLE9BQU8sRUFBYyxtQkFBbUIsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBRWpILGtFQUFrRTtBQUNsRSxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUM7QUFFM0IsTUFBTSxtQkFBbUIsR0FDeEIsQ0FBQyxDQUFTLEVBQUUsRUFBRSxDQUNiLENBQUMsS0FBWSxFQUFFLEVBQUUsQ0FDaEIsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxDQUFDLEVBQUUsS0FBSyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsYUFBYSxHQUFHLENBQUMsRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7QUFFckcsTUFBTSx5QkFBeUIsR0FBRyxDQUFDLEtBQXVCLEVBQUUsaUJBQXlCLEVBQTJELEVBQUU7SUFDakosTUFBTSxhQUFhLEdBQUcsQ0FBQyxDQUFTLEVBQUUsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLGVBQWUsR0FBRyxDQUFDLEVBQUUsQ0FBQztJQUU1RSxNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztJQUdoRCxNQUFNLE9BQU8sR0FBNEQsRUFBRSxDQUFDO0lBRTVFLGNBQWM7U0FDWixPQUFPLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDMUIsTUFBTSxVQUFVLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JFLE1BQU0sTUFBTSxHQUFHLEtBQUssVUFBVSxHQUFHLFVBQVUsSUFBSSxDQUFDO1FBQ2hELE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7UUFFbkMsaUVBQWlFO1FBQ2pFLE1BQU0sSUFBSSxHQUFHLE1BQU0sR0FBRyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBRWhFLE1BQU0sZUFBZSxHQUFHLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFvQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLEdBQUcsWUFBWSxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLFlBQVksQ0FBQyxDQUFDO1FBRTFLLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUMxQyxNQUFNLGlCQUFpQixHQUFHLFVBQVUsQ0FBQyxlQUFlLEtBQUssVUFBVSxDQUFDLGFBQWEsQ0FBQztRQUVsRixJQUFJLFNBQVMsQ0FBQztRQUNkLElBQUksaUJBQWlCLEVBQUUsQ0FBQztZQUFDLFNBQVMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxFQUFFLEtBQUssRUFBRSxVQUFVLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRSxVQUFVLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQzthQUNsSCxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUFDLFNBQVMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxFQUFFLEtBQUssRUFBRSxVQUFVLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQzthQUNsRixJQUFJLENBQUMsS0FBSyxjQUFjLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQUMsU0FBUyxHQUFHLENBQUMsZUFBZSxDQUFDLEVBQUUsR0FBRyxFQUFFLFVBQVUsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDO2FBQ3RHLENBQUM7WUFBQyxTQUFTLEdBQUcsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUFDLENBQUM7UUFFM0MsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNyRSxDQUFDLENBQUMsQ0FBQztJQUVKLE9BQU8sT0FBTyxDQUFDO0FBQ2hCLENBQUMsQ0FBQztBQUlGLFNBQVMsNkJBQTZCLENBQUMsU0FBK0IsRUFBRSxjQUFrQztJQUV6RyxNQUFNLGtCQUFrQixHQUFHLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsRUFBRSxTQUFTLENBQUMsT0FBTyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7SUFDbE4sTUFBTSxrQkFBa0IsR0FBRyxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyw2QkFBNkIsQ0FBQyxTQUFTLEVBQUUsY0FBYyxFQUFFLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFFdFMsT0FBTyxDQUFDLGtCQUFrQixFQUFFLEdBQUcsa0JBQWtCLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFnQyxDQUFDO0FBQ3BHLENBQUM7QUFDRCxTQUFTLDJCQUEyQixDQUFDLFFBQWEsRUFBRSxhQUFpQyxFQUFFLFlBQWlDLEVBQUUsY0FBa0MsRUFBRSxlQUFlLEdBQUcsSUFBSTtJQUNuTCxNQUFNLGlCQUFpQixHQUFHLGFBQWEsQ0FBQyxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxNQUFNLENBQUM7SUFFMUcsTUFBTSxJQUFJLEdBQWEsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQy9FLE1BQU0sV0FBVyxHQUFZLEVBQUUsQ0FBQztJQUVoQyxNQUFNLHdCQUF3QixHQUEyQixFQUFFLENBQUM7SUFFNUQsTUFBTSxPQUFPLEdBQTJDLEVBQUUsQ0FBQztJQUMzRCxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDL0UsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBRXBELElBQUksUUFBUSxHQUF1QixTQUFTLENBQUM7SUFFN0MsTUFBTSxTQUFTLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztJQUNwQyxhQUFhLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQzdCLHlCQUF5QixDQUFDLEtBQUssRUFBRSxpQkFBaUIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUNuRSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztnQkFDdEMsT0FBTyxPQUFPLENBQUMsTUFBTSxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUM7b0JBQ3BFLE1BQU0sRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLEdBQUcsT0FBTyxDQUFDLEtBQUssRUFBRyxDQUFDO29CQUM5QyxJQUFJLFFBQVEsS0FBSyxTQUFTLElBQUksVUFBVSxLQUFLLFFBQVEsR0FBRyxDQUFDLEVBQUUsQ0FBQzt3QkFDM0QsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDZixDQUFDO29CQUNELElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsTUFBTSxDQUFDLGlCQUFpQixHQUFHLEdBQUcsVUFBVSxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsVUFBVSxLQUFLLElBQUksRUFBRSxDQUFDLENBQUM7b0JBQy9GLFFBQVEsR0FBRyxVQUFVLENBQUM7Z0JBQ3ZCLENBQUM7Z0JBRUQsd0JBQXdCLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7Z0JBQ3pELFNBQVMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUNoQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDdEIsUUFBUSxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQztZQUM5QixDQUFDO1lBRUQsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4RyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsT0FBTyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDdkIsTUFBTSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsR0FBRyxPQUFPLENBQUMsS0FBSyxFQUFHLENBQUM7UUFDOUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLFVBQVUsS0FBSyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFFRCxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxDQUFDO0FBQzlCLENBQUM7QUFFRCxTQUFTLDZCQUE2QixDQUFDLFNBQXFCLEVBQUUsY0FBa0MsRUFBRSxlQUF3QjtJQUN6SCxPQUFPLDJCQUEyQixDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxJQUFJLFNBQVMsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsU0FBUyxDQUFDLE9BQU8sRUFBRSxjQUFjLEVBQUUsZUFBZSxDQUFDLENBQUM7QUFDOUwsQ0FBQztBQUVELE1BQU0sbUNBQW1DLEdBQUcsQ0FBQyxPQUFtQixFQUFFLFFBQWdCLEVBQUUsUUFBZ0IsRUFBRSxZQUFvQixFQUF1QixFQUFFO0lBQ2xKLE9BQU87UUFDTixLQUFLLEVBQUUsT0FBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPO1FBQ3JDLFFBQVEsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxRQUFRO1FBQzNDLGVBQWUsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxlQUFlO1FBQ3pELGNBQWMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxXQUFXO1FBQ3BELGNBQWMsRUFBRSxRQUFRLEVBQUUsY0FBYyxFQUFFLFFBQVE7UUFDbEQsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxJQUFJLFFBQVEsSUFBSSxPQUFPLEVBQUUsa0NBQWtDLENBQUM7UUFDN0YsZ0NBQWdDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsa0NBQWtDLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGtDQUFrQyxDQUFDO1FBQ2xKLFlBQVk7UUFDWixlQUFlLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxlQUFlO1FBQzFDLG9CQUFvQixFQUFFO1lBQ3JCLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLFlBQVksRUFBRSx5QkFBeUI7WUFDcEYsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsWUFBWSxFQUFFLDJCQUEyQjtZQUN4RixnQkFBZ0IsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUUscUJBQXFCO1lBQzlFLGFBQWEsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUUsc0JBQXNCO1NBQzVFO0tBQ0QsQ0FBQztBQUNILENBQUMsQ0FBQztBQUVGLE1BQU0sQ0FBQyxNQUFNLDRCQUE0QixHQUFHLENBQUMsTUFBb0MsRUFBVSxFQUFFO0lBQzVGLE1BQU0sMkJBQTJCLEdBQUcsQ0FBSSxDQUFtQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLEtBQUssSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsS0FBSyxTQUFTLENBQVEsQ0FBQztJQUVuSixNQUFNLGNBQWMsR0FBRyxDQUFDLEdBQVcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztJQUV6RixPQUFPLDJCQUEyQixDQUFDO1FBQ2xDLFlBQVksY0FBYyxDQUFDLE1BQU0sQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDLEVBQUU7UUFFaEQsQ0FBQyxNQUFNLENBQUMsZUFBZSxJQUFJLE1BQU0sQ0FBQyxjQUFjLElBQUksTUFBTSxDQUFDLFFBQVEsSUFBSSxNQUFNLENBQUMsZ0NBQWdDLEtBQUssS0FBSyxDQUFDO2VBQ3RILFlBQVksUUFBUSxDQUFDO2dCQUN2QixNQUFNLENBQUMsZUFBZSxJQUFJLGVBQWU7Z0JBQ3pDLE1BQU0sQ0FBQyxjQUFjLElBQUksV0FBVztnQkFDcEMsTUFBTSxDQUFDLFFBQVEsSUFBSSxRQUFRO2dCQUMzQixNQUFNLENBQUMsZUFBZSxJQUFJLGFBQWE7Z0JBQ3ZDLENBQUMsTUFBTSxDQUFDLGdDQUFnQyxLQUFLLEtBQUssQ0FBQyxJQUFJLHVCQUF1QjthQUM5RSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ2QsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUztRQUMzRSxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTO1FBQzNFLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixNQUFNLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVM7UUFDMUUsRUFBRTtLQUNGLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDeEIsQ0FBQyxDQUFDO0FBRUYsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsQ0FBQyxLQUFpQixFQUF1QixFQUFFLENBQ3JGLDJCQUEyQixDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztBQUVoRyxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxHQUF3QixFQUFFLENBQUMsQ0FBQztJQUM5RCxLQUFLLEVBQUUsRUFBRTtJQUNULGNBQWMsRUFBRSxFQUFFO0lBQ2xCLGNBQWMsRUFBRSxFQUFFO0lBQ2xCLFFBQVEsRUFBRSxLQUFLO0lBQ2YsZUFBZSxFQUFFLEtBQUs7SUFDdEIsZ0NBQWdDLEVBQUUsSUFBSTtJQUN0QyxjQUFjLEVBQUUsS0FBSztJQUNyQixZQUFZLEVBQUUsQ0FBQztJQUNmLG9CQUFvQixFQUFFLEtBQUs7SUFDM0IsZUFBZSxFQUFFLEtBQUs7SUFDdEIsb0JBQW9CLEVBQUU7UUFDckIsa0JBQWtCLEVBQUUsSUFBSTtRQUN4QixvQkFBb0IsRUFBRSxLQUFLO1FBQzNCLGdCQUFnQixFQUFFLElBQUk7UUFDdEIsYUFBYSxFQUFFLElBQUk7S0FDbkI7Q0FDRCxDQUFDLENBQUM7QUFFSCxNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRyxDQUFDLEtBQWUsRUFBdUIsRUFBRTtJQUVuRixNQUFNLEtBQUssR0FBRyxtQkFBbUIsRUFBRSxDQUFDO0lBRXBDLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxHQUFXLEVBQUUsRUFBRTtRQUN4QyxJQUFJLEdBQUcsR0FBRyxFQUFFLENBQUM7UUFDYixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3JDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO2dCQUNyQixDQUFDLEVBQUUsQ0FBQztnQkFDSixNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBRXZCLElBQUksT0FBTyxLQUFLLEdBQUcsRUFBRSxDQUFDO29CQUNyQixHQUFHLElBQUksSUFBSSxDQUFDO2dCQUNiLENBQUM7cUJBQ0ksSUFBSSxPQUFPLEtBQUssSUFBSSxFQUFFLENBQUM7b0JBQzNCLEdBQUcsSUFBSSxJQUFJLENBQUM7Z0JBQ2IsQ0FBQztxQkFDSSxDQUFDO29CQUNMLE1BQU0sS0FBSyxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSx3REFBd0QsQ0FBQyxDQUFDLENBQUM7Z0JBQzVHLENBQUM7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNmLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxHQUFHLENBQUM7SUFDWixDQUFDLENBQUM7SUFFRixNQUFNLFFBQVEsR0FBRyxtQkFBbUIsQ0FBQztJQUNyQyxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO1FBQzFCLE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQUMsU0FBUztRQUFDLENBQUM7UUFDMUIsTUFBTSxDQUFDLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxHQUFHLE1BQU0sQ0FBQztRQUM5QixRQUFRLEdBQUcsRUFBRSxDQUFDO1lBQ2IsS0FBSyxPQUFPO2dCQUFFLEtBQUssQ0FBQyxLQUFLLEdBQUcsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQUMsTUFBTTtZQUMzRCxLQUFLLFdBQVc7Z0JBQUUsS0FBSyxDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUM7Z0JBQUMsTUFBTTtZQUN0RCxLQUFLLFdBQVc7Z0JBQUUsS0FBSyxDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUM7Z0JBQUMsTUFBTTtZQUN0RCxLQUFLLGNBQWM7Z0JBQUUsS0FBSyxDQUFDLFlBQVksR0FBRyxDQUFDLEtBQUssQ0FBQztnQkFBQyxNQUFNO1lBQ3hELEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDZCxLQUFLLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0JBQ2hELEtBQUssQ0FBQyxlQUFlLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFDOUQsS0FBSyxDQUFDLGdDQUFnQyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFDdkYsS0FBSyxDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUN6RCxLQUFLLENBQUMsZUFBZSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDN0QsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLG9CQUFvQixHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLElBQUksS0FBSyxDQUFDLGNBQWMsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO0lBRXpILE9BQU8sS0FBSyxDQUFDO0FBQ2QsQ0FBQyxDQUFDO0FBRUYsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQzFDLENBQUMsWUFBMkIsRUFBRSxpQkFBeUIsRUFBRSxpQkFBeUIsRUFBRSxZQUFvQixFQUFFLGNBQWtDLEVBQUUsU0FBMEIsRUFBRSxRQUFrQixFQUFnRixFQUFFO0lBQzdRLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUM7UUFBQyxNQUFNLEtBQUssQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDO0lBQUMsQ0FBQztJQUNyRixNQUFNLE1BQU0sR0FBRyxtQ0FBbUMsQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLGlCQUFpQixFQUFFLGlCQUFpQixFQUFFLFlBQVksQ0FBQyxDQUFDO0lBRTNILE1BQU0sU0FBUyxHQUFHLFlBQVksQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsV0FBVyxFQUFFLFlBQVksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzdJLE1BQU0sV0FBVyxHQUFHLFlBQVksQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsYUFBYSxFQUFFLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBRS9JLE1BQU0sSUFBSSxHQUFHO1FBQ1osWUFBWSxDQUFDLEtBQUssRUFBRTtZQUNuQixDQUFDLENBQUMsR0FBRyxXQUFXLE1BQU0sU0FBUyxFQUFFO1lBQ2pDLENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQztLQUN0QyxDQUFDO0lBQ0YsSUFBSSxRQUFRLEVBQUUsQ0FBQztRQUNkLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLHlCQUF5QixFQUFFLG1IQUFtSCxDQUFDLENBQUMsQ0FBQztJQUNySyxDQUFDO0lBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUVkLE1BQU0sYUFBYSxHQUFHLENBQUMsQ0FBZ0QsRUFBRSxDQUFnRCxFQUFFLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBRW5LLE1BQU0sVUFBVSxHQUNmLGlDQUFpQyxDQUNoQyxZQUFZLENBQUMsYUFBYSxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQztTQUM5QyxHQUFHLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsd0JBQXdCLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDO1NBQzVFLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLDZCQUE2QixDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUU3RixPQUFPO1FBQ04sV0FBVyxFQUFFLFVBQVUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN6RSxJQUFJLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQztRQUN0RCxNQUFNO0tBQ04sQ0FBQztBQUNILENBQUMsQ0FBQztBQUVILE1BQU0saUNBQWlDLEdBQUcsQ0FBQyxjQUEyQyxFQUE2QixFQUFFO0lBQ3BILE1BQU0sSUFBSSxHQUFhLEVBQUUsQ0FBQztJQUMxQixNQUFNLFdBQVcsR0FBWSxFQUFFLENBQUM7SUFFaEMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRTtRQUNuQyxVQUFVLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDdkcsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDakQsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVc7SUFDM0IsQ0FBQyxDQUFDLENBQUM7SUFFSCxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxDQUFDO0FBQzlCLENBQUMsQ0FBQztBQUVGLE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHLEtBQUssRUFBRSxRQUEwQixFQUFFLFFBQWEsRUFBRSxFQUFFO0lBQ3pGLE1BQU0sZUFBZSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUV2RCxNQUFNLElBQUksR0FBRyxDQUFDLE1BQU0sZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztJQUMxRCxPQUFPLDJCQUEyQixDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzFDLENBQUMsQ0FBQztBQUVGLE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLENBQUMsSUFBWSxFQUFFLEVBQUU7SUFDM0QsTUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFDO0lBQ3ZCLE1BQU0sU0FBUyxHQUFHLEVBQUUsQ0FBQztJQUVyQixJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUM7SUFDcEIsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7UUFDekMsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdkIsSUFBSSxJQUFJLEtBQUssRUFBRSxFQUFFLENBQUM7Z0JBQ2pCLFFBQVEsR0FBRyxLQUFLLENBQUM7WUFDbEIsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0QixDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sRUFBRSxNQUFNLEVBQUUsMkJBQTJCLENBQUMsV0FBVyxDQUFDLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztBQUN6RixDQUFDLENBQUMifQ==