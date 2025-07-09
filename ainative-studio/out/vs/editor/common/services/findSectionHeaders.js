/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isMultilineRegexSource } from '../model/textModelSearch.js';
const trimDashesRegex = /^-+|-+$/g;
const CHUNK_SIZE = 100;
const MAX_SECTION_LINES = 5;
/**
 * Find section headers in the model.
 *
 * @param model the text model to search in
 * @param options options to search with
 * @returns an array of section headers
 */
export function findSectionHeaders(model, options) {
    let headers = [];
    if (options.findRegionSectionHeaders && options.foldingRules?.markers) {
        const regionHeaders = collectRegionHeaders(model, options);
        headers = headers.concat(regionHeaders);
    }
    if (options.findMarkSectionHeaders) {
        const markHeaders = collectMarkHeaders(model, options);
        headers = headers.concat(markHeaders);
    }
    return headers;
}
function collectRegionHeaders(model, options) {
    const regionHeaders = [];
    const endLineNumber = model.getLineCount();
    for (let lineNumber = 1; lineNumber <= endLineNumber; lineNumber++) {
        const lineContent = model.getLineContent(lineNumber);
        const match = lineContent.match(options.foldingRules.markers.start);
        if (match) {
            const range = { startLineNumber: lineNumber, startColumn: match[0].length + 1, endLineNumber: lineNumber, endColumn: lineContent.length + 1 };
            if (range.endColumn > range.startColumn) {
                const sectionHeader = {
                    range,
                    ...getHeaderText(lineContent.substring(match[0].length)),
                    shouldBeInComments: false
                };
                if (sectionHeader.text || sectionHeader.hasSeparatorLine) {
                    regionHeaders.push(sectionHeader);
                }
            }
        }
    }
    return regionHeaders;
}
export function collectMarkHeaders(model, options) {
    const markHeaders = [];
    const endLineNumber = model.getLineCount();
    // Create regex with flags for:
    // - 'd' for indices to get proper match positions
    // - 'm' for multi-line mode so ^ and $ match line starts/ends
    // - 's' for dot-all mode so . matches newlines
    const multiline = isMultilineRegexSource(options.markSectionHeaderRegex);
    const regex = new RegExp(options.markSectionHeaderRegex, `gdm${multiline ? 's' : ''}`);
    // Process text in overlapping chunks for better performance
    for (let startLine = 1; startLine <= endLineNumber; startLine += CHUNK_SIZE - MAX_SECTION_LINES) {
        const endLine = Math.min(startLine + CHUNK_SIZE - 1, endLineNumber);
        const lines = [];
        // Collect lines for the current chunk
        for (let i = startLine; i <= endLine; i++) {
            lines.push(model.getLineContent(i));
        }
        const text = lines.join('\n');
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(text)) !== null) {
            // Calculate which line this match starts on by counting newlines before it
            const precedingText = text.substring(0, match.index);
            const lineOffset = (precedingText.match(/\n/g) || []).length;
            const lineNumber = startLine + lineOffset;
            // Calculate match height to check overlap properly
            const matchLines = match[0].split('\n');
            const matchHeight = matchLines.length;
            const matchEndLine = lineNumber + matchHeight - 1;
            // Calculate start column - need to find the start of the line containing the match
            const lineStartIndex = precedingText.lastIndexOf('\n') + 1;
            const startColumn = match.index - lineStartIndex + 1;
            // Calculate end column - need to handle multi-line matches
            const lastMatchLine = matchLines[matchLines.length - 1];
            const endColumn = matchHeight === 1 ? startColumn + match[0].length : lastMatchLine.length + 1;
            const range = {
                startLineNumber: lineNumber,
                startColumn,
                endLineNumber: matchEndLine,
                endColumn
            };
            const text2 = (match.groups ?? {})['label'] ?? '';
            const hasSeparatorLine = ((match.groups ?? {})['separator'] ?? '') !== '';
            const sectionHeader = {
                range,
                text: text2,
                hasSeparatorLine,
                shouldBeInComments: true
            };
            if (sectionHeader.text || sectionHeader.hasSeparatorLine) {
                // only push if the previous one doesn't have this same linbe
                if (markHeaders.length === 0 || markHeaders[markHeaders.length - 1].range.endLineNumber < sectionHeader.range.startLineNumber) {
                    markHeaders.push(sectionHeader);
                }
            }
            // Move lastIndex past the current match to avoid infinite loop
            regex.lastIndex = match.index + match[0].length;
        }
    }
    return markHeaders;
}
function getHeaderText(text) {
    text = text.trim();
    const hasSeparatorLine = text.startsWith('-');
    text = text.replace(trimDashesRegex, '');
    return { text, hasSeparatorLine };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZFNlY3Rpb25IZWFkZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vc2VydmljZXMvZmluZFNlY3Rpb25IZWFkZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBaUNyRSxNQUFNLGVBQWUsR0FBRyxVQUFVLENBQUM7QUFFbkMsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDO0FBQ3ZCLE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxDQUFDO0FBRTVCOzs7Ozs7R0FNRztBQUNILE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxLQUFpQyxFQUFFLE9BQWlDO0lBQ3RHLElBQUksT0FBTyxHQUFvQixFQUFFLENBQUM7SUFDbEMsSUFBSSxPQUFPLENBQUMsd0JBQXdCLElBQUksT0FBTyxDQUFDLFlBQVksRUFBRSxPQUFPLEVBQUUsQ0FBQztRQUN2RSxNQUFNLGFBQWEsR0FBRyxvQkFBb0IsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDM0QsT0FBTyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDekMsQ0FBQztJQUNELElBQUksT0FBTyxDQUFDLHNCQUFzQixFQUFFLENBQUM7UUFDcEMsTUFBTSxXQUFXLEdBQUcsa0JBQWtCLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3ZELE9BQU8sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFDRCxPQUFPLE9BQU8sQ0FBQztBQUNoQixDQUFDO0FBRUQsU0FBUyxvQkFBb0IsQ0FBQyxLQUFpQyxFQUFFLE9BQWlDO0lBQ2pHLE1BQU0sYUFBYSxHQUFvQixFQUFFLENB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