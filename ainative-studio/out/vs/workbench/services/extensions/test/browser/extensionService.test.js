/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import assert from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestDialogService } from '../../../../../platform/dialogs/test/common/testDialogService.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { createServices } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { TestNotificationService } from '../../../../../platform/notification/test/common/testNotificationService.js';
import product from '../../../../../platform/product/common/product.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { RemoteAuthorityResolverService } from '../../../../../platform/remote/browser/remoteAuthorityResolverService.js';
import { IRemoteAuthorityResolverService } from '../../../../../platform/remote/common/remoteAuthorityResolver.js';
import { IRemoteExtensionsScannerService } from '../../../../../platform/remote/common/remoteExtensionsScanner.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
import { IUserDataProfilesService, UserDataProfilesService } from '../../../../../platform/userDataProfile/common/userDataProfile.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IWorkspaceTrustEnablementService } from '../../../../../platform/workspace/common/workspaceTrust.js';
import { IWorkbenchEnvironmentService } from '../../../environment/common/environmentService.js';
import { IWebExtensionsScannerService, IWorkbenchExtensionEnablementService, IWorkbenchExtensionManagementService } from '../../../extensionManagement/common/extensionManagement.js';
import { BrowserExtensionHostKindPicker } from '../../browser/extensionService.js';
import { AbstractExtensionService } from '../../common/abstractExtensionService.js';
import { ExtensionManifestPropertiesService, IExtensionManifestPropertiesService } from '../../common/extensionManifestPropertiesService.js';
import { IExtensionService } from '../../common/extensions.js';
import { ExtensionsProposedApi } from '../../common/extensionsProposedApi.js';
import { ILifecycleService } from '../../../lifecycle/common/lifecycle.js';
import { IRemoteAgentService } from '../../../remote/common/remoteAgentService.js';
import { IUserDataProfileService } from '../../../userDataProfile/common/userDataProfile.js';
import { WorkspaceTrustEnablementService } from '../../../workspaces/common/workspaceTrust.js';
import { TestEnvironmentService, TestFileService, TestLifecycleService, TestRemoteAgentService, TestRemoteExtensionsScannerService, TestUserDataProfileService, TestWebExtensionsScannerService, TestWorkbenchExtensionEnablementService, TestWorkbenchExtensionManagementService } from '../../../../test/browser/workbenchTestServices.js';
import { TestContextService } from '../../../../test/common/workbenchTestServices.js';
suite('BrowserExtensionService', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('pickRunningLocation', () => {
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation([], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation([], false, true, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation([], true, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation([], true, true, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui'], false, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui'], true, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui'], true, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace'], false, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace'], true, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace'], true, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web'], false, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web'], true, false, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web'], true, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'workspace'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'workspace'], false, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'workspace'], true, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'workspace'], true, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'ui'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'ui'], false, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'ui'], true, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'ui'], true, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'workspace'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'workspace'], false, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'workspace'], true, false, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'workspace'], true, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'web'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'web'], false, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'web'], true, false, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'web'], true, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'web'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'web'], false, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'web'], true, false, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'web'], true, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'ui'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'ui'], false, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'ui'], true, false, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'ui'], true, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'web', 'workspace'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'web', 'workspace'], false, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'web', 'workspace'], true, false, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'web', 'workspace'], true, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'workspace', 'web'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'workspace', 'web'], false, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'workspace', 'web'], true, false, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'workspace', 'web'], true, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'ui', 'workspace'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'ui', 'workspace'], false, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'ui', 'workspace'], true, false, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'ui', 'workspace'], true, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'workspace', 'ui'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'workspace', 'ui'], false, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'workspace', 'ui'], true, false, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'workspace', 'ui'], true, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'ui', 'web'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'ui', 'web'], false, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'ui', 'web'], true, false, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'ui', 'web'], true, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'web', 'ui'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'web', 'ui'], false, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'web', 'ui'], true, false, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'web', 'ui'], true, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
    });
});
suite('ExtensionService', () => {
    let MyTestExtensionService = class MyTestExtensionService extends AbstractExtensionService {
        constructor(instantiationService, notificationService, environmentService, telemetryService, extensionEnablementService, fileService, productService, extensionManagementService, contextService, configurationService, extensionManifestPropertiesService, logService, remoteAgentService, remoteExtensionsScannerService, lifecycleService, remoteAuthorityResolverService) {
            const extensionsProposedApi = instantiationService.createInstance(ExtensionsProposedApi);
            const extensionHostFactory = new class {
                createExtensionHost(runningLocations, runningLocation, isInitialStart) {
                    return new class extends mock() {
                        constructor() {
                            super(...arguments);
                            this.runningLocation = runningLocation;
                        }
                    };
                }
            };
            super({ allowRemoteExtensionsInLocalWebWorker: false, hasLocalProcess: true }, extensionsProposedApi, extensionHostFactory, null, instantiationService, notificationService, environmentService, telemetryService, extensionEnablementService, fileService, productService, extensionManagementService, contextService, configurationService, extensionManifestPropertiesService, logService, remoteAgentService, remoteExtensionsScannerService, lifecycleService, remoteAuthorityResolverService, new TestDialogService());
            this._extHostId = 0;
            this.order = [];
        }
        _pickExtensionHostKind(extensionId, extensionKinds, isInstalledLocally, isInstalledRemotely, preference) {
            throw new Error('Method not implemented.');
        }
        _doCreateExtensionHostManager(extensionHost, initialActivationEvents) {
            const order = this.order;
            const extensionHostId = ++this._extHostId;
            order.push(`create ${extensionHostId}`);
            return new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.onDidExit = Event.None;
                    this.onDidChangeResponsiveState = Event.None;
                }
                disconnect() {
                    return Promise.resolve();
                }
                dispose() {
                    order.push(`dispose ${extensionHostId}`);
                }
                representsRunningLocation(runningLocation) {
                    return extensionHost.runningLocation.equals(runningLocation);
                }
            };
        }
        _resolveExtensions() {
            throw new Error('Method not implemented.');
        }
        _scanSingleExtension(extension) {
            throw new Error('Method not implemented.');
        }
        _onExtensionHostExit(code) {
            throw new Error('Method not implemented.');
        }
        _resolveAuthority(remoteAuthority) {
            throw new Error('Method not implemented.');
        }
    };
    MyTestExtensionService = __decorate([
        __param(0, IInstantiationService),
        __param(1, INotificationService),
        __param(2, IWorkbenchEnvironmentService),
        __param(3, ITelemetryService),
        __param(4, IWorkbenchExtensionEnablementService),
        __param(5, IFileService),
        __param(6, IProductService),
        __param(7, IWorkbenchExtensionManagementService),
        __param(8, IWorkspaceContextService),
        __param(9, IConfigurationService),
        __param(10, IExtensionManifestPropertiesService),
        __param(11, ILogService),
        __param(12, IRemoteAgentService),
        __param(13, IRemoteExtensionsScannerService),
        __param(14, ILifecycleService),
        __param(15, IRemoteAuthorityResolverService)
    ], MyTestExtensionService);
    let disposables;
    let instantiationService;
    let extService;
    setup(() => {
        disposables = new DisposableStore();
        const testProductService = { _serviceBrand: undefined, ...product };
        disposables.add(instantiationService = createServices(disposables, [
            // custom
            [IExtensionService, MyTestExtensionService],
            // default
            [ILifecycleService, TestLifecycleService],
            [IWorkbenchExtensionManagementService, TestWorkbenchExtensionManagementService],
            [INotificationService, TestNotificationService],
            [IRemoteAgentService, TestRemoteAgentService],
            [ILogService, NullLogService],
            [IWebExtensionsScannerService, TestWebExtensionsScannerService],
            [IExtensionManifestPropertiesService, ExtensionManifestPropertiesService],
            [IConfigurationService, TestConfigurationService],
            [IWorkspaceContextService, TestContextService],
            [IProductService, testProductService],
            [IFileService, TestFileService],
            [IWorkbenchExtensionEnablementService, TestWorkbenchExtensionEnablementService],
            [ITelemetryService, NullTelemetryService],
            [IEnvironmentService, TestEnvironmentService],
            [IWorkspaceTrustEnablementService, WorkspaceTrustEnablementService],
            [IUserDataProfilesService, UserDataProfilesService],
            [IUserDataProfileService, TestUserDataProfileService],
            [IUriIdentityService, UriIdentityService],
            [IRemoteExtensionsScannerService, TestRemoteExtensionsScannerService],
            [IRemoteAuthorityResolverService, new RemoteAuthorityResolverService(false, undefined, undefined, undefined, testProductService, new NullLogService())]
        ]));
        extService = instantiationService.get(IExtensionService);
    });
    teardown(async () => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('issue #152204: Remote extension host not disposed after closing vscode client', async () => {
        await extService.startExtensionHosts();
        await extService.stopExtensionHosts('foo');
        assert.deepStrictEqual(extService.order, (['create 1', 'create 2', 'create 3', 'dispose 3', 'dispose 2', 'dispose 1']));
    });
    test('Extension host disposed when awaited', async () => {
        await extService.startExtensionHosts();
        await extService.stopExtensionHosts('foo');
        assert.deepStrictEqual(extService.order, (['create 1', 'create 2', 'create 3', 'dispose 3', 'dispose 2', 'dispose 1']));
    });
    test('Extension host not disposed when vetoed (sync)', async () => {
        await extService.startExtensionHosts();
        disposables.add(extService.onWillStop(e => e.veto(true, 'test 1')));
        disposables.add(extService.onWillStop(e => e.veto(false, 'test 2')));
        await extService.stopExtensionHosts('foo');
        assert.deepStrictEqual(extService.order, (['create 1', 'create 2', 'create 3']));
    });
    test('Extension host not disposed when vetoed (async)', async () => {
        await extService.startExtensionHosts();
        disposables.add(extService.onWillStop(e => e.veto(false, 'test 1')));
        disposables.add(extService.onWillStop(e => e.veto(Promise.resolve(true), 'test 2')));
        disposables.add(extService.onWillStop(e => e.veto(Promise.resolve(false), 'test 3')));
        await extService.stopExtensionHosts('foo');
        assert.deepStrictEqual(extService.order, (['create 1', 'create 2', 'create 3']));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvdGVzdC9icm93c2VyL2V4dGVuc2lvblNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDL0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDckcsT0FBTyxFQUFpQixtQkFBbUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBRS9HLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQTRCLGNBQWMsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pJLE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDeEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDbkcsT0FBTyxFQUFFLHVCQUF1QixFQUFF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