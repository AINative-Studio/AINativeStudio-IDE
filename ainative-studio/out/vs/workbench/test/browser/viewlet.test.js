/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Registry } from '../../../platform/registry/common/platform.js';
import { PaneCompositeDescriptor, Extensions, PaneComposite } from '../../browser/panecomposite.js';
import { isFunction } from '../../../base/common/types.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../base/test/common/utils.js';
suite('Viewlets', () => {
    class TestViewlet extends PaneComposite {
        constructor() {
            super('id', null, null, null, null, null, null, null);
        }
        layout(dimension) {
            throw new Error('Method not implemented.');
        }
        setBoundarySashes(sashes) {
            throw new Error('Method not implemented.');
        }
        createViewPaneContainer() { return null; }
    }
    test('ViewletDescriptor API', function () {
        const d = PaneCompositeDescriptor.create(TestViewlet, 'id', 'name', 'class', 5);
        assert.strictEqual(d.id, 'id');
        assert.strictEqual(d.name, 'name');
        assert.strictEqual(d.cssClass, 'class');
        assert.strictEqual(d.order, 5);
    });
    test('Editor Aware ViewletDescriptor API', function () {
        let d = PaneCompositeDescriptor.create(TestViewlet, 'id', 'name', 'class', 5);
        assert.strictEqual(d.id, 'id');
        assert.strictEqual(d.name, 'name');
        d = PaneCompositeDescriptor.create(TestViewlet, 'id', 'name', 'class', 5);
        assert.strictEqual(d.id, 'id');
        assert.strictEqual(d.name, 'name');
    });
    test('Viewlet extension point and registration', function () {
        assert(isFunction(Registry.as(Extensions.Viewlets).registerPaneComposite));
        assert(isFunction(Registry.as(Extensions.Viewlets).getPaneComposite));
        assert(isFunction(Registry.as(Extensions.Viewlets).getPaneComposites));
        const oldCount = Registry.as(Extensions.Viewlets).getPaneComposites().length;
        const d = PaneCompositeDescriptor.create(TestViewlet, 'reg-test-id', 'name');
        Registry.as(Extensions.Viewlets).registerPaneComposite(d);
        assert(d === Registry.as(Extensions.Viewlets).getPaneComposite('reg-test-id'));
        assert.strictEqual(oldCount + 1, Registry.as(Extensions.Viewlets).getPaneComposites().length);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld2xldC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC90ZXN0L2Jyb3dzZXIvdmlld2xldC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDekUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLFVBQVUsRUFBeUIsYUFBYSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDM0gsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRTNELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTdGLEtBQUssQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFO0lBRXRCLE1BQU0sV0FBWSxTQUFRLGFBQWE7UUFFdEM7WUFDQyxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUssRUFBRSxJQUFLLEVBQUUsSUFBSyxFQUFFLElBQUssRUFBRSxJQUFLLEVBQUUsSUFBSyxFQUFFLElBQUssQ0FBQyxDQUFDO1FBQzlELENBQUM7UUFFUSxNQUFNLENBQUMsU0FBYztZQUM3QixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDNUMsQ0FBQztRQUVRLGlCQUFpQixDQUFDLE1BQXVCO1lBQ2pELE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUM1QyxDQUFDO1FBRWtCLHVCQUF1QixLQUFLLE9BQU8sSUFBSyxDQUFDLENBQUMsQ0FBQztLQUM5RDtJQUVELElBQUksQ0FBQyx1QkFBdUIsRUFBRTtRQUM3QixNQUFNLENBQUMsR0FBRyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLElB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