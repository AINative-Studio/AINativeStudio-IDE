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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFRyZWVWaWV3cy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvbWFpblRocmVhZFRyZWVWaWV3cy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFFMUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDBFQUEwRSxDQUFDO0FBQ25ILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUUzRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDMUUsT0FBTyxFQUFFLFVBQVUsRUFBc0Usc0JBQXNCLEVBQWtCLHdCQUF3QixFQUF3QyxNQUFNLDBCQUEwQixDQUFDO0FBR2xPLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2pILE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBRXJGLEtBQUssQ0FBQyx3QkFBd0IsRUFB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