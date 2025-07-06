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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5pY29kZVRleHRNb2RlbEhpZ2hsaWdodGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9zZXJ2aWNlcy91bmljb2RlVGV4dE1vZGVsSGlnaGxpZ2h0ZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBNkIsMkJBQTJCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUNqSSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFdEQsS0FBSyxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtJQUN6Qyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLFNBQVMsQ0FBQyxDQUFDLElBQVksRUFBRSxPQUFrQztRQUMxRCxNQUFNLENBQUMsR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDaEMsTUFBTSxDQUFDLEdBQUcsMkJBQTJCLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzNFLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUVaLE9BQU87WUFDTixHQUFHLENBQUM7WUFDSixNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO1NBQ25ELENBQUM7SUFDSCxDQUFDO0lBRUQsSUFBSSxDQUFDLG9DQUFvQyxFQUFFLEdBQUcsRUFBRTtRQUMvQyxNQUFNLENBQUMsZUFBZSxDQUNyQixDQUFDLENBQUM7O0NBRUosRUFBRTtZQUNDLGlCQUFpQixFQUFFLEVBQUU7WUFDckIsY0FBYyxFQUFFLEVBQUU7WUFDbEIsbUJBQW1CLEVBQUUsSUFBSTtZQUN6QixtQkFBbUIsRUFBRSxJQUFJO1lBQ3pCLGVBQWUsRUFBRSxLQUFLO1lBQ3RCLGNBQWMsRUFBRSxLQUFLO1lBQ3JCLGFBQWEsRUFBRSxLQUFLO1NBQ3BCLENBQUMsRUFDRjtZQUNDLHVCQUF1QixFQUFFLENBQUM7WUFDMUIsT0FBTyxFQUFFLEtBQUs7WUFDZCx1QkFBdUIsRUFBRSxDQUFDO1lBQzFCLDJCQUEyQixFQUFFLENBQUM7WUFDOUIsTUFBTSxFQUFFO2dCQUNQLGNBQWM7Z0JBQ2QsY0FBYztnQkFDZCxnQkFBZ0I7Z0JBQ2hCLGdCQUFnQjthQUNoQjtTQUNELENBQ0QsQ0FBQztJQUNILENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==