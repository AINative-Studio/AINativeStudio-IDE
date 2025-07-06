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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1ZpZXdzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL3Rlc3QvZWxlY3Ryb24tc2FuZGJveC9leHRlbnNpb25zVmlld3MudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3pFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3pGLE9BQU8sRUFDTiwyQkFBMkIsRUFBRSx3QkFBd0IsRUFDckQsaUJBQWlCLEVBQ2pCLE1BQU0sMkVBQTJFLENBQUM7QUFDbkYsT0FBTyxFQUFFLG9DQUFvQyxFQUFtQixpQ0FBaUMsRUFBdUUsb0NBQW9DLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUM3UixPQUFPLEVBQUUsZ0NBQWdDLEVBQWlDLE1BQU0sa0ZBQWtGLENBQUM7QUFDbkssT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDdEgsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sMEZBQTBGLENBQUM7QUFDMUksT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDeEgsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxLQUFLLEVBQUUs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