/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { posix, win32 } from '../../../../../base/common/path.js';
/**
 * Converts a possibly wrapped link's range (comprised of string indices) into a buffer range that plays nicely with xterm.js
 *
 * @param lines A single line (not the entire buffer)
 * @param bufferWidth The number of columns in the terminal
 * @param range The link range - string indices
 * @param startLine The absolute y position (on the buffer) of the line
 */
export function convertLinkRangeToBuffer(lines, bufferWidth, range, startLine) {
    const bufferRange = {
        start: {
            x: range.startColumn,
            y: range.startLineNumber + startLine
        },
        end: {
            x: range.endColumn - 1,
            y: range.endLineNumber + startLine
        }
    };
    // Shift start range right for each wide character before the link
    let startOffset = 0;
    const startWrappedLineCount = Math.ceil(range.startColumn / bufferWidth);
    for (let y = 0; y < Math.min(startWrappedLineCount); y++) {
        const lineLength = Math.min(bufferWidth, (range.startColumn - 1) - y * bufferWidth);
        let lineOffset = 0;
        const line = lines[y];
        // Sanity check for line, apparently this can happen but it's not clear under what
        // circumstances this happens. Continue on, skipping the remainder of start offset if this
        // happens to minimize impact.
        if (!line) {
            break;
        }
        for (let x = 0; x < Math.min(bufferWidth, lineLength + lineOffset); x++) {
            const cell = line.getCell(x);
            // This is unexpected but it means the character doesn't exist, so we shouldn't add to
            // the offset
            if (!cell) {
                break;
            }
            const width = cell.getWidth();
            if (width === 2) {
                lineOffset++;
            }
            const char = cell.getChars();
            if (char.length > 1) {
                lineOffset -= char.length - 1;
            }
        }
        startOffset += lineOffset;
    }
    // Shift end range right for each wide character inside the link
    let endOffset = 0;
    const endWrappedLineCount = Math.ceil(range.endColumn / bufferWidth);
    for (let y = Math.max(0, startWrappedLineCount - 1); y < endWrappedLineCount; y++) {
        const start = (y === startWrappedLineCount - 1 ? (range.startColumn - 1 + startOffset) % bufferWidth : 0);
        const lineLength = Math.min(bufferWidth, range.endColumn + startOffset - y * bufferWidth);
        let lineOffset = 0;
        const line = lines[y];
        // Sanity check for line, apparently this can happen but it's not clear under what
        // circumstances this happens. Continue on, skipping the remainder of start offset if this
        // happens to minimize impact.
        if (!line) {
            break;
        }
        for (let x = start; x < Math.min(bufferWidth, lineLength + lineOffset); x++) {
            const cell = line.getCell(x);
            // This is unexpected but it means the character doesn't exist, so we shouldn't add to
            // the offset
            if (!cell) {
                break;
            }
            const width = cell.getWidth();
            const chars = cell.getChars();
            // Offset for null cells following wide characters
            if (width === 2) {
                lineOffset++;
            }
            // Offset for early wrapping when the last cell in row is a wide character
            if (x === bufferWidth - 1 && chars === '') {
                lineOffset++;
            }
            // Offset multi-code characters like emoji
            if (chars.length > 1) {
                lineOffset -= chars.length - 1;
            }
        }
        endOffset += lineOffset;
    }
    // Apply the width character offsets to the result
    bufferRange.start.x += startOffset;
    bufferRange.end.x += startOffset + endOffset;
    // Convert back to wrapped lines
    while (bufferRange.start.x > bufferWidth) {
        bufferRange.start.x -= bufferWidth;
        bufferRange.start.y++;
    }
    while (bufferRange.end.x > bufferWidth) {
        bufferRange.end.x -= bufferWidth;
        bufferRange.end.y++;
    }
    return bufferRange;
}
export function convertBufferRangeToViewport(bufferRange, viewportY) {
    return {
        start: {
            x: bufferRange.start.x - 1,
            y: bufferRange.start.y - viewportY - 1
        },
        end: {
            x: bufferRange.end.x - 1,
            y: bufferRange.end.y - viewportY - 1
        }
    };
}
export function getXtermLineContent(buffer, lineStart, lineEnd, cols) {
    // Cap the maximum number of lines generated to prevent potential performance problems. This is
    // more of a sanity check as the wrapped line should already be trimmed down at this point.
    const maxLineLength = Math.max(2048, cols * 2);
    lineEnd = Math.min(lineEnd, lineStart + maxLineLength);
    let content = '';
    for (let i = lineStart; i <= lineEnd; i++) {
        // Make sure only 0 to cols are considered as resizing when windows mode is enabled will
        // retain buffer data outside of the terminal width as reflow is disabled.
        const line = buffer.getLine(i);
        if (line) {
            content += line.translateToString(true, 0, cols);
        }
    }
    return content;
}
export function getXtermRangesByAttr(buffer, lineStart, lineEnd, cols) {
    let bufferRangeStart = undefined;
    let lastFgAttr = -1;
    let lastBgAttr = -1;
    const ranges = [];
    for (let y = lineStart; y <= lineEnd; y++) {
        const line = buffer.getLine(y);
        if (!line) {
            continue;
        }
        for (let x = 0; x < cols; x++) {
            const cell = line.getCell(x);
            if (!cell) {
                break;
            }
            // HACK: Re-construct the attributes from fg and bg, this is hacky as it relies
            // upon the internal buffer bit layout
            const thisFgAttr = (cell.isBold() |
                cell.isInverse() |
                cell.isStrikethrough() |
                cell.isUnderline());
            const thisBgAttr = (cell.isDim() |
                cell.isItalic());
            if (lastFgAttr === -1 || lastBgAttr === -1) {
                bufferRangeStart = { x, y };
            }
            else {
                if (lastFgAttr !== thisFgAttr || lastBgAttr !== thisBgAttr) {
                    // TODO: x overflow
                    const bufferRangeEnd = { x, y };
                    ranges.push({
                        start: bufferRangeStart,
                        end: bufferRangeEnd
                    });
                    bufferRangeStart = { x, y };
                }
            }
            lastFgAttr = thisFgAttr;
            lastBgAttr = thisBgAttr;
        }
    }
    return ranges;
}
// export function positionIsInRange(position: IBufferCellPosition, range: IBufferRange): boolean {
// 	if (position.y < range.start.y || position.y > range.end.y) {
// 		return false;
// 	}
// 	if (position.y === range.start.y && position.x < range.start.x) {
// 		return false;
// 	}
// 	if (position.y === range.end.y && position.x > range.end.x) {
// 		return false;
// 	}
// 	return true;
// }
/**
 * For shells with the CommandDetection capability, the cwd for a command relative to the line of
 * the particular link can be used to narrow down the result for an exact file match.
 */
