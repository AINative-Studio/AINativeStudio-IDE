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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkNvbXB1dGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9kaWZmL2RpZmZDb21wdXRlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUU1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFFLFlBQVksRUFBNEIsTUFBTSxpREFBaUQsQ0FBQztBQUV6RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFdEQsU0FBUyxVQUFVLENBQUMsYUFBdUIsRUFBRSxhQUF1QixFQUFFLGVBQThCLEVBQUUsMkJBQW9DLElBQUksRUFBRSwrQkFBd0MsS0FBSyxFQUFFLDZCQUFzQyxLQUFLO0lBQ3pPLE1BQU0sWUFBWSxHQUFHLElBQUksWUFBWSxDQUFDLGFBQWEsRUFBRSxhQUFhLEVBQUU7UUFDbkUsd0JBQXdCO1FBQ3hCLDRCQUE0QjtRQUM1QiwwQkFBMEI7UUFDMUIsb0JBQW9CLEVBQUUsSUFBSTtRQUMxQixrQkFBa0IsRUFBRSxDQUFDO0tBQ3JCLENBQUMsQ0FBQztJQUNILE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxPQUFPLENBQUM7SUFFbkQsTUFBTSxhQUFhLEdBQUcsQ0FBQyxVQUF1QixFQUFFLEVBQUU7UUFDakQsT0FBTztZQUNOLHVCQUF1QixFQUFFLFVBQVUsQ0FBQyx1QkFBdUI7WUFDM0QsbUJBQW1CLEVBQUUsVUFBVSxDQUFDLG1CQUFtQjtZQUNuRCxxQkFBcUIsRUFBRSxVQUFVLENBQUMscUJBQXFC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LEVBQUUsRUFBRSxFQUNaO2dCQUNDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3hDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3hDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3hDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3hDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3hDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3hDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3hDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3hDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3hDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzVDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzVDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzVDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzVDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzVDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzVDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzVDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzVDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzVDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzVDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzVDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzVDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzVDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzVDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzVDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzVDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzVDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7YUFDNUMsQ0FDRDtZ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