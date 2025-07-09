/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../../editor/common/core/range.js';
export const getFileResults = (bytes, pattern, options) => {
    let text;
    if (bytes[0] === 0xff && bytes[1] === 0xfe) {
        text = new TextDecoder('utf-16le').decode(bytes);
    }
    else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
        text = new TextDecoder('utf-16be').decode(bytes);
    }
    else {
        text = new TextDecoder('utf8').decode(bytes);
        if (text.slice(0, 1000).includes('\uFFFD') && bytes.includes(0)) {
            return [];
        }
    }
    const results = [];
    const patternIndecies = [];
    let patternMatch = null;
    let remainingResultQuota = options.remainingResultQuota;
    while (remainingResultQuota >= 0 && (patternMatch = pattern.exec(text))) {
        patternIndecies.push({ matchStartIndex: patternMatch.index, matchedText: patternMatch[0] });
        remainingResultQuota--;
    }
    if (patternIndecies.length) {
        const contextLinesNeeded = new Set();
        const resultLines = new Set();
        const lineRanges = [];
        const readLine = (lineNumber) => text.slice(lineRanges[lineNumber].start, lineRanges[lineNumber].end);
        let prevLineEnd = 0;
        let lineEndingMatch = null;
        const lineEndRegex = /\r?\n/g;
        while ((lineEndingMatch = lineEndRegex.exec(text))) {
            lineRanges.push({ start: prevLineEnd, end: lineEndingMatch.index });
            prevLineEnd = lineEndingMatch.index + lineEndingMatch[0].length;
        }
        if (prevLineEnd < text.length) {
            lineRanges.push({ start: prevLineEnd, end: text.length });
        }
        let startLine = 0;
        for (const { matchStartIndex, matchedText } of patternIndecies) {
            if (remainingResultQuota < 0) {
                break;
            }
            while (Boolean(lineRanges[startLine + 1]) && matchStartIndex > lineRanges[startLine].end) {
                startLine++;
            }
            let endLine = startLine;
            while (Boolean(lineRanges[endLine + 1]) && matchStartIndex + matchedText.length > lineRanges[endLine].end) {
                endLine++;
            }
            if (options.surroundingContext) {
                for (let contextLine = Math.max(0, startLine - options.surroundingContext); contextLine < startLine; contextLine++) {
                    contextLinesNeeded.add(contextLine);
                }
            }
            let previewText = '';
            let offset = 0;
            for (let matchLine = startLine; matchLine <= endLine; matchLine++) {
                let previewLine = readLine(matchLine);
                if (options.previewOptions?.charsPerLine && previewLine.length > options.previewOptions.charsPerLine) {
                    offset = Math.max(matchStartIndex - lineRanges[startLine].start - 20, 0);
                    previewLine = previewLine.substr(offset, options.previewOptions.charsPerLine);
                }
                previewText += `${previewLine}\n`;
                resultLines.add(matchLine);
            }
            const fileRange = new Range(startLine, matchStartIndex - lineRanges[startLine].start, endLine, matchStartIndex + matchedText.length - lineRanges[endLine].start);
            const previewRange = new Range(0, matchStartIndex - lineRanges[startLine].start - offset, endLine - startLine, matchStartIndex + matchedText.length - lineRanges[endLine].start - (endLine === startLine ? offset : 0));
            const match = {
                rangeLocations: [{
                        source: fileRange,
                        preview: previewRange,
                    }],
                previewText: previewText
            };
            results.push(match);
            if (options.surroundingContext) {
                for (let contextLine = endLine + 1; contextLine <= Math.min(endLine + options.surroundingContext, lineRanges.length - 1); contextLine++) {
                    contextLinesNeeded.add(contextLine);
                }
            }
        }
        for (const contextLine of contextLinesNeeded) {
            if (!resultLines.has(contextLine)) {
                results.push({
                    text: readLine(contextLine),
                    lineNumber: contextLine + 1,
                });
            }
        }
    }
    return results;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0RmlsZVJlc3VsdHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC9jb21tb24vZ2V0RmlsZVJlc3VsdHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRWhFLE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxDQUM3QixLQUFpQixFQUNqQixPQUFlLEVBQ2YsT0FJQyxFQUNxQixFQUFFO0lBRXhCLElBQUksSUFBWSxDQUFDO0lBQ2pCLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUM7UUFDNUMsSUFBSSxHQUFHLElBQUksV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNsRCxDQUFDO1NBQU0sSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztRQUNuRCxJQUFJLEdBQUcsSUFBSSxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2xELENBQUM7U0FBTSxDQUFDO1FBQ1AsSUFBSSxHQUFHLElBQUksV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM3QyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7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