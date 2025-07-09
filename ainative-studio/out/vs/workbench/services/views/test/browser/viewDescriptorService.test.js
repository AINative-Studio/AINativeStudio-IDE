/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../../nls.js';
import assert from 'assert';
import { Extensions as ViewContainerExtensions, ViewContainerLocationToString } from '../../../../common/views.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { ViewDescriptorService } from '../../browser/viewDescriptorService.js';
import { assertIsDefined } from '../../../../../base/common/types.js';
import { ContextKeyService } from '../../../../../platform/contextkey/browser/contextKeyService.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { compare } from '../../../../../base/common/strings.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
const ViewsRegistry = Registry.as(ViewContainerExtensions.ViewsRegistry);
const ViewContainersRegistry = Registry.as(ViewContainerExtensions.ViewContainersRegistry);
const viewContainerIdPrefix = 'testViewContainer';
const sidebarContainer = ViewContainersRegistry.registerViewContainer({ id: `${viewContainerIdPrefix}-${generateUuid()}`, title: nls.localize2('test', 'test'), ctorDescriptor: new SyncDescriptor({}) }, 0 /* ViewContainerLocation.Sidebar */);
const panelContainer = ViewContainersRegistry.registerViewContainer({ id: `${viewContainerIdPrefix}-${generateUuid()}`, title: nls.localize2('test', 'test'), ctorDescriptor: new SyncDescriptor({}) }, 1 /* ViewContainerLocation.Panel */);
suite('ViewDescriptorService', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    setup(() => {
        disposables.add(instantiationService = workbenchInstantiationService(undefined, disposables));
        instantiationService.stub(IContextKeyService, disposables.add(instantiationService.createInstance(ContextKeyService)));
    });
    teardown(() => {
        for (const viewContainer of ViewContainersRegistry.all) {
            if (viewContainer.id.startsWith(viewContainerIdPrefix)) {
                ViewsRegistry.deregisterViews(ViewsRegistry.getViews(viewContainer), viewContainer);
            }
        }
    });
    function aViewDescriptorService() {
        return disposables.add(instantiationService.createInstance(ViewDescriptorService));
    }
    test('Empty Containers', function () {
        const testObject = aViewDescriptorService();
        const sidebarViews = testObject.getViewContainerModel(sidebarContainer);
        const panelViews = testObject.getViewContainerModel(panelContainer);
        assert.strictEqual(sidebarViews.allViewDescriptors.length, 0, 'The sidebar container should have no views yet.');
        assert.strictEqual(panelViews.allViewDescriptors.length, 0, 'The panel container should have no views yet.');
    });
    test('Register/Deregister', () => {
        const testObject = aViewDescriptorService();
        const viewDescriptors = [
            {
                id: 'view1',
                ctorDescriptor: null,
                name: nls.localize2('Test View 1', 'Test View 1'),
                canMoveView: true
            },
            {
                id: 'view2',
                ctorDescriptor: null,
                name: nls.localize2('Test View 2', 'Test View 2'),
                canMoveView: true
            },
            {
                id: 'view3',
                ctorDescriptor: null,
                name: nls.localize2('Test View 3', 'Test View 3'),
                canMoveView: true
            }
        ];
        ViewsRegistry.registerViews(viewDescriptors.slice(0, 2), sidebarContainer);
        ViewsRegistry.registerViews(viewDescriptors.slice(2), panelContainer);
        let sidebarViews = testObject.getViewContainerModel(sidebarContainer);
        let panelViews = testObject.getViewContainerModel(panelContainer);
        assert.strictEqual(sidebarViews.activeViewDescriptors.length, 2, 'Sidebar should have 2 views');
        assert.strictEqual(panelViews.activeViewDescriptors.length, 1, 'Panel should have 1 view');
        ViewsRegistry.deregisterViews(viewDescriptors.slice(0, 2), sidebarContainer);
        ViewsRegistry.deregisterViews(viewDescriptors.slice(2), panelContainer);
        sidebarViews = testObject.getViewContainerModel(sidebarContainer);
        panelViews = testObject.getViewContainerModel(panelContainer);
        assert.strictEqual(sidebarViews.activeViewDescriptors.length, 0, 'Sidebar should have no views');
        assert.strictEqual(panelViews.activeViewDescriptors.length, 0, 'Panel should have no views');
    });
    test('move views to existing containers', async function () {
        const testObject = aViewDescriptorService();
        const viewDescriptors = [
            {
                id: 'view1',
                ctorDescriptor: null,
                name: nls.localize2('Test View 1', 'Test View 1'),
                canMoveView: true
            },
            {
                id: 'view2',
                ctorDescriptor: null,
                name: nls.localize2('Test View 2', 'Test View 2'),
                canMoveView: true
            },
            {
                id: 'view3',
                ctorDescriptor: null,
                name: nls.localize2('Test View 3', 'Test View 3'),
                canMoveView: true
            }
        ];
        ViewsRegistry.registerViews(viewDescriptors.slice(0, 2), sidebarContainer);
        ViewsRegistry.registerViews(viewDescriptors.slice(2), panelContainer);
        testObject.moveViewsToContainer(viewDescriptors.slice(2), sidebarContainer);
        testObject.moveViewsToContainer(viewDescriptors.slice(0, 2), panelContainer);
        const sidebarViews = testObject.getViewContainerModel(sidebarContainer);
        const panelViews = testObject.getViewContainerModel(panelContainer);
        assert.strictEqual(sidebarViews.activeViewDescriptors.length, 1, 'Sidebar should have 2 views');
        assert.strictEqual(panelViews.activeViewDescriptors.length, 2, 'Panel should have 1 view');
        assert.notStrictEqual(sidebarViews.activeViewDescriptors.indexOf(viewDescriptors[2]), -1, `Sidebar should have ${viewDescriptors[2].name.value}`);
        assert.notStrictEqual(panelViews.activeViewDescriptors.indexOf(viewDescriptors[0]), -1, `Panel should have ${viewDescriptors[0].name.value}`);
        assert.notStrictEqual(panelViews.activeViewDescriptors.indexOf(viewDescriptors[1]), -1, `Panel should have ${viewDescriptors[1].name.value}`);
    });
    test('move views to generated containers', async function () {
        const testObject = aViewDescriptorService();
        const viewDescriptors = [
            {
                id: 'view1',
                ctorDescriptor: null,
                name: nls.localize2('Test View 1', 'Test View 1'),
                canMoveView: true
            },
            {
                id: 'view2',
                ctorDescriptor: null,
                name: nls.localize2('Test View 2', 'Test View 2'),
                canMoveView: true
            },
            {
                id: 'view3',
                ctorDescriptor: null,
                name: nls.localize2('Test View 3', 'Test View 3'),
                canMoveView: true
            }
        ];
        ViewsRegistry.registerViews(viewDescriptors.slice(0, 2), sidebarContainer);
        ViewsRegistry.registerViews(viewDescriptors.slice(2), panelContainer);
        testObject.moveViewToLocation(viewDescriptors[0], 1 /* ViewContainerLocation.Panel */);
        testObject.moveViewToLocation(viewDescriptors[2], 0 /* ViewContainerLocation.Sidebar */);
        let sidebarViews = testObject.getViewContainerModel(sidebarContainer);
        let panelViews = testObject.getViewContainerModel(panelContainer);
        assert.strictEqual(sidebarViews.activeViewDescriptors.length, 1, 'Sidebar container should have 1 view');
        assert.strictEqual(panelViews.activeViewDescriptors.length, 0, 'Panel container should have no views');
        const generatedPanel = assertIsDefined(testObject.getViewContainerByViewId(viewDescriptors[0].id));
        const generatedSidebar = assertIsDefined(testObject.getViewContainerByViewId(viewDescriptors[2].id));
        assert.strictEqual(testObject.getViewContainerLocation(generatedPanel), 1 /* ViewContainerLocation.Panel */, 'Generated Panel should be in located in the panel');
        assert.strictEqual(testObject.getViewContainerLocation(generatedSidebar), 0 /* ViewContainerLocation.Sidebar */, 'Generated Sidebar should be in located in the sidebar');
        assert.strictEqual(testObject.getViewContainerLocation(generatedPanel), testObject.getViewLocationById(viewDescriptors[0].id), 'Panel view location and container location should match');
        assert.strictEqual(testObject.getViewContainerLocation(generatedSidebar), testObject.getViewLocationById(viewDescriptors[2].id), 'Sidebar view location and container location should match');
        assert.strictEqual(testObject.getDefaultContainerById(viewDescriptors[2].id), panelContainer, `${viewDescriptors[2].name.value} has wrong default container`);
        assert.strictEqual(testObject.getDefaultContainerById(viewDescriptors[0].id), sidebarContainer, `${viewDescriptors[0].name.value} has wrong default container`);
        testObject.moveViewToLocation(viewDescriptors[0], 0 /* ViewContainerLocation.Sidebar */);
        testObject.moveViewToLocation(viewDescriptors[2], 1 /* ViewContainerLocation.Panel */);
        sidebarViews = testObject.getViewContainerModel(sidebarContainer);
        panelViews = testObject.getViewContainerModel(panelContainer);
        assert.strictEqual(sidebarViews.activeViewDescriptors.length, 1, 'Sidebar should have 2 views');
        assert.strictEqual(panelViews.activeViewDescriptors.length, 0, 'Panel should have 1 view');
        assert.strictEqual(testObject.getViewLocationById(viewDescriptors[0].id), 0 /* ViewContainerLocation.Sidebar */, 'View should be located in the sidebar');
        assert.strictEqual(testObject.getViewLocationById(viewDescriptors[2].id), 1 /* ViewContainerLocation.Panel */, 'View should be located in the panel');
    });
    test('move view events', async function () {
        const testObject = aViewDescriptorService();
        const viewDescriptors = [
            {
                id: 'view1',
                ctorDescriptor: null,
                name: nls.localize2('Test View 1', 'Test View 1'),
                canMoveView: true
            },
            {
                id: 'view2',
                ctorDescriptor: null,
                name: nls.localize2('Test View 2', 'Test View 2'),
                canMoveView: true
            },
            {
                id: 'view3',
                ctorDescriptor: null,
                name: nls.localize2('Test View 3', 'Test View 3'),
                canMoveView: true
            }
        ];
        let expectedSequence = '';
        let actualSequence = '';
        const containerMoveString = (view, from, to) => {
            return `Moved ${view.id} from ${from.id} to ${to.id}\n`;
        };
        const locationMoveString = (view, from, to) => {
            return `Moved ${view.id} from ${from === 0 /* ViewContainerLocation.Sidebar */ ? 'Sidebar' : 'Panel'} to ${to === 0 /* ViewContainerLocation.Sidebar */ ? 'Sidebar' : 'Panel'}\n`;
        };
        disposables.add(testObject.onDidChangeContainer(({ views, from, to }) => {
            views.forEach(view => {
                actualSequence += containerMoveString(view, from, to);
            });
        }));
        disposables.add(testObject.onDidChangeLocation(({ views, from, to }) => {
            views.forEach(view => {
                actualSequence += locationMoveString(view, from, to);
            });
        }));
        ViewsRegistry.registerViews(viewDescriptors.slice(0, 2), sidebarContainer);
        ViewsRegistry.registerViews(viewDescriptors.slice(2), panelContainer);
        expectedSequence += locationMoveString(viewDescriptors[0], 0 /* ViewContainerLocation.Sidebar */, 1 /* ViewContainerLocation.Panel */);
        testObject.moveViewToLocation(viewDescriptors[0], 1 /* ViewContainerLocation.Panel */);
        expectedSequence += containerMoveString(viewDescriptors[0], sidebarContainer, testObject.getViewContainerByViewId(viewDescriptors[0].id));
        expectedSequence += locationMoveString(viewDescriptors[2], 1 /* ViewContainerLocation.Panel */, 0 /* ViewContainerLocation.Sidebar */);
        testObject.moveViewToLocation(viewDescriptors[2], 0 /* ViewContainerLocation.Sidebar */);
        expectedSequence += containerMoveString(viewDescriptors[2], panelContainer, testObject.getViewContainerByViewId(viewDescriptors[2].id));
        expectedSequence += locationMoveString(viewDescriptors[0], 1 /* ViewContainerLocation.Panel */, 0 /* ViewContainerLocation.Sidebar */);
        expectedSequence += containerMoveString(viewDescriptors[0], testObject.getViewContainerByViewId(viewDescriptors[0].id), sidebarContainer);
        testObject.moveViewsToContainer([viewDescriptors[0]], sidebarContainer);
        expectedSequence += locationMoveString(viewDescriptors[2], 0 /* ViewContainerLocation.Sidebar */, 1 /* ViewContainerLocation.Panel */);
        expectedSequence += containerMoveString(viewDescriptors[2], testObject.getViewContainerByViewId(viewDescriptors[2].id), panelContainer);
        testObject.moveViewsToContainer([viewDescriptors[2]], panelContainer);
        expectedSequence += locationMoveString(viewDescriptors[0], 0 /* ViewContainerLocation.Sidebar */, 1 /* ViewContainerLocation.Panel */);
        expectedSequence += containerMoveString(viewDescriptors[0], sidebarContainer, panelContainer);
        testObject.moveViewsToContainer([viewDescriptors[0]], panelContainer);
        expectedSequence += locationMoveString(viewDescriptors[2], 1 /* ViewContainerLocation.Panel */, 0 /* ViewContainerLocation.Sidebar */);
        expectedSequence += containerMoveString(viewDescriptors[2], panelContainer, sidebarContainer);
        testObject.moveViewsToContainer([viewDescriptors[2]], sidebarContainer);
        expectedSequence += locationMoveString(viewDescriptors[1], 0 /* ViewContainerLocation.Sidebar */, 1 /* ViewContainerLocation.Panel */);
        expectedSequence += locationMoveString(viewDescriptors[2], 0 /* ViewContainerLocation.Sidebar */, 1 /* ViewContainerLocation.Panel */);
        expectedSequence += containerMoveString(viewDescriptors[1], sidebarContainer, panelContainer);
        expectedSequence += containerMoveString(viewDescriptors[2], sidebarContainer, panelContainer);
        testObject.moveViewsToContainer([viewDescriptors[1], viewDescriptors[2]], panelContainer);
        assert.strictEqual(actualSequence, expectedSequence, 'Event sequence not matching expected sequence');
    });
    test('reset', async function () {
        const testObject = aViewDescriptorService();
        const viewDescriptors = [
            {
                id: 'view1',
                ctorDescriptor: null,
                name: nls.localize2('Test View 1', 'Test View 1'),
                canMoveView: true,
                order: 1
            },
            {
                id: 'view2',
                ctorDescriptor: null,
                name: nls.localize2('Test View 2', 'Test View 2'),
                canMoveView: true,
                order: 2
            },
            {
                id: 'view3',
                ctorDescriptor: null,
                name: nls.localize2('Test View 3', 'Test View 3'),
                canMoveView: true,
                order: 3
            }
        ];
        ViewsRegistry.registerViews(viewDescriptors.slice(0, 2), sidebarContainer);
        ViewsRegistry.registerViews(viewDescriptors.slice(2), panelContainer);
        testObject.moveViewToLocation(viewDescriptors[0], 1 /* ViewContainerLocation.Panel */);
        testObject.moveViewsToContainer([viewDescriptors[1]], panelContainer);
        testObject.moveViewToLocation(viewDescriptors[2], 0 /* ViewContainerLocation.Sidebar */);
        const generatedPanel = assertIsDefined(testObject.getViewContainerByViewId(viewDescriptors[0].id));
        const generatedSidebar = assertIsDefined(testObject.getViewContainerByViewId(viewDescriptors[2].id));
        testObject.reset();
        const sidebarViews = testObject.getViewContainerModel(sidebarContainer);
        assert.deepStrictEqual(sidebarViews.allViewDescriptors.map(v => v.id), ['view1', 'view2']);
        const panelViews = testObject.getViewContainerModel(panelContainer);
        assert.deepStrictEqual(panelViews.allViewDescriptors.map(v => v.id), ['view3']);
        const actual = JSON.parse(instantiationService.get(IStorageService).get('views.customizations', 0 /* StorageScope.PROFILE */));
        assert.deepStrictEqual(actual, { viewContainerLocations: {}, viewLocations: {}, viewContainerBadgeEnablementStates: {} });
        assert.deepStrictEqual(testObject.getViewContainerById(generatedPanel.id), null);
        assert.deepStrictEqual(testObject.getViewContainerById(generatedSidebar.id), null);
    });
    test('initialize with custom locations', async function () {
        const storageService = instantiationService.get(IStorageService);
        const viewContainer1 = ViewContainersRegistry.registerViewContainer({ id: `${viewContainerIdPrefix}-${generateUuid()}`, title: nls.localize2('test', 'test'), ctorDescriptor: new SyncDescriptor({}) }, 0 /* ViewContainerLocation.Sidebar */);
        const generateViewContainer1 = `workbench.views.service.${ViewContainerLocationToString(0 /* ViewContainerLocation.Sidebar */)}.${generateUuid()}`;
        const viewsCustomizations = {
            viewContainerLocations: {
                [generateViewContainer1]: 0 /* ViewContainerLocation.Sidebar */,
                [viewContainer1.id]: 2 /* ViewContainerLocation.AuxiliaryBar */
            },
            viewLocations: {
                'view1': generateViewContainer1
            }
        };
        storageService.store('views.customizations', JSON.stringify(viewsCustomizations), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        const viewDescriptors = [
            {
                id: 'view1',
                ctorDescriptor: null,
                name: nls.localize2('Test View 1', 'Test View 1'),
                canMoveView: true
            },
            {
                id: 'view2',
                ctorDescriptor: null,
                name: nls.localize2('Test View 2', 'Test View 2'),
                canMoveView: true
            },
            {
                id: 'view3',
                ctorDescriptor: null,
                name: nls.localize2('Test View 3', 'Test View 3'),
                canMoveView: true
            },
            {
                id: 'view4',
                ctorDescriptor: null,
                name: nls.localize2('Test View 4', 'Test View 4'),
                canMoveView: true
            }
        ];
        ViewsRegistry.registerViews(viewDescriptors.slice(0, 3), sidebarContainer);
        ViewsRegistry.registerViews(viewDescriptors.slice(3), viewContainer1);
        const testObject = aViewDescriptorService();
        const sidebarViews = testObject.getViewContainerModel(sidebarContainer);
        assert.deepStrictEqual(sidebarViews.allViewDescriptors.map(v => v.id), ['view2', 'view3']);
        const generatedViewContainerViews = testObject.getViewContainerModel(testObject.getViewContainerById(generateViewContainer1));
        assert.deepStrictEqual(generatedViewContainerViews.allViewDescriptors.map(v => v.id), ['view1']);
        const viewContainer1Views = testObject.getViewContainerModel(viewContainer1);
        assert.deepStrictEqual(testObject.getViewContainerLocation(viewContainer1), 2 /* ViewContainerLocation.AuxiliaryBar */);
        assert.deepStrictEqual(viewContainer1Views.allViewDescriptors.map(v => v.id), ['view4']);
    });
    test('storage change', async function () {
        const testObject = aViewDescriptorService();
        const viewContainer1 = ViewContainersRegistry.registerViewContainer({ id: `${viewContainerIdPrefix}-${generateUuid()}`, title: nls.localize2('test', 'test'), ctorDescriptor: new SyncDescriptor({}) }, 0 /* ViewContainerLocation.Sidebar */);
        const generateViewContainer1 = `workbench.views.service.${ViewContainerLocationToString(0 /* ViewContainerLocation.Sidebar */)}.${generateUuid()}`;
        const viewDescriptors = [
            {
                id: 'view1',
                ctorDescriptor: null,
                name: nls.localize2('Test View 1', 'Test View 1'),
                canMoveView: true
            },
            {
                id: 'view2',
                ctorDescriptor: null,
                name: nls.localize2('Test View 2', 'Test View 2'),
                canMoveView: true
            },
            {
                id: 'view3',
                ctorDescriptor: null,
                name: nls.localize2('Test View 3', 'Test View 3'),
                canMoveView: true
            },
            {
                id: 'view4',
                ctorDescriptor: null,
                name: nls.localize2('Test View 4', 'Test View 4'),
                canMoveView: true
            }
        ];
        ViewsRegistry.registerViews(viewDescriptors.slice(0, 3), sidebarContainer);
        ViewsRegistry.registerViews(viewDescriptors.slice(3), viewContainer1);
        const viewsCustomizations = {
            viewContainerLocations: {
                [generateViewContainer1]: 0 /* ViewContainerLocation.Sidebar */,
                [viewContainer1.id]: 2 /* ViewContainerLocation.AuxiliaryBar */
            },
            viewLocations: {
                'view1': generateViewContainer1
            }
        };
        instantiationService.get(IStorageService).store('views.customizations', JSON.stringify(viewsCustomizations), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        const sidebarViews = testObject.getViewContainerModel(sidebarContainer);
        assert.deepStrictEqual(sidebarViews.allViewDescriptors.map(v => v.id), ['view2', 'view3']);
        const generatedViewContainerViews = testObject.getViewContainerModel(testObject.getViewContainerById(generateViewContainer1));
        assert.deepStrictEqual(generatedViewContainerViews.allViewDescriptors.map(v => v.id), ['view1']);
        const viewContainer1Views = testObject.getViewContainerModel(viewContainer1);
        assert.deepStrictEqual(testObject.getViewContainerLocation(viewContainer1), 2 /* ViewContainerLocation.AuxiliaryBar */);
        assert.deepStrictEqual(viewContainer1Views.allViewDescriptors.map(v => v.id), ['view4']);
    });
    test('orphan views', async function () {
        const storageService = instantiationService.get(IStorageService);
        const viewsCustomizations = {
            viewContainerLocations: {},
            viewLocations: {
                'view1': `${viewContainerIdPrefix}-${generateUuid()}`
            }
        };
        storageService.store('views.customizations', JSON.stringify(viewsCustomizations), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        const viewDescriptors = [
            {
                id: 'view1',
                ctorDescriptor: null,
                name: nls.localize2('Test View 1', 'Test View 1'),
                canMoveView: true,
                order: 1
            },
            {
                id: 'view2',
                ctorDescriptor: null,
                name: nls.localize2('Test View 2', 'Test View 2'),
                canMoveView: true,
                order: 2
            },
            {
                id: 'view3',
                ctorDescriptor: null,
                name: nls.localize2('Test View 3', 'Test View 3'),
                canMoveView: true,
                order: 3
            }
        ];
        ViewsRegistry.registerViews(viewDescriptors, sidebarContainer);
        const testObject = aViewDescriptorService();
        const sidebarViews = testObject.getViewContainerModel(sidebarContainer);
        assert.deepStrictEqual(sidebarViews.allViewDescriptors.map(v => v.id), ['view2', 'view3']);
        testObject.whenExtensionsRegistered();
        assert.deepStrictEqual(sidebarViews.allViewDescriptors.map(v => v.id), ['view1', 'view2', 'view3']);
    });
    test('orphan view containers', async function () {
        const storageService = instantiationService.get(IStorageService);
        const generatedViewContainerId = `workbench.views.service.${ViewContainerLocationToString(0 /* ViewContainerLocation.Sidebar */)}.${generateUuid()}`;
        const viewsCustomizations = {
            viewContainerLocations: {
                [generatedViewContainerId]: 0 /* ViewContainerLocation.Sidebar */
            },
            viewLocations: {}
        };
        storageService.store('views.customizations', JSON.stringify(viewsCustomizations), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        const viewDescriptors = [
            {
                id: 'view1',
                ctorDescriptor: null,
                name: nls.localize2('Test View 1', 'Test View 1'),
                canMoveView: true,
                order: 1
            }
        ];
        ViewsRegistry.registerViews(viewDescriptors, sidebarContainer);
        const testObject = aViewDescriptorService();
        testObject.whenExtensionsRegistered();
        assert.deepStrictEqual(testObject.getViewContainerById(generatedViewContainerId), null);
        assert.deepStrictEqual(testObject.isViewContainerRemovedPermanently(generatedViewContainerId), true);
        const actual = JSON.parse(storageService.get('views.customizations', 0 /* StorageScope.PROFILE */));
        assert.deepStrictEqual(actual, { viewContainerLocations: {}, viewLocations: {}, viewContainerBadgeEnablementStates: {} });
    });
    test('custom locations take precedence when default view container of views change', async function () {
        const storageService = instantiationService.get(IStorageService);
        const viewContainer1 = ViewContainersRegistry.registerViewContainer({ id: `${viewContainerIdPrefix}-${generateUuid()}`, title: nls.localize2('test', 'test'), ctorDescriptor: new SyncDescriptor({}) }, 0 /* ViewContainerLocation.Sidebar */);
        const generateViewContainer1 = `workbench.views.service.${ViewContainerLocationToString(0 /* ViewContainerLocation.Sidebar */)}.${generateUuid()}`;
        const viewsCustomizations = {
            viewContainerLocations: {
                [generateViewContainer1]: 0 /* ViewContainerLocation.Sidebar */,
                [viewContainer1.id]: 2 /* ViewContainerLocation.AuxiliaryBar */
            },
            viewLocations: {
                'view1': generateViewContainer1
            }
        };
        storageService.store('views.customizations', JSON.stringify(viewsCustomizations), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        const viewDescriptors = [
            {
                id: 'view1',
                ctorDescriptor: null,
                name: nls.localize2('Test View 1', 'Test View 1'),
                canMoveView: true
            },
            {
                id: 'view2',
                ctorDescriptor: null,
                name: nls.localize2('Test View 2', 'Test View 2'),
                canMoveView: true
            },
            {
                id: 'view3',
                ctorDescriptor: null,
                name: nls.localize2('Test View 3', 'Test View 3'),
                canMoveView: true
            },
            {
                id: 'view4',
                ctorDescriptor: null,
                name: nls.localize2('Test View 4', 'Test View 4'),
                canMoveView: true
            }
        ];
        ViewsRegistry.registerViews(viewDescriptors.slice(0, 3), sidebarContainer);
        ViewsRegistry.registerViews(viewDescriptors.slice(3), viewContainer1);
        const testObject = aViewDescriptorService();
        ViewsRegistry.moveViews([viewDescriptors[0], viewDescriptors[1]], panelContainer);
        const sidebarViews = testObject.getViewContainerModel(sidebarContainer);
        assert.deepStrictEqual(sidebarViews.allViewDescriptors.map(v => v.id), ['view3']);
        const panelViews = testObject.getViewContainerModel(panelContainer);
        assert.deepStrictEqual(panelViews.allViewDescriptors.map(v => v.id), ['view2']);
        const generatedViewContainerViews = testObject.getViewContainerModel(testObject.getViewContainerById(generateViewContainer1));
        assert.deepStrictEqual(generatedViewContainerViews.allViewDescriptors.map(v => v.id), ['view1']);
        const viewContainer1Views = testObject.getViewContainerModel(viewContainer1);
        assert.deepStrictEqual(testObject.getViewContainerLocation(viewContainer1), 2 /* ViewContainerLocation.AuxiliaryBar */);
        assert.deepStrictEqual(viewContainer1Views.allViewDescriptors.map(v => v.id), ['view4']);
    });
    test('view containers with not existing views are not removed from customizations', async function () {
        const storageService = instantiationService.get(IStorageService);
        const viewContainer1 = ViewContainersRegistry.registerViewContainer({ id: `${viewContainerIdPrefix}-${generateUuid()}`, title: nls.localize2('test', 'test'), ctorDescriptor: new SyncDescriptor({}) }, 0 /* ViewContainerLocation.Sidebar */);
        const generateViewContainer1 = `workbench.views.service.${ViewContainerLocationToString(0 /* ViewContainerLocation.Sidebar */)}.${generateUuid()}`;
        const viewsCustomizations = {
            viewContainerLocations: {
                [generateViewContainer1]: 0 /* ViewContainerLocation.Sidebar */,
                [viewContainer1.id]: 2 /* ViewContainerLocation.AuxiliaryBar */
            },
            viewLocations: {
                'view5': generateViewContainer1
            }
        };
        storageService.store('views.customizations', JSON.stringify(viewsCustomizations), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        const viewDescriptors = [
            {
                id: 'view1',
                ctorDescriptor: null,
                name: nls.localize2('Test View 1', 'Test View 1'),
                canMoveView: true
            }
        ];
        ViewsRegistry.registerViews(viewDescriptors, viewContainer1);
        const testObject = aViewDescriptorService();
        testObject.whenExtensionsRegistered();
        const viewContainer1Views = testObject.getViewContainerModel(viewContainer1);
        assert.deepStrictEqual(testObject.getViewContainerLocation(viewContainer1), 2 /* ViewContainerLocation.AuxiliaryBar */);
        assert.deepStrictEqual(viewContainer1Views.allViewDescriptors.map(v => v.id), ['view1']);
        const actual = JSON.parse(storageService.get('views.customizations', 0 /* StorageScope.PROFILE */));
        assert.deepStrictEqual(actual, viewsCustomizations);
    });
    test('storage change also updates locations even if views do not exists and views are registered later', async function () {
        const storageService = instantiationService.get(IStorageService);
        const testObject = aViewDescriptorService();
        const generateViewContainerId = `workbench.views.service.${ViewContainerLocationToString(2 /* ViewContainerLocation.AuxiliaryBar */)}.${generateUuid()}`;
        const viewsCustomizations = {
            viewContainerLocations: {
                [generateViewContainerId]: 2 /* ViewContainerLocation.AuxiliaryBar */,
            },
            viewLocations: {
                'view1': generateViewContainerId
            }
        };
        storageService.store('views.customizations', JSON.stringify(viewsCustomizations), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        const viewContainer = ViewContainersRegistry.registerViewContainer({ id: `${viewContainerIdPrefix}-${generateUuid()}`, title: nls.localize2('test', 'test'), ctorDescriptor: new SyncDescriptor({}) }, 0 /* ViewContainerLocation.Sidebar */);
        const viewDescriptors = [
            {
                id: 'view1',
                ctorDescriptor: null,
                name: nls.localize2('Test View 1', 'Test View 1'),
                canMoveView: true
            },
            {
                id: 'view2',
                ctorDescriptor: null,
                name: nls.localize2('Test View 2', 'Test View 2'),
                canMoveView: true
            }
        ];
        ViewsRegistry.registerViews(viewDescriptors, viewContainer);
        testObject.whenExtensionsRegistered();
        const viewContainer1Views = testObject.getViewContainerModel(viewContainer);
        assert.deepStrictEqual(viewContainer1Views.allViewDescriptors.map(v => v.id), ['view2']);
        const generateViewContainer = testObject.getViewContainerById(generateViewContainerId);
        assert.deepStrictEqual(testObject.getViewContainerLocation(generateViewContainer), 2 /* ViewContainerLocation.AuxiliaryBar */);
        const generatedViewContainerModel = testObject.getViewContainerModel(generateViewContainer);
        assert.deepStrictEqual(generatedViewContainerModel.allViewDescriptors.map(v => v.id), ['view1']);
    });
    test('storage change move views and retain visibility state', async function () {
        const storageService = instantiationService.get(IStorageService);
        const testObject = aViewDescriptorService();
        const viewContainer = ViewContainersRegistry.registerViewContainer({ id: `${viewContainerIdPrefix}-${generateUuid()}`, title: nls.localize2('test', 'test'), ctorDescriptor: new SyncDescriptor({}) }, 0 /* ViewContainerLocation.Sidebar */);
        const viewDescriptors = [
            {
                id: 'view1',
                ctorDescriptor: null,
                name: nls.localize2('Test View 1', 'Test View 1'),
                canMoveView: true,
                canToggleVisibility: true
            },
            {
                id: 'view2',
                ctorDescriptor: null,
                name: nls.localize2('Test View 2', 'Test View 2'),
                canMoveView: true
            }
        ];
        ViewsRegistry.registerViews(viewDescriptors, viewContainer);
        testObject.whenExtensionsRegistered();
        const viewContainer1Views = testObject.getViewContainerModel(viewContainer);
        viewContainer1Views.setVisible('view1', false);
        const generateViewContainerId = `workbench.views.service.${ViewContainerLocationToString(2 /* ViewContainerLocation.AuxiliaryBar */)}.${generateUuid()}`;
        const viewsCustomizations = {
            viewContainerLocations: {
                [generateViewContainerId]: 2 /* ViewContainerLocation.AuxiliaryBar */,
            },
            viewLocations: {
                'view1': generateViewContainerId
            }
        };
        storageService.store('views.customizations', JSON.stringify(viewsCustomizations), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        const generateViewContainer = testObject.getViewContainerById(generateViewContainerId);
        const generatedViewContainerModel = testObject.getViewContainerModel(generateViewContainer);
        assert.deepStrictEqual(viewContainer1Views.allViewDescriptors.map(v => v.id), ['view2']);
        assert.deepStrictEqual(testObject.getViewContainerLocation(generateViewContainer), 2 /* ViewContainerLocation.AuxiliaryBar */);
        assert.deepStrictEqual(generatedViewContainerModel.allViewDescriptors.map(v => v.id), ['view1']);
        storageService.store('views.customizations', JSON.stringify({}), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        assert.deepStrictEqual(viewContainer1Views.allViewDescriptors.map(v => v.id).sort((a, b) => compare(a, b)), ['view1', 'view2']);
        assert.deepStrictEqual(viewContainer1Views.visibleViewDescriptors.map(v => v.id), ['view2']);
        assert.deepStrictEqual(generatedViewContainerModel.allViewDescriptors.map(v => v.id), []);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0Rlc2NyaXB0b3JTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3ZpZXdzL3Rlc3QvYnJvd3Nlci92aWV3RGVzY3JpcHRvclNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLHVCQUF1QixDQUFDO0FBQzdDLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQTRELFVBQVUsSUFBSSx1QkFBdUIsRUFBd0MsNkJBQTZCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNuTixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDL0UsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUNwRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLG1EQUFtRCxDQUFDO0FBQ2pILE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsTUFBTSxhQUFhLEdBQUcsUUFB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