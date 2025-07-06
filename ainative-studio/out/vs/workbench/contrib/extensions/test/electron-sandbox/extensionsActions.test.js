/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { IExtensionsWorkbenchService, ExtensionContainers } from '../../common/extensions.js';
import * as ExtensionsActions from '../../browser/extensionsActions.js';
import { ExtensionsWorkbenchService } from '../../browser/extensionsWorkbenchService.js';
import { IExtensionManagementService, IExtensionGalleryService, IExtensionTipsService, getTargetPlatform } from '../../../../../platform/extensionManagement/common/extensionManagement.js';
import { IWorkbenchExtensionEnablementService, IExtensionManagementServerService, IWorkbenchExtensionManagementService } from '../../../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionRecommendationsService } from '../../../../services/extensionRecommendations/common/extensionRecommendations.js';
import { getGalleryExtensionId } from '../../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { TestExtensionEnablementService } from '../../../../services/extensionManagement/test/browser/extensionEnablementService.test.js';
import { ExtensionGalleryService } from '../../../../../platform/extensionManagement/common/extensionGalleryService.js';
import { IURLService } from '../../../../../platform/url/common/url.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { IExtensionService, toExtensionDescription } from '../../../../services/extensions/common/extensions.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { TestContextService, TestWorkspaceTrustManagementService } from '../../../../test/common/workbenchTestServices.js';
import { TestExtensionTipsService, TestSharedProcessService } from '../../../../test/electron-sandbox/workbenchTestServices.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { NativeURLService } from '../../../../../platform/url/common/urlService.js';
import { URI } from '../../../../../base/common/uri.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IRemoteAgentService } from '../../../../services/remote/common/remoteAgentService.js';
import { RemoteAgentService } from '../../../../services/remote/electron-sandbox/remoteAgentService.js';
import { ISharedProcessService } from '../../../../../platform/ipc/electron-sandbox/services.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { Schemas } from '../../../../../base/common/network.js';
import { IProgressService } from '../../../../../platform/progress/common/progress.js';
import { ProgressService } from '../../../../services/progress/browser/progressService.js';
import { ILifecycleService } from '../../../../services/lifecycle/common/lifecycle.js';
import { TestEnvironmentService, TestLifecycleService } from '../../../../test/browser/workbenchTestServices.js';
import { INativeWorkbenchEnvironmentService } from '../../../../services/environment/electron-sandbox/environmentService.js';
import { IWorkbenchEnvironmentService } from '../../../../services/environment/common/environmentService.js';
import { IUserDataSyncEnablementService } from '../../../../../platform/userDataSync/common/userDataSync.js';
import { UserDataSyncEnablementService } from '../../../../../platform/userDataSync/common/userDataSyncEnablementService.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { IWorkspaceTrustManagementService } from '../../../../../platform/workspace/common/workspaceTrust.js';
import { IEnvironmentService, INativeEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { platform } from '../../../../../base/common/platform.js';
import { arch } from '../../../../../base/common/process.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IUpdateService, State } from '../../../../../platform/update/common/update.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { IUserDataProfileService } from '../../../../services/userDataProfile/common/userDataProfile.js';
import { UserDataProfileService } from '../../../../services/userDataProfile/common/userDataProfileService.js';
import { toUserDataProfile } from '../../../../../platform/userDataProfile/common/userDataProfile.js';
let instantiationService;
let installEvent, didInstallEvent, uninstallEvent, didUninstallEvent;
function setupTest(disposables) {
    installEvent = disposables.add(new Emitter());
    didInstallEvent = disposables.add(new Emitter());
    uninstallEvent = disposables.add(new Emitter());
    didUninstallEvent = disposables.add(new Emitter());
    instantiationService = disposables.add(new TestInstantiationService());
    instantiationService.stub(IEnvironmentService, TestEnvironmentService);
    instantiationService.stub(IWorkbenchEnvironmentService, TestEnvironmentService);
    instantiationService.stub(ITelemetryService, NullTelemetryService);
    instantiationService.stub(ILogService, NullLogService);
    instantiationService.stub(IWorkspaceContextService, new TestContextService());
    instantiationService.stub(IFileService, disposables.add(new FileService(new NullLogService())));
    instantiationService.stub(IConfigurationService, new TestConfigurationService());
    instantiationService.stub(IProgressService, ProgressService);
    instantiationService.stub(IProductService, {});
    instantiationService.stub(IContextKeyService, new MockContextKeyService());
    instantiationService.stub(IExtensionGalleryService, ExtensionGalleryService);
    instantiationService.stub(ISharedProcessService, TestSharedProcessService);
    instantiationService.stub(IWorkbenchExtensionManagementService, {
        onDidInstallExtensions: didInstallEvent.event,
        onInstallExtension: installEvent.event,
        onUninstallExtension: uninstallEvent.event,
        onDidUninstallExtension: didUninstallEvent.event,
        onDidUpdateExtensionMetadata: Event.None,
        onDidChangeProfile: Event.None,
        onProfileAwareDidInstallExtensions: Event.None,
        async getInstalled() { return []; },
        async getInstalledWorkspaceExtensions() { return []; },
        async getExtensionsControlManifest() { return { malicious: [], deprecated: {}, search: [], publisherMapping: {} }; },
        async updateMetadata(local, metadata) {
            local.identifier.uuid = metadata.id;
            local.publisherDisplayName = metadata.publisherDisplayName;
            local.publisherId = metadata.publisherId;
            return local;
        },
        async canInstall() { return true; },
        async getTargetPlatform() { return getTargetPlatform(platform, arch); },
    });
    instantiationService.stub(IRemoteAgentService, RemoteAgentService);
    const localExtensionManagementServer = { extensionManagementService: instantiationService.get(IExtensionManagementService), label: 'local', id: 'vscode-local' };
    instantiationService.stub(IExtensionManagementServerService, {
        get localExtensionManagementServer() {
            return localExtensionManagementServer;
        },
        getExtensionManagementServer(extension) {
            if (extension.location.scheme === Schemas.file) {
                return localExtensionManagementServer;
            }
            throw new Error(`Invalid Extension ${extension.location}`);
        }
    });
    instantiationService.stub(IUserDataProfileService, disposables.add(new UserDataProfileService(toUserDataProfile('test', 'test', URI.file('foo'), URI.file('cache')))));
    instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
    instantiationService.stub(ILabelService, { onDidChangeFormatters: disposables.add(new Emitter()).event });
    instantiationService.stub(ILifecycleService, disposables.add(new TestLifecycleService()));
    instantiationService.stub(IExtensionTipsService, disposables.add(instantiationService.createInstance(TestExtensionTipsService)));
    instantiationService.stub(IExtensionRecommendationsService, {});
    instantiationService.stub(IURLService, NativeURLService);
    instantiationService.stub(IExtensionGalleryService, 'isEnabled', true);
    instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage());
    instantiationService.stubPromise(IExtensionGalleryService, 'getExtensions', []);
    instantiationService.stub(IExtensionService, { extensions: [], onDidChangeExtensions: Event.None, canAddExtension: (extension) => false, canRemoveExtension: (extension) => false, whenInstalledExtensionsRegistered: () => Promise.resolve(true) });
    instantiationService.get(IWorkbenchExtensionEnablementService).reset();
    instantiationService.stub(IUserDataSyncEnablementService, disposables.add(instantiationService.createInstance(UserDataSyncEnablementService)));
    instantiationService.stub(IUpdateService, { onStateChange: Event.None, state: State.Uninitialized });
    instantiationService.set(IExtensionsWorkbenchService, disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService)));
    instantiationService.stub(IWorkspaceTrustManagementService, disposables.add(new TestWorkspaceTrustManagementService()));
}
suite('ExtensionsActions', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => setupTest(disposables));
    test('Install action is disabled when there is no extension', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.InstallAction, { installPreReleaseVersion: false }));
        assert.ok(!testObject.enabled);
    });
    test('Test Install action when state is installed', () => {
        const workbenchService = instantiationService.get(IExtensionsWorkbenchService);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.InstallAction, { installPreReleaseVersion: false }));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        return workbenchService.queryLocal()
            .then(() => {
            instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: local.identifier })));
            return workbenchService.queryGallery(CancellationToken.None)
                .then((paged) => {
                testObject.extension = paged.firstPage[0];
                assert.ok(!testObject.enabled);
                assert.strictEqual('Install', testObject.label);
                assert.strictEqual('extension-action label prominent install hide', testObject.class);
            });
        });
    });
    test('Test InstallingLabelAction when state is installing', () => {
        const workbenchService = instantiationService.get(IExtensionsWorkbenchService);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.InstallingLabelAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const gallery = aGalleryExtension('a');
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        return workbenchService.queryGallery(CancellationToken.None)
            .then((paged) => {
            testObject.extension = paged.firstPage[0];
            installEvent.fire({ identifier: gallery.identifier, source: gallery, profileLocation: null });
            assert.ok(!testObject.enabled);
            assert.strictEqual('Installing', testObject.label);
            assert.strictEqual('extension-action label install installing', testObject.class);
        });
    });
    test('Test Install action when state is uninstalled', async () => {
        const workbenchService = instantiationService.get(IExtensionsWorkbenchService);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.InstallAction, { installPreReleaseVersion: false }));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const gallery = aGalleryExtension('a');
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        const paged = await workbenchService.queryGallery(CancellationToken.None);
        const promise = Event.toPromise(Event.filter(testObject.onDidChange, e => e.enabled === true));
        testObject.extension = paged.firstPage[0];
        await promise;
        assert.ok(testObject.enabled);
        assert.strictEqual('Install', testObject.label);
    });
    test('Test Install action when extension is system action', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.InstallAction, { installPreReleaseVersion: false }));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a', {}, { type: 0 /* ExtensionType.System */ });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        return instantiationService.get(IExtensionsWorkbenchService).queryLocal()
            .then(extensions => {
            uninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
            didUninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
            testObject.extension = extensions[0];
            assert.ok(!testObject.enabled);
        });
    });
    test('Test Install action when extension doesnot has gallery', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.InstallAction, { installPreReleaseVersion: false }));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        return instantiationService.get(IExtensionsWorkbenchService).queryLocal()
            .then(extensions => {
            uninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
            didUninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
            testObject.extension = extensions[0];
            assert.ok(!testObject.enabled);
        });
    });
    test('Uninstall action is disabled when there is no extension', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.UninstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        assert.ok(!testObject.enabled);
    });
    test('Test Uninstall action when state is uninstalling', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.UninstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        return instantiationService.get(IExtensionsWorkbenchService).queryLocal()
            .then(extensions => {
            testObject.extension = extensions[0];
            uninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
            assert.ok(!testObject.enabled);
            assert.strictEqual('Uninstalling', testObject.label);
            assert.strictEqual('extension-action label uninstall uninstalling', testObject.class);
        });
    });
    test('Test Uninstall action when state is installed and is user extension', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.UninstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        return instantiationService.get(IExtensionsWorkbenchService).queryLocal()
            .then(extensions => {
            testObject.extension = extensions[0];
            assert.ok(testObject.enabled);
            assert.strictEqual('Uninstall', testObject.label);
            assert.strictEqual('extension-action label uninstall', testObject.class);
        });
    });
    test('Test Uninstall action when state is installed and is system extension', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.UninstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a', {}, { type: 0 /* ExtensionType.System */ });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        return instantiationService.get(IExtensionsWorkbenchService).queryLocal()
            .then(extensions => {
            testObject.extension = extensions[0];
            assert.ok(!testObject.enabled);
            assert.strictEqual('Uninstall', testObject.label);
            assert.strictEqual('extension-action label uninstall', testObject.class);
        });
    });
    test('Test Uninstall action when state is installing and is user extension', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.UninstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        return instantiationService.get(IExtensionsWorkbenchService).queryLocal()
            .then(extensions => {
            const gallery = aGalleryExtension('a');
            const extension = extensions[0];
            extension.gallery = gallery;
            installEvent.fire({ identifier: gallery.identifier, source: gallery, profileLocation: null });
            testObject.extension = extension;
            assert.ok(!testObject.enabled);
        });
    });
    test('Test Uninstall action after extension is installed', async () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.UninstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const gallery = aGalleryExtension('a');
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        const paged = await instantiationService.get(IExtensionsWorkbenchService).queryGallery(CancellationToken.None);
        testObject.extension = paged.firstPage[0];
        installEvent.fire({ identifier: gallery.identifier, source: gallery, profileLocation: null });
        const promise = Event.toPromise(testObject.onDidChange);
        didInstallEvent.fire([{ identifier: gallery.identifier, source: gallery, operation: 2 /* InstallOperation.Install */, local: aLocalExtension('a', gallery, gallery), profileLocation: null }]);
        await promise;
        assert.ok(testObject.enabled);
        assert.strictEqual('Uninstall', testObject.label);
        assert.strictEqual('extension-action label uninstall', testObject.class);
    });
    test('Test UpdateAction when there is no extension', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.UpdateAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        assert.ok(!testObject.enabled);
    });
    test('Test UpdateAction when extension is uninstalled', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.UpdateAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const gallery = aGalleryExtension('a', { version: '1.0.0' });
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        return instantiationService.get(IExtensionsWorkbenchService).queryGallery(CancellationToken.None)
            .then((paged) => {
            testObject.extension = paged.firstPage[0];
            assert.ok(!testObject.enabled);
        });
    });
    test('Test UpdateAction when extension is installed and not outdated', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.UpdateAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a', { version: '1.0.0' });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        return instantiationService.get(IExtensionsWorkbenchService).queryLocal()
            .then(extensions => {
            testObject.extension = extensions[0];
            instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: local.identifier, version: local.manifest.version })));
            return instantiationService.get(IExtensionsWorkbenchService).queryGallery(CancellationToken.None)
                .then(extensions => assert.ok(!testObject.enabled));
        });
    });
    test('Test UpdateAction when extension is installed outdated and system extension', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.UpdateAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a', { version: '1.0.0' }, { type: 0 /* ExtensionType.System */ });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        return instantiationService.get(IExtensionsWorkbenchService).queryLocal()
            .then(extensions => {
            testObject.extension = extensions[0];
            instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: local.identifier, version: '1.0.1' })));
            return instantiationService.get(IExtensionsWorkbenchService).queryGallery(CancellationToken.None)
                .then(extensions => assert.ok(!testObject.enabled));
        });
    });
    test('Test UpdateAction when extension is installed outdated and user extension', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.UpdateAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a', { version: '1.0.0' });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        const workbenchService = instantiationService.get(IExtensionsWorkbenchService);
        return workbenchService.queryLocal()
            .then(async (extensions) => {
            testObject.extension = extensions[0];
            const gallery = aGalleryExtension('a', { identifier: local.identifier, version: '1.0.1' });
            instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
            instantiationService.stubPromise(IExtensionGalleryService, 'getCompatibleExtension', gallery);
            instantiationService.stubPromise(IExtensionGalleryService, 'getExtensions', [gallery]);
            assert.ok(!testObject.enabled);
            return new Promise(c => {
                disposables.add(testObject.onDidChange(() => {
                    if (testObject.enabled) {
                        c();
                    }
                }));
                instantiationService.get(IExtensionsWorkbenchService).queryGallery(CancellationToken.None);
            });
        });
    });
    test('Test UpdateAction when extension is installing and outdated and user extension', async () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.UpdateAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a', { version: '1.0.0' });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        const extensions = await instantiationService.get(IExtensionsWorkbenchService).queryLocal();
        testObject.extension = extensions[0];
        const gallery = aGalleryExtension('a', { identifier: local.identifier, version: '1.0.1' });
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        instantiationService.stubPromise(IExtensionGalleryService, 'getCompatibleExtension', gallery);
        instantiationService.stubPromise(IExtensionGalleryService, 'getExtensions', [gallery]);
        await new Promise(c => {
            disposables.add(testObject.onDidChange(() => {
                if (testObject.enabled) {
                    c();
                }
            }));
            instantiationService.get(IExtensionsWorkbenchService).queryGallery(CancellationToken.None);
        });
        await new Promise(c => {
            disposables.add(testObject.onDidChange(() => {
                if (!testObject.enabled) {
                    c();
                }
            }));
            installEvent.fire({ identifier: local.identifier, source: gallery, profileLocation: null });
        });
    });
    test('Test ManageExtensionAction when there is no extension', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ManageExtensionAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        assert.ok(!testObject.enabled);
    });
    test('Test ManageExtensionAction when extension is installed', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ManageExtensionAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        return instantiationService.get(IExtensionsWorkbenchService).queryLocal()
            .then(extensions => {
            testObject.extension = extensions[0];
            assert.ok(testObject.enabled);
            assert.strictEqual('extension-action icon manage codicon codicon-extensions-manage', testObject.class);
            assert.strictEqual('Manage', testObject.tooltip);
        });
    });
    test('Test ManageExtensionAction when extension is uninstalled', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ManageExtensionAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const gallery = aGalleryExtension('a');
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        return instantiationService.get(IExtensionsWorkbenchService).queryGallery(CancellationToken.None)
            .then(page => {
            testObject.extension = page.firstPage[0];
            assert.ok(!testObject.enabled);
            assert.strictEqual('extension-action icon manage codicon codicon-extensions-manage hide', testObject.class);
            assert.strictEqual('Manage', testObject.tooltip);
        });
    });
    test('Test ManageExtensionAction when extension is installing', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ManageExtensionAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const gallery = aGalleryExtension('a');
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        return instantiationService.get(IExtensionsWorkbenchService).queryGallery(CancellationToken.None)
            .then(page => {
            testObject.extension = page.firstPage[0];
            installEvent.fire({ identifier: gallery.identifier, source: gallery, profileLocation: null });
            assert.ok(!testObject.enabled);
            assert.strictEqual('extension-action icon manage codicon codicon-extensions-manage hide', testObject.class);
            assert.strictEqual('Manage', testObject.tooltip);
        });
    });
    test('Test ManageExtensionAction when extension is queried from gallery and installed', async () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ManageExtensionAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const gallery = aGalleryExtension('a');
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        const paged = await instantiationService.get(IExtensionsWorkbenchService).queryGallery(CancellationToken.None);
        testObject.extension = paged.firstPage[0];
        installEvent.fire({ identifier: gallery.identifier, source: gallery, profileLocation: null });
        const promise = Event.toPromise(testObject.onDidChange);
        didInstallEvent.fire([{ identifier: gallery.identifier, source: gallery, operation: 2 /* InstallOperation.Install */, local: aLocalExtension('a', gallery, gallery), profileLocation: null }]);
        await promise;
        assert.ok(testObject.enabled);
        assert.strictEqual('extension-action icon manage codicon codicon-extensions-manage', testObject.class);
        assert.strictEqual('Manage', testObject.tooltip);
    });
    test('Test ManageExtensionAction when extension is system extension', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ManageExtensionAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a', {}, { type: 0 /* ExtensionType.System */ });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        return instantiationService.get(IExtensionsWorkbenchService).queryLocal()
            .then(extensions => {
            testObject.extension = extensions[0];
            assert.ok(testObject.enabled);
            assert.strictEqual('extension-action icon manage codicon codicon-extensions-manage', testObject.class);
            assert.strictEqual('Manage', testObject.tooltip);
        });
    });
    test('Test ManageExtensionAction when extension is uninstalling', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ManageExtensionAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        return instantiationService.get(IExtensionsWorkbenchService).queryLocal()
            .then(extensions => {
            testObject.extension = extensions[0];
            uninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
            assert.ok(!testObject.enabled);
            assert.strictEqual('extension-action icon manage codicon codicon-extensions-manage', testObject.class);
            assert.strictEqual('Manage', testObject.tooltip);
        });
    });
    test('Test EnableForWorkspaceAction when there is no extension', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.EnableForWorkspaceAction));
        assert.ok(!testObject.enabled);
    });
    test('Test EnableForWorkspaceAction when there extension is not disabled', () => {
        const local = aLocalExtension('a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        return instantiationService.get(IExtensionsWorkbenchService).queryLocal()
            .then(extensions => {
            const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.EnableForWorkspaceAction));
            testObject.extension = extensions[0];
            assert.ok(!testObject.enabled);
        });
    });
    test('Test EnableForWorkspaceAction when the extension is disabled globally', () => {
        const local = aLocalExtension('a');
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([local], 9 /* EnablementState.DisabledGlobally */)
            .then(() => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
            return instantiationService.get(IExtensionsWorkbenchService).queryLocal()
                .then(extensions => {
                const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.EnableForWorkspaceAction));
                testObject.extension = extensions[0];
                assert.ok(testObject.enabled);
            });
        });
    });
    test('Test EnableForWorkspaceAction when extension is disabled for workspace', () => {
        const local = aLocalExtension('a');
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([local], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
            return instantiationService.get(IExtensionsWorkbenchService).queryLocal()
                .then(extensions => {
                const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.EnableForWorkspaceAction));
                testObject.extension = extensions[0];
                assert.ok(testObject.enabled);
            });
        });
    });
    test('Test EnableForWorkspaceAction when the extension is disabled globally and workspace', () => {
        const local = aLocalExtension('a');
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([local], 9 /* EnablementState.DisabledGlobally */)
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([local], 10 /* EnablementState.DisabledWorkspace */))
            .then(() => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
            return instantiationService.get(IExtensionsWorkbenchService).queryLocal()
                .then(extensions => {
                const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.EnableForWorkspaceAction));
                testObject.extension = extensions[0];
                assert.ok(testObject.enabled);
            });
        });
    });
    test('Test EnableGloballyAction when there is no extension', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.EnableGloballyAction));
        assert.ok(!testObject.enabled);
    });
    test('Test EnableGloballyAction when the extension is not disabled', () => {
        const local = aLocalExtension('a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        return instantiationService.get(IExtensionsWorkbenchService).queryLocal()
            .then(extensions => {
            const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.EnableGloballyAction));
            testObject.extension = extensions[0];
            assert.ok(!testObject.enabled);
        });
    });
    test('Test EnableGloballyAction when the extension is disabled for workspace', () => {
        const local = aLocalExtension('a');
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([local], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
            return instantiationService.get(IExtensionsWorkbenchService).queryLocal()
                .then(extensions => {
                const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.EnableGloballyAction));
                testObject.extension = extensions[0];
                assert.ok(!testObject.enabled);
            });
        });
    });
    test('Test EnableGloballyAction when the extension is disabled globally', () => {
        const local = aLocalExtension('a');
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([local], 9 /* EnablementState.DisabledGlobally */)
            .then(() => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
            return instantiationService.get(IExtensionsWorkbenchService).queryLocal()
                .then(extensions => {
                const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.EnableGloballyAction));
                testObject.extension = extensions[0];
                assert.ok(testObject.enabled);
            });
        });
    });
    test('Test EnableGloballyAction when the extension is disabled in both', () => {
        const local = aLocalExtension('a');
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([local], 9 /* EnablementState.DisabledGlobally */)
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([local], 10 /* EnablementState.DisabledWorkspace */))
            .then(() => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
            return instantiationService.get(IExtensionsWorkbenchService).queryLocal()
                .then(extensions => {
                const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.EnableGloballyAction));
                testObject.extension = extensions[0];
                assert.ok(testObject.enabled);
            });
        });
    });
    test('Test EnableAction when there is no extension', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.EnableDropDownAction));
        assert.ok(!testObject.enabled);
    });
    test('Test EnableDropDownAction when extension is installed and enabled', () => {
        const local = aLocalExtension('a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        return instantiationService.get(IExtensionsWorkbenchService).queryLocal()
            .then(extensions => {
            const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.EnableDropDownAction));
            testObject.extension = extensions[0];
            assert.ok(!testObject.enabled);
        });
    });
    test('Test EnableDropDownAction when extension is installed and disabled globally', () => {
        const local = aLocalExtension('a');
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([local], 9 /* EnablementState.DisabledGlobally */)
            .then(() => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
            return instantiationService.get(IExtensionsWorkbenchService).queryLocal()
                .then(extensions => {
                const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.EnableDropDownAction));
                testObject.extension = extensions[0];
                assert.ok(testObject.enabled);
            });
        });
    });
    test('Test EnableDropDownAction when extension is installed and disabled for workspace', () => {
        const local = aLocalExtension('a');
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([local], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
            return instantiationService.get(IExtensionsWorkbenchService).queryLocal()
                .then(extensions => {
                const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.EnableDropDownAction));
                testObject.extension = extensions[0];
                assert.ok(testObject.enabled);
            });
        });
    });
    test('Test EnableDropDownAction when extension is uninstalled', () => {
        const gallery = aGalleryExtension('a');
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        return instantiationService.get(IExtensionsWorkbenchService).queryGallery(CancellationToken.None)
            .then(page => {
            const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.EnableDropDownAction));
            testObject.extension = page.firstPage[0];
            assert.ok(!testObject.enabled);
        });
    });
    test('Test EnableDropDownAction when extension is installing', () => {
        const gallery = aGalleryExtension('a');
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        return instantiationService.get(IExtensionsWorkbenchService).queryGallery(CancellationToken.None)
            .then(page => {
            const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.EnableDropDownAction));
            testObject.extension = page.firstPage[0];
            disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
            installEvent.fire({ identifier: gallery.identifier, source: gallery, profileLocation: null });
            assert.ok(!testObject.enabled);
        });
    });
    test('Test EnableDropDownAction when extension is uninstalling', () => {
        const local = aLocalExtension('a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        return instantiationService.get(IExtensionsWorkbenchService).queryLocal()
            .then(extensions => {
            const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.EnableDropDownAction));
            testObject.extension = extensions[0];
            uninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
            assert.ok(!testObject.enabled);
        });
    });
    test('Test DisableForWorkspaceAction when there is no extension', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.DisableForWorkspaceAction));
        assert.ok(!testObject.enabled);
    });
    test('Test DisableForWorkspaceAction when the extension is disabled globally', () => {
        const local = aLocalExtension('a');
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([local], 9 /* EnablementState.DisabledGlobally */)
            .then(() => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
            return instantiationService.get(IExtensionsWorkbenchService).queryLocal()
                .then(extensions => {
                const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.DisableForWorkspaceAction));
                testObject.extension = extensions[0];
                assert.ok(!testObject.enabled);
            });
        });
    });
    test('Test DisableForWorkspaceAction when the extension is disabled workspace', () => {
        const local = aLocalExtension('a');
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([local], 9 /* EnablementState.DisabledGlobally */)
            .then(() => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
            return instantiationService.get(IExtensionsWorkbenchService).queryLocal()
                .then(extensions => {
                const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.DisableForWorkspaceAction));
                testObject.extension = extensions[0];
                assert.ok(!testObject.enabled);
            });
        });
    });
    test('Test DisableForWorkspaceAction when extension is enabled', () => {
        const local = aLocalExtension('a');
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(local)],
            onDidChangeExtensions: Event.None,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true)
        });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        return instantiationService.get(IExtensionsWorkbenchService).queryLocal()
            .then(extensions => {
            const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.DisableForWorkspaceAction));
            testObject.extension = extensions[0];
            assert.ok(testObject.enabled);
        });
    });
    test('Test DisableGloballyAction when there is no extension', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.DisableGloballyAction));
        assert.ok(!testObject.enabled);
    });
    test('Test DisableGloballyAction when the extension is disabled globally', () => {
        const local = aLocalExtension('a');
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([local], 9 /* EnablementState.DisabledGlobally */)
            .then(() => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
            return instantiationService.get(IExtensionsWorkbenchService).queryLocal()
                .then(extensions => {
                const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.DisableGloballyAction));
                testObject.extension = extensions[0];
                assert.ok(!testObject.enabled);
            });
        });
    });
    test('Test DisableGloballyAction when the extension is disabled for workspace', () => {
        const local = aLocalExtension('a');
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([local], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
            return instantiationService.get(IExtensionsWorkbenchService).queryLocal()
                .then(extensions => {
                const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.DisableGloballyAction));
                testObject.extension = extensions[0];
                assert.ok(!testObject.enabled);
            });
        });
    });
    test('Test DisableGloballyAction when the extension is enabled', () => {
        const local = aLocalExtension('a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(local)],
            onDidChangeExtensions: Event.None,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true)
        });
        return instantiationService.get(IExtensionsWorkbenchService).queryLocal()
            .then(extensions => {
            const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.DisableGloballyAction));
            testObject.extension = extensions[0];
            assert.ok(testObject.enabled);
        });
    });
    test('Test DisableGloballyAction when extension is installed and enabled', () => {
        const local = aLocalExtension('a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(local)],
            onDidChangeExtensions: Event.None,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true)
        });
        return instantiationService.get(IExtensionsWorkbenchService).queryLocal()
            .then(extensions => {
            const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.DisableGloballyAction));
            testObject.extension = extensions[0];
            assert.ok(testObject.enabled);
        });
    });
    test('Test DisableGloballyAction when extension is installed and disabled globally', () => {
        const local = aLocalExtension('a');
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(local)],
            onDidChangeExtensions: Event.None,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true)
        });
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([local], 9 /* EnablementState.DisabledGlobally */)
            .then(() => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
            return instantiationService.get(IExtensionsWorkbenchService).queryLocal()
                .then(extensions => {
                const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.DisableGloballyAction));
                testObject.extension = extensions[0];
                assert.ok(!testObject.enabled);
            });
        });
    });
    test('Test DisableGloballyAction when extension is uninstalled', () => {
        const gallery = aGalleryExtension('a');
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(aLocalExtension('a'))],
            onDidChangeExtensions: Event.None,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true)
        });
        return instantiationService.get(IExtensionsWorkbenchService).queryGallery(CancellationToken.None)
            .then(page => {
            const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.DisableGloballyAction));
            testObject.extension = page.firstPage[0];
            assert.ok(!testObject.enabled);
        });
    });
    test('Test DisableGloballyAction when extension is installing', () => {
        const gallery = aGalleryExtension('a');
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(aLocalExtension('a'))],
            onDidChangeExtensions: Event.None,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true)
        });
        return instantiationService.get(IExtensionsWorkbenchService).queryGallery(CancellationToken.None)
            .then(page => {
            const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.DisableGloballyAction));
            testObject.extension = page.firstPage[0];
            disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
            installEvent.fire({ identifier: gallery.identifier, source: gallery, profileLocation: null });
            assert.ok(!testObject.enabled);
        });
    });
    test('Test DisableGloballyAction when extension is uninstalling', () => {
        const local = aLocalExtension('a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(local)],
            onDidChangeExtensions: Event.None,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true)
        });
        return instantiationService.get(IExtensionsWorkbenchService).queryLocal()
            .then(extensions => {
            const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.DisableGloballyAction));
            testObject.extension = extensions[0];
            disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
            uninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
            assert.ok(!testObject.enabled);
        });
    });
});
suite('ExtensionRuntimeStateAction', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => setupTest(disposables));
    test('Test Runtime State when there is no extension', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        assert.ok(!testObject.enabled);
    });
    test('Test Runtime State when extension state is installing', async () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const workbenchService = instantiationService.get(IExtensionsWorkbenchService);
        const gallery = aGalleryExtension('a');
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        const paged = await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = paged.firstPage[0];
        installEvent.fire({ identifier: gallery.identifier, source: gallery, profileLocation: null });
        assert.ok(!testObject.enabled);
    });
    test('Test Runtime State when extension state is uninstalling', async () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        const extensions = await instantiationService.get(IExtensionsWorkbenchService).queryLocal();
        testObject.extension = extensions[0];
        uninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
        assert.ok(!testObject.enabled);
    });
    test('Test Runtime State when extension is newly installed', async () => {
        const onDidChangeExtensionsEmitter = new Emitter();
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(aLocalExtension('b'))],
            onDidChangeExtensions: onDidChangeExtensionsEmitter.event,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true)
        });
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const gallery = aGalleryExtension('a');
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        const paged = await instantiationService.get(IExtensionsWorkbenchService).queryGallery(CancellationToken.None);
        testObject.extension = paged.firstPage[0];
        assert.ok(!testObject.enabled);
        installEvent.fire({ identifier: gallery.identifier, source: gallery, profileLocation: null });
        const promise = Event.toPromise(testObject.onDidChange);
        didInstallEvent.fire([{ identifier: gallery.identifier, source: gallery, operation: 2 /* InstallOperation.Install */, local: aLocalExtension('a', gallery, gallery), profileLocation: null }]);
        await promise;
        assert.ok(testObject.enabled);
        assert.strictEqual(testObject.tooltip, `Please restart extensions to enable this extension.`);
    });
    test('Test Runtime State when extension is newly installed and ext host restart is not required', async () => {
        const onDidChangeExtensionsEmitter = new Emitter();
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(aLocalExtension('b'))],
            onDidChangeExtensions: onDidChangeExtensionsEmitter.event,
            canAddExtension: (extension) => true,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true)
        });
        instantiationService.set(IExtensionsWorkbenchService, disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService)));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const gallery = aGalleryExtension('a');
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        const paged = await instantiationService.get(IExtensionsWorkbenchService).queryGallery(CancellationToken.None);
        testObject.extension = paged.firstPage[0];
        assert.ok(!testObject.enabled);
        installEvent.fire({ identifier: gallery.identifier, source: gallery, profileLocation: null });
        didInstallEvent.fire([{ identifier: gallery.identifier, source: gallery, operation: 2 /* InstallOperation.Install */, local: aLocalExtension('a', gallery, gallery), profileLocation: null }]);
        assert.ok(!testObject.enabled);
    });
    test('Test Runtime State when extension is installed and uninstalled', async () => {
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(aLocalExtension('b'))],
            onDidChangeExtensions: Event.None,
            canRemoveExtension: (extension) => false,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true)
        });
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const gallery = aGalleryExtension('a');
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        const paged = await instantiationService.get(IExtensionsWorkbenchService).queryGallery(CancellationToken.None);
        testObject.extension = paged.firstPage[0];
        const identifier = gallery.identifier;
        installEvent.fire({ identifier, source: gallery, profileLocation: null });
        didInstallEvent.fire([{ identifier, source: gallery, operation: 2 /* InstallOperation.Install */, local: aLocalExtension('a', gallery, { identifier }), profileLocation: null }]);
        uninstallEvent.fire({ identifier, profileLocation: null });
        didUninstallEvent.fire({ identifier, profileLocation: null });
        assert.ok(!testObject.enabled);
    });
    test('Test Runtime State when extension is uninstalled', async () => {
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(aLocalExtension('a', { version: '1.0.0' }))],
            onDidChangeExtensions: Event.None,
            canRemoveExtension: (extension) => false,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true)
        });
        instantiationService.set(IExtensionsWorkbenchService, disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService)));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        const extensions = await instantiationService.get(IExtensionsWorkbenchService).queryLocal();
        testObject.extension = extensions[0];
        uninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
        didUninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
        assert.ok(testObject.enabled);
        assert.strictEqual(testObject.tooltip, `Please restart extensions to complete the uninstallation of this extension.`);
    });
    test('Test Runtime State when extension is uninstalled and can be removed', async () => {
        const local = aLocalExtension('a');
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(local)],
            onDidChangeExtensions: Event.None,
            canRemoveExtension: (extension) => true,
            canAddExtension: (extension) => true,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true)
        });
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        const extensions = await instantiationService.get(IExtensionsWorkbenchService).queryLocal();
        testObject.extension = extensions[0];
        uninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
        didUninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
        assert.ok(!testObject.enabled);
    });
    test('Test Runtime State when extension is uninstalled and installed', async () => {
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(aLocalExtension('a', { version: '1.0.0' }))],
            onDidChangeExtensions: Event.None,
            canRemoveExtension: (extension) => false,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true)
        });
        instantiationService.set(IExtensionsWorkbenchService, disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService)));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        const extensions = await instantiationService.get(IExtensionsWorkbenchService).queryLocal();
        testObject.extension = extensions[0];
        uninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
        didUninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
        const gallery = aGalleryExtension('a');
        const identifier = gallery.identifier;
        installEvent.fire({ identifier, source: gallery, profileLocation: null });
        didInstallEvent.fire([{ identifier, source: gallery, operation: 2 /* InstallOperation.Install */, local, profileLocation: null }]);
        assert.ok(!testObject.enabled);
    });
    test('Test Runtime State when extension is updated while running', async () => {
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(aLocalExtension('a', { version: '1.0.1' }))],
            onDidChangeExtensions: Event.None,
            canRemoveExtension: (extension) => true,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true)
        });
        instantiationService.set(IExtensionsWorkbenchService, disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService)));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a', { version: '1.0.1' });
        const workbenchService = instantiationService.get(IExtensionsWorkbenchService);
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        const extensions = await workbenchService.queryLocal();
        testObject.extension = extensions[0];
        return new Promise(c => {
            disposables.add(testObject.onDidChange(() => {
                if (testObject.enabled && testObject.tooltip === `Please restart extensions to enable the updated extension.`) {
                    c();
                }
            }));
            const gallery = aGalleryExtension('a', { uuid: local.identifier.id, version: '1.0.2' });
            installEvent.fire({ identifier: gallery.identifier, source: gallery, profileLocation: null });
            didInstallEvent.fire([{ identifier: gallery.identifier, source: gallery, operation: 2 /* InstallOperation.Install */, local: aLocalExtension('a', gallery, gallery), profileLocation: null }]);
        });
    });
    test('Test Runtime State when extension is updated when not running', async () => {
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(aLocalExtension('b'))],
            onDidChangeExtensions: Event.None,
            canRemoveExtension: (extension) => false,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true)
        });
        const local = aLocalExtension('a', { version: '1.0.1' });
        await instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([local], 9 /* EnablementState.DisabledGlobally */);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const workbenchService = instantiationService.get(IExtensionsWorkbenchService);
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        const extensions = await workbenchService.queryLocal();
        testObject.extension = extensions[0];
        const gallery = aGalleryExtension('a', { identifier: local.identifier, version: '1.0.2' });
        installEvent.fire({ identifier: gallery.identifier, source: gallery, profileLocation: null });
        didInstallEvent.fire([{ identifier: gallery.identifier, source: gallery, operation: 3 /* InstallOperation.Update */, local: aLocalExtension('a', gallery, gallery), profileLocation: null }]);
        assert.ok(!testObject.enabled);
    });
    test('Test Runtime State when extension is disabled when running', async () => {
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(aLocalExtension('a'))],
            onDidChangeExtensions: Event.None,
            canRemoveExtension: (extension) => false,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true)
        });
        instantiationService.set(IExtensionsWorkbenchService, disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService)));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a');
        const workbenchService = instantiationService.get(IExtensionsWorkbenchService);
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        const extensions = await workbenchService.queryLocal();
        testObject.extension = extensions[0];
        await workbenchService.setEnablement(extensions[0], 9 /* EnablementState.DisabledGlobally */);
        await testObject.update();
        assert.ok(testObject.enabled);
        assert.strictEqual(`Please restart extensions to disable this extension.`, testObject.tooltip);
    });
    test('Test Runtime State when extension enablement is toggled when running', async () => {
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(aLocalExtension('a', { version: '1.0.0' }))],
            onDidChangeExtensions: Event.None,
            canRemoveExtension: (extension) => false,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true)
        });
        instantiationService.set(IExtensionsWorkbenchService, disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService)));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a');
        const workbenchService = instantiationService.get(IExtensionsWorkbenchService);
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        const extensions = await workbenchService.queryLocal();
        testObject.extension = extensions[0];
        await workbenchService.setEnablement(extensions[0], 9 /* EnablementState.DisabledGlobally */);
        await workbenchService.setEnablement(extensions[0], 11 /* EnablementState.EnabledGlobally */);
        assert.ok(!testObject.enabled);
    });
    test('Test Runtime State when extension is enabled when not running', async () => {
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(aLocalExtension('b'))],
            onDidChangeExtensions: Event.None,
            canRemoveExtension: (extension) => false,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true)
        });
        const local = aLocalExtension('a');
        await instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([local], 9 /* EnablementState.DisabledGlobally */);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const workbenchService = instantiationService.get(IExtensionsWorkbenchService);
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        const extensions = await workbenchService.queryLocal();
        testObject.extension = extensions[0];
        await workbenchService.setEnablement(extensions[0], 11 /* EnablementState.EnabledGlobally */);
        await testObject.update();
        assert.ok(testObject.enabled);
        assert.strictEqual(`Please restart extensions to enable this extension.`, testObject.tooltip);
    });
    test('Test Runtime State when extension enablement is toggled when not running', async () => {
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(aLocalExtension('b'))],
            onDidChangeExtensions: Event.None,
            canRemoveExtension: (extension) => false,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true)
        });
        const local = aLocalExtension('a');
        await instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([local], 9 /* EnablementState.DisabledGlobally */);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const workbenchService = instantiationService.get(IExtensionsWorkbenchService);
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        const extensions = await workbenchService.queryLocal();
        testObject.extension = extensions[0];
        await workbenchService.setEnablement(extensions[0], 11 /* EnablementState.EnabledGlobally */);
        await workbenchService.setEnablement(extensions[0], 9 /* EnablementState.DisabledGlobally */);
        assert.ok(!testObject.enabled);
    });
    test('Test Runtime State when extension is updated when not running and enabled', async () => {
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(aLocalExtension('a'))],
            onDidChangeExtensions: Event.None,
            canRemoveExtension: (extension) => false,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true)
        });
        const local = aLocalExtension('a', { version: '1.0.1' });
        await instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([local], 9 /* EnablementState.DisabledGlobally */);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const workbenchService = instantiationService.get(IExtensionsWorkbenchService);
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        const extensions = await workbenchService.queryLocal();
        testObject.extension = extensions[0];
        const gallery = aGalleryExtension('a', { identifier: local.identifier, version: '1.0.2' });
        installEvent.fire({ identifier: gallery.identifier, source: gallery, profileLocation: null });
        didInstallEvent.fire([{ identifier: gallery.identifier, source: gallery, operation: 2 /* InstallOperation.Install */, local: aLocalExtension('a', gallery, gallery), profileLocation: null }]);
        await workbenchService.setEnablement(extensions[0], 11 /* EnablementState.EnabledGlobally */);
        await testObject.update();
        assert.ok(testObject.enabled);
        assert.strictEqual(`Please restart extensions to enable this extension.`, testObject.tooltip);
    });
    test('Test Runtime State when a localization extension is newly installed', async () => {
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(aLocalExtension('b'))],
            onDidChangeExtensions: Event.None,
            canRemoveExtension: (extension) => false,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true)
        });
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const gallery = aGalleryExtension('a');
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        const paged = await instantiationService.get(IExtensionsWorkbenchService).queryGallery(CancellationToken.None);
        testObject.extension = paged.firstPage[0];
        assert.ok(!testObject.enabled);
        installEvent.fire({ identifier: gallery.identifier, source: gallery, profileLocation: null });
        didInstallEvent.fire([{ identifier: gallery.identifier, source: gallery, operation: 2 /* InstallOperation.Install */, local: aLocalExtension('a', { ...gallery, ...{ contributes: { localizations: [{ languageId: 'de', translations: [] }] } } }, gallery), profileLocation: null }]);
        assert.ok(!testObject.enabled);
    });
    test('Test Runtime State when a localization extension is updated while running', async () => {
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(aLocalExtension('a', { version: '1.0.1' }))],
            onDidChangeExtensions: Event.None,
            canRemoveExtension: (extension) => false,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true)
        });
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a', { version: '1.0.1', contributes: { localizations: [{ languageId: 'de', translations: [] }] } });
        const workbenchService = instantiationService.get(IExtensionsWorkbenchService);
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        const extensions = await workbenchService.queryLocal();
        testObject.extension = extensions[0];
        const gallery = aGalleryExtension('a', { uuid: local.identifier.id, version: '1.0.2' });
        installEvent.fire({ identifier: gallery.identifier, source: gallery, profileLocation: null });
        didInstallEvent.fire([{ identifier: gallery.identifier, source: gallery, operation: 2 /* InstallOperation.Install */, local: aLocalExtension('a', { ...gallery, ...{ contributes: { localizations: [{ languageId: 'de', translations: [] }] } } }, gallery), profileLocation: null }]);
        assert.ok(!testObject.enabled);
    });
    test('Test Runtime State when extension is not installed but extension from different server is installed and running', async () => {
        // multi server setup
        const gallery = aGalleryExtension('a');
        const localExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file('pub.a') });
        const remoteExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file('pub.a').with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([remoteExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const onDidChangeExtensionsEmitter = new Emitter();
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(remoteExtension)],
            onDidChangeExtensions: onDidChangeExtensionsEmitter.event,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true)
        });
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        await workbenchService.queryGallery(CancellationToken.None);
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
    test('Test Runtime State when extension is uninstalled but extension from different server is installed and running', async () => {
        // multi server setup
        const gallery = aGalleryExtension('a');
        const localExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file('pub.a') });
        const remoteExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file('pub.a').with({ scheme: Schemas.vscodeRemote }) });
        const localExtensionManagementService = createExtensionManagementService([localExtension]);
        const uninstallEvent = new Emitter();
        const onDidUninstallEvent = new Emitter();
        localExtensionManagementService.onUninstallExtension = uninstallEvent.event;
        localExtensionManagementService.onDidUninstallExtension = onDidUninstallEvent.event;
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, localExtensionManagementService, createExtensionManagementService([remoteExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const onDidChangeExtensionsEmitter = new Emitter();
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(remoteExtension)],
            onDidChangeExtensions: onDidChangeExtensionsEmitter.event,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true)
        });
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        await workbenchService.queryGallery(CancellationToken.None);
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
        uninstallEvent.fire({ identifier: localExtension.identifier, profileLocation: null });
        didUninstallEvent.fire({ identifier: localExtension.identifier, profileLocation: null });
        assert.ok(!testObject.enabled);
    });
    test('Test Runtime State when workspace extension is disabled on local server and installed in remote server', async () => {
        // multi server setup
        const gallery = aGalleryExtension('a');
        const remoteExtensionManagementService = createExtensionManagementService([]);
        const onDidInstallEvent = new Emitter();
        remoteExtensionManagementService.onDidInstallExtensions = onDidInstallEvent.event;
        const localExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file('pub.a') });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), remoteExtensionManagementService);
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        const onDidChangeExtensionsEmitter = new Emitter();
        instantiationService.stub(IExtensionService, {
            extensions: [],
            onDidChangeExtensions: onDidChangeExtensionsEmitter.event,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true)
        });
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        await workbenchService.queryGallery(CancellationToken.None);
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
        const remoteExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file('pub.a').with({ scheme: Schemas.vscodeRemote }) });
        const promise = Event.toPromise(testObject.onDidChange);
        onDidInstallEvent.fire([{ identifier: remoteExtension.identifier, local: remoteExtension, operation: 2 /* InstallOperation.Install */, profileLocation: null }]);
        await promise;
        assert.ok(testObject.enabled);
        assert.strictEqual(testObject.tooltip, `Please reload window to enable this extension.`);
    });
    test('Test Runtime State when ui extension is disabled on remote server and installed in local server', async () => {
        // multi server setup
        const gallery = aGalleryExtension('a');
        const localExtensionManagementService = createExtensionManagementService([]);
        const onDidInstallEvent = new Emitter();
        localExtensionManagementService.onDidInstallExtensions = onDidInstallEvent.event;
        const remoteExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file('pub.a').with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, localExtensionManagementService, createExtensionManagementService([remoteExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        const onDidChangeExtensionsEmitter = new Emitter();
        instantiationService.stub(IExtensionService, {
            extensions: [],
            onDidChangeExtensions: onDidChangeExtensionsEmitter.event,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true)
        });
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        await workbenchService.queryGallery(CancellationToken.None);
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
        const localExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file('pub.a') });
        const promise = Event.toPromise(Event.filter(testObject.onDidChange, () => testObject.enabled));
        onDidInstallEvent.fire([{ identifier: localExtension.identifier, local: localExtension, operation: 2 /* InstallOperation.Install */, profileLocation: null }]);
        await promise;
        assert.ok(testObject.enabled);
        assert.strictEqual(testObject.tooltip, `Please reload window to enable this extension.`);
    });
    test('Test Runtime State for remote ui extension is disabled when it is installed and enabled in local server', async () => {
        // multi server setup
        const gallery = aGalleryExtension('a');
        const localExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file('pub.a') });
        const localExtensionManagementService = createExtensionManagementService([localExtension]);
        const onDidInstallEvent = new Emitter();
        localExtensionManagementService.onDidInstallExtensions = onDidInstallEvent.event;
        const remoteExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file('pub.a').with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, localExtensionManagementService, createExtensionManagementService([remoteExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const onDidChangeExtensionsEmitter = new Emitter();
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(localExtension)],
            onDidChangeExtensions: onDidChangeExtensionsEmitter.event,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true)
        });
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        await workbenchService.queryGallery(CancellationToken.None);
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
    test('Test Runtime State for remote workspace+ui extension is enabled when it is installed and enabled in local server', async () => {
        // multi server setup
        const gallery = aGalleryExtension('a');
        const localExtension = aLocalExtension('a', { extensionKind: ['workspace', 'ui'] }, { location: URI.file('pub.a') });
        const localExtensionManagementService = createExtensionManagementService([localExtension]);
        const onDidInstallEvent = new Emitter();
        localExtensionManagementService.onDidInstallExtensions = onDidInstallEvent.event;
        const remoteExtension = aLocalExtension('a', { extensionKind: ['workspace', 'ui'] }, { location: URI.file('pub.a').with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, localExtensionManagementService, createExtensionManagementService([remoteExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        const onDidChangeExtensionsEmitter = new Emitter();
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(localExtension)],
            onDidChangeExtensions: onDidChangeExtensionsEmitter.event,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true)
        });
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        await workbenchService.queryGallery(CancellationToken.None);
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(testObject.enabled);
    });
    test('Test Runtime State for local ui+workspace extension is enabled when it is installed and enabled in remote server', async () => {
        // multi server setup
        const gallery = aGalleryExtension('a');
        const localExtension = aLocalExtension('a', { extensionKind: ['ui', 'workspace'] }, { location: URI.file('pub.a') });
        const remoteExtension = aLocalExtension('a', { extensionKind: ['ui', 'workspace'] }, { location: URI.file('pub.a').with({ scheme: Schemas.vscodeRemote }) });
        const remoteExtensionManagementService = createExtensionManagementService([remoteExtension]);
        const onDidInstallEvent = new Emitter();
        remoteExtensionManagementService.onDidInstallExtensions = onDidInstallEvent.event;
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), remoteExtensionManagementService);
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        const onDidChangeExtensionsEmitter = new Emitter();
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(remoteExtension)],
            onDidChangeExtensions: onDidChangeExtensionsEmitter.event,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true)
        });
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        await workbenchService.queryGallery(CancellationToken.None);
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(testObject.enabled);
    });
    test('Test Runtime State for local workspace+ui extension is enabled when it is installed in both servers but running in local server', async () => {
        // multi server setup
        const gallery = aGalleryExtension('a');
        const localExtension = aLocalExtension('a', { extensionKind: ['workspace', 'ui'] }, { location: URI.file('pub.a') });
        const localExtensionManagementService = createExtensionManagementService([localExtension]);
        const onDidInstallEvent = new Emitter();
        localExtensionManagementService.onDidInstallExtensions = onDidInstallEvent.event;
        const remoteExtension = aLocalExtension('a', { extensionKind: ['workspace', 'ui'] }, { location: URI.file('pub.a').with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, localExtensionManagementService, createExtensionManagementService([remoteExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        const onDidChangeExtensionsEmitter = new Emitter();
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(localExtension)],
            onDidChangeExtensions: onDidChangeExtensionsEmitter.event,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true)
        });
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        await workbenchService.queryGallery(CancellationToken.None);
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(testObject.enabled);
    });
    test('Test Runtime State for remote ui+workspace extension is enabled when it is installed on both servers but running in remote server', async () => {
        // multi server setup
        const gallery = aGalleryExtension('a');
        const localExtension = aLocalExtension('a', { extensionKind: ['ui', 'workspace'] }, { location: URI.file('pub.a') });
        const remoteExtension = aLocalExtension('a', { extensionKind: ['ui', 'workspace'] }, { location: URI.file('pub.a').with({ scheme: Schemas.vscodeRemote }) });
        const remoteExtensionManagementService = createExtensionManagementService([remoteExtension]);
        const onDidInstallEvent = new Emitter();
        remoteExtensionManagementService.onDidInstallExtensions = onDidInstallEvent.event;
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), remoteExtensionManagementService);
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        const onDidChangeExtensionsEmitter = new Emitter();
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(remoteExtension)],
            onDidChangeExtensions: onDidChangeExtensionsEmitter.event,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true)
        });
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        await workbenchService.queryGallery(CancellationToken.None);
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(testObject.enabled);
    });
    test('Test Runtime State when ui+workspace+web extension is installed in web and remote and running in remote', async () => {
        // multi server setup
        const gallery = aGalleryExtension('a');
        const webExtension = aLocalExtension('a', { extensionKind: ['ui', 'workspace'], 'browser': 'browser.js' }, { location: URI.file('pub.a').with({ scheme: Schemas.vscodeUserData }) });
        const remoteExtension = aLocalExtension('a', { extensionKind: ['ui', 'workspace'], 'browser': 'browser.js' }, { location: URI.file('pub.a').with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, null, createExtensionManagementService([remoteExtension]), createExtensionManagementService([webExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(remoteExtension)],
            onDidChangeExtensions: Event.None,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true)
        });
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        await workbenchService.queryGallery(CancellationToken.None);
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
    test('Test Runtime State when workspace+ui+web extension is installed in web and local and running in local', async () => {
        // multi server setup
        const gallery = aGalleryExtension('a');
        const webExtension = aLocalExtension('a', { extensionKind: ['workspace', 'ui'], 'browser': 'browser.js' }, { location: URI.file('pub.a').with({ scheme: Schemas.vscodeUserData }) });
        const localExtension = aLocalExtension('a', { extensionKind: ['workspace', 'ui'], 'browser': 'browser.js' }, { location: URI.file('pub.a') });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), null, createExtensionManagementService([webExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(localExtension)],
            onDidChangeExtensions: Event.None,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true)
        });
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        await workbenchService.queryGallery(CancellationToken.None);
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
});
suite('RemoteInstallAction', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => setupTest(disposables));
    test('Test remote install action is enabled for local workspace extension', async () => {
        // multi server setup
        const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.enabled);
        assert.strictEqual('Install in remote', testObject.label);
        assert.strictEqual('extension-action label prominent install-other-server', testObject.class);
    });
    test('Test remote install action when installing local workspace extension', async () => {
        // multi server setup
        const remoteExtensionManagementService = createExtensionManagementService();
        const onInstallExtension = new Emitter();
        remoteExtensionManagementService.onInstallExtension = onInstallExtension.event;
        const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]), remoteExtensionManagementService);
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.stub(IExtensionsWorkbenchService, workbenchService, 'open', undefined);
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        const gallery = aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier });
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.enabled);
        assert.strictEqual('Install in remote', testObject.label);
        assert.strictEqual('extension-action label prominent install-other-server', testObject.class);
        onInstallExtension.fire({ identifier: localWorkspaceExtension.identifier, source: gallery, profileLocation: null });
        assert.ok(testObject.enabled);
        assert.strictEqual('Installing', testObject.label);
        assert.strictEqual('extension-action label install-other-server installing', testObject.class);
    });
    test('Test remote install action when installing local workspace extension is finished', async () => {
        // multi server setup
        const remoteExtensionManagementService = createExtensionManagementService();
        const onInstallExtension = new Emitter();
        remoteExtensionManagementService.onInstallExtension = onInstallExtension.event;
        const onDidInstallEvent = new Emitter();
        remoteExtensionManagementService.onDidInstallExtensions = onDidInstallEvent.event;
        const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]), remoteExtensionManagementService);
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.stub(IExtensionsWorkbenchService, workbenchService, 'open', undefined);
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        const gallery = aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier });
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.enabled);
        assert.strictEqual('Install in remote', testObject.label);
        assert.strictEqual('extension-action label prominent install-other-server', testObject.class);
        onInstallExtension.fire({ identifier: localWorkspaceExtension.identifier, source: gallery, profileLocation: null });
        assert.ok(testObject.enabled);
        assert.strictEqual('Installing', testObject.label);
        assert.strictEqual('extension-action label install-other-server installing', testObject.class);
        const installedExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const promise = Event.toPromise(testObject.onDidChange);
        onDidInstallEvent.fire([{ identifier: installedExtension.identifier, local: installedExtension, operation: 2 /* InstallOperation.Install */, profileLocation: null }]);
        await promise;
        assert.ok(!testObject.enabled);
    });
    test('Test remote install action is enabled for disabled local workspace extension', async () => {
        // multi server setup
        const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        const remoteWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        await instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([remoteWorkspaceExtension], 9 /* EnablementState.DisabledGlobally */);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.enabled);
        assert.strictEqual('Install in remote', testObject.label);
        assert.strictEqual('extension-action label prominent install-other-server', testObject.class);
    });
    test('Test remote install action is enabled local workspace+ui extension', async () => {
        // multi server setup
        const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace', 'ui'] }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        await instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([localWorkspaceExtension], 9 /* EnablementState.DisabledGlobally */);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.enabled);
        assert.strictEqual('Install in remote', testObject.label);
        assert.strictEqual('extension-action label prominent install-other-server', testObject.class);
    });
    test('Test remote install action is enabled for local ui+workapace extension if can install is true', async () => {
        // multi server setup
        const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['ui', 'workspace'] }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        await instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([localWorkspaceExtension], 9 /* EnablementState.DisabledGlobally */);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, true));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.enabled);
        assert.strictEqual('Install in remote', testObject.label);
        assert.strictEqual('extension-action label prominent install-other-server', testObject.class);
    });
    test('Test remote install action is disabled for local ui+workapace extension if can install is false', async () => {
        // multi server setup
        const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['ui', 'workspace'] }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        await instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([localWorkspaceExtension], 9 /* EnablementState.DisabledGlobally */);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(!testObject.enabled);
    });
    test('Test remote install action is disabled when extension is not set', async () => {
        // multi server setup
        const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]));
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        assert.ok(!testObject.enabled);
    });
    test('Test remote install action is disabled for extension which is not installed', async () => {
        // multi server setup
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService);
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a')));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const pager = await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = pager.firstPage[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
    test('Test remote install action is disabled for local workspace extension which is disabled in env', async () => {
        // multi server setup
        const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]));
        const environmentService = { disableExtensions: true };
        instantiationService.stub(IEnvironmentService, environmentService);
        instantiationService.stub(INativeEnvironmentService, environmentService);
        instantiationService.stub(IWorkbenchEnvironmentService, environmentService);
        instantiationService.stub(INativeWorkbenchEnvironmentService, environmentService);
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
    test('Test remote install action is disabled when remote server is not available', async () => {
        // single server setup
        const workbenchService = instantiationService.get(IExtensionsWorkbenchService);
        const extensionManagementServerService = instantiationService.get(IExtensionManagementServerService);
        const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`) });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [localWorkspaceExtension]);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
    test('Test remote install action is disabled for local workspace extension if it is uninstalled locally', async () => {
        // multi server setup
        const extensionManagementService = instantiationService.get(IExtensionManagementService);
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, extensionManagementService);
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`) });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [localWorkspaceExtension]);
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.enabled);
        assert.strictEqual('Install in remote', testObject.label);
        uninstallEvent.fire({ identifier: localWorkspaceExtension.identifier, profileLocation: null });
        assert.ok(!testObject.enabled);
    });
    test('Test remote install action is disabled for local workspace extension if it is installed in remote', async () => {
        // multi server setup
        const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`) });
        const remoteWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]), createExtensionManagementService([remoteWorkspaceExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
    test('Test remote install action is enabled for local workspace extension if it has not gallery', async () => {
        // multi server setup
        const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(testObject.enabled);
    });
    test('Test remote install action is disabled for local workspace system extension', async () => {
        // multi server setup
        const localWorkspaceSystemExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`), type: 0 /* ExtensionType.System */ });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceSystemExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceSystemExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
    test('Test remote install action is disabled for local ui extension if it is not installed in remote', async () => {
        // multi server setup
        const localUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localUIExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localUIExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
    test('Test remote install action is disabled for local ui extension if it is also installed in remote', async () => {
        // multi server setup
        const localUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`) });
        const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localUIExtension]), createExtensionManagementService([remoteUIExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localUIExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
    test('Test remote install action is enabled for locally installed language pack extension', async () => {
        // multi server setup
        const languagePackExtension = aLocalExtension('a', { contributes: { localizations: [{ languageId: 'de', translations: [] }] } }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([languagePackExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: languagePackExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.enabled);
        assert.strictEqual('Install in remote', testObject.label);
        assert.strictEqual('extension-action label prominent install-other-server', testObject.class);
    });
    test('Test remote install action is disabled if local language pack extension is uninstalled', async () => {
        // multi server setup
        const extensionManagementService = instantiationService.get(IExtensionManagementService);
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, extensionManagementService);
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const languagePackExtension = aLocalExtension('a', { contributes: { localizations: [{ languageId: 'de', translations: [] }] } }, { location: URI.file(`pub.a`) });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [languagePackExtension]);
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: languagePackExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.enabled);
        assert.strictEqual('Install in remote', testObject.label);
        uninstallEvent.fire({ identifier: languagePackExtension.identifier, profileLocation: null });
        assert.ok(!testObject.enabled);
    });
});
suite('LocalInstallAction', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => setupTest(disposables));
    test('Test local install action is enabled for remote ui extension', async () => {
        // multi server setup
        const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), createExtensionManagementService([remoteUIExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: remoteUIExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.LocalInstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.enabled);
        assert.strictEqual('Install Locally', testObject.label);
        assert.strictEqual('extension-action label prominent install-other-server', testObject.class);
    });
    test('Test local install action is enabled for remote ui+workspace extension', async () => {
        // multi server setup
        const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui', 'workspace'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), createExtensionManagementService([remoteUIExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: remoteUIExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.LocalInstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.enabled);
        assert.strictEqual('Install Locally', testObject.label);
        assert.strictEqual('extension-action label prominent install-other-server', testObject.class);
    });
    test('Test local install action when installing remote ui extension', async () => {
        // multi server setup
        const localExtensionManagementService = createExtensionManagementService();
        const onInstallExtension = new Emitter();
        localExtensionManagementService.onInstallExtension = onInstallExtension.event;
        const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, localExtensionManagementService, createExtensionManagementService([remoteUIExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.stub(IExtensionsWorkbenchService, workbenchService, 'open', undefined);
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        const gallery = aGalleryExtension('a', { identifier: remoteUIExtension.identifier });
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.LocalInstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.enabled);
        assert.strictEqual('Install Locally', testObject.label);
        assert.strictEqual('extension-action label prominent install-other-server', testObject.class);
        onInstallExtension.fire({ identifier: remoteUIExtension.identifier, source: gallery, profileLocation: null });
        assert.ok(testObject.enabled);
        assert.strictEqual('Installing', testObject.label);
        assert.strictEqual('extension-action label install-other-server installing', testObject.class);
    });
    test('Test local install action when installing remote ui extension is finished', async () => {
        // multi server setup
        const localExtensionManagementService = createExtensionManagementService();
        const onInstallExtension = new Emitter();
        localExtensionManagementService.onInstallExtension = onInstallExtension.event;
        const onDidInstallEvent = new Emitter();
        localExtensionManagementService.onDidInstallExtensions = onDidInstallEvent.event;
        const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, localExtensionManagementService, createExtensionManagementService([remoteUIExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.stub(IExtensionsWorkbenchService, workbenchService, 'open', undefined);
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        const gallery = aGalleryExtension('a', { identifier: remoteUIExtension.identifier });
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.LocalInstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.enabled);
        assert.strictEqual('Install Locally', testObject.label);
        assert.strictEqual('extension-action label prominent install-other-server', testObject.class);
        onInstallExtension.fire({ identifier: remoteUIExtension.identifier, source: gallery, profileLocation: null });
        assert.ok(testObject.enabled);
        assert.strictEqual('Installing', testObject.label);
        assert.strictEqual('extension-action label install-other-server installing', testObject.class);
        const installedExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`) });
        const promise = Event.toPromise(testObject.onDidChange);
        onDidInstallEvent.fire([{ identifier: installedExtension.identifier, local: installedExtension, operation: 2 /* InstallOperation.Install */, profileLocation: null }]);
        await promise;
        assert.ok(!testObject.enabled);
    });
    test('Test local install action is enabled for disabled remote ui extension', async () => {
        // multi server setup
        const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), createExtensionManagementService([remoteUIExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        const localUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`) });
        await instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([localUIExtension], 9 /* EnablementState.DisabledGlobally */);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: remoteUIExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.LocalInstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.enabled);
        assert.strictEqual('Install Locally', testObject.label);
        assert.strictEqual('extension-action label prominent install-other-server', testObject.class);
    });
    test('Test local install action is disabled when extension is not set', async () => {
        // multi server setup
        const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), createExtensionManagementService([remoteUIExtension]));
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: remoteUIExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.LocalInstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        assert.ok(!testObject.enabled);
    });
    test('Test local install action is disabled for extension which is not installed', async () => {
        // multi server setup
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService);
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a')));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.LocalInstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const pager = await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = pager.firstPage[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
    test('Test local install action is disabled for remote ui extension which is disabled in env', async () => {
        // multi server setup
        const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const environmentService = { disableExtensions: true };
        instantiationService.stub(IEnvironmentService, environmentService);
        instantiationService.stub(INativeEnvironmentService, environmentService);
        instantiationService.stub(IWorkbenchEnvironmentService, environmentService);
        instantiationService.stub(INativeWorkbenchEnvironmentService, environmentService);
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), createExtensionManagementService([remoteUIExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: remoteUIExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.LocalInstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
    test('Test local install action is disabled when local server is not available', async () => {
        // single server setup
        const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aSingleRemoteExtensionManagementServerService(instantiationService, createExtensionManagementService([remoteUIExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: remoteUIExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.LocalInstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
    test('Test local install action is disabled for remote ui extension if it is installed in local', async () => {
        // multi server setup
        const localUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`) });
        const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localUIExtension]), createExtensionManagementService([remoteUIExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localUIExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.LocalInstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
    test('Test local install action is disabled for remoteUI extension if it is uninstalled locally', async () => {
        // multi server setup
        const extensionManagementService = instantiationService.get(IExtensionManagementService);
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), extensionManagementService);
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [remoteUIExtension]);
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: remoteUIExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.LocalInstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.enabled);
        assert.strictEqual('Install Locally', testObject.label);
        uninstallEvent.fire({ identifier: remoteUIExtension.identifier, profileLocation: null });
        assert.ok(!testObject.enabled);
    });
    test('Test local install action is enabled for remote UI extension if it has gallery', async () => {
        // multi server setup
        const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), createExtensionManagementService([remoteUIExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: remoteUIExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.LocalInstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(testObject.enabled);
    });
    test('Test local install action is disabled for remote UI system extension', async () => {
        // multi server setup
        const remoteUISystemExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }), type: 0 /* ExtensionType.System */ });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), createExtensionManagementService([remoteUISystemExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: remoteUISystemExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.LocalInstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
    test('Test local install action is disabled for remote workspace extension if it is not installed in local', async () => {
        // multi server setup
        const remoteWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), createExtensionManagementService([remoteWorkspaceExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: remoteWorkspaceExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.LocalInstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
    test('Test local install action is disabled for remote workspace extension if it is also installed in local', async () => {
        // multi server setup
        const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspae'] }, { location: URI.file(`pub.a`) });
        const remoteWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]), createExtensionManagementService([remoteWorkspaceExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.LocalInstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
    test('Test local install action is enabled for remotely installed language pack extension', async () => {
        // multi server setup
        const languagePackExtension = aLocalExtension('a', { contributes: { localizations: [{ languageId: 'de', translations: [] }] } }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), createExtensionManagementService([languagePackExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: languagePackExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.LocalInstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.enabled);
        assert.strictEqual('Install Locally', testObject.label);
        assert.strictEqual('extension-action label prominent install-other-server', testObject.class);
    });
    test('Test local install action is disabled if remote language pack extension is uninstalled', async () => {
        // multi server setup
        const extensionManagementService = instantiationService.get(IExtensionManagementService);
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), extensionManagementService);
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const languagePackExtension = aLocalExtension('a', { contributes: { localizations: [{ languageId: 'de', translations: [] }] } }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [languagePackExtension]);
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: languagePackExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.LocalInstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.enabled);
        assert.strictEqual('Install Locally', testObject.label);
        uninstallEvent.fire({ identifier: languagePackExtension.identifier, profileLocation: null });
        assert.ok(!testObject.enabled);
    });
});
function aLocalExtension(name = 'someext', manifest = {}, properties = {}) {
    manifest = { name, publisher: 'pub', version: '1.0.0', ...manifest };
    properties = {
        type: 1 /* ExtensionType.User */,
        location: URI.file(`pub.${name}`),
        identifier: { id: getGalleryExtensionId(manifest.publisher, manifest.name) },
        ...properties,
        isValid: properties.isValid ?? true,
    };
    properties.isBuiltin = properties.type === 0 /* ExtensionType.System */;
    return Object.create({ manifest, ...properties });
}
function aGalleryExtension(name, properties = {}, galleryExtensionProperties = {}, assets = {}) {
    const targetPlatform = getTargetPlatform(platform, arch);
    const galleryExtension = Object.create({ name, publisher: 'pub', version: '1.0.0', allTargetPlatforms: [targetPlatform], properties: {}, assets: {}, isSigned: true, ...properties });
    galleryExtension.properties = { ...galleryExtension.properties, dependencies: [], targetPlatform, ...galleryExtensionProperties };
    galleryExtension.assets = { ...galleryExtension.assets, ...assets };
    galleryExtension.identifier = { id: getGalleryExtensionId(galleryExtension.publisher, galleryExtension.name), uuid: generateUuid() };
    galleryExtension.hasReleaseVersion = true;
    return galleryExtension;
}
function aPage(...objects) {
    return { firstPage: objects, total: objects.length, pageSize: objects.length, getPage: () => null };
}
function aSingleRemoteExtensionManagementServerService(instantiationService, remoteExtensionManagementService) {
    const remoteExtensionManagementServer = {
        id: 'vscode-remote',
        label: 'remote',
        extensionManagementService: remoteExtensionManagementService || createExtensionManagementService(),
    };
    return {
        _serviceBrand: undefined,
        localExtensionManagementServer: null,
        remoteExtensionManagementServer,
        webExtensionManagementServer: null,
        getExtensionManagementServer: (extension) => {
            if (extension.location.scheme === Schemas.vscodeRemote) {
                return remoteExtensionManagementServer;
            }
            return null;
        },
        getExtensionInstallLocation(extension) {
            const server = this.getExtensionManagementServer(extension);
            return server === remoteExtensionManagementServer ? 2 /* ExtensionInstallLocation.Remote */ : 1 /* ExtensionInstallLocation.Local */;
        }
    };
}
function aMultiExtensionManagementServerService(instantiationService, localExtensionManagementService, remoteExtensionManagementService, webExtensionManagementService) {
    const localExtensionManagementServer = localExtensionManagementService === null ? null : {
        id: 'vscode-local',
        label: 'local',
        extensionManagementService: localExtensionManagementService || createExtensionManagementService(),
    };
    const remoteExtensionManagementServer = remoteExtensionManagementService === null ? null : {
        id: 'vscode-remote',
        label: 'remote',
        extensionManagementService: remoteExtensionManagementService || createExtensionManagementService(),
    };
    const webExtensionManagementServer = webExtensionManagementService ? {
        id: 'vscode-web',
        label: 'web',
        extensionManagementService: webExtensionManagementService,
    } : null;
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
            if (extension.location.scheme === Schemas.vscodeUserData) {
                return webExtensionManagementServer;
            }
            throw new Error('');
        },
        getExtensionInstallLocation(extension) {
            const server = this.getExtensionManagementServer(extension);
            if (server === null) {
                return null;
            }
            if (server === remoteExtensionManagementServer) {
                return 2 /* ExtensionInstallLocation.Remote */;
            }
            if (server === webExtensionManagementServer) {
                return 3 /* ExtensionInstallLocation.Web */;
            }
            return 1 /* ExtensionInstallLocation.Local */;
        }
    };
}
function createExtensionManagementService(installed = []) {
    return {
        onInstallExtension: Event.None,
        onDidInstallExtensions: Event.None,
        onUninstallExtension: Event.None,
        onDidUninstallExtension: Event.None,
        onDidChangeProfile: Event.None,
        onDidUpdateExtensionMetadata: Event.None,
        onProfileAwareDidInstallExtensions: Event.None,
        getInstalled: () => Promise.resolve(installed),
        canInstall: async (extension) => { return true; },
        installFromGallery: (extension) => Promise.reject(new Error('not supported')),
        updateMetadata: async (local, metadata, profileLocation) => {
            local.identifier.uuid = metadata.id;
            local.publisherDisplayName = metadata.publisherDisplayName;
            local.publisherId = metadata.publisherId;
            return local;
        },
        async getTargetPlatform() { return getTargetPlatform(platform, arch); },
        async getExtensionsControlManifest() { return { malicious: [], deprecated: {}, search: [], publisherMapping: {} }; },
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc0FjdGlvbnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvdGVzdC9lbGVjdHJvbi1zYW5kYm94L2V4dGVuc2lvbnNBY3Rpb25zLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUM5RixPQUFPLEtBQUssaUJBQWlCLE1BQU0sb0NBQW9DLENBQUM7QUFDeEUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDekYsT0FBTyxFQUNOLDJCQUEyQixFQUFFLHdCQUF3QixFQUNzQyxxQkFBcUIsRUFBMEIsaUJBQWlCLEVBQzNKLE1BQU0sMkVBQTJFLENBQUM7QUFDbkYsT0FBTyxFQUFFLG9DQUFvQyxFQUFtQixpQ0FBaUMsRUFBaUcsb0NBQW9DLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUN2VCxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQztBQUNwSSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUN0SCxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSwwRkFBMEYsQ0FBQztBQUMxSSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUN4SCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDeEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFD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