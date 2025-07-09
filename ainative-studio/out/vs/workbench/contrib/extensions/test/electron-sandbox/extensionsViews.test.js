/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { ExtensionsListView } from '../../browser/extensionsViews.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IExtensionsWorkbenchService } from '../../common/extensions.js';
import { ExtensionsWorkbenchService } from '../../browser/extensionsWorkbenchService.js';
import { IExtensionManagementService, IExtensionGalleryService, getTargetPlatform } from '../../../../../platform/extensionManagement/common/extensionManagement.js';
import { IWorkbenchExtensionEnablementService, IExtensionManagementServerService, IWorkbenchExtensionManagementService } from '../../../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionRecommendationsService } from '../../../../services/extensionRecommendations/common/extensionRecommendations.js';
import { getGalleryExtensionId } from '../../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { TestExtensionEnablementService } from '../../../../services/extensionManagement/test/browser/extensionEnablementService.test.js';
import { ExtensionGalleryService } from '../../../../../platform/extensionManagement/common/extensionGalleryService.js';
import { IURLService } from '../../../../../platform/url/common/url.js';
import { Event } from '../../../../../base/common/event.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { IExtensionService, toExtensionDescription } from '../../../../services/extensions/common/extensions.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { TestMenuService } from '../../../../test/browser/workbenchTestServices.js';
import { TestSharedProcessService } from '../../../../test/electron-sandbox/workbenchTestServices.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { NativeURLService } from '../../../../../platform/url/common/urlService.js';
import { URI } from '../../../../../base/common/uri.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IRemoteAgentService } from '../../../../services/remote/common/remoteAgentService.js';
import { RemoteAgentService } from '../../../../services/remote/electron-sandbox/remoteAgentService.js';
import { ISharedProcessService } from '../../../../../platform/ipc/electron-sandbox/services.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { IMenuService } from '../../../../../platform/actions/common/actions.js';
import { TestContextService } from '../../../../test/common/workbenchTestServices.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { Schemas } from '../../../../../base/common/network.js';
import { platform } from '../../../../../base/common/platform.js';
import { arch } from '../../../../../base/common/process.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IUpdateService, State } from '../../../../../platform/update/common/update.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { IUserDataProfileService } from '../../../../services/userDataProfile/common/userDataProfile.js';
import { UserDataProfileService } from '../../../../services/userDataProfile/common/userDataProfileService.js';
import { toUserDataProfile } from '../../../../../platform/userDataProfile/common/userDataProfile.js';
suite('ExtensionsViews Tests', () => {
    const disposableStore = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let testableView;
    const localEnabledTheme = aLocalExtension('first-enabled-extension', { categories: ['Themes', 'random'] }, { installedTimestamp: 123456 });
    const localEnabledLanguage = aLocalExtension('second-enabled-extension', { categories: ['Programming languages'], version: '1.0.0' }, { installedTimestamp: Date.now(), updated: false });
    const localDisabledTheme = aLocalExtension('first-disabled-extension', { categories: ['themes'] }, { installedTimestamp: 234567 });
    const localDisabledLanguage = aLocalExtension('second-disabled-extension', { categories: ['programming languages'] }, { installedTimestamp: Date.now() - 50000, updated: true });
    const localRandom = aLocalExtension('random-enabled-extension', { categories: ['random'] }, { installedTimestamp: 345678 });
    const builtInTheme = aLocalExtension('my-theme', { categories: ['Themes'], contributes: { themes: ['my-theme'] } }, { type: 0 /* ExtensionType.System */, installedTimestamp: 222 });
    const builtInBasic = aLocalExtension('my-lang', { categories: ['Programming Languages'], contributes: { grammars: [{ language: 'my-language' }] } }, { type: 0 /* ExtensionType.System */, installedTimestamp: 666666 });
    let queryPage = aPage([]);
    const galleryExtensions = [];
    const workspaceRecommendationA = aGalleryExtension('workspace-recommendation-A');
    const workspaceRecommendationB = aGalleryExtension('workspace-recommendation-B');
    const configBasedRecommendationA = aGalleryExtension('configbased-recommendation-A');
    const configBasedRecommendationB = aGalleryExtension('configbased-recommendation-B');
    const fileBasedRecommendationA = aGalleryExtension('filebased-recommendation-A');
    const fileBasedRecommendationB = aGalleryExtension('filebased-recommendation-B');
    const otherRecommendationA = aGalleryExtension('other-recommendation-A');
    setup(async () => {
        instantiationService = disposableStore.add(new TestInstantiationService());
        instantiationService.stub(ITelemetryService, NullTelemetryService);
        instantiationService.stub(ILogService, NullLogService);
        instantiationService.stub(IFileService, disposableStore.add(new FileService(new NullLogService())));
        instantiationService.stub(IProductService, {});
        instantiationService.stub(IWorkspaceContextService, new TestContextService());
        instantiationService.stub(IConfigurationService, new TestConfigurationService());
        instantiationService.stub(IExtensionGalleryService, ExtensionGalleryService);
        instantiationService.stub(ISharedProcessService, TestSharedProcessService);
        instantiationService.stub(IWorkbenchExtensionManagementService, {
            onInstallExtension: Event.None,
            onDidInstallExtensions: Event.None,
            onUninstallExtension: Event.None,
            onDidUninstallExtension: Event.None,
            onDidUpdateExtensionMetadata: Event.None,
            onDidChangeProfile: Event.None,
            onProfileAwareDidInstallExtensions: Event.None,
            async getInstalled() { return []; },
            async getInstalledWorkspaceExtensions() { return []; },
            async canInstall() { return true; },
            async getExtensionsControlManifest() { return { malicious: [], deprecated: {}, search: [], publisherMapping: {} }; },
            async getTargetPlatform() { return getTargetPlatform(platform, arch); },
            async updateMetadata(local) { return local; }
        });
        instantiationService.stub(IRemoteAgentService, RemoteAgentService);
        instantiationService.stub(IContextKeyService, new MockContextKeyService());
        instantiationService.stub(IMenuService, new TestMenuService());
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
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        instantiationService.stub(IUserDataProfileService, disposableStore.add(new UserDataProfileService(toUserDataProfile('test', 'test', URI.file('foo'), URI.file('cache')))));
        const reasons = {};
        reasons[workspaceRecommendationA.identifier.id] = { reasonId: 0 /* ExtensionRecommendationReason.Workspace */ };
        reasons[workspaceRecommendationB.identifier.id] = { reasonId: 0 /* ExtensionRecommendationReason.Workspace */ };
        reasons[fileBasedRecommendationA.identifier.id] = { reasonId: 1 /* ExtensionRecommendationReason.File */ };
        reasons[fileBasedRecommendationB.identifier.id] = { reasonId: 1 /* ExtensionRecommendationReason.File */ };
        reasons[otherRecommendationA.identifier.id] = { reasonId: 2 /* ExtensionRecommendationReason.Executable */ };
        reasons[configBasedRecommendationA.identifier.id] = { reasonId: 3 /* ExtensionRecommendationReason.WorkspaceConfig */ };
        instantiationService.stub(IExtensionRecommendationsService, {
            getWorkspaceRecommendations() {
                return Promise.resolve([
                    workspaceRecommendationA.identifier.id,
                    workspaceRecommendationB.identifier.id
                ]);
            },
            getConfigBasedRecommendations() {
                return Promise.resolve({
                    important: [configBasedRecommendationA.identifier.id],
                    others: [configBasedRecommendationB.identifier.id],
                });
            },
            getImportantRecommendations() {
                return Promise.resolve([]);
            },
            getFileBasedRecommendations() {
                return [
                    fileBasedRecommendationA.identifier.id,
                    fileBasedRecommendationB.identifier.id
                ];
            },
            getOtherRecommendations() {
                return Promise.resolve([
                    configBasedRecommendationB.identifier.id,
                    otherRecommendationA.identifier.id
                ]);
            },
            getAllRecommendationsWithReason() {
                return reasons;
            }
        });
        instantiationService.stub(IURLService, NativeURLService);
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [localEnabledTheme, localEnabledLanguage, localRandom, localDisabledTheme, localDisabledLanguage, builtInTheme, builtInBasic]);
        instantiationService.stubPromise(IExtensionManagementService, 'getExtensgetExtensionsControlManifestionsReport', {});
        instantiationService.stub(IExtensionGalleryService, {
            query: async () => {
                return queryPage;
            },
            getCompatibleExtension: async (gallery) => {
                return gallery;
            },
            getExtensions: async (infos) => {
                const result = [];
                for (const info of infos) {
                    const extension = galleryExtensions.find(e => e.identifier.id === info.id);
                    if (extension) {
                        result.push(extension);
                    }
                }
                return result;
            },
            isEnabled: () => true,
            isExtensionCompatible: async () => true,
        });
        instantiationService.stub(IViewDescriptorService, {
            getViewLocationById() {
                return 0 /* ViewContainerLocation.Sidebar */;
            },
            onDidChangeLocation: Event.None
        });
        instantiationService.stub(IExtensionService, {
            onDidChangeExtensions: Event.None,
            extensions: [
                toExtensionDescription(localEnabledTheme),
                toExtensionDescription(localEnabledLanguage),
                toExtensionDescription(localRandom),
                toExtensionDescription(builtInTheme),
                toExtensionDescription(builtInBasic)
            ],
            canAddExtension: (extension) => true,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true)
        });
        await instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([localDisabledTheme], 9 /* EnablementState.DisabledGlobally */);
        await instantiationService.get(IWorkbenchExtensionEnablementService).setEnablement([localDisabledLanguage], 9 /* EnablementState.DisabledGlobally */);
        instantiationService.stub(IUpdateService, { onStateChange: Event.None, state: State.Uninitialized });
        instantiationService.set(IExtensionsWorkbenchService, disposableStore.add(instantiationService.createInstance(ExtensionsWorkbenchService)));
        testableView = disposableStore.add(instantiationService.createInstance(ExtensionsListView, {}, { id: '', title: '' }));
        queryPage = aPage([]);
        galleryExtensions.splice(0, galleryExtensions.length, ...[
            workspaceRecommendationA,
            workspaceRecommendationB,
            configBasedRecommendationA,
            configBasedRecommendationB,
            fileBasedRecommendationA,
            fileBasedRecommendationB,
            otherRecommendationA
        ]);
    });
    test('Test query types', () => {
        assert.strictEqual(ExtensionsListView.isBuiltInExtensionsQuery('@builtin'), true);
        assert.strictEqual(ExtensionsListView.isLocalExtensionsQuery('@installed'), true);
        assert.strictEqual(ExtensionsListView.isLocalExtensionsQuery('@enabled'), true);
        assert.strictEqual(ExtensionsListView.isLocalExtensionsQuery('@disabled'), true);
        assert.strictEqual(ExtensionsListView.isLocalExtensionsQuery('@outdated'), true);
        assert.strictEqual(ExtensionsListView.isLocalExtensionsQuery('@updates'), true);
        assert.strictEqual(ExtensionsListView.isLocalExtensionsQuery('@sort:name'), true);
        assert.strictEqual(ExtensionsListView.isLocalExtensionsQuery('@sort:updateDate'), true);
        assert.strictEqual(ExtensionsListView.isLocalExtensionsQuery('@installed searchText'), true);
        assert.strictEqual(ExtensionsListView.isLocalExtensionsQuery('@enabled searchText'), true);
        assert.strictEqual(ExtensionsListView.isLocalExtensionsQuery('@disabled searchText'), true);
        assert.strictEqual(ExtensionsListView.isLocalExtensionsQuery('@outdated searchText'), true);
        assert.strictEqual(ExtensionsListView.isLocalExtensionsQuery('@updates searchText'), true);
    });
    test('Test empty query equates to sort by install count', async () => {
        const target = instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage());
        await testableView.show('');
        assert.ok(target.calledOnce);
        const options = target.args[0][0];
        assert.strictEqual(options.sortBy, "InstallCount" /* SortBy.InstallCount */);
    });
    test('Test non empty query without sort doesnt use sortBy', async () => {
        const target = instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage());
        await testableView.show('some extension');
        assert.ok(target.calledOnce);
        const options = target.args[0][0];
        assert.strictEqual(options.sortBy, undefined);
    });
    test('Test query with sort uses sortBy', async () => {
        const target = instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage());
        await testableView.show('some extension @sort:rating');
        assert.ok(target.calledOnce);
        const options = target.args[0][0];
        assert.strictEqual(options.sortBy, "WeightedRating" /* SortBy.WeightedRating */);
    });
    test('Test default view actions required sorting', async () => {
        queryPage = aPage([aGalleryExtension(localEnabledLanguage.manifest.name, { ...localEnabledLanguage.manifest, version: '1.0.1', identifier: localDisabledLanguage.identifier })]);
        const workbenchService = instantiationService.get(IExtensionsWorkbenchService);
        const extension = (await workbenchService.queryLocal()).find(ex => ex.identifier.id === localEnabledLanguage.identifier.id);
        await new Promise(c => {
            const disposable = workbenchService.onChange(() => {
                if (extension?.outdated) {
                    disposable.dispose();
                    c();
                }
            });
            instantiationService.get(IExtensionsWorkbenchService).queryGallery(CancellationToken.None);
        });
        const result = await testableView.show('@installed');
        assert.strictEqual(result.length, 5, 'Unexpected number of results for @installed query');
        const actual = [result.get(0).name, result.get(1).name, result.get(2).name, result.get(3).name, result.get(4).name];
        const expected = [localEnabledLanguage.manifest.name, localEnabledTheme.manifest.name, localRandom.manifest.name, localDisabledTheme.manifest.name, localDisabledLanguage.manifest.name];
        for (let i = 0; i < result.length; i++) {
            assert.strictEqual(actual[i], expected[i], 'Unexpected extension for @installed query with outadted extension.');
        }
    });
    test('Test installed query results', async () => {
        await testableView.show('@installed').then(result => {
            assert.strictEqual(result.length, 5, 'Unexpected number of results for @installed query');
            const actual = [result.get(0).name, result.get(1).name, result.get(2).name, result.get(3).name, result.get(4).name].sort();
            const expected = [localDisabledTheme.manifest.name, localEnabledTheme.manifest.name, localRandom.manifest.name, localDisabledLanguage.manifest.name, localEnabledLanguage.manifest.name];
            for (let i = 0; i < result.length; i++) {
                assert.strictEqual(actual[i], expected[i], 'Unexpected extension for @installed query.');
            }
        });
        await testableView.show('@installed first').then(result => {
            assert.strictEqual(result.length, 2, 'Unexpected number of results for @installed query');
            assert.strictEqual(result.get(0).name, localEnabledTheme.manifest.name, 'Unexpected extension for @installed query with search text.');
            assert.strictEqual(result.get(1).name, localDisabledTheme.manifest.name, 'Unexpected extension for @installed query with search text.');
        });
        await testableView.show('@disabled').then(result => {
            assert.strictEqual(result.length, 2, 'Unexpected number of results for @disabled query');
            assert.strictEqual(result.get(0).name, localDisabledTheme.manifest.name, 'Unexpected extension for @disabled query.');
            assert.strictEqual(result.get(1).name, localDisabledLanguage.manifest.name, 'Unexpected extension for @disabled query.');
        });
        await testableView.show('@enabled').then(result => {
            assert.strictEqual(result.length, 3, 'Unexpected number of results for @enabled query');
            assert.strictEqual(result.get(0).name, localEnabledTheme.manifest.name, 'Unexpected extension for @enabled query.');
            assert.strictEqual(result.get(1).name, localRandom.manifest.name, 'Unexpected extension for @enabled query.');
            assert.strictEqual(result.get(2).name, localEnabledLanguage.manifest.name, 'Unexpected extension for @enabled query.');
        });
        await testableView.show('@builtin category:themes').then(result => {
            assert.strictEqual(result.length, 1, 'Unexpected number of results for @builtin category:themes query');
            assert.strictEqual(result.get(0).name, builtInTheme.manifest.name, 'Unexpected extension for @builtin:themes query.');
        });
        await testableView.show('@builtin category:"programming languages"').then(result => {
            assert.strictEqual(result.length, 1, 'Unexpected number of results for @builtin:basics query');
            assert.strictEqual(result.get(0).name, builtInBasic.manifest.name, 'Unexpected extension for @builtin:basics query.');
        });
        await testableView.show('@builtin').then(result => {
            assert.strictEqual(result.length, 2, 'Unexpected number of results for @builtin query');
            assert.strictEqual(result.get(0).name, builtInBasic.manifest.name, 'Unexpected extension for @builtin query.');
            assert.strictEqual(result.get(1).name, builtInTheme.manifest.name, 'Unexpected extension for @builtin query.');
        });
        await testableView.show('@builtin my-theme').then(result => {
            assert.strictEqual(result.length, 1, 'Unexpected number of results for @builtin query');
            assert.strictEqual(result.get(0).name, builtInTheme.manifest.name, 'Unexpected extension for @builtin query.');
        });
    });
    test('Test installed query with category', async () => {
        await testableView.show('@installed category:themes').then(result => {
            assert.strictEqual(result.length, 2, 'Unexpected number of results for @installed query with category');
            assert.strictEqual(result.get(0).name, localEnabledTheme.manifest.name, 'Unexpected extension for @installed query with category.');
            assert.strictEqual(result.get(1).name, localDisabledTheme.manifest.name, 'Unexpected extension for @installed query with category.');
        });
        await testableView.show('@installed category:"themes"').then(result => {
            assert.strictEqual(result.length, 2, 'Unexpected number of results for @installed query with quoted category');
            assert.strictEqual(result.get(0).name, localEnabledTheme.manifest.name, 'Unexpected extension for @installed query with quoted category.');
            assert.strictEqual(result.get(1).name, localDisabledTheme.manifest.name, 'Unexpected extension for @installed query with quoted category.');
        });
        await testableView.show('@installed category:"programming languages"').then(result => {
            assert.strictEqual(result.length, 2, 'Unexpected number of results for @installed query with quoted category including space');
            assert.strictEqual(result.get(0).name, localEnabledLanguage.manifest.name, 'Unexpected extension for @installed query with quoted category including space.');
            assert.strictEqual(result.get(1).name, localDisabledLanguage.manifest.name, 'Unexpected extension for @installed query with quoted category inlcuding space.');
        });
        await testableView.show('@installed category:themes category:random').then(result => {
            assert.strictEqual(result.length, 3, 'Unexpected number of results for @installed query with multiple category');
            assert.strictEqual(result.get(0).name, localEnabledTheme.manifest.name, 'Unexpected extension for @installed query with multiple category.');
            assert.strictEqual(result.get(1).name, localRandom.manifest.name, 'Unexpected extension for @installed query with multiple category.');
            assert.strictEqual(result.get(2).name, localDisabledTheme.manifest.name, 'Unexpected extension for @installed query with multiple category.');
        });
        await testableView.show('@enabled category:themes').then(result => {
            assert.strictEqual(result.length, 1, 'Unexpected number of results for @enabled query with category');
            assert.strictEqual(result.get(0).name, localEnabledTheme.manifest.name, 'Unexpected extension for @enabled query with category.');
        });
        await testableView.show('@enabled category:"themes"').then(result => {
            assert.strictEqual(result.length, 1, 'Unexpected number of results for @enabled query with quoted category');
            assert.strictEqual(result.get(0).name, localEnabledTheme.manifest.name, 'Unexpected extension for @enabled query with quoted category.');
        });
        await testableView.show('@enabled category:"programming languages"').then(result => {
            assert.strictEqual(result.length, 1, 'Unexpected number of results for @enabled query with quoted category inlcuding space');
            assert.strictEqual(result.get(0).name, localEnabledLanguage.manifest.name, 'Unexpected extension for @enabled query with quoted category including space.');
        });
        await testableView.show('@disabled category:themes').then(result => {
            assert.strictEqual(result.length, 1, 'Unexpected number of results for @disabled query with category');
            assert.strictEqual(result.get(0).name, localDisabledTheme.manifest.name, 'Unexpected extension for @disabled query with category.');
        });
        await testableView.show('@disabled category:"themes"').then(result => {
            assert.strictEqual(result.length, 1, 'Unexpected number of results for @disabled query with quoted category');
            assert.strictEqual(result.get(0).name, localDisabledTheme.manifest.name, 'Unexpected extension for @disabled query with quoted category.');
        });
        await testableView.show('@disabled category:"programming languages"').then(result => {
            assert.strictEqual(result.length, 1, 'Unexpected number of results for @disabled query with quoted category inlcuding space');
            assert.strictEqual(result.get(0).name, localDisabledLanguage.manifest.name, 'Unexpected extension for @disabled query with quoted category including space.');
        });
    });
    test('Test local query with sorting order', async () => {
        await testableView.show('@recentlyUpdated').then(result => {
            assert.strictEqual(result.length, 1, 'Unexpected number of results for @recentlyUpdated');
            assert.strictEqual(result.get(0).name, localDisabledLanguage.manifest.name, 'Unexpected default sort order of extensions for @recentlyUpdate query');
        });
        await testableView.show('@installed @sort:updateDate').then(result => {
            assert.strictEqual(result.length, 5, 'Unexpected number of results for @sort:updateDate. Expected all localy installed Extension which are not builtin');
            const actual = [result.get(0).local?.installedTimestamp, result.get(1).local?.installedTimestamp, result.get(2).local?.installedTimestamp, result.get(3).local?.installedTimestamp, result.get(4).local?.installedTimestamp];
            const expected = [localEnabledLanguage.installedTimestamp, localDisabledLanguage.installedTimestamp, localRandom.installedTimestamp, localDisabledTheme.installedTimestamp, localEnabledTheme.installedTimestamp];
            for (let i = 0; i < result.length; i++) {
                assert.strictEqual(actual[i], expected[i], 'Unexpected extension sorting for @sort:updateDate query.');
            }
        });
    });
    test('Test @recommended:workspace query', () => {
        const workspaceRecommendedExtensions = [
            workspaceRecommendationA,
            workspaceRecommendationB,
            configBasedRecommendationA,
        ];
        return testableView.show('@recommended:workspace').then(result => {
            assert.strictEqual(result.length, workspaceRecommendedExtensions.length);
            for (let i = 0; i < workspaceRecommendedExtensions.length; i++) {
                assert.strictEqual(result.get(i).identifier.id, workspaceRecommendedExtensions[i].identifier.id);
            }
        });
    });
    test('Test @recommended query', async () => {
        const allRecommendedExtensions = [
            fileBasedRecommendationA,
            fileBasedRecommendationB,
            configBasedRecommendationB,
            otherRecommendationA
        ];
        const result = await testableView.show('@recommended');
        assert.strictEqual(result.length, allRecommendedExtensions.length);
        for (let i = 0; i < allRecommendedExtensions.length; i++) {
            assert.strictEqual(result.get(i).identifier.id, allRecommendedExtensions[i].identifier.id);
        }
    });
    test('Test @recommended:all query', async () => {
        const allRecommendedExtensions = [
            workspaceRecommendationA,
            workspaceRecommendationB,
            configBasedRecommendationA,
            fileBasedRecommendationA,
            fileBasedRecommendationB,
            configBasedRecommendationB,
            otherRecommendationA,
        ];
        const result = await testableView.show('@recommended:all');
        assert.strictEqual(result.length, allRecommendedExtensions.length);
        for (let i = 0; i < allRecommendedExtensions.length; i++) {
            assert.strictEqual(result.get(i).identifier.id, allRecommendedExtensions[i].identifier.id);
        }
    });
    test('Test search', async () => {
        const results = [
            fileBasedRecommendationA,
            workspaceRecommendationA,
            otherRecommendationA,
            workspaceRecommendationB
        ];
        queryPage = aPage(results);
        const result = await testableView.show('search-me');
        assert.strictEqual(result.length, results.length);
        for (let i = 0; i < results.length; i++) {
            assert.strictEqual(result.get(i).identifier.id, results[i].identifier.id);
        }
    });
    test('Test preferred search experiment', async () => {
        queryPage = aPage([
            fileBasedRecommendationA,
            workspaceRecommendationA,
            otherRecommendationA,
            workspaceRecommendationB
        ], 5);
        const notInFirstPage = aGalleryExtension('not-in-first-page');
        galleryExtensions.push(notInFirstPage);
        const expected = [
            workspaceRecommendationA,
            notInFirstPage,
            workspaceRecommendationB,
            fileBasedRecommendationA,
            otherRecommendationA,
        ];
        instantiationService.stubPromise(IWorkbenchExtensionManagementService, 'getExtensionsControlManifest', {
            malicious: [], deprecated: {},
            search: [{
                    query: 'search-me',
                    preferredResults: [
                        workspaceRecommendationA.identifier.id,
                        notInFirstPage.identifier.id,
                        workspaceRecommendationB.identifier.id
                    ]
                }]
        });
        const testObject = disposableStore.add(instantiationService.createInstance(ExtensionsListView, {}, { id: '', title: '' }));
        const result = await testObject.show('search-me');
        assert.strictEqual(result.length, expected.length);
        for (let i = 0; i < expected.length; i++) {
            assert.strictEqual(result.get(i).identifier.id, expected[i].identifier.id);
        }
    });
    test('Skip preferred search experiment when user defines sort order', async () => {
        const realResults = [
            fileBasedRecommendationA,
            workspaceRecommendationA,
            otherRecommendationA,
            workspaceRecommendationB
        ];
        queryPage = aPage(realResults);
        const result = await testableView.show('search-me @sort:installs');
        assert.strictEqual(result.length, realResults.length);
        for (let i = 0; i < realResults.length; i++) {
            assert.strictEqual(result.get(i).identifier.id, realResults[i].identifier.id);
        }
    });
    function aLocalExtension(name = 'someext', manifest = {}, properties = {}) {
        manifest = { name, publisher: 'pub', version: '1.0.0', ...manifest };
        properties = {
            type: 1 /* ExtensionType.User */,
            location: URI.file(`pub.${name}`),
            identifier: { id: getGalleryExtensionId(manifest.publisher, manifest.name) },
            metadata: { id: getGalleryExtensionId(manifest.publisher, manifest.name), publisherId: manifest.publisher, publisherDisplayName: 'somename' },
            ...properties,
            isValid: properties.isValid ?? true,
        };
        properties.isBuiltin = properties.type === 0 /* ExtensionType.System */;
        return Object.create({ manifest, ...properties });
    }
    function aGalleryExtension(name, properties = {}, galleryExtensionProperties = {}, assets = {}) {
        const targetPlatform = getTargetPlatform(platform, arch);
        const galleryExtension = Object.create({ name, publisher: 'pub', version: '1.0.0', allTargetPlatforms: [targetPlatform], properties: {}, assets: {}, ...properties });
        galleryExtension.properties = { ...galleryExtension.properties, dependencies: [], targetPlatform, ...galleryExtensionProperties };
        galleryExtension.assets = { ...galleryExtension.assets, ...assets };
        galleryExtension.identifier = { id: getGalleryExtensionId(galleryExtension.publisher, galleryExtension.name), uuid: generateUuid() };
        return galleryExtension;
    }
    function aPage(objects = [], total) {
        return { firstPage: objects, total: total ?? objects.length, pageSize: objects.length, getPage: () => null };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1ZpZXdzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy90ZXN0L2VsZWN0cm9uLXNhbmRib3gvZXh0ZW5zaW9uc1ZpZXdzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUN6SCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUN6RSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN6RixPQUFPLEVBQ04sMkJBQTJCLEVBQUUsd0JBQXdCLEVBQ3JELGlCQUFpQixFQUNqQixNQUFNLDJFQUEyRSxDQUFDO0FBQ25GLE9BQU8sRUFBRSxvQ0FBb0MsRUFBbUIsaUNBQWlDLEVBQXVFLG9DQUFvQyxFQUFFLE1BQU0sd0VBQXdFLENBQUM7QUFDN1IsT0FBTyxFQUFFLGdDQUFnQyxFQUFpQyxNQUFNLGtGQUFrRixDQUFDO0FBQ25LLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3RILE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLDBGQUEwRixDQUFDO0FBQzFJLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3hILE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsS0FBSyxFQUFF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