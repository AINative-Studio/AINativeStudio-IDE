/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Range } from '../../../common/core/range.js';
import { DiffComputer } from '../../../common/diff/legacyLinesDiffComputer.js';
import { createTextModel } from '../testTextModel.js';
function assertDiff(originalLines, modifiedLines, expectedChanges, shouldComputeCharChanges = true, shouldPostProcessCharChanges = false, shouldIgnoreTrimWhitespace = false) {
    const diffComputer = new DiffComputer(originalLines, modifiedLines, {
        shouldComputeCharChanges,
        shouldPostProcessCharChanges,
        shouldIgnoreTrimWhitespace,
        shouldMakePrettyDiff: true,
        maxComputationTime: 0
    });
    const changes = diffComputer.computeDiff().changes;
    const mapCharChange = (charChange) => {
        return {
            originalStartLineNumber: charChange.originalStartLineNumber,
            originalStartColumn: charChange.originalStartColumn,
            originalEndLineNumber: charChange.originalEndLineNumber,
            originalEndColumn: charChange.originalEndColumn,
            modifiedStartLineNumber: charChange.modifiedStartLineNumber,
            modifiedStartColumn: charChange.modifiedStartColumn,
            modifiedEndLineNumber: charChange.modifiedEndLineNumber,
            modifiedEndColumn: charChange.modifiedEndColumn,
        };
    };
    const actual = changes.map((lineChange) => {
        return {
            originalStartLineNumber: lineChange.originalStartLineNumber,
            originalEndLineNumber: lineChange.originalEndLineNumber,
            modifiedStartLineNumber: lineChange.modifiedStartLineNumber,
            modifiedEndLineNumber: lineChange.modifiedEndLineNumber,
            charChanges: (lineChange.charChanges ? lineChange.charChanges.map(mapCharChange) : undefined)
        };
    });
    assert.deepStrictEqual(actual, expectedChanges);
    if (!shouldIgnoreTrimWhitespace) {
        // The diffs should describe how to apply edits to the original text model to get to the modified text model.
        const modifiedTextModel = createTextModel(modifiedLines.join('\n'));
        const expectedValue = modifiedTextModel.getValue();
        {
            // Line changes:
            const originalTextModel = createTextModel(originalLines.join('\n'));
            originalTextModel.applyEdits(changes.map(c => getLineEdit(c, modifiedTextModel)));
            assert.deepStrictEqual(originalTextModel.getValue(), expectedValue);
            originalTextModel.dispose();
        }
        if (shouldComputeCharChanges) {
            // Char changes:
            const originalTextModel = createTextModel(originalLines.join('\n'));
            originalTextModel.applyEdits(changes.flatMap(c => getCharEdits(c, modifiedTextModel)));
            assert.deepStrictEqual(originalTextModel.getValue(), expectedValue);
            originalTextModel.dispose();
        }
        modifiedTextModel.dispose();
    }
}
function getCharEdits(lineChange, modifiedTextModel) {
    if (!lineChange.charChanges) {
        return [getLineEdit(lineChange, modifiedTextModel)];
    }
    return lineChange.charChanges.map(c => {
        const originalRange = new Range(c.originalStartLineNumber, c.originalStartColumn, c.originalEndLineNumber, c.originalEndColumn);
        const modifiedRange = new Range(c.modifiedStartLineNumber, c.modifiedStartColumn, c.modifiedEndLineNumber, c.modifiedEndColumn);
        return {
            range: originalRange,
            text: modifiedTextModel.getValueInRange(modifiedRange)
        };
    });
}
function getLineEdit(lineChange, modifiedTextModel) {
    let originalRange;
    if (lineChange.originalEndLineNumber === 0) {
        // Insertion
        originalRange = new LineRange(lineChange.originalStartLineNumber + 1, 0);
    }
    else {
        originalRange = new LineRange(lineChange.originalStartLineNumber, lineChange.originalEndLineNumber - lineChange.originalStartLineNumber + 1);
    }
    let modifiedRange;
    if (lineChange.modifiedEndLineNumber === 0) {
        // Deletion
        modifiedRange = new LineRange(lineChange.modifiedStartLineNumber + 1, 0);
    }
    else {
        modifiedRange = new LineRange(lineChange.modifiedStartLineNumber, lineChange.modifiedEndLineNumber - lineChange.modifiedStartLineNumber + 1);
    }
    const [r1, r2] = diffFromLineRanges(originalRange, modifiedRange);
    return {
        range: r1,
        text: modifiedTextModel.getValueInRange(r2),
    };
}
function diffFromLineRanges(originalRange, modifiedRange) {
    if (originalRange.startLineNumber === 1 || modifiedRange.startLineNumber === 1) {
        if (!originalRange.isEmpty && !modifiedRange.isEmpty) {
            return [
                new Range(originalRange.startLineNumber, 1, originalRange.endLineNumberExclusive - 1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */),
                new Range(modifiedRange.startLineNumber, 1, modifiedRange.endLineNumberExclusive - 1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */)
            ];
        }
        // When one of them is one and one of them is empty, the other cannot be the last line of the document
        return [
            new Range(originalRange.startLineNumber, 1, originalRange.endLineNumberExclusive, 1),
            new Range(modifiedRange.startLineNumber, 1, modifiedRange.endLineNumberExclusive, 1)
        ];
    }
    return [
        new Range(originalRange.startLineNumber - 1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */, originalRange.endLineNumberExclusive - 1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */),
        new Range(modifiedRange.startLineNumber - 1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */, modifiedRange.endLineNumberExclusive - 1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */)
    ];
}
class LineRange {
    constructor(startLineNumber, lineCount) {
        this.startLineNumber = startLineNumber;
        this.lineCount = lineCount;
    }
    get isEmpty() {
        return this.lineCount === 0;
    }
    get endLineNumberExclusive() {
        return this.startLineNumber + this.lineCount;
    }
}
function createLineDeletion(startLineNumber, endLineNumber, modifiedLineNumber) {
    return {
        originalStartLineNumber: startLineNumber,
        originalEndLineNumber: endLineNumber,
        modifiedStartLineNumber: modifiedLineNumber,
        modifiedEndLineNumber: 0,
        charChanges: undefined
    };
}
function createLineInsertion(startLineNumber, endLineNumber, originalLineNumber) {
    return {
        originalStartLineNumber: originalLineNumber,
        originalEndLineNumber: 0,
        modifiedStartLineNumber: startLineNumber,
        modifiedEndLineNumber: endLineNumber,
        charChanges: undefined
    };
}
function createLineChange(originalStartLineNumber, originalEndLineNumber, modifiedStartLineNumber, modifiedEndLineNumber, charChanges) {
    return {
        originalStartLineNumber: originalStartLineNumber,
        originalEndLineNumber: originalEndLineNumber,
        modifiedStartLineNumber: modifiedStartLineNumber,
        modifiedEndLineNumber: modifiedEndLineNumber,
        charChanges: charChanges
    };
}
function createCharChange(originalStartLineNumber, originalStartColumn, originalEndLineNumber, originalEndColumn, modifiedStartLineNumber, modifiedStartColumn, modifiedEndLineNumber, modifiedEndColumn) {
    return {
        originalStartLineNumber: originalStartLineNumber,
        originalStartColumn: originalStartColumn,
        originalEndLineNumber: originalEndLineNumber,
        originalEndColumn: originalEndColumn,
        modifiedStartLineNumber: modifiedStartLineNumber,
        modifiedStartColumn: modifiedStartColumn,
        modifiedEndLineNumber: modifiedEndLineNumber,
        modifiedEndColumn: modifiedEndColumn
    };
}
suite('Editor Diff - DiffComputer', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    // ---- insertions
    test('one inserted line below', () => {
        const original = ['line'];
        const modified = ['line', 'new line'];
        const expected = [createLineInsertion(2, 2, 1)];
        assertDiff(original, modified, expected);
    });
    test('two inserted lines below', () => {
        const original = ['line'];
        const modified = ['line', 'new line', 'another new line'];
        const expected = [createLineInsertion(2, 3, 1)];
        assertDiff(original, modified, expected);
    });
    test('one inserted line above', () => {
        const original = ['line'];
        const modified = ['new line', 'line'];
        const expected = [createLineInsertion(1, 1, 0)];
        assertDiff(original, modified, expected);
    });
    test('two inserted lines above', () => {
        const original = ['line'];
        const modified = ['new line', 'another new line', 'line'];
        const expected = [createLineInsertion(1, 2, 0)];
        assertDiff(original, modified, expected);
    });
    test('one inserted line in middle', () => {
        const original = ['line1', 'line2', 'line3', 'line4'];
        const modified = ['line1', 'line2', 'new line', 'line3', 'line4'];
        const expected = [createLineInsertion(3, 3, 2)];
        assertDiff(original, modified, expected);
    });
    test('two inserted lines in middle', () => {
        const original = ['line1', 'line2', 'line3', 'line4'];
        const modified = ['line1', 'line2', 'new line', 'another new line', 'line3', 'line4'];
        const expected = [createLineInsertion(3, 4, 2)];
        assertDiff(original, modified, expected);
    });
    test('two inserted lines in middle interrupted', () => {
        const original = ['line1', 'line2', 'line3', 'line4'];
        const modified = ['line1', 'line2', 'new line', 'line3', 'another new line', 'line4'];
        const expected = [createLineInsertion(3, 3, 2), createLineInsertion(5, 5, 3)];
        assertDiff(original, modified, expected);
    });
    // ---- deletions
    test('one deleted line below', () => {
        const original = ['line', 'new line'];
        const modified = ['line'];
        const expected = [createLineDeletion(2, 2, 1)];
        assertDiff(original, modified, expected);
    });
    test('two deleted lines below', () => {
        const original = ['line', 'new line', 'another new line'];
        const modified = ['line'];
        const expected = [createLineDeletion(2, 3, 1)];
        assertDiff(original, modified, expected);
    });
    test('one deleted lines above', () => {
        const original = ['new line', 'line'];
        const modified = ['line'];
        const expected = [createLineDeletion(1, 1, 0)];
        assertDiff(original, modified, expected);
    });
    test('two deleted lines above', () => {
        const original = ['new line', 'another new line', 'line'];
        const modified = ['line'];
        const expected = [createLineDeletion(1, 2, 0)];
        assertDiff(original, modified, expected);
    });
    test('one deleted line in middle', () => {
        const original = ['line1', 'line2', 'new line', 'line3', 'line4'];
        const modified = ['line1', 'line2', 'line3', 'line4'];
        const expected = [createLineDeletion(3, 3, 2)];
        assertDiff(original, modified, expected);
    });
    test('two deleted lines in middle', () => {
        const original = ['line1', 'line2', 'new line', 'another new line', 'line3', 'line4'];
        const modified = ['line1', 'line2', 'line3', 'line4'];
        const expected = [createLineDeletion(3, 4, 2)];
        assertDiff(original, modified, expected);
    });
    test('two deleted lines in middle interrupted', () => {
        const original = ['line1', 'line2', 'new line', 'line3', 'another new line', 'line4'];
        const modified = ['line1', 'line2', 'line3', 'line4'];
        const expected = [createLineDeletion(3, 3, 2), createLineDeletion(5, 5, 3)];
        assertDiff(original, modified, expected);
    });
    // ---- changes
    test('one line changed: chars inserted at the end', () => {
        const original = ['line'];
        const modified = ['line changed'];
        const expected = [
            createLineChange(1, 1, 1, 1, [
                createCharChange(1, 5, 1, 5, 1, 5, 1, 13)
            ])
        ];
        assertDiff(original, modified, expected);
    });
    test('one line changed: chars inserted at the beginning', () => {
        const original = ['line'];
        const modified = ['my line'];
        const expected = [
            createLineChange(1, 1, 1, 1, [
                createCharChange(1, 1, 1, 1, 1, 1, 1, 4)
            ])
        ];
        assertDiff(original, modified, expected);
    });
    test('one line changed: chars inserted in the middle', () => {
        const original = ['abba'];
        const modified = ['abzzba'];
        const expected = [
            createLineChange(1, 1, 1, 1, [
                createCharChange(1, 3, 1, 3, 1, 3, 1, 5)
            ])
        ];
        assertDiff(original, modified, expected);
    });
    test('one line changed: chars inserted in the middle (two spots)', () => {
        const original = ['abba'];
        const modified = ['abzzbzza'];
        const expected = [
            createLineChange(1, 1, 1, 1, [
                createCharChange(1, 3, 1, 3, 1, 3, 1, 5),
                createCharChange(1, 4, 1, 4, 1, 6, 1, 8)
            ])
        ];
        assertDiff(original, modified, expected);
    });
    test('one line changed: chars deleted 1', () => {
        const original = ['abcdefg'];
        const modified = ['abcfg'];
        const expected = [
            createLineChange(1, 1, 1, 1, [
                createCharChange(1, 4, 1, 6, 1, 4, 1, 4)
            ])
        ];
        assertDiff(original, modified, expected);
    });
    test('one line changed: chars deleted 2', () => {
        const original = ['abcdefg'];
        const modified = ['acfg'];
        const expected = [
            createLineChange(1, 1, 1, 1, [
                createCharChange(1, 2, 1, 3, 1, 2, 1, 2),
                createCharChange(1, 4, 1, 6, 1, 3, 1, 3)
            ])
        ];
        assertDiff(original, modified, expected);
    });
    test('two lines changed 1', () => {
        const original = ['abcd', 'efgh'];
        const modified = ['abcz'];
        const expected = [
            createLineChange(1, 2, 1, 1, [
                createCharChange(1, 4, 2, 5, 1, 4, 1, 5)
            ])
        ];
        assertDiff(original, modified, expected);
    });
    test('two lines changed 2', () => {
        const original = ['foo', 'abcd', 'efgh', 'BAR'];
        const modified = ['foo', 'abcz', 'BAR'];
        const expected = [
            createLineChange(2, 3, 2, 2, [
                createCharChange(2, 4, 3, 5, 2, 4, 2, 5)
            ])
        ];
        assertDiff(original, modified, expected);
    });
    test('two lines changed 3', () => {
        const original = ['foo', 'abcd', 'efgh', 'BAR'];
        const modified = ['foo', 'abcz', 'zzzzefgh', 'BAR'];
        const expected = [
            createLineChange(2, 3, 2, 3, [
                createCharChange(2, 4, 2, 5, 2, 4, 2, 5),
                createCharChange(3, 1, 3, 1, 3, 1, 3, 5)
            ])
        ];
        assertDiff(original, modified, expected);
    });
    test('two lines changed 4', () => {
        const original = ['abc'];
        const modified = ['', '', 'axc', ''];
        const expected = [
            createLineChange(1, 1, 1, 4, [
                createCharChange(1, 1, 1, 1, 1, 1, 3, 1),
                createCharChange(1, 2, 1, 3, 3, 2, 3, 3),
                createCharChange(1, 4, 1, 4, 3, 4, 4, 1)
            ])
        ];
        assertDiff(original, modified, expected);
    });
    test('empty original sequence in char diff', () => {
        const original = ['abc', '', 'xyz'];
        const modified = ['abc', 'qwe', 'rty', 'xyz'];
        const expected = [
            createLineChange(2, 2, 2, 3)
        ];
        assertDiff(original, modified, expected);
    });
    test('three lines changed', () => {
        const original = ['foo', 'abcd', 'efgh', 'BAR'];
        const modified = ['foo', 'zzzefgh', 'xxx', 'BAR'];
        const expected = [
            createLineChange(2, 3, 2, 3, [
                createCharChange(2, 1, 3, 1, 2, 1, 2, 4),
                createCharChange(3, 5, 3, 5, 2, 8, 3, 4),
            ])
        ];
        assertDiff(original, modified, expected);
    });
    test('big change part 1', () => {
        const original = ['foo', 'abcd', 'efgh', 'BAR'];
        const modified = ['hello', 'foo', 'zzzefgh', 'xxx', 'BAR'];
        const expected = [
            createLineInsertion(1, 1, 0),
            createLineChange(2, 3, 3, 4, [
                createCharChange(2, 1, 3, 1, 3, 1, 3, 4),
                createCharChange(3, 5, 3, 5, 3, 8, 4, 4)
            ])
        ];
        assertDiff(original, modified, expected);
    });
    test('big change part 2', () => {
        const original = ['foo', 'abcd', 'efgh', 'BAR', 'RAB'];
        const modified = ['hello', 'foo', 'zzzefgh', 'xxx', 'BAR'];
        const expected = [
            createLineInsertion(1, 1, 0),
            createLineChange(2, 3, 3, 4, [
                createCharChange(2, 1, 3, 1, 3, 1, 3, 4),
                createCharChange(3, 5, 3, 5, 3, 8, 4, 4)
            ]),
            createLineDeletion(5, 5, 5)
        ];
        assertDiff(original, modified, expected);
    });
    test('char change postprocessing merges', () => {
        const original = ['abba'];
        const modified = ['azzzbzzzbzzza'];
        const expected = [
            createLineChange(1, 1, 1, 1, [
                createCharChange(1, 2, 1, 4, 1, 2, 1, 13)
            ])
        ];
        assertDiff(original, modified, expected, true, true);
    });
    test('ignore trim whitespace', () => {
        const original = ['\t\t foo ', 'abcd', 'efgh', '\t\t BAR\t\t'];
        const modified = ['  hello\t', '\t foo   \t', 'zzzefgh', 'xxx', '   BAR   \t'];
        const expected = [
            createLineInsertion(1, 1, 0),
            createLineChange(2, 3, 3, 4, [
                createCharChange(2, 1, 2, 5, 3, 1, 3, 4),
                createCharChange(3, 5, 3, 5, 4, 1, 4, 4)
            ])
        ];
        assertDiff(original, modified, expected, true, false, true);
    });
    test('issue #12122 r.hasOwnProperty is not a function', () => {
        const original = ['hasOwnProperty'];
        const modified = ['hasOwnProperty', 'and another line'];
        const expected = [
            createLineInsertion(2, 2, 1)
        ];
        assertDiff(original, modified, expected);
    });
    test('empty diff 1', () => {
        const original = [''];
        const modified = ['something'];
        const expected = [
            createLineChange(1, 1, 1, 1, undefined)
        ];
        assertDiff(original, modified, expected, true, false, true);
    });
    test('empty diff 2', () => {
        const original = [''];
        const modified = ['something', 'something else'];
        const expected = [
            createLineChange(1, 1, 1, 2, undefined)
        ];
        assertDiff(original, modified, expected, true, false, true);
    });
    test('empty diff 3', () => {
        const original = ['something', 'something else'];
        const modified = [''];
        const expected = [
            createLineChange(1, 2, 1, 1, undefined)
        ];
        assertDiff(original, modified, expected, true, false, true);
    });
    test('empty diff 4', () => {
        const original = ['something'];
        const modified = [''];
        const expected = [
            createLineChange(1, 1, 1, 1, undefined)
        ];
        assertDiff(original, modified, expected, true, false, true);
    });
    test('empty diff 5', () => {
        const original = [''];
        const modified = [''];
        const expected = [];
        assertDiff(original, modified, expected, true, false, true);
    });
    test('pretty diff 1', () => {
        const original = [
            'suite(function () {',
            '	test1() {',
            '		assert.ok(true);',
            '	}',
            '',
            '	test2() {',
            '		assert.ok(true);',
            '	}',
            '});',
            '',
        ];
        const modified = [
            '// An insertion',
            'suite(function () {',
            '	test1() {',
            '		assert.ok(true);',
            '	}',
            '',
            '	test2() {',
            '		assert.ok(true);',
            '	}',
            '',
            '	test3() {',
            '		assert.ok(true);',
            '	}',
            '});',
            '',
        ];
        const expected = [
            createLineInsertion(1, 1, 0),
            createLineInsertion(10, 13, 8)
        ];
        assertDiff(original, modified, expected, true, false, true);
    });
    test('pretty diff 2', () => {
        const original = [
            '// Just a comment',
            '',
            'function compute(a, b, c, d) {',
            '	if (a) {',
            '		if (b) {',
            '			if (c) {',
            '				return 5;',
            '			}',
            '		}',
            '		// These next lines will be deleted',
            '		if (d) {',
            '			return -1;',
            '		}',
            '		return 0;',
            '	}',
            '}',
        ];
        const modified = [
            '// Here is an inserted line',
            '// and another inserted line',
            '// and another one',
            '// Just a comment',
            '',
            'function compute(a, b, c, d) {',
            '	if (a) {',
            '		if (b) {',
            '			if (c) {',
            '				return 5;',
            '			}',
            '		}',
            '		return 0;',
            '	}',
            '}',
        ];
        const expected = [
            createLineInsertion(1, 3, 0),
            createLineDeletion(10, 13, 12),
        ];
        assertDiff(original, modified, expected, true, false, true);
    });
    test('pretty diff 3', () => {
        const original = [
            'class A {',
            '	/**',
            '	 * m1',
            '	 */',
            '	method1() {}',
            '',
            '	/**',
            '	 * m3',
            '	 */',
            '	method3() {}',
            '}',
        ];
        const modified = [
            'class A {',
            '	/**',
            '	 * m1',
            '	 */',
            '	method1() {}',
            '',
            '	/**',
            '	 * m2',
            '	 */',
            '	method2() {}',
            '',
            '	/**',
            '	 * m3',
            '	 */',
            '	method3() {}',
            '}',
        ];
        const expected = [
            createLineInsertion(7, 11, 6)
        ];
        assertDiff(original, modified, expected, true, false, true);
    });
    test('issue #23636', () => {
        const original = [
            'if(!TextDrawLoad[playerid])',
            '{',
            '',
            '	TextDrawHideForPlayer(playerid,TD_AppleJob[3]);',
            '	TextDrawHideForPlayer(playerid,TD_AppleJob[4]);',
            '	if(!AppleJobTreesType[AppleJobTreesPlayerNum[playerid]])',
            '	{',
            '		for(new i=0;i<10;i++) if(StatusTD_AppleJobApples[playerid][i]) TextDrawHideForPlayer(playerid,TD_AppleJob[5+i]);',
            '	}',
            '	else',
            '	{',
            '		for(new i=0;i<10;i++) if(StatusTD_AppleJobApples[playerid][i]) TextDrawHideForPlayer(playerid,TD_AppleJob[15+i]);',
            '	}',
            '}',
            'else',
            '{',
            '	TextDrawHideForPlayer(playerid,TD_AppleJob[3]);',
            '	TextDrawHideForPlayer(playerid,TD_AppleJob[27]);',
            '	if(!AppleJobTreesType[AppleJobTreesPlayerNum[playerid]])',
            '	{',
            '		for(new i=0;i<10;i++) if(StatusTD_AppleJobApples[playerid][i]) TextDrawHideForPlayer(playerid,TD_AppleJob[28+i]);',
            '	}',
            '	else',
            '	{',
            '		for(new i=0;i<10;i++) if(StatusTD_AppleJobApples[playerid][i]) TextDrawHideForPlayer(playerid,TD_AppleJob[38+i]);',
            '	}',
            '}',
        ];
        const modified = [
            '	if(!TextDrawLoad[playerid])',
            '	{',
            '	',
            '		TextDrawHideForPlayer(playerid,TD_AppleJob[3]);',
            '		TextDrawHideForPlayer(playerid,TD_AppleJob[4]);',
            '		if(!AppleJobTreesType[AppleJobTreesPlayerNum[playerid]])',
            '		{',
            '			for(new i=0;i<10;i++) if(StatusTD_AppleJobApples[playerid][i]) TextDrawHideForPlayer(playerid,TD_AppleJob[5+i]);',
            '		}',
            '		else',
            '		{',
            '			for(new i=0;i<10;i++) if(StatusTD_AppleJobApples[playerid][i]) TextDrawHideForPlayer(playerid,TD_AppleJob[15+i]);',
            '		}',
            '	}',
            '	else',
            '	{',
            '		TextDrawHideForPlayer(playerid,TD_AppleJob[3]);',
            '		TextDrawHideForPlayer(playerid,TD_AppleJob[27]);',
            '		if(!AppleJobTreesType[AppleJobTreesPlayerNum[playerid]])',
            '		{',
            '			for(new i=0;i<10;i++) if(StatusTD_AppleJobApples[playerid][i]) TextDrawHideForPlayer(playerid,TD_AppleJob[28+i]);',
            '		}',
            '		else',
            '		{',
            '			for(new i=0;i<10;i++) if(StatusTD_AppleJobApples[playerid][i]) TextDrawHideForPlayer(playerid,TD_AppleJob[38+i]);',
            '		}',
            '	}',
        ];
        const expected = [
            createLineChange(1, 27, 1, 27, [
                createCharChange(1, 1, 1, 1, 1, 1, 1, 2),
                createCharChange(2, 1, 2, 1, 2, 1, 2, 2),
                createCharChange(3, 1, 3, 1, 3, 1, 3, 2),
                createCharChange(4, 1, 4, 1, 4, 1, 4, 2),
                createCharChange(5, 1, 5, 1, 5, 1, 5, 2),
                createCharChange(6, 1, 6, 1, 6, 1, 6, 2),
                createCharChange(7, 1, 7, 1, 7, 1, 7, 2),
                createCharChange(8, 1, 8, 1, 8, 1, 8, 2),
                createCharChange(9, 1, 9, 1, 9, 1, 9, 2),
                createCharChange(10, 1, 10, 1, 10, 1, 10, 2),
                createCharChange(11, 1, 11, 1, 11, 1, 11, 2),
                createCharChange(12, 1, 12, 1, 12, 1, 12, 2),
                createCharChange(13, 1, 13, 1, 13, 1, 13, 2),
                createCharChange(14, 1, 14, 1, 14, 1, 14, 2),
                createCharChange(15, 1, 15, 1, 15, 1, 15, 2),
                createCharChange(16, 1, 16, 1, 16, 1, 16, 2),
                createCharChange(17, 1, 17, 1, 17, 1, 17, 2),
                createCharChange(18, 1, 18, 1, 18, 1, 18, 2),
                createCharChange(19, 1, 19, 1, 19, 1, 19, 2),
                createCharChange(20, 1, 20, 1, 20, 1, 20, 2),
                createCharChange(21, 1, 21, 1, 21, 1, 21, 2),
                createCharChange(22, 1, 22, 1, 22, 1, 22, 2),
                createCharChange(23, 1, 23, 1, 23, 1, 23, 2),
                createCharChange(24, 1, 24, 1, 24, 1, 24, 2),
                createCharChange(25, 1, 25, 1, 25, 1, 25, 2),
                createCharChange(26, 1, 26, 1, 26, 1, 26, 2),
                createCharChange(27, 1, 27, 1, 27, 1, 27, 2),
            ])
            // createLineInsertion(7, 11, 6)
        ];
        assertDiff(original, modified, expected, true, true, false);
    });
    test('issue #43922', () => {
        const original = [
            ' * `yarn [install]` -- Install project NPM dependencies. This is automatically done when you first create the project. You should only need to run this if you add dependencies in `package.json`.',
        ];
        const modified = [
            ' * `yarn` -- Install project NPM dependencies. You should only need to run this if you add dependencies in `package.json`.',
        ];
        const expected = [
            createLineChange(1, 1, 1, 1, [
                createCharChange(1, 9, 1, 19, 1, 9, 1, 9),
                createCharChange(1, 58, 1, 120, 1, 48, 1, 48),
            ])
        ];
        assertDiff(original, modified, expected, true, true, false);
    });
    test('issue #42751', () => {
        const original = [
            '    1',
            '  2',
        ];
        const modified = [
            '    1',
            '   3',
        ];
        const expected = [
            createLineChange(2, 2, 2, 2, [
                createCharChange(2, 3, 2, 4, 2, 3, 2, 5)
            ])
        ];
        assertDiff(original, modified, expected, true, true, false);
    });
    test('does not give character changes', () => {
        const original = [
            '    1',
            '  2',
            'A',
        ];
        const modified = [
            '    1',
            '   3',
            ' A',
        ];
        const expected = [
            createLineChange(2, 3, 2, 3)
        ];
        assertDiff(original, modified, expected, false, false, false);
    });
    test('issue #44422: Less than ideal diff results', () => {
        const original = [
            'export class C {',
            '',
            '	public m1(): void {',
            '		{',
            '		//2',
            '		//3',
            '		//4',
            '		//5',
            '		//6',
            '		//7',
            '		//8',
            '		//9',
            '		//10',
            '		//11',
            '		//12',
            '		//13',
            '		//14',
            '		//15',
            '		//16',
            '		//17',
            '		//18',
            '		}',
            '	}',
            '',
            '	public m2(): void {',
            '		if (a) {',
            '			if (b) {',
            '				//A1',
            '				//A2',
            '				//A3',
            '				//A4',
            '				//A5',
            '				//A6',
            '				//A7',
            '				//A8',
            '			}',
            '		}',
            '',
            '		//A9',
            '		//A10',
            '		//A11',
            '		//A12',
            '		//A13',
            '		//A14',
            '		//A15',
            '	}',
            '',
            '	public m3(): void {',
            '		if (a) {',
            '			//B1',
            '		}',
            '		//B2',
            '		//B3',
            '	}',
            '',
            '	public m4(): boolean {',
            '		//1',
            '		//2',
            '		//3',
            '		//4',
            '	}',
            '',
            '}',
        ];
        const modified = [
            'export class C {',
            '',
            '	constructor() {',
            '',
            '',
            '',
            '',
            '	}',
            '',
            '	public m1(): void {',
            '		{',
            '		//2',
            '		//3',
            '		//4',
            '		//5',
            '		//6',
            '		//7',
            '		//8',
            '		//9',
            '		//10',
            '		//11',
            '		//12',
            '		//13',
            '		//14',
            '		//15',
            '		//16',
            '		//17',
            '		//18',
            '		}',
            '	}',
            '',
            '	public m4(): boolean {',
            '		//1',
            '		//2',
            '		//3',
            '		//4',
            '	}',
            '',
            '}',
        ];
        const expected = [
            createLineChange(2, 0, 3, 9),
            createLineChange(25, 55, 31, 0)
        ];
        assertDiff(original, modified, expected, false, false, false);
    });
    test('gives preference to matching longer lines', () => {
        const original = [
            'A',
            'A',
            'BB',
            'C',
        ];
        const modified = [
            'A',
            'BB',
            'A',
            'D',
            'E',
            'A',
            'C',
        ];
        const expected = [
            createLineChange(2, 2, 1, 0),
            createLineChange(3, 0, 3, 6)
        ];
        assertDiff(original, modified, expected, false, false, false);
    });
    test('issue #119051: gives preference to fewer diff hunks', () => {
        const original = [
            '1',
            '',
            '',
            '2',
            '',
        ];
        const modified = [
            '1',
            '',
            '1.5',
            '',
            '',
            '2',
            '',
            '3',
            '',
        ];
        const expected = [
            createLineChange(2, 0, 3, 4),
            createLineChange(5, 0, 8, 9)
        ];
        assertDiff(original, modified, expected, false, false, false);
    });
    test('issue #121436: Diff chunk contains an unchanged line part 1', () => {
        const original = [
            'if (cond) {',
            '    cmd',
            '}',
        ];
        const modified = [
            'if (cond) {',
            '    if (other_cond) {',
            '        cmd',
            '    }',
            '}',
        ];
        const expected = [
            createLineChange(1, 0, 2, 2),
            createLineChange(2, 0, 4, 4)
        ];
        assertDiff(original, modified, expected, false, false, true);
    });
    test('issue #121436: Diff chunk contains an unchanged line part 2', () => {
        const original = [
            'if (cond) {',
            '    cmd',
            '}',
        ];
        const modified = [
            'if (cond) {',
            '    if (other_cond) {',
            '        cmd',
            '    }',
            '}',
        ];
        const expected = [
            createLineChange(1, 0, 2, 2),
            createLineChange(2, 2, 3, 3),
            createLineChange(2, 0, 4, 4)
        ];
        assertDiff(original, modified, expected, false, false, false);
    });
    test('issue #169552: Assertion error when having both leading and trailing whitespace diffs', () => {
        const original = [
            'if True:',
            '    print(2)',
        ];
        const modified = [
            'if True:',
            '\tprint(2) ',
        ];
        const expected = [
            createLineChange(2, 2, 2, 2, [
                createCharChange(2, 1, 2, 5, 2, 1, 2, 2),
                createCharChange(2, 13, 2, 13, 2, 10, 2, 11),
            ]),
        ];
        assertDiff(original, modified, expected, true, false, false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkNvbXB1dGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL2RpZmYvZGlmZkNvbXB1dGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBRTVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsWUFBWSxFQUE0QixNQUFNLGlEQUFpRCxDQUFDO0FBRXpHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUV0RCxTQUFTLFVBQVUsQ0FBQyxhQUF1QixFQUFFLGFBQXVCLEVBQUUsZUFBOEIsRUFBRSwyQkFBb0MsSUFBSSxFQUFFLCtCQUF3QyxLQUFLLEVBQUUsNkJBQXNDLEtBQUs7SUFDek8sTUFBTSxZQUFZLEdBQUcsSUFBSSxZQUFZLENBQUMsYUFBYSxFQUFFLGFBQWEsRUFBRTtRQUNuRSx3QkFBd0I7UUFDeEIsNEJBQTRCO1FBQzVCLDBCQUEwQjtRQUMxQixvQkFBb0IsRUFBRSxJQUFJO1FBQzFCLGtCQUFrQixFQUFFLENBQUM7S0FDckIsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxPQUFPLEdBQUcsWUFBWSxDQUFDLFdBQVcsRUFBRSxDQUFDLE9BQU8sQ0FBQztJQUVuRCxNQUFNLGFBQWEsR0FBRyxDQUFDLFVBQXVCLEVBQUUsRUFBRTtRQUNqRCxPQUFPO1lBQ04sdUJBQXVCLEVBQUUsVUFBVSxDQUFDLHVCQUF1QjtZQUMzRCxtQkFBbUIsRUFBRSxVQUFVLENBQUMsbUJBQW1CO1lBQ25ELHFCQUFxQixFQUFFLFVBQVUsQ0FBQyxxQkFBcUI7WUFD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RSxFQUFFLEVBQ1o7Z0JBQ0MsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDeEMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDeEMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDeEMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDeEMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDeEMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDeEMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDeEMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDeEMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDeEMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQzthQUM1QyxDQUNEO1lBQ0Qs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