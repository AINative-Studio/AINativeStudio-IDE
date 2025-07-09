/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ListView } from '../../../../browser/ui/list/listView.js';
import { range } from '../../../../common/arrays.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../common/utils.js';
suite('ListView', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('all rows get disposed', function () {
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
        const listView = new ListView(element, delegate, [renderer]);
        listView.layout(200);
        assert.strictEqual(templatesCount, 0, 'no templates have been allocated');
        listView.splice(0, 0, range(100));
        assert.strictEqual(templatesCount, 10, 'some templates have been allocated');
        listView.dispose();
        assert.strictEqual(templatesCount, 0, 'all templates have been disposed');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlzdFZpZXcudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvYnJvd3Nlci91aS9saXN0L2xpc3RWaWV3LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBRTVCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDckQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFbkYsS0FBSyxDQUFDLFVBQVUsRUFBRTtJQUNqQix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyx1QkFBdUIsRUFBRTtRQUM3QixNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzlDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQztRQUMvQixPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUM7UUFFOUIsTUFBTSxRQUFRLEdBQWlDO1lBQzlDLFNBQVMsS0FBSyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDMUIsYUFBYSxLQUFLLE9BQU8sVUFBVSxDQUFDLENBQUMsQ0FBQztTQUN0QyxDQUFDO1FBRUYsSUFBSSxjQUFjLEdBQUcsQ0FBQyxDQUFDO1FBRXZCLE1BQU0sUUFBUSxHQUFnQztZQUM3QyxVQUFVLEVBQUUsVUFBVTtZQUN0QixjQUFjLEtBQUssY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3RDLGFBQWEsS0FBSyxDQUFDO1lBQ25CLGVBQWUsS0FBSyxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDdkMsQ0FBQztRQUVGLE1BQU0sUUFBUSxHQUFHLElBQUksUUFBUSxDQUFTLE9BQU8sRUFBRSxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQ3JFLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFckIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxFQUFFLGtDQUFrQyxDQUFDLENBQUM7UUFDMUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sQ0FBQyxXQUFXLENBQUMsY0FBYyxFQUFFLEVBQUUsRUFBRSxvQ0FBb0MsQ0FBQyxDQUFDO1FBQzdFLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNuQixNQUFNLENBQUMsV0FBVyxDQUFDLGNBQWMsRUFBRSxDQUFDLEVBQUUsa0NBQWtDLENBQUMsQ0FBQztJQUMzRSxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=