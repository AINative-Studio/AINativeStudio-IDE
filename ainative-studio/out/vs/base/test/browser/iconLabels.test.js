/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { isHTMLElement } from '../../browser/dom.js';
import { renderLabelWithIcons } from '../../browser/ui/iconLabel/iconLabels.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
suite('renderLabelWithIcons', () => {
    test('no icons', () => {
        const result = renderLabelWithIcons(' hello World .');
        assert.strictEqual(elementsToString(result), ' hello World .');
    });
    test('icons only', () => {
        const result = renderLabelWithIcons('$(alert)');
        assert.strictEqual(elementsToString(result), '<span class="codicon codicon-alert"></span>');
    });
    test('icon and non-icon strings', () => {
        const result = renderLabelWithIcons(` $(alert) Unresponsive`);
        assert.strictEqual(elementsToString(result), ' <span class="codicon codicon-alert"></span> Unresponsive');
    });
    test('multiple icons', () => {
        const result = renderLabelWithIcons('$(check)$(error)');
        assert.strictEqual(elementsToString(result), '<span class="codicon codicon-check"></span><span class="codicon codicon-error"></span>');
    });
    test('escaped icons', () => {
        const result = renderLabelWithIcons('\\$(escaped)');
        assert.strictEqual(elementsToString(result), '$(escaped)');
    });
    test('icon with animation', () => {
        const result = renderLabelWithIcons('$(zip~anim)');
        assert.strictEqual(elementsToString(result), '<span class="codicon codicon-zip codicon-modifier-anim"></span>');
    });
    const elementsToString = (elements) => {
        return elements
            .map(elem => isHTMLElement(elem) ? elem.outerHTML : elem)
            .reduce((a, b) => a + b, '');
    };
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvbkxhYmVscy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9icm93c2VyL2ljb25MYWJlbHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ3JELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTdFLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7SUFFbEMsSUFBSSxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUU7UUFDckIsTUFBTSxNQUFNLEdBQUcsb0JBQW9CLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUV0RCxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxFQUFFLGdCQUFnQixDQUFDLENBQUM7SUFDaEUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtRQUN2QixNQUFNLE1BQU0sR0FBRyxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUVoRCxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxFQUFFLDZDQUE2QyxDQUFDLENBQUM7SUFDN0YsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsMkJBQTJCLEVBQUUsR0FBRyxFQUFFO1FBQ3RDLE1BQU0sTUFBTSxHQUFHLG9CQUFvQixDQUFDLHdCQUF3QixDQUFDLENBQUM7UUFFOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFBRSwyREFBMkQsQ0FBQyxDQUFDO0lBQzNHLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtRQUMzQixNQUFNLE1BQU0sR0FBRyxvQkFBb0IsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBRXhELE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQUUsd0ZBQXdGLENBQUMsQ0FBQztJQUN4SSxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO1FBQzFCLE1BQU0sTUFBTSxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBRXBELE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDNUQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO1FBQ2hDLE1BQU0sTUFBTSxHQUFHLG9CQUFvQixDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBRW5ELE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQUUsaUVBQWlFLENBQUMsQ0FBQztJQUNqSCxDQUFDLENBQUMsQ0FBQztJQUVILE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxRQUFxQyxFQUFVLEVBQUU7UUFDMUUsT0FBTyxRQUFRO2FBQ2IsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7YUFDeEQsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUMvQixDQUFDLENBQUM7SUFFRix1Q0FBdUMsRUFBRSxDQUFDO0FBQzNDLENBQUMsQ0FBQyxDQUFDIn0=