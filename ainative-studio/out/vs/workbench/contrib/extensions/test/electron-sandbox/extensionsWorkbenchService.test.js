/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as sinon from 'sinon';
import assert from 'assert';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { AutoCheckUpdatesConfigurationKey, AutoUpdateConfigurationKey } from '../../common/extensions.js';
import { ExtensionsWorkbenchService } from '../../browser/extensionsWorkbenchService.js';
import { IExtensionManagementService, IExtensionGalleryService, IExtensionTipsService, getTargetPlatform } from '../../../../../platform/extensionManagement/common/extensionManagement.js';
import { IWorkbenchExtensionEnablementService, IExtensionManagementServerService, IWorkbenchExtensionManagementService } from '../../../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionRecommendationsService } from '../../../../services/extensionRecommendations/common/extensionRecommendations.js';
import { getGalleryExtensionId } from '../../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { anExtensionManagementServerService, TestExtensionEnablementService } from '../../../../services/extensionManagement/test/browser/extensionEnablementService.test.js';
import { ExtensionGalleryService } from '../../../../../platform/extensionManagement/common/extensionGalleryService.js';
import { IURLService } from '../../../../../platform/url/common/url.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { Event, Emitter } from '../../../../../base/common/event.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { TestExtensionTipsService, TestSharedProcessService } from '../../../../test/electron-sandbox/workbenchTestServices.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { IProgressService } from '../../../../../platform/progress/common/progress.js';
import { ProgressService } from '../../../../services/progress/browser/progressService.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { NativeURLService } from '../../../../../platform/url/common/urlService.js';
import { URI } from '../../../../../base/common/uri.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { IRemoteAgentService } from '../../../../services/remote/common/remoteAgentService.js';
import { RemoteAgentService } from '../../../../services/remote/electron-sandbox/remoteAgentService.js';
import { ISharedProcessService } from '../../../../../platform/ipc/electron-sandbox/services.js';
import { TestContextService } from '../../../../test/common/workbenchTestServices.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { ILifecycleService } from '../../../../services/lifecycle/common/lifecycle.js';
import { TestLifecycleService } from '../../../../test/browser/workbenchTestServices.js';
import { Schemas } from '../../../../../base/common/network.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { platform } from '../../../../../base/common/platform.js';
import { arch } from '../../../../../base/common/process.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { toDisposable } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IUpdateService, State } from '../../../../../platform/update/common/update.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { UserDataProfileService } from '../../../../services/userDataProfile/common/userDataProfileService.js';
import { IUserDataProfileService } from '../../../../services/userDataProfile/common/userDataProfile.js';
import { toUserDataProfile } from '../../../../../platform/userDataProfile/common/userDataProfile.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
suite('ExtensionsWorkbenchServiceTest', () => {
    let instantiationService;
    let testObject;
    const disposableStore = ensureNoDisposablesAreLeakedInTestSuite();
    let installEvent, didInstallEvent, uninstallEvent, didUninstallEvent;
    setup(async () => {
        disposableStore.add(toDisposable(() => sinon.restore()));
        installEvent = disposableStore.add(new Emitter());
        didInstallEvent = disposableStore.add(new Emitter());
        uninstallEvent = disposableStore.add(new Emitter());
        didUninstallEvent = disposableStore.add(new Emitter());
        instantiationService = disposableStore.add(new TestInstantiationService());
        instantiationService.stub(ITelemetryService, NullTelemetryService);
        instantiationService.stub(ILogService, NullLogService);
        instantiationService.stub(IFileService, disposableStore.add(new FileService(new NullLogService())));
        instantiationService.stub(IProgressService, ProgressService);
        instantiationService.stub(IProductService, {});
        instantiationService.stub(IExtensionGalleryService, ExtensionGalleryService);
        instantiationService.stub(IURLService, NativeURLService);
        instantiationService.stub(ISharedProcessService, TestSharedProcessService);
        instantiationService.stub(IContextKeyService, new MockContextKeyService());
        instantiationService.stub(IWorkspaceContextService, new TestContextService());
        stubConfiguration();
        instantiationService.stub(IRemoteAgentService, RemoteAgentService);
        instantiationService.stub(IUserDataProfileService, disposableStore.add(new UserDataProfileService(toUserDataProfile('test', 'test', URI.file('foo'), URI.file('cache')))));
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
            getTargetPlatform: async () => getTargetPlatform(platform, arch),
            async resetPinnedStateForAllUserExtensions(pinned) { }
        });
        instantiationService.stub(IExtensionManagementServerService, anExtensionManagementServerService({
            id: 'local',
            label: 'local',
            extensionManagementService: instantiationService.get(IExtensionManagementService),
        }, null, null));
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        instantiationService.stub(ILifecycleService, disposableStore.add(new TestLifecycleService()));
        instantiationService.stub(IExtensionTipsService, disposableStore.add(instantiationService.createInstance(TestExtensionTipsService)));
        instantiationService.stub(IExtensionRecommendationsService, {});
        instantiationService.stub(INotificationService, { prompt: () => null });
        instantiationService.stub(IExtensionService, {
            onDidChangeExtensions: Event.None,
            extensions: [],
            async whenInstalledExtensionsRegistered() { return true; }
        });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', []);
        instantiationService.stub(IExtensionGalleryService, 'isEnabled', true);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage());
        instantiationService.stubPromise(IExtensionGalleryService, 'getExtensions', []);
        instantiationService.stubPromise(INotificationService, 'prompt', 0);
        instantiationService.get(IWorkbenchExtensionEnablementService).reset();
        instantiationService.stub(IUpdateService, { onStateChange: Event.None, state: State.Uninitialized });
    });
    test('test gallery extension', async () => {
        const expected = aGalleryExtension('expectedName', {
            displayName: 'expectedDisplayName',
            version: '1.5.0',
            publisherId: 'expectedPublisherId',
            publisher: 'expectedPublisher',
            publisherDisplayName: 'expectedPublisherDisplayName',
            description: 'expectedDescription',
            installCount: 1000,
            rating: 4,
            ratingCount: 100
        }, {
            dependencies: ['pub.1', 'pub.2'],
        }, {
            manifest: { uri: 'uri:manifest', fallbackUri: 'fallback:manifest' },
            readme: { uri: 'uri:readme', fallbackUri: 'fallback:readme' },
            changelog: { uri: 'uri:changelog', fallbackUri: 'fallback:changlog' },
            download: { uri: 'uri:download', fallbackUri: 'fallback:download' },
            icon: { uri: 'uri:icon', fallbackUri: 'fallback:icon' },
            license: { uri: 'uri:license', fallbackUri: 'fallback:license' },
            repository: { uri: 'uri:repository', fallbackUri: 'fallback:repository' },
            signature: { uri: 'uri:signature', fallbackUri: 'fallback:signature' },
            coreTranslations: []
        });
        testObject = await aWorkbenchService();
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(expected));
        return testObject.queryGallery(CancellationToken.None).then(pagedResponse => {
            assert.strictEqual(1, pagedResponse.firstPage.length);
            const actual = pagedResponse.firstPage[0];
            assert.strictEqual(1 /* ExtensionType.User */, actual.type);
            assert.strictEqual('expectedName', actual.name);
            assert.strictEqual('expectedDisplayName', actual.displayName);
            assert.strictEqual('expectedpublisher.expectedname', actual.identifier.id);
            assert.strictEqual('expectedPublisher', actual.publisher);
            assert.strictEqual('expectedPublisherDisplayName', actual.publisherDisplayName);
            assert.strictEqual('1.5.0', actual.version);
            assert.strictEqual('1.5.0', actual.latestVersion);
            assert.strictEqual('expectedDescription', actual.description);
            assert.strictEqual('uri:icon', actual.iconUrl);
            assert.strictEqual('fallback:icon', actual.iconUrlFallback);
            assert.strictEqual('uri:license', actual.licenseUrl);
            assert.strictEqual(3 /* ExtensionState.Uninstalled */, actual.state);
            assert.strictEqual(1000, actual.installCount);
            assert.strictEqual(4, actual.rating);
            assert.strictEqual(100, actual.ratingCount);
            assert.strictEqual(false, actual.outdated);
            assert.deepStrictEqual(['pub.1', 'pub.2'], actual.dependencies);
        });
    });
    test('test for empty installed extensions', async () => {
        testObject = await aWorkbenchService();
        assert.deepStrictEqual([], testObject.local);
    });
    test('test for installed extensions', async () => {
        const expected1 = aLocalExtension('local1', {
            publisher: 'localPublisher1',
            version: '1.1.0',
            displayName: 'localDisplayName1',
            description: 'localDescription1',
            icon: 'localIcon1',
            extensionDependencies: ['pub.1', 'pub.2'],
        }, {
            type: 1 /* ExtensionType.User */,
            readmeUrl: 'localReadmeUrl1',
            changelogUrl: 'localChangelogUrl1',
            location: URI.file('localPath1')
        });
        const expected2 = aLocalExtension('local2', {
            publisher: 'localPublisher2',
            version: '1.2.0',
            displayName: 'localDisplayName2',
            description: 'localDescription2',
        }, {
            type: 0 /* ExtensionType.System */,
            readmeUrl: 'localReadmeUrl2',
            changelogUrl: 'localChangelogUrl2',
        });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [expected1, expected2]);
        testObject = await aWorkbenchService();
        const actuals = testObject.local;
        assert.strictEqual(2, actuals.length);
        let actual = actuals[0];
        assert.strictEqual(1 /* ExtensionType.User */, actual.type);
        assert.strictEqual('local1', actual.name);
        assert.strictEqual('localDisplayName1', actual.displayName);
        assert.strictEqual('localpublisher1.local1', actual.identifier.id);
        assert.strictEqual('localPublisher1', actual.publisher);
        assert.strictEqual('1.1.0', actual.version);
        assert.strictEqual('1.1.0', actual.latestVersion);
        assert.strictEqual('localDescription1', actual.description);
        assert.ok(actual.iconUrl === 'file:///localPath1/localIcon1' || actual.iconUrl === 'vscode-file://vscode-app/localPath1/localIcon1');
        assert.ok(actual.iconUrlFallback === 'file:///localPath1/localIcon1' || actual.iconUrlFallback === 'vscode-file://vscode-app/localPath1/localIcon1');
        assert.strictEqual(undefined, actual.licenseUrl);
        assert.strictEqual(1 /* ExtensionState.Installed */, actual.state);
        assert.strictEqual(undefined, actual.installCount);
        assert.strictEqual(undefined, actual.rating);
        assert.strictEqual(undefined, actual.ratingCount);
        assert.strictEqual(false, actual.outdated);
        assert.deepStrictEqual(['pub.1', 'pub.2'], actual.dependencies);
        actual = actuals[1];
        assert.strictEqual(0 /* ExtensionType.System */, actual.type);
        assert.strictEqual('local2', actual.name);
        assert.strictEqual('localDisplayName2', actual.displayName);
        assert.strictEqual('localpublisher2.local2', actual.identifier.id);
        assert.strictEqual('localPublisher2', actual.publisher);
        assert.strictEqual('1.2.0', actual.version);
        assert.strictEqual('1.2.0', actual.latestVersion);
        assert.strictEqual('localDescription2', actual.description);
        assert.strictEqual(undefined, actual.licenseUrl);
        assert.strictEqual(1 /* ExtensionState.Installed */, actual.state);
        assert.strictEqual(undefined, actual.installCount);
        assert.strictEqual(undefined, actual.rating);
        assert.strictEqual(undefined, actual.ratingCount);
        assert.strictEqual(false, actual.outdated);
        assert.deepStrictEqual([], actual.dependencies);
    });
    test('test installed extensions get syncs with gallery', async () => {
        const local1 = aLocalExtension('local1', {
            publisher: 'localPublisher1',
            version: '1.1.0',
            displayName: 'localDisplayName1',
            description: 'localDescription1',
            icon: 'localIcon1',
            extensionDependencies: ['pub.1', 'pub.2'],
        }, {
            type: 1 /* ExtensionType.User */,
            readmeUrl: 'localReadmeUrl1',
            changelogUrl: 'localChangelogUrl1',
            location: URI.file('localPath1')
        });
        const local2 = aLocalExtension('local2', {
            publisher: 'localPublisher2',
            version: '1.2.0',
            displayName: 'localDisplayName2',
            description: 'localDescription2',
        }, {
            type: 0 /* ExtensionType.System */,
            readmeUrl: 'localReadmeUrl2',
            changelogUrl: 'localChangelogUrl2',
        });
        const gallery1 = aGalleryExtension(local1.manifest.name, {
            identifier: local1.identifier,
            displayName: 'expectedDisplayName',
            version: '1.5.0',
            publisherId: 'expectedPublisherId',
            publisher: local1.manifest.publisher,
            publisherDisplayName: 'expectedPublisherDisplayName',
            description: 'expectedDescription',
            installCount: 1000,
            rating: 4,
            ratingCount: 100
        }, {
            dependencies: ['pub.1'],
        }, {
            manifest: { uri: 'uri:manifest', fallbackUri: 'fallback:manifest' },
            readme: { uri: 'uri:readme', fallbackUri: 'fallback:readme' },
            changelog: { uri: 'uri:changelog', fallbackUri: 'fallback:changlog' },
            download: { uri: 'uri:download', fallbackUri: 'fallback:download' },
            icon: { uri: 'uri:icon', fallbackUri: 'fallback:icon' },
            license: { uri: 'uri:license', fallbackUri: 'fallback:license' },
            repository: { uri: 'uri:repository', fallbackUri: 'fallback:repository' },
            signature: { uri: 'uri:signature', fallbackUri: 'fallback:signature' },
            coreTranslations: []
        });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local1, local2]);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery1));
        instantiationService.stubPromise(IExtensionGalleryService, 'getCompatibleExtension', gallery1);
        instantiationService.stubPromise(IExtensionGalleryService, 'getExtensions', [gallery1]);
        testObject = await aWorkbenchService();
        await testObject.queryLocal();
        return Event.toPromise(testObject.onChange).then(() => {
            const actuals = testObject.local;
            assert.strictEqual(2, actuals.length);
            let actual = actuals[0];
            assert.strictEqual(1 /* ExtensionType.User */, actual.type);
            assert.strictEqual('local1', actual.name);
            assert.strictEqual('expectedDisplayName', actual.displayName);
            assert.strictEqual('localpublisher1.local1', actual.identifier.id);
            assert.strictEqual('localPublisher1', actual.publisher);
            assert.strictEqual('1.1.0', actual.version);
            assert.strictEqual('1.5.0', actual.latestVersion);
            assert.strictEqual('expectedDescription', actual.description);
            assert.strictEqual('uri:icon', actual.iconUrl);
            assert.strictEqual('fallback:icon', actual.iconUrlFallback);
            assert.strictEqual(1 /* ExtensionState.Installed */, actual.state);
            assert.strictEqual('uri:license', actual.licenseUrl);
            assert.strictEqual(1000, actual.installCount);
            assert.strictEqual(4, actual.rating);
            assert.strictEqual(100, actual.ratingCount);
            assert.strictEqual(true, actual.outdated);
            assert.deepStrictEqual(['pub.1'], actual.dependencies);
            actual = actuals[1];
            assert.strictEqual(0 /* ExtensionType.System */, actual.type);
            assert.strictEqual('local2', actual.name);
            assert.strictEqual('localDisplayName2', actual.displayName);
            assert.strictEqual('localpublisher2.local2', actual.identifier.id);
            assert.strictEqual('localPublisher2', actual.publisher);
            assert.strictEqual('1.2.0', actual.version);
            assert.strictEqual('1.2.0', actual.latestVersion);
            assert.strictEqual('localDescription2', actual.description);
            assert.strictEqual(undefined, actual.licenseUrl);
            assert.strictEqual(1 /* ExtensionState.Installed */, actual.state);
            assert.strictEqual(undefined, actual.installCount);
            assert.strictEqual(undefined, actual.rating);
            assert.strictEqual(undefined, actual.ratingCount);
            assert.strictEqual(false, actual.outdated);
            assert.deepStrictEqual([], actual.dependencies);
        });
    });
    test('test extension state computation', async () => {
        const gallery = aGalleryExtension('gallery1');
        testObject = await aWorkbenchService();
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        return testObject.queryGallery(CancellationToken.None).then(page => {
            const extension = page.firstPage[0];
            assert.strictEqual(3 /* ExtensionState.Uninstalled */, extension.state);
            const identifier = gallery.identifier;
            // Installing
            installEvent.fire({ identifier, source: gallery, profileLocation: null });
            const local = testObject.local;
            assert.strictEqual(1, local.length);
            const actual = local[0];
            assert.strictEqual(`${gallery.publisher}.${gallery.name}`, actual.identifier.id);
            assert.strictEqual(0 /* ExtensionState.Installing */, actual.state);
            // Installed
            didInstallEvent.fire([{ identifier, source: gallery, operation: 2 /* InstallOperation.Install */, local: aLocalExtension(gallery.name, gallery, { identifier }), profileLocation: null }]);
            assert.strictEqual(1 /* ExtensionState.Installed */, actual.state);
            assert.strictEqual(1, testObject.local.length);
            testObject.uninstall(actual);
            // Uninstalling
            uninstallEvent.fire({ identifier, profileLocation: null });
            assert.strictEqual(2 /* ExtensionState.Uninstalling */, actual.state);
            // Uninstalled
            didUninstallEvent.fire({ identifier, profileLocation: null });
            assert.strictEqual(3 /* ExtensionState.Uninstalled */, actual.state);
            assert.strictEqual(0, testObject.local.length);
        });
    });
    test('test extension doesnot show outdated for system extensions', async () => {
        const local = aLocalExtension('a', { version: '1.0.1' }, { type: 0 /* ExtensionType.System */ });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension(local.manifest.name, { identifier: local.identifier, version: '1.0.2' })));
        testObject = await aWorkbenchService();
        await testObject.queryLocal();
        assert.ok(!testObject.local[0].outdated);
    });
    test('test canInstall returns false for extensions with out gallery', async () => {
        const local = aLocalExtension('a', { version: '1.0.1' }, { type: 0 /* ExtensionType.System */ });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        testObject = await aWorkbenchService();
        const target = testObject.local[0];
        testObject.uninstall(target);
        uninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
        didUninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
        assert.ok(await testObject.canInstall(target) !== true);
    });
    test('test canInstall returns false for a system extension', async () => {
        const local = aLocalExtension('a', { version: '1.0.1' }, { type: 0 /* ExtensionType.System */ });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension(local.manifest.name, { identifier: local.identifier })));
        testObject = await aWorkbenchService();
        const target = testObject.local[0];
        assert.ok(await testObject.canInstall(target) !== true);
    });
    test('test canInstall returns true for extensions with gallery', async () => {
        const local = aLocalExtension('a', { version: '1.0.1' }, { type: 1 /* ExtensionType.User */ });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        const gallery = aGalleryExtension(local.manifest.name, { identifier: local.identifier });
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        instantiationService.stubPromise(IExtensionGalleryService, 'getCompatibleExtension', gallery);
        instantiationService.stubPromise(IExtensionGalleryService, 'getExtensions', [gallery]);
        testObject = await aWorkbenchService();
        const target = testObject.local[0];
        await Event.toPromise(Event.filter(testObject.onChange, e => !!e?.gallery));
        assert.equal(await testObject.canInstall(target), true);
    });
    test('test onchange event is triggered while installing', async () => {
        const gallery = aGalleryExtension('gallery1');
        testObject = await aWorkbenchService();
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        const page = await testObject.queryGallery(CancellationToken.None);
        const extension = page.firstPage[0];
        assert.strictEqual(3 /* ExtensionState.Uninstalled */, extension.state);
        installEvent.fire({ identifier: gallery.identifier, source: gallery, profileLocation: null });
        const promise = Event.toPromise(testObject.onChange);
        // Installed
        didInstallEvent.fire([{ identifier: gallery.identifier, source: gallery, operation: 2 /* InstallOperation.Install */, local: aLocalExtension(gallery.name, gallery, gallery), profileLocation: null }]);
        await promise;
    });
    test('test onchange event is triggered when installation is finished', async () => {
        const gallery = aGalleryExtension('gallery1');
        testObject = await aWorkbenchService();
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        const target = sinon.spy();
        return testObject.queryGallery(CancellationToken.None).then(page => {
            const extension = page.firstPage[0];
            assert.strictEqual(3 /* ExtensionState.Uninstalled */, extension.state);
            disposableStore.add(testObject.onChange(target));
            // Installing
            installEvent.fire({ identifier: gallery.identifier, source: gallery, profileLocation: null });
            assert.ok(target.calledOnce);
        });
    });
    test('test onchange event is triggered while uninstalling', async () => {
        const local = aLocalExtension('a', {}, { type: 0 /* ExtensionType.System */ });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        testObject = await aWorkbenchService();
        const target = sinon.spy();
        testObject.uninstall(testObject.local[0]);
        disposableStore.add(testObject.onChange(target));
        uninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
        assert.ok(target.calledOnce);
    });
    test('test onchange event is triggered when uninstalling is finished', async () => {
        const local = aLocalExtension('a', {}, { type: 0 /* ExtensionType.System */ });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        testObject = await aWorkbenchService();
        const target = sinon.spy();
        testObject.uninstall(testObject.local[0]);
        uninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
        disposableStore.add(testObject.onChange(target));
        didUninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
        assert.ok(target.calledOnce);
    });
    test('test uninstalled extensions are always enabled', async () => {
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([aLocalExtension('b')], 9 /* EnablementState.DisabledGlobally */)
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([aLocalExtension('c')], 10 /* EnablementState.DisabledWorkspace */))
            .then(async () => {
            testObject = await aWorkbenchService();
            instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a')));
            return testObject.queryGallery(CancellationToken.None).then(pagedResponse => {
                const actual = pagedResponse.firstPage[0];
                assert.strictEqual(actual.enablementState, 11 /* EnablementState.EnabledGlobally */);
            });
        });
    });
    test('test enablement state installed enabled extension', async () => {
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([aLocalExtension('b')], 9 /* EnablementState.DisabledGlobally */)
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([aLocalExtension('c')], 10 /* EnablementState.DisabledWorkspace */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [aLocalExtension('a')]);
            testObject = await aWorkbenchService();
            const actual = testObject.local[0];
            assert.strictEqual(actual.enablementState, 11 /* EnablementState.EnabledGlobally */);
        });
    });
    test('test workspace disabled extension', async () => {
        const extensionA = aLocalExtension('a');
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([aLocalExtension('b')], 9 /* EnablementState.DisabledGlobally */)
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([aLocalExtension('d')], 9 /* EnablementState.DisabledGlobally */))
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionA], 10 /* EnablementState.DisabledWorkspace */))
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([aLocalExtension('e')], 10 /* EnablementState.DisabledWorkspace */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [extensionA]);
            testObject = await aWorkbenchService();
            const actual = testObject.local[0];
            assert.strictEqual(actual.enablementState, 10 /* EnablementState.DisabledWorkspace */);
        });
    });
    test('test globally disabled extension', async () => {
        const localExtension = aLocalExtension('a');
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([localExtension], 9 /* EnablementState.DisabledGlobally */)
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([aLocalExtension('d')], 9 /* EnablementState.DisabledGlobally */))
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([aLocalExtension('c')], 10 /* EnablementState.DisabledWorkspace */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [localExtension]);
            testObject = await aWorkbenchService();
            const actual = testObject.local[0];
            assert.strictEqual(actual.enablementState, 9 /* EnablementState.DisabledGlobally */);
        });
    });
    test('test enablement state is updated for user extensions', async () => {
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([aLocalExtension('c')], 9 /* EnablementState.DisabledGlobally */)
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([aLocalExtension('b')], 10 /* EnablementState.DisabledWorkspace */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [aLocalExtension('a')]);
            testObject = await aWorkbenchService();
            return testObject.setEnablement(testObject.local[0], 10 /* EnablementState.DisabledWorkspace */)
                .then(() => {
                const actual = testObject.local[0];
                assert.strictEqual(actual.enablementState, 10 /* EnablementState.DisabledWorkspace */);
            });
        });
    });
    test('test enable extension globally when extension is disabled for workspace', async () => {
        const localExtension = aLocalExtension('a');
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([localExtension], 10 /* EnablementState.DisabledWorkspace */)
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [localExtension]);
            testObject = await aWorkbenchService();
            return testObject.setEnablement(testObject.local[0], 11 /* EnablementState.EnabledGlobally */)
                .then(() => {
                const actual = testObject.local[0];
                assert.strictEqual(actual.enablementState, 11 /* EnablementState.EnabledGlobally */);
            });
        });
    });
    test('test disable extension globally', async () => {
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [aLocalExtension('a')]);
        testObject = await aWorkbenchService();
        return testObject.setEnablement(testObject.local[0], 9 /* EnablementState.DisabledGlobally */)
            .then(() => {
            const actual = testObject.local[0];
            assert.strictEqual(actual.enablementState, 9 /* EnablementState.DisabledGlobally */);
        });
    });
    test('test system extensions can be disabled', async () => {
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [aLocalExtension('a', {}, { type: 0 /* ExtensionType.System */ })]);
        testObject = await aWorkbenchService();
        return testObject.setEnablement(testObject.local[0], 9 /* EnablementState.DisabledGlobally */)
            .then(() => {
            const actual = testObject.local[0];
            assert.strictEqual(actual.enablementState, 9 /* EnablementState.DisabledGlobally */);
        });
    });
    test('test enablement state is updated on change from outside', async () => {
        const localExtension = aLocalExtension('a');
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([aLocalExtension('c')], 9 /* EnablementState.DisabledGlobally */)
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([aLocalExtension('b')], 10 /* EnablementState.DisabledWorkspace */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [localExtension]);
            testObject = await aWorkbenchService();
            return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([localExtension], 9 /* EnablementState.DisabledGlobally */)
                .then(() => {
                const actual = testObject.local[0];
                assert.strictEqual(actual.enablementState, 9 /* EnablementState.DisabledGlobally */);
            });
        });
    });
    test('test disable extension with dependencies disable only itself', async () => {
        const extensionA = aLocalExtension('a', { extensionDependencies: ['pub.b'] });
        const extensionB = aLocalExtension('b');
        const extensionC = aLocalExtension('c');
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionA], 11 /* EnablementState.EnabledGlobally */)
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionB], 11 /* EnablementState.EnabledGlobally */))
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionC], 11 /* EnablementState.EnabledGlobally */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [extensionA, extensionB, extensionC]);
            testObject = await aWorkbenchService();
            return testObject.setEnablement(testObject.local[0], 9 /* EnablementState.DisabledGlobally */)
                .then(() => {
                assert.strictEqual(testObject.local[0].enablementState, 9 /* EnablementState.DisabledGlobally */);
                assert.strictEqual(testObject.local[1].enablementState, 11 /* EnablementState.EnabledGlobally */);
            });
        });
    });
    test('test disable extension pack disables the pack', async () => {
        const extensionA = aLocalExtension('a', { extensionPack: ['pub.b'] });
        const extensionB = aLocalExtension('b');
        const extensionC = aLocalExtension('c');
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionA], 11 /* EnablementState.EnabledGlobally */)
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionB], 11 /* EnablementState.EnabledGlobally */))
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionC], 11 /* EnablementState.EnabledGlobally */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [extensionA, extensionB, extensionC]);
            testObject = await aWorkbenchService();
            return testObject.setEnablement(testObject.local[0], 9 /* EnablementState.DisabledGlobally */)
                .then(() => {
                assert.strictEqual(testObject.local[0].enablementState, 9 /* EnablementState.DisabledGlobally */);
                assert.strictEqual(testObject.local[1].enablementState, 9 /* EnablementState.DisabledGlobally */);
            });
        });
    });
    test('test disable extension pack disable all', async () => {
        const extensionA = aLocalExtension('a', { extensionPack: ['pub.b'] });
        const extensionB = aLocalExtension('b');
        const extensionC = aLocalExtension('c');
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionA], 11 /* EnablementState.EnabledGlobally */)
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionB], 11 /* EnablementState.EnabledGlobally */))
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionC], 11 /* EnablementState.EnabledGlobally */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [extensionA, extensionB, extensionC]);
            testObject = await aWorkbenchService();
            return testObject.setEnablement(testObject.local[0], 9 /* EnablementState.DisabledGlobally */)
                .then(() => {
                assert.strictEqual(testObject.local[0].enablementState, 9 /* EnablementState.DisabledGlobally */);
                assert.strictEqual(testObject.local[1].enablementState, 9 /* EnablementState.DisabledGlobally */);
            });
        });
    });
    test('test disable extension fails if extension is a dependent of other', async () => {
        const extensionA = aLocalExtension('a', { extensionDependencies: ['pub.b'] });
        const extensionB = aLocalExtension('b');
        const extensionC = aLocalExtension('c');
        instantiationService.stub(INotificationService, {
            prompt(severity, message, choices, options) {
                options.onCancel();
                return null;
            }
        });
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionA], 11 /* EnablementState.EnabledGlobally */)
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionB], 11 /* EnablementState.EnabledGlobally */))
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionC], 11 /* EnablementState.EnabledGlobally */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [extensionA, extensionB, extensionC]);
            testObject = await aWorkbenchService();
            return testObject.setEnablement(testObject.local[1], 9 /* EnablementState.DisabledGlobally */).then(() => assert.fail('Should fail'), error => assert.ok(true));
        });
    });
    test('test disable extension disables all dependents when chosen to disable all', async () => {
        const extensionA = aLocalExtension('a', { extensionDependencies: ['pub.b'] });
        const extensionB = aLocalExtension('b');
        const extensionC = aLocalExtension('c');
        instantiationService.stub(IDialogService, {
            prompt() {
                return Promise.resolve({ result: true });
            }
        });
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionA], 11 /* EnablementState.EnabledGlobally */)
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionB], 11 /* EnablementState.EnabledGlobally */))
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionC], 11 /* EnablementState.EnabledGlobally */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [extensionA, extensionB, extensionC]);
            testObject = await aWorkbenchService();
            await testObject.setEnablement(testObject.local[1], 9 /* EnablementState.DisabledGlobally */);
            assert.strictEqual(testObject.local[0].enablementState, 9 /* EnablementState.DisabledGlobally */);
            assert.strictEqual(testObject.local[1].enablementState, 9 /* EnablementState.DisabledGlobally */);
        });
    });
    test('test disable extension when extension is part of a pack', async () => {
        const extensionA = aLocalExtension('a', { extensionPack: ['pub.b'] });
        const extensionB = aLocalExtension('b');
        const extensionC = aLocalExtension('c');
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionA], 11 /* EnablementState.EnabledGlobally */)
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionB], 11 /* EnablementState.EnabledGlobally */))
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionC], 11 /* EnablementState.EnabledGlobally */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [extensionA, extensionB, extensionC]);
            testObject = await aWorkbenchService();
            return testObject.setEnablement(testObject.local[1], 9 /* EnablementState.DisabledGlobally */)
                .then(() => {
                assert.strictEqual(testObject.local[1].enablementState, 9 /* EnablementState.DisabledGlobally */);
            });
        });
    });
    test('test disable both dependency and dependent do not promot and do not fail', async () => {
        const extensionA = aLocalExtension('a', { extensionDependencies: ['pub.b'] });
        const extensionB = aLocalExtension('b');
        const extensionC = aLocalExtension('c');
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionA], 11 /* EnablementState.EnabledGlobally */)
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionB], 11 /* EnablementState.EnabledGlobally */))
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionC], 11 /* EnablementState.EnabledGlobally */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [extensionA, extensionB, extensionC]);
            const target = sinon.spy();
            testObject = await aWorkbenchService();
            return testObject.setEnablement([testObject.local[1], testObject.local[0]], 9 /* EnablementState.DisabledGlobally */)
                .then(() => {
                assert.ok(!target.called);
                assert.strictEqual(testObject.local[0].enablementState, 9 /* EnablementState.DisabledGlobally */);
                assert.strictEqual(testObject.local[1].enablementState, 9 /* EnablementState.DisabledGlobally */);
            });
        });
    });
    test('test enable both dependency and dependent do not promot and do not fail', async () => {
        const extensionA = aLocalExtension('a', { extensionDependencies: ['pub.b'] });
        const extensionB = aLocalExtension('b');
        const extensionC = aLocalExtension('c');
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionA], 9 /* EnablementState.DisabledGlobally */)
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionB], 9 /* EnablementState.DisabledGlobally */))
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionC], 9 /* EnablementState.DisabledGlobally */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [extensionA, extensionB, extensionC]);
            const target = sinon.spy();
            testObject = await aWorkbenchService();
            return testObject.setEnablement([testObject.local[1], testObject.local[0]], 11 /* EnablementState.EnabledGlobally */)
                .then(() => {
                assert.ok(!target.called);
                assert.strictEqual(testObject.local[0].enablementState, 11 /* EnablementState.EnabledGlobally */);
                assert.strictEqual(testObject.local[1].enablementState, 11 /* EnablementState.EnabledGlobally */);
            });
        });
    });
    test('test disable extension does not fail if its dependency is a dependent of other but chosen to disable only itself', async () => {
        const extensionA = aLocalExtension('a', { extensionDependencies: ['pub.b'] });
        const extensionB = aLocalExtension('b');
        const extensionC = aLocalExtension('c', { extensionDependencies: ['pub.b'] });
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionA], 11 /* EnablementState.EnabledGlobally */)
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionB], 11 /* EnablementState.EnabledGlobally */))
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionC], 11 /* EnablementState.EnabledGlobally */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [extensionA, extensionB, extensionC]);
            testObject = await aWorkbenchService();
            return testObject.setEnablement(testObject.local[0], 9 /* EnablementState.DisabledGlobally */)
                .then(() => {
                assert.strictEqual(testObject.local[0].enablementState, 9 /* EnablementState.DisabledGlobally */);
            });
        });
    });
    test('test disable extension if its dependency is a dependent of other disabled extension', async () => {
        const extensionA = aLocalExtension('a', { extensionDependencies: ['pub.b'] });
        const extensionB = aLocalExtension('b');
        const extensionC = aLocalExtension('c', { extensionDependencies: ['pub.b'] });
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionA], 11 /* EnablementState.EnabledGlobally */)
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionB], 11 /* EnablementState.EnabledGlobally */))
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionC], 9 /* EnablementState.DisabledGlobally */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [extensionA, extensionB, extensionC]);
            testObject = await aWorkbenchService();
            return testObject.setEnablement(testObject.local[0], 9 /* EnablementState.DisabledGlobally */)
                .then(() => {
                assert.strictEqual(testObject.local[0].enablementState, 9 /* EnablementState.DisabledGlobally */);
            });
        });
    });
    test('test disable extension if its dependencys dependency is itself', async () => {
        const extensionA = aLocalExtension('a', { extensionDependencies: ['pub.b'] });
        const extensionB = aLocalExtension('b', { extensionDependencies: ['pub.a'] });
        const extensionC = aLocalExtension('c');
        instantiationService.stub(INotificationService, {
            prompt(severity, message, choices, options) {
                options.onCancel();
                return null;
            }
        });
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionA], 11 /* EnablementState.EnabledGlobally */)
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionB], 11 /* EnablementState.EnabledGlobally */))
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionC], 11 /* EnablementState.EnabledGlobally */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [extensionA, extensionB, extensionC]);
            testObject = await aWorkbenchService();
            return testObject.setEnablement(testObject.local[0], 9 /* EnablementState.DisabledGlobally */)
                .then(() => assert.fail('An extension with dependent should not be disabled'), () => null);
        });
    });
    test('test disable extension if its dependency is dependent and is disabled', async () => {
        const extensionA = aLocalExtension('a', { extensionDependencies: ['pub.b'] });
        const extensionB = aLocalExtension('b');
        const extensionC = aLocalExtension('c', { extensionDependencies: ['pub.b'] });
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionA], 11 /* EnablementState.EnabledGlobally */)
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionB], 9 /* EnablementState.DisabledGlobally */))
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionC], 11 /* EnablementState.EnabledGlobally */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [extensionA, extensionB, extensionC]);
            testObject = await aWorkbenchService();
            return testObject.setEnablement(testObject.local[0], 9 /* EnablementState.DisabledGlobally */)
                .then(() => assert.strictEqual(testObject.local[0].enablementState, 9 /* EnablementState.DisabledGlobally */));
        });
    });
    test('test disable extension with cyclic dependencies', async () => {
        const extensionA = aLocalExtension('a', { extensionDependencies: ['pub.b'] });
        const extensionB = aLocalExtension('b', { extensionDependencies: ['pub.c'] });
        const extensionC = aLocalExtension('c', { extensionDependencies: ['pub.a'] });
        instantiationService.stub(INotificationService, {
            prompt(severity, message, choices, options) {
                options.onCancel();
                return null;
            }
        });
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionA], 11 /* EnablementState.EnabledGlobally */)
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionB], 11 /* EnablementState.EnabledGlobally */))
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionC], 11 /* EnablementState.EnabledGlobally */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [extensionA, extensionB, extensionC]);
            testObject = await aWorkbenchService();
            return testObject.setEnablement(testObject.local[0], 9 /* EnablementState.DisabledGlobally */)
                .then(() => assert.fail('An extension with dependent should not be disabled'), () => null);
        });
    });
    test('test enable extension with dependencies enable all', async () => {
        const extensionA = aLocalExtension('a', { extensionDependencies: ['pub.b'] });
        const extensionB = aLocalExtension('b');
        const extensionC = aLocalExtension('c');
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionA], 9 /* EnablementState.DisabledGlobally */)
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionB], 9 /* EnablementState.DisabledGlobally */))
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionC], 9 /* EnablementState.DisabledGlobally */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [extensionA, extensionB, extensionC]);
            testObject = await aWorkbenchService();
            return testObject.setEnablement(testObject.local[0], 11 /* EnablementState.EnabledGlobally */)
                .then(() => {
                assert.strictEqual(testObject.local[0].enablementState, 11 /* EnablementState.EnabledGlobally */);
                assert.strictEqual(testObject.local[1].enablementState, 11 /* EnablementState.EnabledGlobally */);
            });
        });
    });
    test('test enable extension with dependencies does not prompt if dependency is enabled already', async () => {
        const extensionA = aLocalExtension('a', { extensionDependencies: ['pub.b'] });
        const extensionB = aLocalExtension('b');
        const extensionC = aLocalExtension('c');
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionA], 9 /* EnablementState.DisabledGlobally */)
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionB], 11 /* EnablementState.EnabledGlobally */))
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionC], 9 /* EnablementState.DisabledGlobally */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [extensionA, extensionB, extensionC]);
            const target = sinon.spy();
            testObject = await aWorkbenchService();
            return testObject.setEnablement(testObject.local[0], 11 /* EnablementState.EnabledGlobally */)
                .then(() => {
                assert.ok(!target.called);
                assert.strictEqual(testObject.local[0].enablementState, 11 /* EnablementState.EnabledGlobally */);
            });
        });
    });
    test('test enable extension with dependency does not prompt if both are enabled', async () => {
        const extensionA = aLocalExtension('a', { extensionDependencies: ['pub.b'] });
        const extensionB = aLocalExtension('b');
        const extensionC = aLocalExtension('c');
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionA], 9 /* EnablementState.DisabledGlobally */)
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionB], 9 /* EnablementState.DisabledGlobally */))
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionC], 9 /* EnablementState.DisabledGlobally */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [extensionA, extensionB, extensionC]);
            const target = sinon.spy();
            testObject = await aWorkbenchService();
            return testObject.setEnablement([testObject.local[1], testObject.local[0]], 11 /* EnablementState.EnabledGlobally */)
                .then(() => {
                assert.ok(!target.called);
                assert.strictEqual(testObject.local[0].enablementState, 11 /* EnablementState.EnabledGlobally */);
                assert.strictEqual(testObject.local[1].enablementState, 11 /* EnablementState.EnabledGlobally */);
            });
        });
    });
    test('test enable extension with cyclic dependencies', async () => {
        const extensionA = aLocalExtension('a', { extensionDependencies: ['pub.b'] });
        const extensionB = aLocalExtension('b', { extensionDependencies: ['pub.c'] });
        const extensionC = aLocalExtension('c', { extensionDependencies: ['pub.a'] });
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionA], 9 /* EnablementState.DisabledGlobally */)
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionB], 9 /* EnablementState.DisabledGlobally */))
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([extensionC], 9 /* EnablementState.DisabledGlobally */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [extensionA, extensionB, extensionC]);
            testObject = await aWorkbenchService();
            return testObject.setEnablement(testObject.local[0], 11 /* EnablementState.EnabledGlobally */)
                .then(() => {
                assert.strictEqual(testObject.local[0].enablementState, 11 /* EnablementState.EnabledGlobally */);
                assert.strictEqual(testObject.local[1].enablementState, 11 /* EnablementState.EnabledGlobally */);
                assert.strictEqual(testObject.local[2].enablementState, 11 /* EnablementState.EnabledGlobally */);
            });
        });
    });
    test('test change event is fired when disablement flags are changed', async () => {
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([aLocalExtension('c')], 9 /* EnablementState.DisabledGlobally */)
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([aLocalExtension('b')], 10 /* EnablementState.DisabledWorkspace */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [aLocalExtension('a')]);
            testObject = await aWorkbenchService();
            const target = sinon.spy();
            disposableStore.add(testObject.onChange(target));
            return testObject.setEnablement(testObject.local[0], 9 /* EnablementState.DisabledGlobally */)
                .then(() => assert.ok(target.calledOnce));
        });
    });
    test('test change event is fired when disablement flags are changed from outside', async () => {
        const localExtension = aLocalExtension('a');
        return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([aLocalExtension('c')], 9 /* EnablementState.DisabledGlobally */)
            .then(() => instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([aLocalExtension('b')], 10 /* EnablementState.DisabledWorkspace */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [localExtension]);
            testObject = await aWorkbenchService();
            const target = sinon.spy();
            disposableStore.add(testObject.onChange(target));
            return instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([localExtension], 9 /* EnablementState.DisabledGlobally */)
                .then(() => assert.ok(target.calledOnce));
        });
    });
    test('test updating an extension does not re-eanbles it when disabled globally', async () => {
        testObject = await aWorkbenchService();
        const local = aLocalExtension('pub.a');
        await instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([local], 9 /* EnablementState.DisabledGlobally */);
        didInstallEvent.fire([{ local, identifier: local.identifier, operation: 3 /* InstallOperation.Update */, profileLocation: null }]);
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual[0].enablementState, 9 /* EnablementState.DisabledGlobally */);
    });
    test('test updating an extension does not re-eanbles it when workspace disabled', async () => {
        testObject = await aWorkbenchService();
        const local = aLocalExtension('pub.a');
        await instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([local], 10 /* EnablementState.DisabledWorkspace */);
        didInstallEvent.fire([{ local, identifier: local.identifier, operation: 3 /* InstallOperation.Update */, profileLocation: null }]);
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual[0].enablementState, 10 /* EnablementState.DisabledWorkspace */);
    });
    test('test user extension is preferred when the same extension exists as system and user extension', async () => {
        testObject = await aWorkbenchService();
        const userExtension = aLocalExtension('pub.a');
        const systemExtension = aLocalExtension('pub.a', {}, { type: 0 /* ExtensionType.System */ });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [systemExtension, userExtension]);
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, userExtension);
    });
    test('test user extension is disabled when the same extension exists as system and user extension and system extension is disabled', async () => {
        testObject = await aWorkbenchService();
        const systemExtension = aLocalExtension('pub.a', {}, { type: 0 /* ExtensionType.System */ });
        await instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([systemExtension], 9 /* EnablementState.DisabledGlobally */);
        const userExtension = aLocalExtension('pub.a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [systemExtension, userExtension]);
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, userExtension);
        assert.strictEqual(actual[0].enablementState, 9 /* EnablementState.DisabledGlobally */);
    });
    test('Test local ui extension is chosen if it exists only in local server', async () => {
        // multi server setup
        const extensionKind = ['ui'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, localExtension);
    });
    test('Test local workspace extension is chosen if it exists only in local server', async () => {
        // multi server setup
        const extensionKind = ['workspace'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, localExtension);
    });
    test('Test local web extension is chosen if it exists only in local server', async () => {
        // multi server setup
        const extensionKind = ['web'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, localExtension);
    });
    test('Test local ui,workspace extension is chosen if it exists only in local server', async () => {
        // multi server setup
        const extensionKind = ['ui', 'workspace'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, localExtension);
    });
    test('Test local workspace,ui extension is chosen if it exists only in local server', async () => {
        // multi server setup
        const extensionKind = ['workspace', 'ui'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, localExtension);
    });
    test('Test local ui,workspace,web extension is chosen if it exists only in local server', async () => {
        // multi server setup
        const extensionKind = ['ui', 'workspace', 'web'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, localExtension);
    });
    test('Test local ui,web,workspace extension is chosen if it exists only in local server', async () => {
        // multi server setup
        const extensionKind = ['ui', 'web', 'workspace'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, localExtension);
    });
    test('Test local web,ui,workspace extension is chosen if it exists only in local server', async () => {
        // multi server setup
        const extensionKind = ['web', 'ui', 'workspace'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, localExtension);
    });
    test('Test local web,workspace,ui extension is chosen if it exists only in local server', async () => {
        // multi server setup
        const extensionKind = ['web', 'workspace', 'ui'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, localExtension);
    });
    test('Test local workspace,web,ui extension is chosen if it exists only in local server', async () => {
        // multi server setup
        const extensionKind = ['workspace', 'web', 'ui'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, localExtension);
    });
    test('Test local workspace,ui,web extension is chosen if it exists only in local server', async () => {
        // multi server setup
        const extensionKind = ['workspace', 'ui', 'web'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, localExtension);
    });
    test('Test local UI extension is chosen if it exists in both servers', async () => {
        // multi server setup
        const extensionKind = ['ui'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const remoteExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([remoteExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, localExtension);
    });
    test('Test local ui,workspace extension is chosen if it exists in both servers', async () => {
        // multi server setup
        const extensionKind = ['ui', 'workspace'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const remoteExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([remoteExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, localExtension);
    });
    test('Test remote workspace extension is chosen if it exists in remote server', async () => {
        // multi server setup
        const extensionKind = ['workspace'];
        const remoteExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), createExtensionManagementService([remoteExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, remoteExtension);
    });
    test('Test remote workspace extension is chosen if it exists in both servers', async () => {
        // multi server setup
        const extensionKind = ['workspace'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const remoteExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([remoteExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, remoteExtension);
    });
    test('Test remote workspace extension is chosen if it exists in both servers and local is disabled', async () => {
        // multi server setup
        const extensionKind = ['workspace'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const remoteExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([remoteExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        await instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([remoteExtension], 9 /* EnablementState.DisabledGlobally */);
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, remoteExtension);
        assert.strictEqual(actual[0].enablementState, 9 /* EnablementState.DisabledGlobally */);
    });
    test('Test remote workspace extension is chosen if it exists in both servers and remote is disabled in workspace', async () => {
        // multi server setup
        const extensionKind = ['workspace'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const remoteExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([remoteExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        await instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([remoteExtension], 10 /* EnablementState.DisabledWorkspace */);
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, remoteExtension);
        assert.strictEqual(actual[0].enablementState, 10 /* EnablementState.DisabledWorkspace */);
    });
    test('Test local ui, workspace extension is chosen if it exists in both servers and local is disabled', async () => {
        // multi server setup
        const extensionKind = ['ui', 'workspace'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const remoteExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([remoteExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        await instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([localExtension], 9 /* EnablementState.DisabledGlobally */);
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, localExtension);
        assert.strictEqual(actual[0].enablementState, 9 /* EnablementState.DisabledGlobally */);
    });
    test('Test local ui, workspace extension is chosen if it exists in both servers and local is disabled in workspace', async () => {
        // multi server setup
        const extensionKind = ['ui', 'workspace'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const remoteExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([remoteExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        await instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([localExtension], 10 /* EnablementState.DisabledWorkspace */);
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, localExtension);
        assert.strictEqual(actual[0].enablementState, 10 /* EnablementState.DisabledWorkspace */);
    });
    test('Test local web extension is chosen if it exists in both servers', async () => {
        // multi server setup
        const extensionKind = ['web'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const remoteExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([remoteExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, localExtension);
    });
    test('Test remote web extension is chosen if it exists only in remote', async () => {
        // multi server setup
        const extensionKind = ['web'];
        const remoteExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([]), createExtensionManagementService([remoteExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, remoteExtension);
    });
    test('Test disable autoupdate for extension when auto update is enabled for all', async () => {
        const extension1 = aLocalExtension('a');
        const extension2 = aLocalExtension('b');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [extension1, extension2]);
        instantiationService.stub(IExtensionManagementService, 'updateMetadata', (local, metadata) => {
            local.pinned = !!metadata.pinned;
            return local;
        });
        testObject = await aWorkbenchService();
        assert.strictEqual(testObject.local[0].local?.pinned, undefined);
        assert.strictEqual(testObject.local[1].local?.pinned, undefined);
        await testObject.updateAutoUpdateEnablementFor(testObject.local[0], false);
        assert.strictEqual(testObject.local[0].local?.pinned, undefined);
        assert.strictEqual(testObject.local[1].local?.pinned, undefined);
        assert.deepStrictEqual(testObject.getEnabledAutoUpdateExtensions(), []);
        assert.deepStrictEqual(testObject.getDisabledAutoUpdateExtensions(), ['pub.a']);
    });
    test('Test disable autoupdate for extension when auto update is enabled for enabled extensions', async () => {
        stubConfiguration('onlyEnabledExtensions');
        const extension1 = aLocalExtension('a');
        const extension2 = aLocalExtension('b');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [extension1, extension2]);
        instantiationService.stub(IExtensionManagementService, 'updateMetadata', (local, metadata) => {
            local.pinned = !!metadata.pinned;
            return local;
        });
        testObject = await aWorkbenchService();
        assert.strictEqual(testObject.local[0].local?.pinned, undefined);
        assert.strictEqual(testObject.local[1].local?.pinned, undefined);
        await testObject.updateAutoUpdateEnablementFor(testObject.local[0], false);
        assert.strictEqual(testObject.local[0].local?.pinned, undefined);
        assert.strictEqual(testObject.local[1].local?.pinned, undefined);
        assert.deepStrictEqual(testObject.getEnabledAutoUpdateExtensions(), []);
        assert.deepStrictEqual(testObject.getDisabledAutoUpdateExtensions(), ['pub.a']);
    });
    test('Test enable autoupdate for extension when auto update is enabled for all', async () => {
        const extension1 = aLocalExtension('a');
        const extension2 = aLocalExtension('b');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [extension1, extension2]);
        instantiationService.stub(IExtensionManagementService, 'updateMetadata', (local, metadata) => {
            local.pinned = !!metadata.pinned;
            return local;
        });
        testObject = await aWorkbenchService();
        assert.strictEqual(testObject.local[0].local?.pinned, undefined);
        assert.strictEqual(testObject.local[1].local?.pinned, undefined);
        await testObject.updateAutoUpdateEnablementFor(testObject.local[0], false);
        await testObject.updateAutoUpdateEnablementFor(testObject.local[0], true);
        assert.strictEqual(testObject.local[0].local?.pinned, undefined);
        assert.strictEqual(testObject.local[1].local?.pinned, undefined);
        assert.deepStrictEqual(testObject.getEnabledAutoUpdateExtensions(), []);
        assert.deepStrictEqual(testObject.getDisabledAutoUpdateExtensions(), []);
    });
    test('Test enable autoupdate for pinned extension when auto update is enabled', async () => {
        const extension1 = aLocalExtension('a', undefined, { pinned: true });
        const extension2 = aLocalExtension('b');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [extension1, extension2]);
        instantiationService.stub(IExtensionManagementService, 'updateMetadata', (local, metadata) => {
            local.pinned = !!metadata.pinned;
            return local;
        });
        testObject = await aWorkbenchService();
        assert.strictEqual(testObject.local[0].local?.pinned, true);
        assert.strictEqual(testObject.local[1].local?.pinned, undefined);
        await testObject.updateAutoUpdateEnablementFor(testObject.local[0], true);
        assert.strictEqual(testObject.local[0].local?.pinned, false);
        assert.strictEqual(testObject.local[1].local?.pinned, undefined);
        assert.deepStrictEqual(testObject.getEnabledAutoUpdateExtensions(), []);
        assert.deepStrictEqual(testObject.getDisabledAutoUpdateExtensions(), []);
    });
    test('Test updateAutoUpdateEnablementFor throws error when auto update is disabled', async () => {
        stubConfiguration(false);
        const extension1 = aLocalExtension('a');
        const extension2 = aLocalExtension('b');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [extension1, extension2]);
        testObject = await aWorkbenchService();
        try {
            await testObject.updateAutoUpdateEnablementFor(testObject.local[0], true);
            assert.fail('error expected');
        }
        catch (error) {
            // expected
        }
    });
    test('Test updateAutoUpdateEnablementFor throws error for publisher when auto update is enabled', async () => {
        const extension1 = aLocalExtension('a');
        const extension2 = aLocalExtension('b');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [extension1, extension2]);
        testObject = await aWorkbenchService();
        try {
            await testObject.updateAutoUpdateEnablementFor(testObject.local[0].publisher, true);
            assert.fail('error expected');
        }
        catch (error) {
            // expected
        }
    });
    test('Test enable autoupdate for extension when auto update is disabled', async () => {
        stubConfiguration(false);
        const extension1 = aLocalExtension('a', undefined, { pinned: true });
        const extension2 = aLocalExtension('b', undefined, { pinned: true });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [extension1, extension2]);
        instantiationService.stub(IExtensionManagementService, 'updateMetadata', (local, metadata) => {
            local.pinned = !!metadata.pinned;
            return local;
        });
        testObject = await aWorkbenchService();
        assert.strictEqual(testObject.local[0].local?.pinned, true);
        assert.strictEqual(testObject.local[1].local?.pinned, true);
        await testObject.updateAutoUpdateEnablementFor(testObject.local[0], true);
        assert.strictEqual(testObject.local[0].local?.pinned, true);
        assert.strictEqual(testObject.local[1].local?.pinned, true);
        assert.deepStrictEqual(testObject.getEnabledAutoUpdateExtensions(), ['pub.a']);
        assert.deepStrictEqual(testObject.getDisabledAutoUpdateExtensions(), []);
    });
    test('Test reset autoupdate extensions state when auto update is disabled', async () => {
        instantiationService.stub(IDialogService, {
            confirm: () => Promise.resolve({ confirmed: true })
        });
        const extension1 = aLocalExtension('a', undefined, { pinned: true });
        const extension2 = aLocalExtension('b', undefined, { pinned: true });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [extension1, extension2]);
        instantiationService.stub(IExtensionManagementService, 'updateMetadata', (local, metadata) => {
            local.pinned = !!metadata.pinned;
            return local;
        });
        testObject = await aWorkbenchService();
        await testObject.updateAutoUpdateEnablementFor(testObject.local[0], false);
        assert.deepStrictEqual(testObject.getEnabledAutoUpdateExtensions(), []);
        assert.deepStrictEqual(testObject.getDisabledAutoUpdateExtensions(), ['pub.a']);
        await testObject.updateAutoUpdateForAllExtensions(false);
        assert.deepStrictEqual(testObject.getEnabledAutoUpdateExtensions(), []);
        assert.deepStrictEqual(testObject.getDisabledAutoUpdateExtensions(), []);
    });
    test('Test reset autoupdate extensions state when auto update is enabled', async () => {
        stubConfiguration(false);
        instantiationService.stub(IDialogService, {
            confirm: () => Promise.resolve({ confirmed: true })
        });
        const extension1 = aLocalExtension('a', undefined, { pinned: true });
        const extension2 = aLocalExtension('b', undefined, { pinned: true });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [extension1, extension2]);
        instantiationService.stub(IExtensionManagementService, 'updateMetadata', (local, metadata) => {
            local.pinned = !!metadata.pinned;
            return local;
        });
        testObject = await aWorkbenchService();
        await testObject.updateAutoUpdateEnablementFor(testObject.local[0], true);
        assert.deepStrictEqual(testObject.getEnabledAutoUpdateExtensions(), ['pub.a']);
        assert.deepStrictEqual(testObject.getDisabledAutoUpdateExtensions(), []);
        await testObject.updateAutoUpdateForAllExtensions(true);
        assert.deepStrictEqual(testObject.getEnabledAutoUpdateExtensions(), []);
        assert.deepStrictEqual(testObject.getDisabledAutoUpdateExtensions(), []);
    });
    async function aWorkbenchService() {
        const workbenchService = disposableStore.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        await workbenchService.queryLocal();
        return workbenchService;
    }
    function stubConfiguration(autoUpdateValue, autoCheckUpdatesValue) {
        const values = {
            [AutoUpdateConfigurationKey]: autoUpdateValue ?? true,
            [AutoCheckUpdatesConfigurationKey]: autoCheckUpdatesValue ?? true
        };
        const emitter = disposableStore.add(new Emitter());
        instantiationService.stub(IConfigurationService, {
            onDidChangeConfiguration: emitter.event,
            getValue: (key) => {
                return key ? values[key] : undefined;
            },
            updateValue: async (key, value) => {
                values[key] = value;
                emitter.fire({
                    affectedKeys: new Set([key]),
                    source: 2 /* ConfigurationTarget.USER */,
                    change: { keys: [], overrides: [] },
                    affectsConfiguration(configuration, overrides) {
                        return true;
                    },
                });
            },
            inspect: (key) => {
                return {};
            }
        });
    }
    function aLocalExtension(name = 'someext', manifest = {}, properties = {}) {
        manifest = { name, publisher: 'pub', version: '1.0.0', ...manifest };
        properties = {
            type: 1 /* ExtensionType.User */,
            location: URI.file(`pub.${name}`),
            identifier: { id: getGalleryExtensionId(manifest.publisher, manifest.name) },
            ...properties,
            isValid: properties.isValid ?? true,
        };
        return Object.create({ manifest, ...properties });
    }
    const noAssets = {
        changelog: null,
        download: null,
        icon: null,
        license: null,
        manifest: null,
        readme: null,
        repository: null,
        signature: null,
        coreTranslations: []
    };
    function aGalleryExtension(name, properties = {}, galleryExtensionProperties = {}, assets = noAssets) {
        const targetPlatform = getTargetPlatform(platform, arch);
        const galleryExtension = Object.create({ name, publisher: 'pub', version: '1.0.0', allTargetPlatforms: [targetPlatform], properties: {}, assets: {}, isSigned: true, ...properties });
        galleryExtension.properties = { ...galleryExtension.properties, dependencies: [], targetPlatform, ...galleryExtensionProperties };
        galleryExtension.assets = { ...galleryExtension.assets, ...assets };
        galleryExtension.identifier = { id: getGalleryExtensionId(galleryExtension.publisher, galleryExtension.name), uuid: generateUuid() };
        return galleryExtension;
    }
    function aPage(...objects) {
        return { firstPage: objects, total: objects.length, pageSize: objects.length, getPage: () => null };
    }
    function aMultiExtensionManagementServerService(instantiationService, localExtensionManagementService, remoteExtensionManagementService) {
        const localExtensionManagementServer = {
            id: 'vscode-local',
            label: 'local',
            extensionManagementService: localExtensionManagementService || createExtensionManagementService(),
        };
        const remoteExtensionManagementServer = {
            id: 'vscode-remote',
            label: 'remote',
            extensionManagementService: remoteExtensionManagementService || createExtensionManagementService(),
        };
        return anExtensionManagementServerService(localExtensionManagementServer, remoteExtensionManagementServer, null);
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
            installFromGallery: (extension) => Promise.reject(new Error('not supported')),
            updateMetadata: async (local, metadata, profileLocation) => {
                local.identifier.uuid = metadata.id;
                local.publisherDisplayName = metadata.publisherDisplayName;
                local.publisherId = metadata.publisherId;
                return local;
            },
            getTargetPlatform: async () => getTargetPlatform(platform, arch),
            async getExtensionsControlManifest() { return { malicious: [], deprecated: {}, search: [], publisherMapping: {} }; },
            async resetPinnedStateForAllUserExtensions(pinned) { }
        };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1dvcmtiZW5jaFNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvdGVzdC9lbGVjdHJvbi1zYW5kYm94L2V4dGVuc2lvbnNXb3JrYmVuY2hTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUM7QUFDL0IsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNsRSxPQUFPLEVBQWtCLGdDQUFnQyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDMUgsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDekYsT0FBTyxFQUNOLDJCQUEyQixFQUFFLHdCQUF3QixFQUN5QyxxQkFBcUIsRUFBMEIsaUJBQWlCLEVBQzlKLE1BQU0sMkVBQTJFLENBQUM7QUFDbkYsT0FBTyxFQUFFLG9DQUFvQyxFQUFtQixpQ0FBaUMsRUFBdUUsb0NBQW9DLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUM3UixPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQztBQUNwSSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUN0SCxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsOEJBQThCLEVBQUUsTUFBTSwwRkFBMEYsQ0FBQztBQUM5SyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUN4SCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDeEUsT0FBTyxFQUFFLHdCQUF3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