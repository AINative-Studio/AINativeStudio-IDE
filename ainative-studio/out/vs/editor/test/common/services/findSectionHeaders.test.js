/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { findSectionHeaders } from '../../../common/services/findSectionHeaders.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
class TestSectionHeaderFinderTarget {
    constructor(lines) {
        this.lines = lines;
    }
    getLineCount() {
        return this.lines.length;
    }
    getLineContent(lineNumber) {
        return this.lines[lineNumber - 1];
    }
}
suite('FindSectionHeaders', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('finds simple section headers', () => {
        const model = new TestSectionHeaderFinderTarget([
            'regular line',
            'MARK: My Section',
            'another line',
            'MARK: Another Section',
            'last line'
        ]);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: 'MARK:\\s*(?<label>.*)$'
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 2);
        assert.strictEqual(headers[0].text, 'My Section');
        assert.strictEqual(headers[0].range.startLineNumber, 2);
        assert.strictEqual(headers[0].range.endLineNumber, 2);
        assert.strictEqual(headers[1].text, 'Another Section');
        assert.strictEqual(headers[1].range.startLineNumber, 4);
        assert.strictEqual(headers[1].range.endLineNumber, 4);
    });
    test('finds section headers with separators', () => {
        const model = new TestSectionHeaderFinderTarget([
            'regular line',
            'MARK: -My Section',
            'another line',
            'MARK: - Another Section',
            'last line'
        ]);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: 'MARK:\\s*(?<separator>-?)\\s*(?<label>.*)$'
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 2);
        assert.strictEqual(headers[0].text, 'My Section');
        assert.strictEqual(headers[0].hasSeparatorLine, true);
        assert.strictEqual(headers[1].text, 'Another Section');
        assert.strictEqual(headers[1].hasSeparatorLine, true);
    });
    test('finds multi-line section headers with separators', () => {
        const model = new TestSectionHeaderFinderTarget([
            'regular line',
            '// ==========',
            '// My Section',
            '// ==========',
            'code...',
            '// ==========',
            '// Another Section',
            '// ==========',
            'more code...'
        ]);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: '^\/\/ =+\\n^\/\/ (?<label>[^\\n]+?)\\n^\/\/ =+$'
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 2);
        assert.strictEqual(headers[0].text, 'My Section');
        assert.strictEqual(headers[0].range.startLineNumber, 2);
        assert.strictEqual(headers[0].range.endLineNumber, 4);
        assert.strictEqual(headers[1].text, 'Another Section');
        assert.strictEqual(headers[1].range.startLineNumber, 6);
        assert.strictEqual(headers[1].range.endLineNumber, 8);
    });
    test('handles overlapping multi-line section headers correctly', () => {
        const model = new TestSectionHeaderFinderTarget([
            '// ==========',
            '// Section 1',
            '// ==========',
            '// ==========', // This line starts another header
            '// Section 2',
            '// ==========',
        ]);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: '^\/\/ =+\\n^\/\/ (?<label>[^\\n]+?)\\n^\/\/ =+$'
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 2);
        assert.strictEqual(headers[0].text, 'Section 1');
        assert.strictEqual(headers[0].range.startLineNumber, 1);
        assert.strictEqual(headers[0].range.endLineNumber, 3);
        assert.strictEqual(headers[1].text, 'Section 2');
        assert.strictEqual(headers[1].range.startLineNumber, 4);
        assert.strictEqual(headers[1].range.endLineNumber, 6);
    });
    test('section headers must be in comments when specified', () => {
        const model = new TestSectionHeaderFinderTarget([
            '// ==========',
            '// Section 1', // This one is in a comment
            '// ==========',
            '==========', // This one isn't
            'Section 2',
            '=========='
        ]);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: '^(?:\/\/ )?=+\\n^(?:\/\/ )?(?<label>[^\\n]+?)\\n^(?:\/\/ )?=+$'
        };
        // Both patterns match, but the second one should be filtered out by the token check
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers[0].shouldBeInComments, true);
    });
    test('handles section headers at chunk boundaries', () => {
        // Create enough lines to ensure we cross chunk boundaries
        const lines = [];
        for (let i = 0; i < 150; i++) {
            lines.push('line ' + i);
        }
        // Add headers near the chunk boundary (chunk size is 100)
        lines[97] = '// ==========';
        lines[98] = '// Section 1';
        lines[99] = '// ==========';
        lines[100] = '// ==========';
        lines[101] = '// Section 2';
        lines[102] = '// ==========';
        const model = new TestSectionHeaderFinderTarget(lines);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: '^\/\/ =+\\n^\/\/ (?<label>[^\\n]+?)\\n^\/\/ =+$'
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 2);
        assert.strictEqual(headers[0].text, 'Section 1');
        assert.strictEqual(headers[0].range.startLineNumber, 98);
        assert.strictEqual(headers[0].range.endLineNumber, 100);
        assert.strictEqual(headers[1].text, 'Section 2');
        assert.strictEqual(headers[1].range.startLineNumber, 101);
        assert.strictEqual(headers[1].range.endLineNumber, 103);
    });
    test('correctly advances past matches without infinite loop', () => {
        const model = new TestSectionHeaderFinderTarget([
            '// ==========',
            '// Section 1',
            '// ==========',
            'some code',
            '// ==========',
            '// Section 2',
            '// ==========',
            'more code',
            '// ==========',
            '// Section 3',
            '// ==========',
        ]);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: '^\/\/ =+\\n^\/\/ (?<label>[^\\n]+?)\\n^\/\/ =+$'
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 3, 'Should find all three section headers');
        assert.strictEqual(headers[0].text, 'Section 1');
        assert.strictEqual(headers[1].text, 'Section 2');
        assert.strictEqual(headers[2].text, 'Section 3');
    });
    test('handles consecutive section headers correctly', () => {
        const model = new TestSectionHeaderFinderTarget([
            '// ==========',
            '// Section 1',
            '// ==========',
            '// ==========', // This line is both the end of Section 1 and start of Section 2
            '// Section 2',
            '// ==========',
        ]);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: '^\/\/ =+\\n^\/\/ (?<label>[^\\n]+?)\\n^\/\/ =+$'
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 2, 'Should find both section headers');
        assert.strictEqual(headers[0].text, 'Section 1');
        assert.strictEqual(headers[1].text, 'Section 2');
    });
    test('handles nested separators correctly', () => {
        const model = new TestSectionHeaderFinderTarget([
            '// ==============',
            '// Major Section',
            '// ==============',
            '',
            '// ----------',
            '// Subsection',
            '// ----------',
        ]);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: '^\/\/ [-=]+\\n^\/\/ (?<label>[^\\n]+?)\\n^\/\/ [-=]+$'
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 2, 'Should find both section headers');
        assert.strictEqual(headers[0].text, 'Major Section');
        assert.strictEqual(headers[1].text, 'Subsection');
    });
    test('handles section headers at chunk boundaries correctly', () => {
        const lines = [];
        // Fill up to near the chunk boundary (chunk size is 100)
        for (let i = 0; i < 97; i++) {
            lines.push(`line ${i}`);
        }
        // Add a section header that would cross the chunk boundary
        lines.push('// =========='); // line 97
        lines.push('// Section 1'); // line 98
        lines.push('// =========='); // line 99
        lines.push('// =========='); // line 100 (chunk boundary)
        lines.push('// Section 2'); // line 101
        lines.push('// =========='); // line 102
        // Add more content after
        for (let i = 103; i < 150; i++) {
            lines.push(`line ${i}`);
        }
        const model = new TestSectionHeaderFinderTarget(lines);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: '^\/\/ =+\\n^\/\/ (?<label>[^\\n]+?)\\n^\/\/ =+$'
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 2, 'Should find both section headers across chunk boundary');
        assert.strictEqual(headers[0].text, 'Section 1');
        assert.strictEqual(headers[0].range.startLineNumber, 98);
        assert.strictEqual(headers[0].range.endLineNumber, 100);
        assert.strictEqual(headers[1].text, 'Section 2');
        assert.strictEqual(headers[1].range.startLineNumber, 101);
        assert.strictEqual(headers[1].range.endLineNumber, 103);
    });
    test('handles overlapping section headers without duplicates', () => {
        const model = new TestSectionHeaderFinderTarget([
            '// ==========', // Line 1
            '// Section 1', // Line 2 - This is part of first header
            '// ==========', // Line 3 - This is the end of first
            '// Section 2', // Line 4 - This is not a header
            '// ==========', // Line 5
            '// ==========', // Line 6 - Start of second header
            '// Section 3', // Line 7
            '// ===========' // Line 8
        ]);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: '^\/\/ =+\\n^\/\/ (?<label>[^\\n]+?)\\n^\/\/ =+$'
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 2);
        assert.strictEqual(headers[0].text, 'Section 1');
        assert.strictEqual(headers[0].range.startLineNumber, 1);
        assert.strictEqual(headers[0].range.endLineNumber, 3);
        // assert.strictEqual(headers[1].text, 'Section 2');
        // assert.strictEqual(headers[1].range.startLineNumber, 3);
        // assert.strictEqual(headers[1].range.endLineNumber, 5);
        assert.strictEqual(headers[1].text, 'Section 3');
        assert.strictEqual(headers[1].range.startLineNumber, 6);
        assert.strictEqual(headers[1].range.endLineNumber, 8);
    });
    test('handles partially overlapping multiline section headers correctly', () => {
        const model = new TestSectionHeaderFinderTarget([
            '// ================', // Line 1
            '// Major Section 1', // Line 2
            '// ================', // Line 3
            '// --------', // Line 4 - Start of subsection that overlaps with end of major section
            '// Subsection 1.1', // Line 5
            '// --------', // Line 6
            '// ================', // Line 7
            '// Major Section 2', // Line 8
            '// ================', // Line 9
        ]);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: '^\/\/ [-=]+\\n^\/\/ (?<label>[^\\n]+?)\\n^\/\/ [-=]+$'
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 3);
        assert.strictEqual(headers[0].text, 'Major Section 1');
        assert.strictEqual(headers[0].range.startLineNumber, 1);
        assert.strictEqual(headers[0].range.endLineNumber, 3);
        assert.strictEqual(headers[1].text, 'Subsection 1.1');
        assert.strictEqual(headers[1].range.startLineNumber, 4);
        assert.strictEqual(headers[1].range.endLineNumber, 6);
        assert.strictEqual(headers[2].text, 'Major Section 2');
        assert.strictEqual(headers[2].range.startLineNumber, 7);
        assert.strictEqual(headers[2].range.endLineNumber, 9);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZFNlY3Rpb25IZWFkZXJzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL3NlcnZpY2VzL2ZpbmRTZWN0aW9uSGVhZGVycy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sRUFBd0Qsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMxSSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVoRyxNQUFNLDZCQUE2QjtJQUNsQyxZQUE2QixLQUFlO1FBQWYsVUFBSyxHQUFMLEtBQUssQ0FBVTtJQUFJLENBQUM7SUFFakQsWUFBWTtRQUNYLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7SUFDMUIsQ0FBQztJQUVELGNBQWMsQ0FBQyxVQUFrQjtRQUNoQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ25DLENBQUM7Q0FDRDtBQUVELEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7SUFFaEMsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsOEJBQThCLEVBQUUsR0FBRyxFQUFFO1FBQ3pDLE1BQU0sS0FBSyxHQUFHLElBQUksNkJBQTZCLENBQUM7WUFDL0MsY0FBYztZQUNkLGtCQUFrQjtZQUNsQixjQUFjO1lBQ2QsdUJBQXVCO1lBQ3ZCLFdBQVc7U0FDWCxDQUFDLENBQUM7UUFFSCxNQUFNLE9BQU8sR0FBNkI7WUFDekMsd0JBQXdCLEVBQUUsS0FBSztZQUMvQixzQkFBc0IsRUFBRSxJQUFJO1lBQzVCLHNCQUFzQixFQUFFLHdCQUF3QjtTQUNoRCxDQUFD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