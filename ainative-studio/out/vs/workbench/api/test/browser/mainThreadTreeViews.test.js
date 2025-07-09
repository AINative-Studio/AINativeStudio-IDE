/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import assert from 'assert';
import { mock } from '../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { TestNotificationService } from '../../../../platform/notification/test/common/testNotificationService.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { MainThreadTreeViews } from '../../browser/mainThreadTreeViews.js';
import { CustomTreeView } from '../../../browser/parts/views/treeView.js';
import { Extensions, IViewDescriptorService, TreeItemCollapsibleState } from '../../../common/views.js';
import { ViewDescriptorService } from '../../../services/views/browser/viewDescriptorService.js';
import { TestViewsService, workbenchInstantiationService } from '../../../test/browser/workbenchTestServices.js';
import { TestExtensionService } from '../../../test/common/workbenchTestServices.js';
suite('MainThreadHostTreeView', function () {
    const testTreeViewId = 'testTreeView';
    const customValue = 'customValue';
    const ViewsRegistry = Registry.as(Extensions.ViewsRegistry);
    class MockExtHostTreeViewsShape extends mock() {
        async $getChildren(treeViewId, treeItemHandle) {
            return [[0, { handle: 'testItem1', collapsibleState: TreeItemCollapsibleState.Expanded, customProp: customValue }]];
        }
        async $hasResolve() {
            return false;
        }
        $setVisible() { }
    }
    let container;
    let mainThreadTreeViews;
    let extHostTreeViewsShape;
    teardown(() => {
        ViewsRegistry.deregisterViews(ViewsRegistry.getViews(container), container);
    });
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const viewDescriptorService = disposables.add(instantiationService.createInstance(ViewDescriptorService));
        instantiationService.stub(IViewDescriptorService, viewDescriptorService);
        container = Registry.as(Extensions.ViewContainersRegistry).registerViewContainer({ id: 'testContainer', title: nls.localize2('test', 'test'), ctorDescriptor: new SyncDescriptor({}) }, 0 /* ViewContainerLocation.Sidebar */);
        const viewDescriptor = {
            id: testTreeViewId,
            ctorDescriptor: null,
            name: nls.localize2('Test View 1', 'Test View 1'),
            treeView: disposables.add(instantiationService.createInstance(CustomTreeView, 'testTree', 'Test Title', 'extension.id')),
        };
        ViewsRegistry.registerViews([viewDescriptor], container);
        const testExtensionService = new TestExtensionService();
        extHostTreeViewsShape = new MockExtHostTreeViewsShape();
        mainThreadTreeViews = disposables.add(new MainThreadTreeViews(new class {
            constructor() {
                this.remoteAuthority = '';
                this.extensionHostKind = 1 /* ExtensionHostKind.LocalProcess */;
            }
            dispose() { }
            assertRegistered() { }
            set(v) { return null; }
            getProxy() {
                return extHostTreeViewsShape;
            }
            drain() { return null; }
        }, new TestViewsService(), new TestNotificationService(), testExtensionService, new NullLogService()));
        mainThreadTreeViews.$registerTreeViewDataProvider(testTreeViewId, { showCollapseAll: false, canSelectMany: false, dropMimeTypes: [], dragMimeTypes: [], hasHandleDrag: false, hasHandleDrop: false, manuallyManageCheckboxes: false });
        await testExtensionService.whenInstalledExtensionsRegistered();
    });
    test('getChildren keeps custom properties', async () => {
        const treeView = ViewsRegistry.getView(testTreeViewId).treeView;
        const children = await treeView.dataProvider?.getChildren({ handle: 'root', collapsibleState: TreeItemCollapsibleState.Expanded });
        assert(children.length === 1, 'Exactly one child should be returned');
        assert(children[0].customProp === customValue, 'Tree Items should keep custom properties');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFRyZWVWaWV3cy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL21haW5UaHJlYWRUcmVlVmlld3MudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDNUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBRTFGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwwRUFBMEUsQ0FBQztBQUNuSCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFM0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxVQUFVLEVBQXNFLHNCQUFzQixFQUFrQix3QkFBd0IsRUFBd0MsTUFBTSwwQkFBMEIsQ0FBQztBQUdsTyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNqSCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUVyRixLQUFLLENBQUMsd0JBQXdCLEVB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