/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { convertLinkRangeToBuffer } from '../../browser/terminalLinkHelpers.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
suite('Workbench - Terminal Link Helpers', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('convertLinkRangeToBuffer', () => {
        test('should convert ranges for ascii characters', () => {
            const lines = createBufferLineArray([
                { text: 'AA http://t', width: 11 },
                { text: '.com/f/', width: 8 }
            ]);
            const bufferRange = convertLinkRangeToBuffer(lines, 11, { startColumn: 4, startLineNumber: 1, endColumn: 19, endLineNumber: 1 }, 0);
            assert.deepStrictEqual(bufferRange, {
                start: { x: 4, y: 1 },
                end: { x: 7, y: 2 }
            });
        });
        test('should convert ranges for wide characters before the link', () => {
            const lines = createBufferLineArray([
                { text: 'A文 http://', width: 11 },
                { text: 't.com/f/', width: 9 }
            ]);
            const bufferRange = convertLinkRangeToBuffer(lines, 11, { startColumn: 4, startLineNumber: 1, endColumn: 19, endLineNumber: 1 }, 0);
            assert.deepStrictEqual(bufferRange, {
                start: { x: 4 + 1, y: 1 },
                end: { x: 7 + 1, y: 2 }
            });
        });
        test('should give correct range for links containing multi-character emoji', () => {
            const lines = createBufferLineArray([
                { text: 'A🙂 http://', width: 11 }
            ]);
            const bufferRange = convertLinkRangeToBuffer(lines, 11, { startColumn: 0 + 1, startLineNumber: 1, endColumn: 2 + 1, endLineNumber: 1 }, 0);
            assert.deepStrictEqual(bufferRange, {
                start: { x: 1, y: 1 },
                end: { x: 2, y: 1 }
            });
        });
        test('should convert ranges for combining characters before the link', () => {
            const lines = createBufferLineArray([
                { text: 'A🙂 http://', width: 11 },
                { text: 't.com/f/', width: 9 }
            ]);
            const bufferRange = convertLinkRangeToBuffer(lines, 11, { startColumn: 4 + 1, startLineNumber: 1, endColumn: 19 + 1, endLineNumber: 1 }, 0);
            assert.deepStrictEqual(bufferRange, {
                start: { x: 6, y: 1 },
                end: { x: 9, y: 2 }
            });
        });
        test('should convert ranges for wide characters inside the link', () => {
            const lines = createBufferLineArray([
                { text: 'AA http://t', width: 11 },
                { text: '.com/文/', width: 8 }
            ]);
            const bufferRange = convertLinkRangeToBuffer(lines, 11, { startColumn: 4, startLineNumber: 1, endColumn: 19, endLineNumber: 1 }, 0);
            assert.deepStrictEqual(bufferRange, {
                start: { x: 4, y: 1 },
                end: { x: 7 + 1, y: 2 }
            });
        });
        test('should convert ranges for wide characters before and inside the link', () => {
            const lines = createBufferLineArray([
                { text: 'A文 http://', width: 11 },
                { text: 't.com/文/', width: 9 }
            ]);
            const bufferRange = convertLinkRangeToBuffer(lines, 11, { startColumn: 4, startLineNumber: 1, endColumn: 19, endLineNumber: 1 }, 0);
            assert.deepStrictEqual(bufferRange, {
                start: { x: 4 + 1, y: 1 },
                end: { x: 7 + 2, y: 2 }
            });
        });
        test('should convert ranges for emoji before and wide inside the link', () => {
            const lines = createBufferLineArray([
                { text: 'A🙂 http://', width: 11 },
                { text: 't.com/文/', width: 9 }
            ]);
            const bufferRange = convertLinkRangeToBuffer(lines, 11, { startColumn: 4 + 1, startLineNumber: 1, endColumn: 19 + 1, endLineNumber: 1 }, 0);
            assert.deepStrictEqual(bufferRange, {
                start: { x: 6, y: 1 },
                end: { x: 10 + 1, y: 2 }
            });
        });
        test('should convert ranges for ascii characters (link starts on wrapped)', () => {
            const lines = createBufferLineArray([
                { text: 'AAAAAAAAAAA', width: 11 },
                { text: 'AA http://t', width: 11 },
                { text: '.com/f/', width: 8 }
            ]);
            const bufferRange = convertLinkRangeToBuffer(lines, 11, { startColumn: 15, startLineNumber: 1, endColumn: 30, endLineNumber: 1 }, 0);
            assert.deepStrictEqual(bufferRange, {
                start: { x: 4, y: 2 },
                end: { x: 7, y: 3 }
            });
        });
        test('should convert ranges for wide characters before the link (link starts on wrapped)', () => {
            const lines = createBufferLineArray([
                { text: 'AAAAAAAAAAA', width: 11 },
                { text: 'A文 http://', width: 11 },
                { text: 't.com/f/', width: 9 }
            ]);
            const bufferRange = convertLinkRangeToBuffer(lines, 11, { startColumn: 15, startLineNumber: 1, endColumn: 30, endLineNumber: 1 }, 0);
            assert.deepStrictEqual(bufferRange, {
                start: { x: 4 + 1, y: 2 },
                end: { x: 7 + 1, y: 3 }
            });
        });
        test('regression test #147619: 获取模板 25235168 的预览图失败', () => {
            const lines = createBufferLineArray([
                { text: '获取模板 25235168 的预览图失败', width: 30 }
            ]);
            assert.deepStrictEqual(convertLinkRangeToBuffer(lines, 30, {
                startColumn: 1,
                startLineNumber: 1,
                endColumn: 5,
                endLineNumber: 1
            }, 0), {
                start: { x: 1, y: 1 },
                end: { x: 8, y: 1 }
            });
            assert.deepStrictEqual(convertLinkRangeToBuffer(lines, 30, {
                startColumn: 6,
                startLineNumber: 1,
                endColumn: 14,
                endLineNumber: 1
            }, 0), {
                start: { x: 10, y: 1 },
                end: { x: 17, y: 1 }
            });
            assert.deepStrictEqual(convertLinkRangeToBuffer(lines, 30, {
                startColumn: 15,
                startLineNumber: 1,
                endColumn: 21,
                endLineNumber: 1
            }, 0), {
                start: { x: 19, y: 1 },
                end: { x: 30, y: 1 }
            });
        });
        test('should convert ranges for wide characters inside the link (link starts on wrapped)', () => {
            const lines = createBufferLineArray([
                { text: 'AAAAAAAAAAA', width: 11 },
                { text: 'AA http://t', width: 11 },
                { text: '.com/文/', width: 8 }
            ]);
            const bufferRange = convertLinkRangeToBuffer(lines, 11, { startColumn: 15, startLineNumber: 1, endColumn: 30, endLineNumber: 1 }, 0);
            assert.deepStrictEqual(bufferRange, {
                start: { x: 4, y: 2 },
                end: { x: 7 + 1, y: 3 }
            });
        });
        test('should convert ranges for wide characters before and inside the link #2', () => {
            const lines = createBufferLineArray([
                { text: 'AAAAAAAAAAA', width: 11 },
                { text: 'A文 http://', width: 11 },
                { text: 't.com/文/', width: 9 }
            ]);
            const bufferRange = convertLinkRangeToBuffer(lines, 11, { startColumn: 15, startLineNumber: 1, endColumn: 30, endLineNumber: 1 }, 0);
            assert.deepStrictEqual(bufferRange, {
                start: { x: 4 + 1, y: 2 },
                end: { x: 7 + 2, y: 3 }
            });
        });
        test('should convert ranges for several wide characters before the link', () => {
            const lines = createBufferLineArray([
                { text: 'A文文AAAAAA', width: 11 },
                { text: 'AA文文 http', width: 11 },
                { text: '://t.com/f/', width: 11 }
            ]);
            const bufferRange = convertLinkRangeToBuffer(lines, 11, { startColumn: 15, startLineNumber: 1, endColumn: 30, endLineNumber: 1 }, 0);
            // This test ensures that the start offset is applied to the end before it's counted
            assert.deepStrictEqual(bufferRange, {
                start: { x: 3 + 4, y: 2 },
                end: { x: 6 + 4, y: 3 }
            });
        });
        test('should convert ranges for several wide characters before and inside the link', () => {
            const lines = createBufferLineArray([
                { text: 'A文文AAAAAA', width: 11 },
                { text: 'AA文文 http', width: 11 },
                { text: '://t.com/文', width: 11 },
                { text: '文/', width: 3 }
            ]);
            const bufferRange = convertLinkRangeToBuffer(lines, 11, { startColumn: 14, startLineNumber: 1, endColumn: 31, endLineNumber: 1 }, 0);
            // This test ensures that the start offset is applies to the end before it's counted
            assert.deepStrictEqual(bufferRange, {
                start: { x: 5, y: 2 },
                end: { x: 1, y: 4 }
            });
        });
    });
});
const TEST_WIDE_CHAR = '文';
const TEST_NULL_CHAR = 'C';
function createBufferLineArray(lines) {
    const result = [];
    lines.forEach((l, i) => {
        result.push(new TestBufferLine(l.text, l.width, i + 1 !== lines.length));
    });
    return result;
}
class TestBufferLine {
    constructor(_text, length, isWrapped) {
        this._text = _text;
        this.length = length;
        this.isWrapped = isWrapped;
    }
    getCell(x) {
        // Create a fake line of cells and use that to resolve the width
        const cells = [];
        let wideNullCellOffset = 0; // There is no null 0 width char after a wide char
        const emojiOffset = 0; // Skip chars as emoji are multiple characters
        for (let i = 0; i <= x - wideNullCellOffset + emojiOffset; i++) {
            let char = this._text.charAt(i);
            if (char === '\ud83d') {
                // Make "🙂"
                char += '\ude42';
            }
            cells.push(char);
            if (this._text.charAt(i) === TEST_WIDE_CHAR || char.charCodeAt(0) > 255) {
                // Skip the next character as it's width is 0
                cells.push(TEST_NULL_CHAR);
                wideNullCellOffset++;
            }
        }
        return {
            getChars: () => {
                return x >= cells.length ? '' : cells[x];
            },
            getWidth: () => {
                switch (cells[x]) {
                    case TEST_WIDE_CHAR: return 2;
                    case TEST_NULL_CHAR: return 0;
                    default: {
                        // Naive measurement, assume anything our of ascii in tests are wide
                        if (cells[x].charCodeAt(0) > 255) {
                            return 2;
                        }
                        return 1;
                    }
                }
            }
        };
    }
    translateToString() {
        throw new Error('Method not implemented.');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMaW5rSGVscGVycy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9saW5rcy90ZXN0L2Jyb3dzZXIvdGVybWluYWxMaW5rSGVscGVycy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUU1QixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUV0RyxLQUFLLENBQUMsbUNBQW1DLEVBQUUsR0FBRyxFQUFFO0lBQy9DLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsS0FBSyxDQUFDLDBCQUEwQixFQUFFLEdBQUcsRUFBRTtRQUN0QyxJQUFJLENBQUMsNENBQTRDLEVBQUUsR0FBRyxFQUFFO1lBQ3ZELE1BQU0sS0FBSyxHQUFHLHFCQUFxQixDQUFDO2dCQUNuQyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRTtnQkFDbEMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUU7YUFDN0IsQ0FBQyxDQUFDO1lBQ0gsTUFBTSxXQUFXLEdBQUcsd0JBQXdCLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxDQUFDLEVBQUUsZUFBZSxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLGFBQWEsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNwSSxNQUFNLENBQUMsZUFBZSxDQUFDLFdBQVcsRUFBRTtnQkFDbkMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxFQUFF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