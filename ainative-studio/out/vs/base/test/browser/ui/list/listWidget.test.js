/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { List } from '../../../../browser/ui/list/listWidget.js';
import { range } from '../../../../common/arrays.js';
import { timeout } from '../../../../common/async.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../common/utils.js';
suite('ListWidget', function () {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    test('Page up and down', async function () {
        const element = document.createElement('div');
        element.style.height = '200px';
        element.style.width = '200px';
        const delegate = {
            getHeight() { return 20; },
            getTemplateId() { return 'template'; }
        };
        let templatesCount = 0;
        const renderer = {
            templateId: 'template',
            renderTemplate() { templatesCount++; },
            renderElement() { },
            disposeTemplate() { templatesCount--; }
        };
        const listWidget = store.add(new List('test', element, delegate, [renderer]));
        listWidget.layout(200);
        assert.strictEqual(templatesCount, 0, 'no templates have been allocated');
        listWidget.splice(0, 0, range(100));
        listWidget.focusFirst();
        listWidget.focusNextPage();
        assert.strictEqual(listWidget.getFocus()[0], 9, 'first page down moves focus to element at bottom');
        // scroll to next page is async
        listWidget.focusNextPage();
        await timeout(0);
        assert.strictEqual(listWidget.getFocus()[0], 19, 'page down to next page');
        listWidget.focusPreviousPage();
        assert.strictEqual(listWidget.getFocus()[0], 10, 'first page up moves focus to element at top');
        // scroll to previous page is async
        listWidget.focusPreviousPage();
        await timeout(0);
        assert.strictEqual(listWidget.getFocus()[0], 0, 'page down to previous page');
    });
    test('Page up and down with item taller than viewport #149502', async function () {
        const element = document.createElement('div');
        element.style.height = '200px';
        element.style.width = '200px';
        const delegate = {
            getHeight() { return 200; },
            getTemplateId() { return 'template'; }
        };
        let templatesCount = 0;
        const renderer = {
            templateId: 'template',
            renderTemplate() { templatesCount++; },
            renderElement() { },
            disposeTemplate() { templatesCount--; }
        };
        const listWidget = store.add(new List('test', element, delegate, [renderer]));
        listWidget.layout(200);
        assert.strictEqual(templatesCount, 0, 'no templates have been allocated');
        listWidget.splice(0, 0, range(100));
        listWidget.focusFirst();
        assert.strictEqual(listWidget.getFocus()[0], 0, 'initial focus is first element');
        // scroll to next page is async
        listWidget.focusNextPage();
        await timeout(0);
        assert.strictEqual(listWidget.getFocus()[0], 1, 'page down to next page');
        // scroll to previous page is async
        listWidget.focusPreviousPage();
        await timeout(0);
        assert.strictEqual(listWidget.getFocus()[0], 0, 'page up to next page');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlzdFdpZGdldC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9icm93c2VyL3VpL2xpc3QvbGlzdFdpZGdldC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUU1QixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDakUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3JELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUVuRixLQUFLLENBQUMsWUFBWSxFQUFFO0lBQ25CLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFeEQsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEtBQUs7UUFDN0IsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM5QyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUM7UUFDL0IsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDO1FBRTlCLE1BQU0sUUFBUSxHQUFpQztZQUM5QyxTQUFTLEtBQUssT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzFCLGFBQWEsS0FBSyxPQUFPLFVBQVUsQ0FBQyxDQUFDLENBQUM7U0FDdEMsQ0FBQztRQUVGLElBQUksY0FBYyxHQUFHLENBQUMsQ0FBQztRQUV2QixNQUFNLFFBQVEsR0FBZ0M7WUFDN0MsVUFBVSxFQUFFLFVBQVU7WUFDdEIsY0FBYyxLQUFLLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQztZ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