/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Range } from '../../../common/core/range.js';
import { UnicodeTextModelHighlighter } from '../../../common/services/unicodeTextModelHighlighter.js';
import { createTextModel } from '../testTextModel.js';
suite('UnicodeTextModelHighlighter', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function t(text, options) {
        const m = createTextModel(text);
        const r = UnicodeTextModelHighlighter.computeUnicodeHighlights(m, options);
        m.dispose();
        return {
            ...r,
            ranges: r.ranges.map(r => Range.lift(r).toString())
        };
    }
    test('computeUnicodeHighlights (#168068)', () => {
        assert.deepStrictEqual(t(`
	For å gi et eksempel
`, {
            allowedCodePoints: [],
            allowedLocales: [],
            ambiguousCharacters: true,
            invisibleCharacters: true,
            includeComments: false,
            includeStrings: false,
            nonBasicASCII: false
        }), {
            ambiguousCharacterCount: 0,
            hasMore: false,
            invisibleCharacterCount: 4,
            nonBasicAsciiCharacterCount: 0,
            ranges: [
                '[2,5 -> 2,6]',
                '[2,7 -> 2,8]',
                '[2,10 -> 2,11]',
                '[2,13 -> 2,14]'
            ]
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5pY29kZVRleHRNb2RlbEhpZ2hsaWdodGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL3NlcnZpY2VzL3VuaWNvZGVUZXh0TW9kZWxIaWdobGlnaHRlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUE2QiwyQkFBMkIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ2pJLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUV0RCxLQUFLLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO0lBQ3pDLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsU0FBUyxDQUFDLENBQUMsSUFBWSxFQUFFLE9BQWtDO1FBQzFELE1BQU0sQ0FBQyxHQUFHLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNoQyxNQUFNLENBQUMsR0FBRywyQkFBMkIsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDM0UsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRVosT0FBTztZQUNOLEdBQUcsQ0FBQztZQUNKLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7U0FDbkQsQ0FBQztJQUNILENBQUM7SUFFRCxJQUFJLENBQUMsb0NBQW9DLEVBQUUsR0FBRyxFQUFFO1FBQy9DLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLENBQUMsQ0FBQzs7Q0FFSixFQUFFO1lBQ0MsaUJBQWlCLEVBQUUsRUFBRTtZQUNyQixjQUFjLEVBQUUsRUFBRTtZQUNsQixtQkFBbUIsRUFBRSxJQUFJO1lBQ3pCLG1CQUFtQixFQUFFLElBQUk7WUFDekIsZUFBZSxFQUFFLEtBQUs7WUFDdEIsY0FBYyxFQUFFLEtBQUs7WUFDckIsYUFBYSxFQUFFLEtBQUs7U0FDcEIsQ0FBQyxFQUNGO1lBQ0MsdUJBQXVCLEVBQUUsQ0FBQztZQUMxQixPQUFPLEVBQUUsS0FBSztZQUNkLHVCQUF1QixFQUFFLENBQUM7WUFDMUIsMkJBQTJCLEVBQUUsQ0FBQztZQUM5QixNQUFNLEVBQUU7Z0JBQ1AsY0FBYztnQkFDZCxjQUFjO2dCQUNkLGdCQUFnQjtnQkFDaEIsZ0JBQWdCO2FBQ2hCO1NBQ0QsQ0FDRCxDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9