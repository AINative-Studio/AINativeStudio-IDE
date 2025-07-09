/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { OneLineRange, TextSearchMatch, SearchRange } from '../../common/search.js';
suite('TextSearchResult', () => {
    const previewOptions1 = {
        matchLines: 1,
        charsPerLine: 100
    };
    function assertOneLinePreviewRangeText(text, result) {
        assert.strictEqual(result.rangeLocations.length, 1);
        assert.strictEqual(result.previewText.substring((result.rangeLocations[0].preview).startColumn, (result.rangeLocations[0].preview).endColumn), text);
    }
    function getFirstSourceFromResult(result) {
        return result.rangeLocations.map(e => e.source)[0];
    }
    ensureNoDisposablesAreLeakedInTestSuite();
    test('empty without preview options', () => {
        const range = new OneLineRange(5, 0, 0);
        const result = new TextSearchMatch('', range);
        assert.deepStrictEqual(getFirstSourceFromResult(result), range);
        assertOneLinePreviewRangeText('', result);
    });
    test('empty with preview options', () => {
        const range = new OneLineRange(5, 0, 0);
        const result = new TextSearchMatch('', range, previewOptions1);
        assert.deepStrictEqual(getFirstSourceFromResult(result), range);
        assertOneLinePreviewRangeText('', result);
    });
    test('short without preview options', () => {
        const range = new OneLineRange(5, 4, 7);
        const result = new TextSearchMatch('foo bar', range);
        assert.deepStrictEqual(getFirstSourceFromResult(result), range);
        assertOneLinePreviewRangeText('bar', result);
    });
    test('short with preview options', () => {
        const range = new OneLineRange(5, 4, 7);
        const result = new TextSearchMatch('foo bar', range, previewOptions1);
        assert.deepStrictEqual(getFirstSourceFromResult(result), range);
        assertOneLinePreviewRangeText('bar', result);
    });
    test('leading', () => {
        const range = new OneLineRange(5, 25, 28);
        const result = new TextSearchMatch('long text very long text foo', range, previewOptions1);
        assert.deepStrictEqual(getFirstSourceFromResult(result), range);
        assertOneLinePreviewRangeText('foo', result);
    });
    test('trailing', () => {
        const range = new OneLineRange(5, 0, 3);
        const result = new TextSearchMatch('foo long text very long text long text very long text long text very long text long text very long text long text very long text', range, previewOptions1);
        assert.deepStrictEqual(getFirstSourceFromResult(result), range);
        assertOneLinePreviewRangeText('foo', result);
    });
    test('middle', () => {
        const range = new OneLineRange(5, 30, 33);
        const result = new TextSearchMatch('long text very long text long foo text very long text long text very long text long text very long text long text very long text', range, previewOptions1);
        assert.deepStrictEqual(getFirstSourceFromResult(result), range);
        assertOneLinePreviewRangeText('foo', result);
    });
    test('truncating match', () => {
        const previewOptions = {
            matchLines: 1,
            charsPerLine: 1
        };
        const range = new OneLineRange(0, 4, 7);
        const result = new TextSearchMatch('foo bar', range, previewOptions);
        assert.deepStrictEqual(getFirstSourceFromResult(result), range);
        assertOneLinePreviewRangeText('b', result);
    });
    test('one line of multiline match', () => {
        const previewOptions = {
            matchLines: 1,
            charsPerLine: 10000
        };
        const range = new SearchRange(5, 4, 6, 3);
        const result = new TextSearchMatch('foo bar\nfoo bar', range, previewOptions);
        assert.deepStrictEqual(getFirstSourceFromResult(result), range);
        assert.strictEqual(result.previewText, 'foo bar\nfoo bar');
        assert.strictEqual(result.rangeLocations.length, 1);
        assert.strictEqual(result.rangeLocations[0].preview.startLineNumber, 0);
        assert.strictEqual(result.rangeLocations[0].preview.startColumn, 4);
        assert.strictEqual(result.rangeLocations[0].preview.endLineNumber, 1);
        assert.strictEqual(result.rangeLocations[0].preview.endColumn, 3);
    });
    test('compacts multiple ranges on long lines', () => {
        const previewOptions = {
            matchLines: 1,
            charsPerLine: 10
        };
        const range1 = new SearchRange(5, 4, 5, 7);
        const range2 = new SearchRange(5, 133, 5, 136);
        const range3 = new SearchRange(5, 141, 5, 144);
        const result = new TextSearchMatch('foo bar 123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890 foo bar baz bar', [range1, range2, range3], previewOptions);
        assert.deepStrictEqual(result.rangeLocations.map(e => e.preview), [new OneLineRange(0, 4, 7), new OneLineRange(0, 42, 45), new OneLineRange(0, 50, 53)]);
        assert.strictEqual(result.previewText, 'foo bar 123456⟪ 117 characters skipped ⟫o bar baz bar');
    });
    test('trims lines endings', () => {
        const range = new SearchRange(5, 3, 5, 5);
        const previewOptions = {
            matchLines: 1,
            charsPerLine: 10000
        };
        assert.strictEqual(new TextSearchMatch('foo bar\n', range, previewOptions).previewText, 'foo bar');
        assert.strictEqual(new TextSearchMatch('foo bar\r\n', range, previewOptions).previewText, 'foo bar');
    });
    // test('all lines of multiline match', () => {
    // 	const previewOptions: ITextSearchPreviewOptions = {
    // 		matchLines: 5,
    // 		charsPerLine: 10000
    // 	};
    // 	const range = new SearchRange(5, 4, 6, 3);
    // 	const result = new TextSearchResult('foo bar\nfoo bar', range, previewOptions);
    // 	assert.deepStrictEqual(result.range, range);
    // 	assertPreviewRangeText('bar\nfoo', result);
    // });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC90ZXN0L2NvbW1vbi9zZWFyY2gudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUE2QixZQUFZLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBRS9HLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7SUFFOUIsTUFBTSxlQUFlLEdBQThCO1FBQ2xELFVBQVUsRUFBRSxDQUFDO1FBQ2IsWUFBWSxFQUFFLEdBQUc7S0FDakIsQ0FBQztJQUVGLFNBQVMsNkJBQTZCLENBQUMsSUFBWSxFQUFFLE1BQXVCO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FDakIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQzFILElBQUksQ0FBQyxDQUFDO0lBQ1IsQ0FBQztJQUVELFNBQVMsd0JBQXdCLENBQUMsTUFBdUI7UUFDeEQsT0FBTyxNQUFNLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FB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