export function updateLinkWithRelativeCwd(capabilities, y, text, osPath, logService) {
    const cwd = capabilities.get(2 /* TerminalCapability.CommandDetection */)?.getCwdForLine(y);
    logService.trace('terminalLinkHelpers#updateLinkWithRelativeCwd cwd', cwd);
    if (!cwd) {
        return undefined;
    }
    const result = [];
    const sep = osPath.sep;
    if (!text.includes(sep)) {
        result.push(osPath.resolve(cwd + sep + text));
    }
    else {
        let commonDirs = 0;
        let i = 0;
        const cwdPath = cwd.split(sep).reverse();
        const linkPath = text.split(sep);
        // Get all results as candidates, prioritizing the link with the most common directories.
        // For example if in the directory /home/common and the link is common/file, the result
        // should be: `['/home/common/common/file', '/home/common/file']`. The first is the most
        // likely as cwd detection is active.
        while (i < cwdPath.length) {
            result.push(osPath.resolve(cwd + sep + linkPath.slice(commonDirs).join(sep)));
            if (cwdPath[i] === linkPath[i]) {
                commonDirs++;
            }
            else {
                break;
            }
            i++;
        }
    }
    return result;
}
export function osPathModule(os) {
    return os === 1 /* OperatingSystem.Windows */ ? win32 : posix;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMaW5rSGVscGVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvbGlua3MvYnJvd3Nlci90ZXJtaW5hbExpbmtIZWxwZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLE9BQU8sRUFBUyxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFJekU7Ozs7Ozs7R0FPRztBQUNILE1BQU0sVUFBVSx3QkFBd0IsQ0FDdkMsS0FBb0IsRUFDcEIsV0FBbUIsRUFDbkIsS0FBYSxFQUNiLFNBQWlCO0lBRWpCLE1BQU0sV0FBVyxHQUFpQjtRQUNqQyxLQUFLLEVBQUU7WUFDTixDQUFDLEVBQUUsS0FBSyxDQUFDLFdBQVc7WUFDcEIsQ0FBQyxFQUFFLEtBQUssQ0FBQyxlQUFlLEdBQUcsU0FBUztTQUNwQztRQUNELEdBQUcsRUFBRTtZQUNKLENBQUMsRUFBRSxLQUFLLENBQUMsU0FBUyxHQUFHLENBQUM7WUFDdEIsQ0FBQyxFQUFFLEtBQUssQ0FBQyxhQUFhLEdBQUcsU0FBUztTQUNsQztLQUNELENBQUM7SUFFRixrRUFBa0U7SUFDbEUsSUFBSSxXQUFXLEdBQUcsQ0FBQyxDQUFDO0lBQ3BCLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQyxDQUFDO0lBQ3pFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUMxRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDLEtBQUss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