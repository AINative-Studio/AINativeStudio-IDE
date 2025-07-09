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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvbkxhYmVscy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vaWNvbkxhYmVscy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUU1QixPQUFPLEVBQUUsV0FBVyxFQUFFLG1CQUFtQixFQUF5QiwwQkFBMEIsRUFBRSxxQkFBcUIsRUFBRSxtQkFBbUIsRUFBRSxVQUFVLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUN6TCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFPckUsU0FBUyxRQUFRLENBQUMsTUFBbUIsRUFBRSxJQUFZLEVBQUUsTUFBNkIsRUFBRSxVQUE2QztJQUNoSSxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQy9CLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNWLElBQUksVUFBVSxFQUFFLENBQUM7UUFDaEIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDdkMsQ0FBQztBQUNGLENBQUM7QUFFRCxLQUFLLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtJQUN6QixJQUFJLENBQUMsNEJBQTRCLEVBQUUsR0FBRyxFQUFFO1FBQ3ZDLGdEQUFnRDtRQUNoRCxNQUFNLFNBQVMsR0FBRyxJQUFJLEdBQUcsQ0FBaUI7WUFDekMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ1IsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDO1lBQ2hCLENBQUMscUJBQXFCLEVBQUUsb0JBQW9CLENBQUM7WUFDN0MsQ0FBQyx1QkFBdUIsRUFBRSxzQkFBc0IsQ0FBQztZQUNqRCxDQUFDLGVBQWUs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