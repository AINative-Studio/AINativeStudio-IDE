/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as sinon from 'sinon';
import { IExtensionManagementService, IAllowedExtensionsService, AllowedExtensionsConfigKey } from '../../../../../platform/extensionManagement/common/extensionManagement.js';
import { IExtensionManagementServerService, IWorkbenchExtensionManagementService } from '../../common/extensionManagement.js';
import { ExtensionEnablementService } from '../../browser/extensionEnablementService.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IWorkbenchEnvironmentService } from '../../../environment/common/environmentService.js';
import { IStorageService, InMemoryStorageService } from '../../../../../platform/storage/common/storage.js';
import { isUndefinedOrNull } from '../../../../../base/common/types.js';
import { areSameExtensions } from '../../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { URI } from '../../../../../base/common/uri.js';
import { Schemas } from '../../../../../base/common/network.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestLifecycleService } from '../../../../test/browser/workbenchTestServices.js';
import { GlobalExtensionEnablementService } from '../../../../../platform/extensionManagement/common/extensionEnablementService.js';
import { IUserDataSyncAccountService, UserDataSyncAccountService } from '../../../../../platform/userDataSync/common/userDataSyncAccount.js';
import { IUserDataSyncEnablementService } from '../../../../../platform/userDataSync/common/userDataSync.js';
import { ILifecycleService } from '../../../lifecycle/common/lifecycle.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { TestNotificationService } from '../../../../../platform/notification/test/common/testNotificationService.js';
import { IHostService } from '../../../host/browser/host.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { IWorkspaceTrustManagementService } from '../../../../../platform/workspace/common/workspaceTrust.js';
import { ExtensionManifestPropertiesService, IExtensionManifestPropertiesService } from '../../../extensions/common/extensionManifestPropertiesService.js';
import { TestContextService, TestProductService, TestWorkspaceTrustEnablementService, TestWorkspaceTrustManagementService } from '../../../../test/common/workbenchTestServices.js';
import { TestWorkspace } from '../../../../../platform/workspace/test/common/testWorkspace.js';
import { ExtensionManagementService } from '../../common/extensionManagementService.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { AllowedExtensionsService } from '../../../../../platform/extensionManagement/common/allowedExtensionsService.js';
function createStorageService(instantiationService, disposableStore) {
    let service = instantiationService.get(IStorageService);
    if (!service) {
        let workspaceContextService = instantiationService.get(IWorkspaceContextService);
        if (!workspaceContextService) {
            workspaceContextService = instantiationService.stub(IWorkspaceContextService, {
                getWorkbenchState: () => 2 /* WorkbenchState.FOLDER */,
                getWorkspace: () => TestWorkspace
            });
        }
        service = instantiationService.stub(IStorageService, disposableStore.add(new InMemoryStorageService()));
    }
    return service;
}
export class TestExtensionEnablementService extends ExtensionEnablementService {
    constructor(instantiationService) {
        const disposables = new DisposableStore();
        const storageService = createStorageService(instantiationService, disposables);
        const extensionManagementServerService = instantiationService.get(IExtensionManagementServerService) ||
            instantiationService.stub(IExtensionManagementServerService, anExtensionManagementServerService({
                id: 'local',
                label: 'local',
                extensionManagementService: {
                    onInstallExtension: disposables.add(new Emitter()).event,
                    onDidInstallExtensions: disposables.add(new Emitter()).event,
                    onUninstallExtension: disposables.add(new Emitter()).event,
                    onDidUninstallExtension: disposables.add(new Emitter()).event,
                    onDidChangeProfile: disposables.add(new Emitter()).event,
                    onDidUpdateExtensionMetadata: disposables.add(new Emitter()).event,
                    onProfileAwareDidInstallExtensions: Event.None,
                },
            }, null, null));
        const extensionManagementService = disposables.add(instantiationService.createInstance(ExtensionManagementService));
        const workbenchExtensionManagementService = instantiationService.get(IWorkbenchExtensionManagementService) || instantiationService.stub(IWorkbenchExtensionManagementService, extensionManagementService);
        const workspaceTrustManagementService = instantiationService.get(IWorkspaceTrustManagementService) || instantiationService.stub(IWorkspaceTrustManagementService, disposables.add(new TestWorkspaceTrustManagementService()));
        super(storageService, disposables.add(new GlobalExtensionEnablementService(storageService, extensionManagementService)), instantiationService.get(IWorkspaceContextService) || new TestContextService(), instantiationService.get(IWorkbenchEnvironmentService) || instantiationService.stub(IWorkbenchEnvironmentService, {}), workbenchExtensionManagementService, instantiationService.get(IConfigurationService), extensionManagementServerService, instantiationService.get(IUserDataSyncEnablementService) || instantiationService.stub(IUserDataSyncEnablementService, { isEnabled() { return false; } }), instantiationService.get(IUserDataSyncAccountService) || instantiationService.stub(IUserDataSyncAccountService, UserDataSyncAccountService), instantiationService.get(ILifecycleService) || instantiationService.stub(ILifecycleService, disposables.add(new TestLifecycleService())), instantiationService.get(INotificationService) || instantiationService.stub(INotificationService, new TestNotificationService()), instantiationService.get(IHostService), new class extends mock() {
            isDisabledByBisect() { return false; }
        }, instantiationService.stub(IAllowedExtensionsService, disposables.add(new AllowedExtensionsService(instantiationService.get(IProductService), instantiationService.get(IConfigurationService)))), workspaceTrustManagementService, new class extends mock() {
            requestWorkspaceTrust(options) { return Promise.resolve(true); }
        }, instantiationService.get(IExtensionManifestPropertiesService) || instantiationService.stub(IExtensionManifestPropertiesService, disposables.add(new ExtensionManifestPropertiesService(TestProductService, new TestConfigurationService(), new TestWorkspaceTrustEnablementService(), new NullLogService()))), instantiationService, new NullLogService());
        this._register(disposables);
    }
    async waitUntilInitialized() {
        await this.extensionsManager.whenInitialized();
    }
    reset() {
        let extensions = this.globalExtensionEnablementService.getDisabledExtensions();
        for (const e of this._getWorkspaceDisabledExtensions()) {
            if (!extensions.some(r => areSameExtensions(r, e))) {
                extensions.push(e);
            }
        }
        const workspaceEnabledExtensions = this._getWorkspaceEnabledExtensions();
        if (workspaceEnabledExtensions.length) {
            extensions = extensions.filter(r => !workspaceEnabledExtensions.some(e => areSameExtensions(e, r)));
        }
        extensions.forEach(d => this.setEnablement([aLocalExtension(d.id)], 11 /* EnablementState.EnabledGlobally */));
    }
}
suite('ExtensionEnablementService Test', () => {
    const disposableStore = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let testObject;
    const didInstallEvent = new Emitter();
    const didUninstallEvent = new Emitter();
    const didChangeProfileExtensionsEvent = new Emitter();
    const installed = [];
    const malicious = [];
    setup(() => {
        installed.splice(0, installed.length);
        instantiationService = disposableStore.add(new TestInstantiationService());
        instantiationService.stub(IFileService, disposableStore.add(new FileService(new NullLogService())));
        instantiationService.stub(IProductService, TestProductService);
        const testConfigurationService = new TestConfigurationService();
        testConfigurationService.setUserConfiguration(AllowedExtensionsConfigKey, { '*': true, 'unallowed': false });
        instantiationService.stub(IConfigurationService, testConfigurationService);
        instantiationService.stub(IWorkspaceContextService, new TestContextService());
        instantiationService.stub(IExtensionManagementServerService, anExtensionManagementServerService({
            id: 'local',
            label: 'local',
            extensionManagementService: {
                onDidInstallExtensions: didInstallEvent.event,
                onDidUninstallExtension: didUninstallEvent.event,
                onDidChangeProfile: didChangeProfileExtensionsEvent.event,
                onProfileAwareDidInstallExtensions: Event.None,
                getInstalled: () => Promise.resolve(installed),
                async getExtensionsControlManifest() {
                    return {
                        malicious,
                        deprecated: {},
                        search: []
                    };
                }
            },
        }, null, null));
        instantiationService.stub(ILogService, NullLogService);
        instantiationService.stub(IWorkbenchExtensionManagementService, disposableStore.add(instantiationService.createInstance(ExtensionManagementService)));
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
    });
    test('test disable an extension globally', async () => {
        const extension = aLocalExtension('pub.a');
        await testObject.setEnablement([extension], 9 /* EnablementState.DisabledGlobally */);
        assert.ok(!testObject.isEnabled(extension));
        assert.strictEqual(testObject.getEnablementState(extension), 9 /* EnablementState.DisabledGlobally */);
    });
    test('test disable an extension globally should return truthy promise', () => {
        return testObject.setEnablement([aLocalExtension('pub.a')], 9 /* EnablementState.DisabledGlobally */)
            .then(value => assert.ok(value));
    });
    test('test disable an extension globally triggers the change event', async () => {
        const target = sinon.spy();
        disposableStore.add(testObject.onEnablementChanged(target));
        await testObject.setEnablement([aLocalExtension('pub.a')], 9 /* EnablementState.DisabledGlobally */);
        assert.ok(target.calledOnce);
        assert.deepStrictEqual(target.args[0][0][0].identifier, { id: 'pub.a' });
    });
    test('test disable an extension globally again should return a falsy promise', () => {
        return testObject.setEnablement([aLocalExtension('pub.a')], 9 /* EnablementState.DisabledGlobally */)
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 9 /* EnablementState.DisabledGlobally */))
            .then(value => assert.ok(!value[0]));
    });
    test('test state of globally disabled extension', () => {
        return testObject.setEnablement([aLocalExtension('pub.a')], 9 /* EnablementState.DisabledGlobally */)
            .then(() => assert.strictEqual(testObject.getEnablementState(aLocalExtension('pub.a')), 9 /* EnablementState.DisabledGlobally */));
    });
    test('test state of globally enabled extension', () => {
        return testObject.setEnablement([aLocalExtension('pub.a')], 9 /* EnablementState.DisabledGlobally */)
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 11 /* EnablementState.EnabledGlobally */))
            .then(() => assert.strictEqual(testObject.getEnablementState(aLocalExtension('pub.a')), 11 /* EnablementState.EnabledGlobally */));
    });
    test('test disable an extension for workspace', async () => {
        const extension = aLocalExtension('pub.a');
        await testObject.setEnablement([extension], 10 /* EnablementState.DisabledWorkspace */);
        assert.ok(!testObject.isEnabled(extension));
        assert.strictEqual(testObject.getEnablementState(extension), 10 /* EnablementState.DisabledWorkspace */);
    });
    test('test disable an extension for workspace returns a truthy promise', () => {
        return testObject.setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */)
            .then(value => assert.ok(value));
    });
    test('test disable an extension for workspace again should return a falsy promise', () => {
        return testObject.setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */))
            .then(value => assert.ok(!value[0]));
    });
    test('test state of workspace disabled extension', () => {
        return testObject.setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => assert.strictEqual(testObject.getEnablementState(aLocalExtension('pub.a')), 10 /* EnablementState.DisabledWorkspace */));
    });
    test('test state of workspace and globally disabled extension', () => {
        return testObject.setEnablement([aLocalExtension('pub.a')], 9 /* EnablementState.DisabledGlobally */)
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */))
            .then(() => assert.strictEqual(testObject.getEnablementState(aLocalExtension('pub.a')), 10 /* EnablementState.DisabledWorkspace */));
    });
    test('test state of workspace enabled extension', () => {
        return testObject.setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 12 /* EnablementState.EnabledWorkspace */))
            .then(() => assert.strictEqual(testObject.getEnablementState(aLocalExtension('pub.a')), 12 /* EnablementState.EnabledWorkspace */));
    });
    test('test state of globally disabled and workspace enabled extension', () => {
        return testObject.setEnablement([aLocalExtension('pub.a')], 9 /* EnablementState.DisabledGlobally */)
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */))
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 12 /* EnablementState.EnabledWorkspace */))
            .then(() => assert.strictEqual(testObject.getEnablementState(aLocalExtension('pub.a')), 12 /* EnablementState.EnabledWorkspace */));
    });
    test('test state of an extension when disabled for workspace from workspace enabled', () => {
        return testObject.setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 12 /* EnablementState.EnabledWorkspace */))
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */))
            .then(() => assert.strictEqual(testObject.getEnablementState(aLocalExtension('pub.a')), 10 /* EnablementState.DisabledWorkspace */));
    });
    test('test state of an extension when disabled globally from workspace enabled', () => {
        return testObject.setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 12 /* EnablementState.EnabledWorkspace */))
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 9 /* EnablementState.DisabledGlobally */))
            .then(() => assert.strictEqual(testObject.getEnablementState(aLocalExtension('pub.a')), 9 /* EnablementState.DisabledGlobally */));
    });
    test('test state of an extension when disabled globally from workspace disabled', () => {
        return testObject.setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 9 /* EnablementState.DisabledGlobally */))
            .then(() => assert.strictEqual(testObject.getEnablementState(aLocalExtension('pub.a')), 9 /* EnablementState.DisabledGlobally */));
    });
    test('test state of an extension when enabled globally from workspace enabled', () => {
        return testObject.setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 12 /* EnablementState.EnabledWorkspace */))
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 11 /* EnablementState.EnabledGlobally */))
            .then(() => assert.strictEqual(testObject.getEnablementState(aLocalExtension('pub.a')), 11 /* EnablementState.EnabledGlobally */));
    });
    test('test state of an extension when enabled globally from workspace disabled', () => {
        return testObject.setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 11 /* EnablementState.EnabledGlobally */))
            .then(() => assert.strictEqual(testObject.getEnablementState(aLocalExtension('pub.a')), 11 /* EnablementState.EnabledGlobally */));
    });
    test('test disable an extension for workspace and then globally', async () => {
        const extension = aLocalExtension('pub.a');
        await testObject.setEnablement([extension], 10 /* EnablementState.DisabledWorkspace */);
        await testObject.setEnablement([extension], 9 /* EnablementState.DisabledGlobally */);
        assert.ok(!testObject.isEnabled(extension));
        assert.strictEqual(testObject.getEnablementState(extension), 9 /* EnablementState.DisabledGlobally */);
    });
    test('test disable an extension for workspace and then globally return a truthy promise', () => {
        return testObject.setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 9 /* EnablementState.DisabledGlobally */))
            .then(value => assert.ok(value));
    });
    test('test disable an extension for workspace and then globally trigger the change event', () => {
        const target = sinon.spy();
        return testObject.setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => disposableStore.add(testObject.onEnablementChanged(target)))
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 9 /* EnablementState.DisabledGlobally */))
            .then(() => {
            assert.ok(target.calledOnce);
            assert.deepStrictEqual(target.args[0][0][0].identifier, { id: 'pub.a' });
        });
    });
    test('test disable an extension globally and then for workspace', async () => {
        const extension = aLocalExtension('pub.a');
        await testObject.setEnablement([extension], 9 /* EnablementState.DisabledGlobally */);
        await testObject.setEnablement([extension], 10 /* EnablementState.DisabledWorkspace */);
        assert.ok(!testObject.isEnabled(extension));
        assert.strictEqual(testObject.getEnablementState(extension), 10 /* EnablementState.DisabledWorkspace */);
    });
    test('test disable an extension globally and then for workspace return a truthy promise', () => {
        return testObject.setEnablement([aLocalExtension('pub.a')], 9 /* EnablementState.DisabledGlobally */)
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */))
            .then(value => assert.ok(value));
    });
    test('test disable an extension globally and then for workspace triggers the change event', () => {
        const target = sinon.spy();
        return testObject.setEnablement([aLocalExtension('pub.a')], 9 /* EnablementState.DisabledGlobally */)
            .then(() => disposableStore.add(testObject.onEnablementChanged(target)))
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */))
            .then(() => {
            assert.ok(target.calledOnce);
            assert.deepStrictEqual(target.args[0][0][0].identifier, { id: 'pub.a' });
        });
    });
    test('test disable an extension for workspace when there is no workspace throws error', () => {
        instantiationService.stub(IWorkspaceContextService, 'getWorkbenchState', 1 /* WorkbenchState.EMPTY */);
        return testObject.setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => assert.fail('should throw an error'), error => assert.ok(error));
    });
    test('test enable an extension globally', async () => {
        const extension = aLocalExtension('pub.a');
        await testObject.setEnablement([extension], 9 /* EnablementState.DisabledGlobally */);
        await testObject.setEnablement([extension], 11 /* EnablementState.EnabledGlobally */);
        assert.ok(testObject.isEnabled(extension));
        assert.strictEqual(testObject.getEnablementState(extension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test enable an extension globally return truthy promise', async () => {
        await testObject.setEnablement([aLocalExtension('pub.a')], 9 /* EnablementState.DisabledGlobally */);
        const value = await testObject.setEnablement([aLocalExtension('pub.a')], 11 /* EnablementState.EnabledGlobally */);
        assert.strictEqual(value[0], true);
    });
    test('test enable an extension globally triggers change event', () => {
        const target = sinon.spy();
        return testObject.setEnablement([aLocalExtension('pub.a')], 9 /* EnablementState.DisabledGlobally */)
            .then(() => disposableStore.add(testObject.onEnablementChanged(target)))
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 11 /* EnablementState.EnabledGlobally */))
            .then(() => {
            assert.ok(target.calledOnce);
            assert.deepStrictEqual(target.args[0][0][0].identifier, { id: 'pub.a' });
        });
    });
    test('test enable an extension globally when already enabled return falsy promise', () => {
        return testObject.setEnablement([aLocalExtension('pub.a')], 11 /* EnablementState.EnabledGlobally */)
            .then(value => assert.ok(!value[0]));
    });
    test('test enable an extension for workspace', async () => {
        const extension = aLocalExtension('pub.a');
        await testObject.setEnablement([extension], 10 /* EnablementState.DisabledWorkspace */);
        await testObject.setEnablement([extension], 12 /* EnablementState.EnabledWorkspace */);
        assert.ok(testObject.isEnabled(extension));
        assert.strictEqual(testObject.getEnablementState(extension), 12 /* EnablementState.EnabledWorkspace */);
    });
    test('test enable an extension for workspace return truthy promise', () => {
        return testObject.setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 12 /* EnablementState.EnabledWorkspace */))
            .then(value => assert.ok(value));
    });
    test('test enable an extension for workspace triggers change event', () => {
        const target = sinon.spy();
        return testObject.setEnablement([aLocalExtension('pub.b')], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => disposableStore.add(testObject.onEnablementChanged(target)))
            .then(() => testObject.setEnablement([aLocalExtension('pub.b')], 12 /* EnablementState.EnabledWorkspace */))
            .then(() => {
            assert.ok(target.calledOnce);
            assert.deepStrictEqual(target.args[0][0][0].identifier, { id: 'pub.b' });
        });
    });
    test('test enable an extension for workspace when already enabled return truthy promise', () => {
        return testObject.setEnablement([aLocalExtension('pub.a')], 12 /* EnablementState.EnabledWorkspace */)
            .then(value => assert.ok(value));
    });
    test('test enable an extension for workspace when disabled in workspace and gloablly', async () => {
        const extension = aLocalExtension('pub.a');
        await testObject.setEnablement([extension], 10 /* EnablementState.DisabledWorkspace */);
        await testObject.setEnablement([extension], 9 /* EnablementState.DisabledGlobally */);
        await testObject.setEnablement([extension], 12 /* EnablementState.EnabledWorkspace */);
        assert.ok(testObject.isEnabled(extension));
        assert.strictEqual(testObject.getEnablementState(extension), 12 /* EnablementState.EnabledWorkspace */);
    });
    test('test enable an extension globally when disabled in workspace and gloablly', async () => {
        const extension = aLocalExtension('pub.a');
        await testObject.setEnablement([extension], 12 /* EnablementState.EnabledWorkspace */);
        await testObject.setEnablement([extension], 10 /* EnablementState.DisabledWorkspace */);
        await testObject.setEnablement([extension], 9 /* EnablementState.DisabledGlobally */);
        await testObject.setEnablement([extension], 11 /* EnablementState.EnabledGlobally */);
        assert.ok(testObject.isEnabled(extension));
        assert.strictEqual(testObject.getEnablementState(extension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test enable an extension also enables dependencies', async () => {
        installed.push(...[aLocalExtension2('pub.a', { extensionDependencies: ['pub.b'] }), aLocalExtension('pub.b')]);
        const target = installed[0];
        const dep = installed[1];
        await testObject.waitUntilInitialized();
        await testObject.setEnablement([dep, target], 9 /* EnablementState.DisabledGlobally */);
        await testObject.setEnablement([target], 11 /* EnablementState.EnabledGlobally */);
        assert.ok(testObject.isEnabled(target));
        assert.ok(testObject.isEnabled(dep));
        assert.strictEqual(testObject.getEnablementState(target), 11 /* EnablementState.EnabledGlobally */);
        assert.strictEqual(testObject.getEnablementState(dep), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test enable an extension in workspace with a dependency extension that has auth providers', async () => {
        installed.push(...[aLocalExtension2('pub.a', { extensionDependencies: ['pub.b'] }), aLocalExtension('pub.b', { authentication: [{ id: 'a', label: 'a' }] })]);
        const target = installed[0];
        await testObject.waitUntilInitialized();
        await testObject.setEnablement([target], 10 /* EnablementState.DisabledWorkspace */);
        await testObject.setEnablement([target], 12 /* EnablementState.EnabledWorkspace */);
        assert.ok(testObject.isEnabled(target));
        assert.strictEqual(testObject.getEnablementState(target), 12 /* EnablementState.EnabledWorkspace */);
    });
    test('test enable an extension with a dependency extension that cannot be enabled', async () => {
        instantiationService.stub(IExtensionManagementServerService, anExtensionManagementServerService(anExtensionManagementServer('vscode-local', instantiationService), anExtensionManagementServer('vscode-remote', instantiationService), null));
        const localWorkspaceDepExtension = aLocalExtension2('pub.b', { extensionKind: ['workspace'] }, { location: URI.file(`pub.b`) });
        const remoteWorkspaceExtension = aLocalExtension2('pub.a', { extensionKind: ['workspace'], extensionDependencies: ['pub.b'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const remoteWorkspaceDepExtension = aLocalExtension2('pub.b', { extensionKind: ['workspace'] }, { location: URI.file(`pub.b`).with({ scheme: Schemas.vscodeRemote }) });
        installed.push(localWorkspaceDepExtension, remoteWorkspaceExtension, remoteWorkspaceDepExtension);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        await testObject.setEnablement([remoteWorkspaceExtension], 9 /* EnablementState.DisabledGlobally */);
        await testObject.setEnablement([remoteWorkspaceExtension], 11 /* EnablementState.EnabledGlobally */);
        assert.ok(testObject.isEnabled(remoteWorkspaceExtension));
        assert.strictEqual(testObject.getEnablementState(remoteWorkspaceExtension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test enable an extension also enables packed extensions', async () => {
        installed.push(...[aLocalExtension2('pub.a', { extensionPack: ['pub.b'] }), aLocalExtension('pub.b')]);
        const target = installed[0];
        const dep = installed[1];
        await testObject.setEnablement([dep, target], 9 /* EnablementState.DisabledGlobally */);
        await testObject.setEnablement([target], 11 /* EnablementState.EnabledGlobally */);
        assert.ok(testObject.isEnabled(target));
        assert.ok(testObject.isEnabled(dep));
        assert.strictEqual(testObject.getEnablementState(target), 11 /* EnablementState.EnabledGlobally */);
        assert.strictEqual(testObject.getEnablementState(dep), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test remove an extension from disablement list when uninstalled', async () => {
        const extension = aLocalExtension('pub.a');
        installed.push(extension);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.setEnablement([extension], 10 /* EnablementState.DisabledWorkspace */);
        await testObject.setEnablement([extension], 9 /* EnablementState.DisabledGlobally */);
        didUninstallEvent.fire({ identifier: { id: 'pub.a' }, profileLocation: null });
        assert.ok(testObject.isEnabled(extension));
        assert.strictEqual(testObject.getEnablementState(extension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test isEnabled return false extension is disabled globally', () => {
        return testObject.setEnablement([aLocalExtension('pub.a')], 9 /* EnablementState.DisabledGlobally */)
            .then(() => assert.ok(!testObject.isEnabled(aLocalExtension('pub.a'))));
    });
    test('test isEnabled return false extension is disabled in workspace', () => {
        return testObject.setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => assert.ok(!testObject.isEnabled(aLocalExtension('pub.a'))));
    });
    test('test isEnabled return true extension is not disabled', () => {
        return testObject.setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => testObject.setEnablement([aLocalExtension('pub.c')], 9 /* EnablementState.DisabledGlobally */))
            .then(() => assert.ok(testObject.isEnabled(aLocalExtension('pub.b'))));
    });
    test('test canChangeEnablement return false for language packs', () => {
        assert.strictEqual(testObject.canChangeEnablement(aLocalExtension('pub.a', { localizations: [{ languageId: 'gr', translations: [{ id: 'vscode', path: 'path' }] }] })), false);
    });
    test('test canChangeEnablement return true for auth extension', () => {
        assert.strictEqual(testObject.canChangeEnablement(aLocalExtension('pub.a', { authentication: [{ id: 'a', label: 'a' }] })), true);
    });
    test('test canChangeEnablement return true for auth extension when user data sync account does not depends on it', () => {
        instantiationService.stub(IUserDataSyncAccountService, {
            account: { authenticationProviderId: 'b' }
        });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.canChangeEnablement(aLocalExtension('pub.a', { authentication: [{ id: 'a', label: 'a' }] })), true);
    });
    test('test canChangeEnablement return true for auth extension when user data sync account depends on it but auto sync is off', () => {
        instantiationService.stub(IUserDataSyncAccountService, {
            account: { authenticationProviderId: 'a' }
        });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.canChangeEnablement(aLocalExtension('pub.a', { authentication: [{ id: 'a', label: 'a' }] })), true);
    });
    test('test canChangeEnablement return false for auth extension and user data sync account depends on it and auto sync is on', () => {
        instantiationService.stub(IUserDataSyncEnablementService, { isEnabled() { return true; } });
        instantiationService.stub(IUserDataSyncAccountService, {
            account: { authenticationProviderId: 'a' }
        });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.canChangeEnablement(aLocalExtension('pub.a', { authentication: [{ id: 'a', label: 'a' }] })), false);
    });
    test('test canChangeWorkspaceEnablement return true', () => {
        assert.strictEqual(testObject.canChangeWorkspaceEnablement(aLocalExtension('pub.a')), true);
    });
    test('test canChangeWorkspaceEnablement return false if there is no workspace', () => {
        instantiationService.stub(IWorkspaceContextService, 'getWorkbenchState', 1 /* WorkbenchState.EMPTY */);
        assert.strictEqual(testObject.canChangeWorkspaceEnablement(aLocalExtension('pub.a')), false);
    });
    test('test canChangeWorkspaceEnablement return false for auth extension', () => {
        assert.strictEqual(testObject.canChangeWorkspaceEnablement(aLocalExtension('pub.a', { authentication: [{ id: 'a', label: 'a' }] })), false);
    });
    test('test canChangeEnablement return false when extensions are disabled in environment', () => {
        instantiationService.stub(IWorkbenchEnvironmentService, { disableExtensions: true });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.canChangeEnablement(aLocalExtension('pub.a')), false);
    });
    test('test canChangeEnablement return false when the extension is disabled in environment', () => {
        instantiationService.stub(IWorkbenchEnvironmentService, { disableExtensions: ['pub.a'] });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.canChangeEnablement(aLocalExtension('pub.a')), false);
    });
    test('test canChangeEnablement return true for system extensions when extensions are disabled in environment', () => {
        instantiationService.stub(IWorkbenchEnvironmentService, { disableExtensions: true });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        const extension = aLocalExtension('pub.a', undefined, 0 /* ExtensionType.System */);
        assert.strictEqual(testObject.canChangeEnablement(extension), true);
    });
    test('test canChangeEnablement return false for system extension when extension is disabled in environment', () => {
        instantiationService.stub(IWorkbenchEnvironmentService, { disableExtensions: ['pub.a'] });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        const extension = aLocalExtension('pub.a', undefined, 0 /* ExtensionType.System */);
        assert.ok(!testObject.canChangeEnablement(extension));
    });
    test('test extension is disabled when disabled in environment', async () => {
        const extension = aLocalExtension('pub.a');
        installed.push(extension);
        instantiationService.stub(IWorkbenchEnvironmentService, { disableExtensions: ['pub.a'] });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(!testObject.isEnabled(extension));
        assert.deepStrictEqual(testObject.getEnablementState(extension), 2 /* EnablementState.DisabledByEnvironment */);
    });
    test('test extension is enabled globally when enabled in environment', async () => {
        const extension = aLocalExtension('pub.a');
        installed.push(extension);
        instantiationService.stub(IWorkbenchEnvironmentService, { enableExtensions: ['pub.a'] });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(testObject.isEnabled(extension));
        assert.deepStrictEqual(testObject.getEnablementState(extension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test extension is enabled workspace when enabled in environment', async () => {
        const extension = aLocalExtension('pub.a');
        installed.push(extension);
        await testObject.setEnablement([extension], 12 /* EnablementState.EnabledWorkspace */);
        instantiationService.stub(IWorkbenchEnvironmentService, { enableExtensions: ['pub.a'] });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(testObject.isEnabled(extension));
        assert.deepStrictEqual(testObject.getEnablementState(extension), 12 /* EnablementState.EnabledWorkspace */);
    });
    test('test extension is enabled by environment when disabled globally', async () => {
        const extension = aLocalExtension('pub.a');
        installed.push(extension);
        await testObject.setEnablement([extension], 9 /* EnablementState.DisabledGlobally */);
        instantiationService.stub(IWorkbenchEnvironmentService, { enableExtensions: ['pub.a'] });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(testObject.isEnabled(extension));
        assert.deepStrictEqual(testObject.getEnablementState(extension), 3 /* EnablementState.EnabledByEnvironment */);
    });
    test('test extension is enabled by environment when disabled workspace', async () => {
        const extension = aLocalExtension('pub.a');
        installed.push(extension);
        await testObject.setEnablement([extension], 10 /* EnablementState.DisabledWorkspace */);
        instantiationService.stub(IWorkbenchEnvironmentService, { enableExtensions: ['pub.a'] });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(testObject.isEnabled(extension));
        assert.deepStrictEqual(testObject.getEnablementState(extension), 3 /* EnablementState.EnabledByEnvironment */);
    });
    test('test extension is disabled by environment when also enabled in environment', async () => {
        const extension = aLocalExtension('pub.a');
        installed.push(extension);
        testObject.setEnablement([extension], 10 /* EnablementState.DisabledWorkspace */);
        instantiationService.stub(IWorkbenchEnvironmentService, { disableExtensions: true, enableExtensions: ['pub.a'] });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(!testObject.isEnabled(extension));
        assert.deepStrictEqual(testObject.getEnablementState(extension), 2 /* EnablementState.DisabledByEnvironment */);
    });
    test('test canChangeEnablement return false when the extension is enabled in environment', () => {
        instantiationService.stub(IWorkbenchEnvironmentService, { enableExtensions: ['pub.a'] });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.canChangeEnablement(aLocalExtension('pub.a')), false);
    });
    test('test extension does not support vitrual workspace is not enabled in virtual workspace', async () => {
        const extension = aLocalExtension2('pub.a', { capabilities: { virtualWorkspaces: false } });
        instantiationService.stub(IWorkspaceContextService, 'getWorkspace', { folders: [{ uri: URI.file('worskapceA').with(({ scheme: 'virtual' })) }] });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(!testObject.isEnabled(extension));
        assert.deepStrictEqual(testObject.getEnablementState(extension), 5 /* EnablementState.DisabledByVirtualWorkspace */);
    });
    test('test web extension from web extension management server and does not support vitrual workspace is enabled in virtual workspace', async () => {
        instantiationService.stub(IExtensionManagementServerService, anExtensionManagementServerService(null, anExtensionManagementServer('vscode-remote', instantiationService), anExtensionManagementServer('web', instantiationService)));
        const extension = aLocalExtension2('pub.a', { capabilities: { virtualWorkspaces: false }, browser: 'browser.js' }, { location: URI.file(`pub.a`).with({ scheme: 'web' }) });
        instantiationService.stub(IWorkspaceContextService, 'getWorkspace', { folders: [{ uri: URI.file('worskapceA').with(({ scheme: 'virtual' })) }] });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(testObject.isEnabled(extension));
        assert.deepStrictEqual(testObject.getEnablementState(extension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test web extension from remote extension management server and does not support vitrual workspace is disabled in virtual workspace', async () => {
        instantiationService.stub(IExtensionManagementServerService, anExtensionManagementServerService(null, anExtensionManagementServer('vscode-remote', instantiationService), anExtensionManagementServer('web', instantiationService)));
        const extension = aLocalExtension2('pub.a', { capabilities: { virtualWorkspaces: false }, browser: 'browser.js' }, { location: URI.file(`pub.a`).with({ scheme: 'vscode-remote' }) });
        instantiationService.stub(IWorkspaceContextService, 'getWorkspace', { folders: [{ uri: URI.file('worskapceA').with(({ scheme: 'virtual' })) }] });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(!testObject.isEnabled(extension));
        assert.deepStrictEqual(testObject.getEnablementState(extension), 5 /* EnablementState.DisabledByVirtualWorkspace */);
    });
    test('test enable a remote workspace extension and local ui extension that is a dependency of remote', async () => {
        instantiationService.stub(IExtensionManagementServerService, anExtensionManagementServerService(anExtensionManagementServer('vscode-local', instantiationService), anExtensionManagementServer('vscode-remote', instantiationService), null));
        const localUIExtension = aLocalExtension2('pub.a', { main: 'main.js', extensionKind: ['ui'] }, { location: URI.file(`pub.a`) });
        const remoteUIExtension = aLocalExtension2('pub.a', { main: 'main.js', extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: 'vscode-remote' }) });
        const target = aLocalExtension2('pub.b', { main: 'main.js', extensionDependencies: ['pub.a'] }, { location: URI.file(`pub.b`).with({ scheme: 'vscode-remote' }) });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        installed.push(localUIExtension, remoteUIExtension, target);
        await testObject.setEnablement([target, localUIExtension], 9 /* EnablementState.DisabledGlobally */);
        await testObject.setEnablement([target, localUIExtension], 11 /* EnablementState.EnabledGlobally */);
        assert.ok(testObject.isEnabled(target));
        assert.ok(testObject.isEnabled(localUIExtension));
        assert.strictEqual(testObject.getEnablementState(target), 11 /* EnablementState.EnabledGlobally */);
        assert.strictEqual(testObject.getEnablementState(localUIExtension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test enable a remote workspace extension also enables its dependency in local', async () => {
        instantiationService.stub(IExtensionManagementServerService, anExtensionManagementServerService(anExtensionManagementServer('vscode-local', instantiationService), anExtensionManagementServer('vscode-remote', instantiationService), null));
        const localUIExtension = aLocalExtension2('pub.a', { main: 'main.js', extensionKind: ['ui'] }, { location: URI.file(`pub.a`) });
        const remoteUIExtension = aLocalExtension2('pub.a', { main: 'main.js', extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: 'vscode-remote' }) });
        const target = aLocalExtension2('pub.b', { main: 'main.js', extensionDependencies: ['pub.a'] }, { location: URI.file(`pub.b`).with({ scheme: 'vscode-remote' }) });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        installed.push(localUIExtension, remoteUIExtension, target);
        await testObject.setEnablement([target, localUIExtension], 9 /* EnablementState.DisabledGlobally */);
        await testObject.setEnablement([target], 11 /* EnablementState.EnabledGlobally */);
        assert.ok(testObject.isEnabled(target));
        assert.ok(testObject.isEnabled(localUIExtension));
        assert.strictEqual(testObject.getEnablementState(target), 11 /* EnablementState.EnabledGlobally */);
        assert.strictEqual(testObject.getEnablementState(localUIExtension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test canChangeEnablement return false when extension is disabled in virtual workspace', () => {
        const extension = aLocalExtension2('pub.a', { capabilities: { virtualWorkspaces: false } });
        instantiationService.stub(IWorkspaceContextService, 'getWorkspace', { folders: [{ uri: URI.file('worskapceA').with(({ scheme: 'virtual' })) }] });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(!testObject.canChangeEnablement(extension));
    });
    test('test extension does not support vitrual workspace is enabled in normal workspace', async () => {
        const extension = aLocalExtension2('pub.a', { capabilities: { virtualWorkspaces: false } });
        instantiationService.stub(IWorkspaceContextService, 'getWorkspace', { folders: [{ uri: URI.file('worskapceA') }] });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(testObject.isEnabled(extension));
        assert.deepStrictEqual(testObject.getEnablementState(extension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test extension supports virtual workspace is enabled in virtual workspace', async () => {
        const extension = aLocalExtension2('pub.a', { capabilities: { virtualWorkspaces: true } });
        instantiationService.stub(IWorkspaceContextService, 'getWorkspace', { folders: [{ uri: URI.file('worskapceA').with(({ scheme: 'virtual' })) }] });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(testObject.isEnabled(extension));
        assert.deepStrictEqual(testObject.getEnablementState(extension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test extension does not support untrusted workspaces is disabled in untrusted workspace', () => {
        const extension = aLocalExtension2('pub.a', { main: 'main.js', capabilities: { untrustedWorkspaces: { supported: false, description: 'hello' } } });
        instantiationService.stub(IWorkspaceTrustManagementService, { isWorkspaceTrusted() { return false; } });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.getEnablementState(extension), 0 /* EnablementState.DisabledByTrustRequirement */);
    });
    test('test canChangeEnablement return true when extension is disabled by workspace trust', () => {
        const extension = aLocalExtension2('pub.a', { main: 'main.js', capabilities: { untrustedWorkspaces: { supported: false, description: 'hello' } } });
        instantiationService.stub(IWorkspaceTrustManagementService, { isWorkspaceTrusted() { return false; } });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(testObject.canChangeEnablement(extension));
    });
    test('test extension supports untrusted workspaces is enabled in untrusted workspace', () => {
        const extension = aLocalExtension2('pub.a', { main: 'main.js', capabilities: { untrustedWorkspaces: { supported: true } } });
        instantiationService.stub(IWorkspaceTrustManagementService, { isWorkspaceTrusted() { return false; } });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.getEnablementState(extension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test extension does not support untrusted workspaces is enabled in trusted workspace', () => {
        const extension = aLocalExtension2('pub.a', { main: 'main.js', capabilities: { untrustedWorkspaces: { supported: false, description: '' } } });
        instantiationService.stub(IWorkspaceTrustManagementService, { isWorkspaceTrusted() { return true; } });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.getEnablementState(extension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test extension supports untrusted workspaces is enabled in trusted workspace', () => {
        const extension = aLocalExtension2('pub.a', { main: 'main.js', capabilities: { untrustedWorkspaces: { supported: true } } });
        instantiationService.stub(IWorkspaceTrustManagementService, { isWorkspaceTrusted() { return true; } });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.getEnablementState(extension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test extension without any value for virtual worksapce is enabled in virtual workspace', async () => {
        const extension = aLocalExtension2('pub.a');
        instantiationService.stub(IWorkspaceContextService, 'getWorkspace', { folders: [{ uri: URI.file('worskapceA').with(({ scheme: 'virtual' })) }] });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(testObject.isEnabled(extension));
        assert.deepStrictEqual(testObject.getEnablementState(extension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test local workspace extension is disabled by kind', async () => {
        instantiationService.stub(IExtensionManagementServerService, aMultiExtensionManagementServerService(instantiationService));
        const localWorkspaceExtension = aLocalExtension2('pub.a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`) });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(!testObject.isEnabled(localWorkspaceExtension));
        assert.deepStrictEqual(testObject.getEnablementState(localWorkspaceExtension), 1 /* EnablementState.DisabledByExtensionKind */);
    });
    test('test local workspace + ui extension is enabled by kind', async () => {
        instantiationService.stub(IExtensionManagementServerService, aMultiExtensionManagementServerService(instantiationService));
        const localWorkspaceExtension = aLocalExtension2('pub.a', { extensionKind: ['workspace', 'ui'] }, { location: URI.file(`pub.a`) });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(testObject.isEnabled(localWorkspaceExtension));
        assert.deepStrictEqual(testObject.getEnablementState(localWorkspaceExtension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test local ui extension is not disabled by kind', async () => {
        instantiationService.stub(IExtensionManagementServerService, aMultiExtensionManagementServerService(instantiationService));
        const localWorkspaceExtension = aLocalExtension2('pub.a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`) });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(testObject.isEnabled(localWorkspaceExtension));
        assert.deepStrictEqual(testObject.getEnablementState(localWorkspaceExtension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test canChangeEnablement return true when the local workspace extension is disabled by kind', () => {
        instantiationService.stub(IExtensionManagementServerService, aMultiExtensionManagementServerService(instantiationService));
        const localWorkspaceExtension = aLocalExtension2('pub.a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`) });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.canChangeEnablement(localWorkspaceExtension), false);
    });
    test('test canChangeEnablement return true for local ui extension', () => {
        instantiationService.stub(IExtensionManagementServerService, aMultiExtensionManagementServerService(instantiationService));
        const localWorkspaceExtension = aLocalExtension2('pub.a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`) });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.canChangeEnablement(localWorkspaceExtension), true);
    });
    test('test remote ui extension is disabled by kind', async () => {
        instantiationService.stub(IExtensionManagementServerService, aMultiExtensionManagementServerService(instantiationService));
        const localWorkspaceExtension = aLocalExtension2('pub.a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(!testObject.isEnabled(localWorkspaceExtension));
        assert.deepStrictEqual(testObject.getEnablementState(localWorkspaceExtension), 1 /* EnablementState.DisabledByExtensionKind */);
    });
    test('test remote ui+workspace extension is disabled by kind', async () => {
        instantiationService.stub(IExtensionManagementServerService, aMultiExtensionManagementServerService(instantiationService));
        const localWorkspaceExtension = aLocalExtension2('pub.a', { extensionKind: ['ui', 'workspace'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(testObject.isEnabled(localWorkspaceExtension));
        assert.deepStrictEqual(testObject.getEnablementState(localWorkspaceExtension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test remote ui extension is disabled by kind when there is no local server', async () => {
        instantiationService.stub(IExtensionManagementServerService, anExtensionManagementServerService(null, anExtensionManagementServer('vscode-remote', instantiationService), null));
        const localWorkspaceExtension = aLocalExtension2('pub.a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(!testObject.isEnabled(localWorkspaceExtension));
        assert.deepStrictEqual(testObject.getEnablementState(localWorkspaceExtension), 1 /* EnablementState.DisabledByExtensionKind */);
    });
    test('test remote workspace extension is not disabled by kind', async () => {
        instantiationService.stub(IExtensionManagementServerService, aMultiExtensionManagementServerService(instantiationService));
        const localWorkspaceExtension = aLocalExtension2('pub.a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(testObject.isEnabled(localWorkspaceExtension));
        assert.deepStrictEqual(testObject.getEnablementState(localWorkspaceExtension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test canChangeEnablement return true when the remote ui extension is disabled by kind', () => {
        instantiationService.stub(IExtensionManagementServerService, aMultiExtensionManagementServerService(instantiationService));
        const localWorkspaceExtension = aLocalExtension2('pub.a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.canChangeEnablement(localWorkspaceExtension), false);
    });
    test('test canChangeEnablement return true for remote workspace extension', () => {
        instantiationService.stub(IExtensionManagementServerService, aMultiExtensionManagementServerService(instantiationService));
        const localWorkspaceExtension = aLocalExtension2('pub.a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.canChangeEnablement(localWorkspaceExtension), true);
    });
    test('test web extension on local server is disabled by kind when web worker is not enabled', async () => {
        instantiationService.stub(IExtensionManagementServerService, aMultiExtensionManagementServerService(instantiationService));
        const localWorkspaceExtension = aLocalExtension2('pub.a', { browser: 'browser.js' }, { location: URI.file(`pub.a`) });
        instantiationService.get(IConfigurationService).setUserConfiguration('extensions', { webWorker: false });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.isEnabled(localWorkspaceExtension), false);
        assert.deepStrictEqual(testObject.getEnablementState(localWorkspaceExtension), 1 /* EnablementState.DisabledByExtensionKind */);
    });
    test('test web extension on local server is not disabled by kind when web worker is enabled', async () => {
        instantiationService.stub(IExtensionManagementServerService, aMultiExtensionManagementServerService(instantiationService));
        const localWorkspaceExtension = aLocalExtension2('pub.a', { browser: 'browser.js' }, { location: URI.file(`pub.a`) });
        instantiationService.get(IConfigurationService).setUserConfiguration('extensions', { webWorker: true });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.isEnabled(localWorkspaceExtension), true);
        assert.deepStrictEqual(testObject.getEnablementState(localWorkspaceExtension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test web extension on remote server is disabled by kind when web worker is not enabled', async () => {
        instantiationService.stub(IExtensionManagementServerService, anExtensionManagementServerService(anExtensionManagementServer('vscode-local', instantiationService), anExtensionManagementServer('vscode-remote', instantiationService), null));
        const localWorkspaceExtension = aLocalExtension2('pub.a', { browser: 'browser.js' }, { location: URI.file(`pub.a`).with({ scheme: 'vscode-remote' }) });
        instantiationService.get(IConfigurationService).setUserConfiguration('extensions', { webWorker: false });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.isEnabled(localWorkspaceExtension), false);
        assert.deepStrictEqual(testObject.getEnablementState(localWorkspaceExtension), 1 /* EnablementState.DisabledByExtensionKind */);
    });
    test('test web extension on remote server is disabled by kind when web worker is enabled', async () => {
        instantiationService.stub(IExtensionManagementServerService, anExtensionManagementServerService(anExtensionManagementServer('vscode-local', instantiationService), anExtensionManagementServer('vscode-remote', instantiationService), null));
        const localWorkspaceExtension = aLocalExtension2('pub.a', { browser: 'browser.js' }, { location: URI.file(`pub.a`).with({ scheme: 'vscode-remote' }) });
        instantiationService.get(IConfigurationService).setUserConfiguration('extensions', { webWorker: true });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.isEnabled(localWorkspaceExtension), false);
        assert.deepStrictEqual(testObject.getEnablementState(localWorkspaceExtension), 1 /* EnablementState.DisabledByExtensionKind */);
    });
    test('test web extension on remote server is enabled in web', async () => {
        instantiationService.stub(IExtensionManagementServerService, anExtensionManagementServerService(anExtensionManagementServer('vscode-local', instantiationService), anExtensionManagementServer('vscode-remote', instantiationService), anExtensionManagementServer('web', instantiationService)));
        const localWorkspaceExtension = aLocalExtension2('pub.a', { browser: 'browser.js' }, { location: URI.file(`pub.a`).with({ scheme: 'vscode-remote' }) });
        instantiationService.get(IConfigurationService).setUserConfiguration('extensions', { webWorker: false });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.isEnabled(localWorkspaceExtension), true);
        assert.deepStrictEqual(testObject.getEnablementState(localWorkspaceExtension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test web extension on web server is not disabled by kind', async () => {
        instantiationService.stub(IExtensionManagementServerService, anExtensionManagementServerService(anExtensionManagementServer('vscode-local', instantiationService), anExtensionManagementServer('vscode-remote', instantiationService), anExtensionManagementServer('web', instantiationService)));
        const webExtension = aLocalExtension2('pub.a', { browser: 'browser.js' }, { location: URI.file(`pub.a`).with({ scheme: 'web' }) });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.isEnabled(webExtension), true);
        assert.deepStrictEqual(testObject.getEnablementState(webExtension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test state of multipe extensions', async () => {
        installed.push(...[aLocalExtension('pub.a'), aLocalExtension('pub.b'), aLocalExtension('pub.c'), aLocalExtension('pub.d'), aLocalExtension('pub.e')]);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        await testObject.setEnablement([installed[0]], 9 /* EnablementState.DisabledGlobally */);
        await testObject.setEnablement([installed[1]], 10 /* EnablementState.DisabledWorkspace */);
        await testObject.setEnablement([installed[2]], 12 /* EnablementState.EnabledWorkspace */);
        await testObject.setEnablement([installed[3]], 11 /* EnablementState.EnabledGlobally */);
        assert.deepStrictEqual(testObject.getEnablementStates(installed), [9 /* EnablementState.DisabledGlobally */, 10 /* EnablementState.DisabledWorkspace */, 12 /* EnablementState.EnabledWorkspace */, 11 /* EnablementState.EnabledGlobally */, 11 /* EnablementState.EnabledGlobally */]);
    });
    test('test extension is disabled by dependency if it has a dependency that is disabled', async () => {
        installed.push(...[aLocalExtension2('pub.a'), aLocalExtension2('pub.b', { extensionDependencies: ['pub.a'] })]);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        await testObject.setEnablement([installed[0]], 9 /* EnablementState.DisabledGlobally */);
        assert.strictEqual(testObject.getEnablementState(installed[1]), 8 /* EnablementState.DisabledByExtensionDependency */);
    });
    test('test extension is disabled by dependency if it has a dependency that is disabled by virtual workspace', async () => {
        installed.push(...[aLocalExtension2('pub.a', { capabilities: { virtualWorkspaces: false } }), aLocalExtension2('pub.b', { extensionDependencies: ['pub.a'], capabilities: { virtualWorkspaces: true } })]);
        instantiationService.stub(IWorkspaceContextService, 'getWorkspace', { folders: [{ uri: URI.file('worskapceA').with(({ scheme: 'virtual' })) }] });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        assert.strictEqual(testObject.getEnablementState(installed[0]), 5 /* EnablementState.DisabledByVirtualWorkspace */);
        assert.strictEqual(testObject.getEnablementState(installed[1]), 8 /* EnablementState.DisabledByExtensionDependency */);
    });
    test('test canChangeEnablement return false when extension is disabled by dependency if it has a dependency that is disabled by virtual workspace', async () => {
        installed.push(...[aLocalExtension2('pub.a', { capabilities: { virtualWorkspaces: false } }), aLocalExtension2('pub.b', { extensionDependencies: ['pub.a'], capabilities: { virtualWorkspaces: true } })]);
        instantiationService.stub(IWorkspaceContextService, 'getWorkspace', { folders: [{ uri: URI.file('worskapceA').with(({ scheme: 'virtual' })) }] });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        assert.ok(!testObject.canChangeEnablement(installed[1]));
    });
    test('test extension is disabled by dependency if it has a dependency that is disabled by workspace trust', async () => {
        installed.push(...[aLocalExtension2('pub.a', { main: 'hello.js', capabilities: { untrustedWorkspaces: { supported: false, description: '' } } }), aLocalExtension2('pub.b', { extensionDependencies: ['pub.a'], capabilities: { untrustedWorkspaces: { supported: true } } })]);
        instantiationService.stub(IWorkspaceTrustManagementService, { isWorkspaceTrusted() { return false; } });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        assert.strictEqual(testObject.getEnablementState(installed[0]), 0 /* EnablementState.DisabledByTrustRequirement */);
        assert.strictEqual(testObject.getEnablementState(installed[1]), 8 /* EnablementState.DisabledByExtensionDependency */);
    });
    test('test extension is not disabled by dependency if it has a dependency that is disabled by extension kind', async () => {
        instantiationService.stub(IExtensionManagementServerService, anExtensionManagementServerService(anExtensionManagementServer('vscode-local', instantiationService), anExtensionManagementServer('vscode-remote', instantiationService), null));
        const localUIExtension = aLocalExtension2('pub.a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`) });
        const remoteUIExtension = aLocalExtension2('pub.a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const remoteWorkspaceExtension = aLocalExtension2('pub.n', { extensionKind: ['workspace'], extensionDependencies: ['pub.a'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        installed.push(localUIExtension, remoteUIExtension, remoteWorkspaceExtension);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        assert.strictEqual(testObject.getEnablementState(localUIExtension), 11 /* EnablementState.EnabledGlobally */);
        assert.strictEqual(testObject.getEnablementState(remoteUIExtension), 1 /* EnablementState.DisabledByExtensionKind */);
        assert.strictEqual(testObject.getEnablementState(remoteWorkspaceExtension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test canChangeEnablement return false when extension is disabled by dependency if it has a dependency that is disabled by workspace trust', async () => {
        installed.push(...[aLocalExtension2('pub.a', { main: 'hello.js', capabilities: { untrustedWorkspaces: { supported: false, description: '' } } }), aLocalExtension2('pub.b', { extensionDependencies: ['pub.a'], capabilities: { untrustedWorkspaces: { supported: true } } })]);
        instantiationService.stub(IWorkspaceTrustManagementService, { isWorkspaceTrusted() { return false; } });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        assert.deepEqual(testObject.canChangeEnablement(installed[1]), false);
    });
    test('test canChangeEnablement return false when extension is disabled by dependency if it has a dependency that is disabled globally', async () => {
        installed.push(...[aLocalExtension2('pub.a', {}), aLocalExtension2('pub.b', { extensionDependencies: ['pub.a'] })]);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        await testObject.setEnablement([installed[0]], 9 /* EnablementState.DisabledGlobally */);
        assert.deepEqual(testObject.canChangeEnablement(installed[1]), false);
    });
    test('test canChangeEnablement return false when extension is disabled by dependency if it has a dependency that is disabled workspace', async () => {
        installed.push(...[aLocalExtension2('pub.a', {}), aLocalExtension2('pub.b', { extensionDependencies: ['pub.a'] })]);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        await testObject.setEnablement([installed[0]], 10 /* EnablementState.DisabledWorkspace */);
        assert.deepEqual(testObject.canChangeEnablement(installed[1]), false);
    });
    test('test extension is not disabled by dependency even if it has a dependency that is disabled when installed extensions are not set', async () => {
        await testObject.setEnablement([aLocalExtension2('pub.a')], 9 /* EnablementState.DisabledGlobally */);
        assert.strictEqual(testObject.getEnablementState(aLocalExtension2('pub.b', { extensionDependencies: ['pub.a'] })), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test extension is disabled by dependency if it has a dependency that is disabled when all extensions are passed', async () => {
        installed.push(...[aLocalExtension2('pub.a'), aLocalExtension2('pub.b', { extensionDependencies: ['pub.a'] })]);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        await testObject.setEnablement([installed[0]], 9 /* EnablementState.DisabledGlobally */);
        assert.deepStrictEqual(testObject.getEnablementStates(installed), [9 /* EnablementState.DisabledGlobally */, 8 /* EnablementState.DisabledByExtensionDependency */]);
    });
    test('test extension is not disabled when it has a missing dependency', async () => {
        const target = aLocalExtension2('pub.b', { extensionDependencies: ['pub.a'] });
        installed.push(target);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        assert.strictEqual(testObject.getEnablementState(target), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test extension is not disabled when it has a dependency in another server', async () => {
        instantiationService.stub(IExtensionManagementServerService, aMultiExtensionManagementServerService(instantiationService));
        const target = aLocalExtension2('pub.a', { extensionDependencies: ['pub.b'], extensionKind: ['ui'] }, { location: URI.file(`pub.a`) });
        const depdencyOnAnotherServer = aLocalExtension2('pub.b', {}, { location: URI.file(`pub.b`).with({ scheme: Schemas.vscodeRemote }) });
        installed.push(...[target, depdencyOnAnotherServer]);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        assert.strictEqual(testObject.getEnablementState(target), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test extension is enabled when it has a dependency in another server which is disabled', async () => {
        instantiationService.stub(IExtensionManagementServerService, aMultiExtensionManagementServerService(instantiationService));
        const target = aLocalExtension2('pub.a', { extensionDependencies: ['pub.b'], extensionKind: ['ui'] }, { location: URI.file(`pub.a`) });
        const depdencyOnAnotherServer = aLocalExtension2('pub.b', {}, { location: URI.file(`pub.b`).with({ scheme: Schemas.vscodeRemote }) });
        installed.push(...[target, depdencyOnAnotherServer]);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        await testObject.setEnablement([depdencyOnAnotherServer], 9 /* EnablementState.DisabledGlobally */);
        assert.strictEqual(testObject.getEnablementState(target), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test extension is enabled when it has a dependency in another server which is disabled and with no exports and no main and no browser entrypoints', async () => {
        instantiationService.stub(IExtensionManagementServerService, aMultiExtensionManagementServerService(instantiationService));
        const target = aLocalExtension2('pub.a', { extensionDependencies: ['pub.b'], extensionKind: ['ui'] }, { location: URI.file(`pub.a`) });
        const depdencyOnAnotherServer = aLocalExtension2('pub.b', { api: 'none' }, { location: URI.file(`pub.b`).with({ scheme: Schemas.vscodeRemote }) });
        installed.push(...[target, depdencyOnAnotherServer]);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        await testObject.setEnablement([depdencyOnAnotherServer], 9 /* EnablementState.DisabledGlobally */);
        assert.strictEqual(testObject.getEnablementState(target), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test extension is disabled by dependency when it has a dependency in another server  which is disabled and with no exports and has main entry point', async () => {
        instantiationService.stub(IExtensionManagementServerService, aMultiExtensionManagementServerService(instantiationService));
        const target = aLocalExtension2('pub.a', { extensionDependencies: ['pub.b'], extensionKind: ['ui'] }, { location: URI.file(`pub.a`) });
        const depdencyOnAnotherServer = aLocalExtension2('pub.b', { api: 'none', main: 'main.js' }, { location: URI.file(`pub.b`).with({ scheme: Schemas.vscodeRemote }) });
        installed.push(...[target, depdencyOnAnotherServer]);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        await testObject.setEnablement([depdencyOnAnotherServer], 9 /* EnablementState.DisabledGlobally */);
        assert.strictEqual(testObject.getEnablementState(target), 8 /* EnablementState.DisabledByExtensionDependency */);
    });
    test('test extension is disabled by dependency when it has a dependency in another server  which is disabled and with no exports and has browser entry point', async () => {
        instantiationService.stub(IExtensionManagementServerService, aMultiExtensionManagementServerService(instantiationService));
        const target = aLocalExtension2('pub.a', { extensionDependencies: ['pub.b'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const depdencyOnAnotherServer = aLocalExtension2('pub.b', { api: 'none', browser: 'browser.js', extensionKind: 'ui' }, { location: URI.file(`pub.b`) });
        installed.push(...[target, depdencyOnAnotherServer]);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        await testObject.setEnablement([depdencyOnAnotherServer], 9 /* EnablementState.DisabledGlobally */);
        assert.strictEqual(testObject.getEnablementState(target), 8 /* EnablementState.DisabledByExtensionDependency */);
    });
    test('test extension is disabled by invalidity', async () => {
        const target = aLocalExtension2('pub.b', {}, { isValid: false });
        assert.strictEqual(testObject.getEnablementState(target), 6 /* EnablementState.DisabledByInvalidExtension */);
    });
    test('test extension is disabled by dependency when it has a dependency that is invalid', async () => {
        const target = aLocalExtension2('pub.b', { extensionDependencies: ['pub.a'] });
        installed.push(...[target, aLocalExtension2('pub.a', {}, { isValid: false })]);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        assert.strictEqual(testObject.getEnablementState(target), 8 /* EnablementState.DisabledByExtensionDependency */);
    });
    test('test extension is enabled when its dependency becomes valid', async () => {
        const extension = aLocalExtension2('pub.b', { extensionDependencies: ['pub.a'] });
        installed.push(...[extension, aLocalExtension2('pub.a', {}, { isValid: false })]);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        assert.strictEqual(testObject.getEnablementState(extension), 8 /* EnablementState.DisabledByExtensionDependency */);
        const target = sinon.spy();
        disposableStore.add(testObject.onEnablementChanged(target));
        const validExtension = aLocalExtension2('pub.a');
        didInstallEvent.fire([{
                identifier: validExtension.identifier,
                operation: 2 /* InstallOperation.Install */,
                source: validExtension.location,
                profileLocation: validExtension.location,
                local: validExtension,
            }]);
        assert.strictEqual(testObject.getEnablementState(extension), 11 /* EnablementState.EnabledGlobally */);
        assert.deepStrictEqual(target.args[0][0][0].identifier, { id: 'pub.b' });
    });
    test('test override workspace to trusted when getting extensions enablements', async () => {
        const extension = aLocalExtension2('pub.a', { main: 'main.js', capabilities: { untrustedWorkspaces: { supported: false, description: 'hello' } } });
        instantiationService.stub(IWorkspaceTrustManagementService, { isWorkspaceTrusted() { return false; } });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.getEnablementStates([extension], { trusted: true })[0], 11 /* EnablementState.EnabledGlobally */);
    });
    test('test override workspace to not trusted when getting extensions enablements', async () => {
        const extension = aLocalExtension2('pub.a', { main: 'main.js', capabilities: { untrustedWorkspaces: { supported: false, description: 'hello' } } });
        instantiationService.stub(IWorkspaceTrustManagementService, { isWorkspaceTrusted() { return true; } });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.getEnablementStates([extension], { trusted: false })[0], 0 /* EnablementState.DisabledByTrustRequirement */);
    });
    test('test update extensions enablements on trust change triggers change events for extensions depending on workspace trust', async () => {
        installed.push(...[
            aLocalExtension2('pub.a', { main: 'main.js', capabilities: { untrustedWorkspaces: { supported: false, description: 'hello' } } }),
            aLocalExtension2('pub.b', { main: 'main.js', capabilities: { untrustedWorkspaces: { supported: true } } }),
            aLocalExtension2('pub.c', { main: 'main.js', capabilities: { untrustedWorkspaces: { supported: false, description: 'hello' } } }),
            aLocalExtension2('pub.d', { main: 'main.js', capabilities: { untrustedWorkspaces: { supported: true } } }),
        ]);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        const target = sinon.spy();
        disposableStore.add(testObject.onEnablementChanged(target));
        await testObject.updateExtensionsEnablementsWhenWorkspaceTrustChanges();
        assert.strictEqual(target.args[0][0].length, 2);
        assert.deepStrictEqual(target.args[0][0][0].identifier, { id: 'pub.a' });
        assert.deepStrictEqual(target.args[0][0][1].identifier, { id: 'pub.c' });
    });
    test('test adding an extension that was disabled', async () => {
        const extension = aLocalExtension('pub.a');
        installed.push(extension);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.setEnablement([extension], 9 /* EnablementState.DisabledGlobally */);
        const target = sinon.spy();
        disposableStore.add(testObject.onEnablementChanged(target));
        didChangeProfileExtensionsEvent.fire({ added: [extension], removed: [] });
        assert.ok(!testObject.isEnabled(extension));
        assert.strictEqual(testObject.getEnablementState(extension), 9 /* EnablementState.DisabledGlobally */);
        assert.strictEqual(target.args[0][0].length, 1);
        assert.deepStrictEqual(target.args[0][0][0].identifier, { id: 'pub.a' });
    });
    test('test extension is disabled by allowed list', async () => {
        const target = aLocalExtension2('unallowed.extension');
        assert.strictEqual(testObject.getEnablementState(target), 7 /* EnablementState.DisabledByAllowlist */);
    });
    test('test extension is disabled by malicious', async () => {
        malicious.push({ id: 'malicious.extensionA' });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        const target = aLocalExtension2('malicious.extensionA');
        assert.strictEqual(testObject.getEnablementState(target), 4 /* EnablementState.DisabledByMalicious */);
    });
    test('test installed malicious extension triggers change event', async () => {
        testObject.dispose();
        malicious.push({ id: 'malicious.extensionB' });
        const local = aLocalExtension2('malicious.extensionB');
        installed.push(local);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.getEnablementState(local), 11 /* EnablementState.EnabledGlobally */);
        const promise = Event.toPromise(testObject.onEnablementChanged);
        const result = await promise;
        assert.deepStrictEqual(result[0], local);
        assert.strictEqual(testObject.getEnablementState(local), 4 /* EnablementState.DisabledByMalicious */);
    });
});
function anExtensionManagementServer(authority, instantiationService) {
    return {
        id: authority,
        label: authority,
        extensionManagementService: instantiationService.get(IExtensionManagementService),
    };
}
function aMultiExtensionManagementServerService(instantiationService) {
    const localExtensionManagementServer = anExtensionManagementServer('vscode-local', instantiationService);
    const remoteExtensionManagementServer = anExtensionManagementServer('vscode-remote', instantiationService);
    return anExtensionManagementServerService(localExtensionManagementServer, remoteExtensionManagementServer, null);
}
export function anExtensionManagementServerService(localExtensionManagementServer, remoteExtensionManagementServer, webExtensionManagementServer) {
    return {
        _serviceBrand: undefined,
        localExtensionManagementServer,
        remoteExtensionManagementServer,
        webExtensionManagementServer,
        getExtensionManagementServer: (extension) => {
            if (extension.location.scheme === Schemas.file) {
                return localExtensionManagementServer;
            }
            if (extension.location.scheme === Schemas.vscodeRemote) {
                return remoteExtensionManagementServer;
            }
            return webExtensionManagementServer;
        },
        getExtensionInstallLocation(extension) {
            const server = this.getExtensionManagementServer(extension);
            return server === remoteExtensionManagementServer ? 2 /* ExtensionInstallLocation.Remote */
                : server === webExtensionManagementServer ? 3 /* ExtensionInstallLocation.Web */
                    : 1 /* ExtensionInstallLocation.Local */;
        }
    };
}
function aLocalExtension(id, contributes, type) {
    return aLocalExtension2(id, contributes ? { contributes } : {}, isUndefinedOrNull(type) ? {} : { type });
}
function aLocalExtension2(id, manifest = {}, properties = {}) {
    const [publisher, name] = id.split('.');
    manifest = { name, publisher, ...manifest };
    properties = {
        identifier: { id },
        location: URI.file(`pub.${name}`),
        galleryIdentifier: { id, uuid: undefined },
        type: 1 /* ExtensionType.User */,
        ...properties,
        isValid: properties.isValid ?? true,
    };
    properties.isBuiltin = properties.type === 0 /* ExtensionType.System */;
    return Object.create({ manifest, ...properties });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRW5hYmxlbWVudFNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9uTWFuYWdlbWVudC90ZXN0L2Jyb3dzZXIvZXh0ZW5zaW9uRW5hYmxlbWVudFNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUM7QUFDL0IsT0FBTyxFQUFFLDJCQUEyQixFQUFxSyx5QkFBeUIsRUFBRSwwQkFBMEIsRUFBOEIsTUFBTSwyRUFBMkUsQ0FBQztBQUM5VyxPQUFPLEVBQW1CLGlDQUFpQyxFQUE4QixvQ0FBb0MsRUFBNEYsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyUSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN6RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUN6SCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBYyx3QkFBd0IsRUFBa0IsTUFBTSx1REFBdUQsQ0FBQztBQUM3SCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsZUFBZSxFQUFFLHNCQUFzQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFNUcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDbEgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7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