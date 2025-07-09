/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../../editor/common/core/range.js';
import { TextSearchMatch } from './search.js';
function editorMatchToTextSearchResult(matches, model, previewOptions) {
    const firstLine = matches[0].range.startLineNumber;
    const lastLine = matches[matches.length - 1].range.endLineNumber;
    const lineTexts = [];
    for (let i = firstLine; i <= lastLine; i++) {
        lineTexts.push(model.getLineContent(i));
    }
    return new TextSearchMatch(lineTexts.join('\n') + '\n', matches.map(m => new Range(m.range.startLineNumber - 1, m.range.startColumn - 1, m.range.endLineNumber - 1, m.range.endColumn - 1)), previewOptions);
}
/**
 * Combine a set of FindMatches into a set of TextSearchResults. They should be grouped by matches that start on the same line that the previous match ends on.
 */
export function editorMatchesToTextSearchResults(matches, model, previewOptions) {
    let previousEndLine = -1;
    const groupedMatches = [];
    let currentMatches = [];
    matches.forEach((match) => {
        if (match.range.startLineNumber !== previousEndLine) {
            currentMatches = [];
            groupedMatches.push(currentMatches);
        }
        currentMatches.push(match);
        previousEndLine = match.range.endLineNumber;
    });
    return groupedMatches.map(sameLineMatches => {
        return editorMatchToTextSearchResult(sameLineMatches, model, previewOptions);
    });
}
export function getTextSearchMatchWithModelContext(matches, model, query) {
    const results = [];
    let prevLine = -1;
    for (let i = 0; i < matches.length; i++) {
        const { start: matchStartLine, end: matchEndLine } = getMatchStartEnd(matches[i]);
        if (typeof query.surroundingContext === 'number' && query.surroundingContext > 0) {
            const beforeContextStartLine = Math.max(prevLine + 1, matchStartLine - query.surroundingContext);
            for (let b = beforeContextStartLine; b < matchStartLine; b++) {
                results.push({
                    text: model.getLineContent(b + 1),
                    lineNumber: b + 1
                });
            }
        }
        results.push(matches[i]);
        const nextMatch = matches[i + 1];
        const nextMatchStartLine = nextMatch ? getMatchStartEnd(nextMatch).start : Number.MAX_VALUE;
        if (typeof query.surroundingContext === 'number' && query.surroundingContext > 0) {
            const afterContextToLine = Math.min(nextMatchStartLine - 1, matchEndLine + query.surroundingContext, model.getLineCount() - 1);
            for (let a = matchEndLine + 1; a <= afterContextToLine; a++) {
                results.push({
                    text: model.getLineContent(a + 1),
                    lineNumber: a + 1
                });
            }
        }
        prevLine = matchEndLine;
    }
    return results;
}
function getMatchStartEnd(match) {
    const matchRanges = match.rangeLocations.map(e => e.source);
    const matchStartLine = matchRanges[0].startLineNumber;
    const matchEndLine = matchRanges[matchRanges.length - 1].endLineNumber;
    return {
        start: matchStartLine,
        end: matchEndLine
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoSGVscGVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL2NvbW1vbi9zZWFyY2hIZWxwZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVoRSxPQUFPLEVBQTZCLGVBQWUsRUFBeUQsTUFBTSxhQUFhLENBQUM7QUFFaEksU0FBUyw2QkFBNkIsQ0FBQyxPQUFvQixFQUFFLEtBQWlCLEVBQUUsY0FBMEM7SUFDekgsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUM7SUFDbkQsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQztJQUVqRSxNQUFNLFNBQVMsR0FBYSxFQUFFLENBQUM7SUFDL0IsS0FBSyxJQUFJLENBQUMsR0FBRyxTQUFTLEVBQUUsQ0FBQyxJQUFJLFFBQVEsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQzVDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFFRCxPQUFPLElBQUksZUFBZSxDQUN6QixTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksRUFDM0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsR0FBRyxDQUFDLEVB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