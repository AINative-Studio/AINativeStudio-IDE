/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { escapeIcons, getCodiconAriaLabel, markdownEscapeEscapedIcons, matchesFuzzyIconAware, parseLabelWithIcons, stripIcons } from '../../common/iconLabels.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
function filterOk(filter, word, target, highlights) {
    const r = filter(word, target);
    assert(r);
    if (highlights) {
        assert.deepStrictEqual(r, highlights);
    }
}
suite('Icon Labels', () => {
    test('Can get proper aria labels', () => {
        // note, the spaces in the results are important
        const testCases = new Map([
            ['', ''],
            ['asdf', 'asdf'],
            ['asdf$(squirrel)asdf', 'asdf squirrel asdf'],
            ['asdf $(squirrel) asdf', 'asdf  squirrel  asdf'],
            ['$(rocket)asdf', 'rocket asdf'],
            ['$(rocket) asdf', 'rocket  asdf'],
            ['$(rocket)$(rocket)$(rocket)asdf', 'rocket  rocket  rocket asdf'],
            ['$(rocket) asdf $(rocket)', 'rocket  asdf  rocket'],
            ['$(rocket)asdf$(rocket)', 'rocket asdf rocket'],
        ]);
        for (const [input, expected] of testCases) {
            assert.strictEqual(getCodiconAriaLabel(input), expected);
        }
    });
    test('matchesFuzzyIconAware', () => {
        // Camel Case
        filterOk(matchesFuzzyIconAware, 'ccr', parseLabelWithIcons('$(codicon)CamelCaseRocks$(codicon)'), [
            { start: 10, end: 11 },
            { start: 15, end: 16 },
            { start: 19, end: 20 }
        ]);
        filterOk(matchesFuzzyIconAware, 'ccr', parseLabelWithIcons('$(codicon) CamelCaseRocks $(codicon)'), [
            { start: 11, end: 12 },
            { start: 16, end: 17 },
            { start: 20, end: 21 }
        ]);
        filterOk(matchesFuzzyIconAware, 'iut', parseLabelWithIcons('$(codicon) Indent $(octico) Using $(octic) Tpaces'), [
            { start: 11, end: 12 },
            { start: 28, end: 29 },
            { start: 43, end: 44 },
        ]);
        // Prefix
        filterOk(matchesFuzzyIconAware, 'using', parseLabelWithIcons('$(codicon) Indent Using Spaces'), [
            { start: 18, end: 23 },
        ]);
        // Broken Codicon
        filterOk(matchesFuzzyIconAware, 'codicon', parseLabelWithIcons('This $(codicon Indent Using Spaces'), [
            { start: 7, end: 14 },
        ]);
        filterOk(matchesFuzzyIconAware, 'indent', parseLabelWithIcons('This $codicon Indent Using Spaces'), [
            { start: 14, end: 20 },
        ]);
        // Testing #59343
        filterOk(matchesFuzzyIconAware, 'unt', parseLabelWithIcons('$(primitive-dot) $(file-text) Untitled-1'), [
            { start: 30, end: 33 },
        ]);
        // Testing #136172
        filterOk(matchesFuzzyIconAware, 's', parseLabelWithIcons('$(loading~spin) start'), [
            { start: 16, end: 17 },
        ]);
    });
    test('stripIcons', () => {
        assert.strictEqual(stripIcons('Hello World'), 'Hello World');
        assert.strictEqual(stripIcons('$(Hello World'), '$(Hello World');
        assert.strictEqual(stripIcons('$(Hello) World'), ' World');
        assert.strictEqual(stripIcons('$(Hello) W$(oi)rld'), ' Wrld');
    });
    test('escapeIcons', () => {
        assert.strictEqual(escapeIcons('Hello World'), 'Hello World');
        assert.strictEqual(escapeIcons('$(Hello World'), '$(Hello World');
        assert.strictEqual(escapeIcons('$(Hello) World'), '\\$(Hello) World');
        assert.strictEqual(escapeIcons('\\$(Hello) W$(oi)rld'), '\\$(Hello) W\\$(oi)rld');
    });
    test('markdownEscapeEscapedIcons', () => {
        assert.strictEqual(markdownEscapeEscapedIcons('Hello World'), 'Hello World');
        assert.strictEqual(markdownEscapeEscapedIcons('$(Hello) World'), '$(Hello) World');
        assert.strictEqual(markdownEscapeEscapedIcons('\\$(Hello) World'), '\\\\$(Hello) World');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvbkxhYmVscy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL2ljb25MYWJlbHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFFNUIsT0FBTyxFQUFFLFdBQVcsRUFBRSxtQkFBbUIsRUFBeUIsMEJBQTBCLEVBQUUscUJBQXFCLEVBQUUsbUJBQW1CLEVBQUUsVUFBVSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDekwsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBT3JFLFNBQVMsUUFBUSxDQUFDLE1BQW1CLEVBQUUsSUFBWSxFQUFFLE1BQTZCLEVBQUUsVUFBNkM7SUFDaEksTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztJQUMvQixNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDVixJQUFJLFVBQVUsRUFBRSxDQUFDO1FBQ2hCLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7QUFDRixDQUFDO0FBRUQsS0FBSyxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7SUFDekIsSUFBSSxDQUFDLDRCQUE0QixFQUFFLEdBQUcsRUFBRTtRQUN2QyxnREFBZ0Q7UUFDaEQsTUFBTSxTQUFTLEdBQUcsSUFBSSxHQUFHLENBQWlCO1lBQ3pDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNSLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQztZQUNoQixDQUFDLHFCQUFxQixFQUFFLG9CQUFvQixDQUFDO1lBQzdDLENBQUMsdUJBQXVCLEVBQUUsc0JBQXNCLENBQUM7WUFDakQsQ0FBQyxl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