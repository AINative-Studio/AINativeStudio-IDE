/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { RenderedContentHover } from '../../browser/contentHoverRendered.js';
import { withTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
suite('Content Hover', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('issue #151235: Gitlens hover shows up in the wrong place', () => {
        const text = 'just some text';
        withTestCodeEditor(text, {}, (editor) => {
            const actual = RenderedContentHover.computeHoverPositions(editor, new Range(5, 5, 5, 5), [{ range: new Range(4, 1, 5, 6) }]);
            assert.deepStrictEqual(actual, {
                showAtPosition: new Position(5, 5),
                showAtSecondaryPosition: new Position(5, 5)
            });
        });
    });
    test('issue #95328: Hover placement with word-wrap', () => {
        const text = 'just some text';
        const opts = { wordWrap: 'wordWrapColumn', wordWrapColumn: 6 };
        withTestCodeEditor(text, opts, (editor) => {
            const actual = RenderedContentHover.computeHoverPositions(editor, new Range(1, 8, 1, 8), [{ range: new Range(1, 1, 1, 15) }]);
            assert.deepStrictEqual(actual, {
                showAtPosition: new Position(1, 8),
                showAtSecondaryPosition: new Position(1, 6)
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudEhvdmVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaG92ZXIvdGVzdC9icm93c2VyL2NvbnRlbnRIb3Zlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRTdFLE9BQU8sRUFBc0Msa0JBQWtCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUVwSCxLQUFLLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtJQUUzQix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQywwREFBMEQsRUFBRSxHQUFHLEVBQUU7UUFDckUsTUFBTSxJQUFJLEdBQUcsZ0JBQWdCLENBQUM7UUFDOUIsa0JBQWtCLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ3ZDLE1BQU0sTUFBTSxHQUFHLG9CQUFvQixDQUFDLHFCQUFxQixDQUN4RCxNQUFNLEVBQ04sSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3JCLENBQWEsRUFBRSxLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUM5QyxDQUFDO1lBQ0YsTUFBTSxDQUFDLGVBQWUsQ0FDckIsTUFBTSxFQUNOO2dCQUNDLGNBQWMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNsQyx1QkFBdUIsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQzNDLENBQ0QsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsOENBQThDLEVBQUUsR0FBRyxFQUFFO1FBQ3pELE1BQU0sSUFBSSxHQUFHLGdCQUFnQixDQUFDO1FBQzlCLE1BQU0sSUFBSSxHQUF1QyxFQUFFLFFBQVEsRUFBRSxnQkFBZ0IsRUFBRSxjQUFjLEVBQUUsQ0FBQyxFQUFFLENBQUM7UUFDbkcsa0JBQWtCLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ3pDLE1BQU0sTUFBTSxHQUFHLG9CQUFvQixDQUFDLHFCQUFxQixDQUN4RCxNQUFNLEVBQ04sSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3JCLENBQWEsRUFBRSxLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUMvQyxDQUFDO1lBQ0YsTUFBTSxDQUFDLGVBQWUsQ0FDckIsTUFBTSxFQUNOO2dCQUNDLGNBQWMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNsQyx1QkFBdUIsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQzNDLENBQ0QsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9