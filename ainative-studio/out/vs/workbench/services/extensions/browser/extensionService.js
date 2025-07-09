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
var BrowserExtensionHostKindPicker_1;
import { mainWindow } from '../../../../base/browser/window.js';
import { Schemas } from '../../../../base/common/network.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { getLogs } from '../../../../platform/log/browser/log.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IRemoteAuthorityResolverService, RemoteAuthorityResolverError } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { IRemoteExtensionsScannerService } from '../../../../platform/remote/common/remoteExtensionsScanner.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IBrowserWorkbenchEnvironmentService } from '../../environment/browser/environmentService.js';
import { IWebExtensionsScannerService, IWorkbenchExtensionEnablementService, IWorkbenchExtensionManagementService } from '../../extensionManagement/common/extensionManagement.js';
import { WebWorkerExtensionHost } from './webWorkerExtensionHost.js';
import { FetchFileSystemProvider } from './webWorkerFileSystemProvider.js';
import { AbstractExtensionService, LocalExtensions, RemoteExtensions, ResolverExtensions, checkEnabledAndProposedAPI, isResolverExtension } from '../common/abstractExtensionService.js';
import { extensionHostKindToString, extensionRunningPreferenceToString } from '../common/extensionHostKind.js';
import { IExtensionManifestPropertiesService } from '../common/extensionManifestPropertiesService.js';
import { filterExtensionDescriptions } from '../common/extensionRunningLocationTracker.js';
import { ExtensionHostExtensions, IExtensionService, toExtensionDescription } from '../common/extensions.js';
import { ExtensionsProposedApi } from '../common/extensionsProposedApi.js';
import { dedupExtensions } from '../common/extensionsUtil.js';
import { RemoteExtensionHost } from '../common/remoteExtensionHost.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
import { IRemoteExplorerService } from '../../remote/common/remoteExplorerService.js';
import { IUserDataInitializationService } from '../../userData/browser/userDataInit.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
import { AsyncIterableObject } from '../../../../base/common/async.js';
let ExtensionService = class ExtensionService extends AbstractExtensionService {
    constructor(instantiationService, notificationService, _browserEnvironmentService, telemetryService, extensionEnablementService, fileService, productService, extensionManagementService, contextService, configurationService, extensionManifestPropertiesService, _webExtensionsScannerService, logService, remoteAgentService, remoteExtensionsScannerService, lifecycleService, remoteAuthorityResolverService, _userDataInitializationService, _userDataProfileService, _workspaceTrustManagementService, _remoteExplorerService, dialogService) {
        const extensionsProposedApi = instantiationService.createInstance(ExtensionsProposedApi);
        const extensionHostFactory = new BrowserExtensionHostFactory(extensionsProposedApi, () => this._scanWebExtensions(), () => this._getExtensionRegistrySnapshotWhenReady(), instantiationService, remoteAgentService, remoteAuthorityResolverService, extensionEnablementService, logService);
        super({ hasLocalProcess: false, allowRemoteExtensionsInLocalWebWorker: true }, extensionsProposedApi, extensionHostFactory, new BrowserExtensionHostKindPicker(logService), instantiationService, notificationService, _browserEnvironmentService, telemetryService, extensionEnablementService, fileService, productService, extensionManagementService, contextService, configurationService, extensionManifestPropertiesService, logService, remoteAgentService, remoteExtensionsScannerService, lifecycleService, remoteAuthorityResolverService, dialogService);
        this._browserEnvironmentService = _browserEnvironmentService;
        this._webExtensionsScannerService = _webExtensionsScannerService;
        this._userDataInitializationService = _userDataInitializationService;
        this._userDataProfileService = _userDataProfileService;
        this._workspaceTrustManagementService = _workspaceTrustManagementService;
        this._remoteExplorerService = _remoteExplorerService;
        // Initialize installed extensions first and do it only after workbench is ready
        lifecycleService.when(2 /* LifecyclePhase.Ready */).then(async () => {
            await this._userDataInitializationService.initializeInstalledExtensions(this._instantiationService);
            this._initialize();
        });
        this._initFetchFileSystem();
    }
    _initFetchFileSystem() {
        const provider = new FetchFileSystemProvider();
        this._register(this._fileService.registerProvider(Schemas.http, provider));
        this._register(this._fileService.registerProvider(Schemas.https, provider));
    }
    async _scanWebExtensions() {
        if (!this._scanWebExtensionsPromise) {
            this._scanWebExtensionsPromise = (async () => {
                const system = [], user = [], development = [];
                try {
                    await Promise.all([
                        this._webExtensionsScannerService.scanSystemExtensions().then(extensions => system.push(...extensions.map(e => toExtensionDescription(e)))),
                        this._webExtensionsScannerService.scanUserExtensions(this._userDataProfileService.currentProfile.extensionsResource, { skipInvalidExtensions: true }).then(extensions => user.push(...extensions.map(e => toExtensionDescription(e)))),
                        this._webExtensionsScannerService.scanExtensionsUnderDevelopment().then(extensions => development.push(...extensions.map(e => toExtensionDescription(e, true))))
                    ]);
                }
                catch (error) {
                    this._logService.error(error);
                }
                return dedupExtensions(system, user, [], development, this._logService);
            })();
        }
        return this._scanWebExtensionsPromise;
    }
    async _resolveExtensionsDefault(emitter) {
        const [localExtensions, remoteExtensions] = await Promise.all([
            this._scanWebExtensions(),
            this._remoteExtensionsScannerService.scanExtensions()
        ]);
        if (remoteExtensions.length) {
            emitter.emitOne(new RemoteExtensions(remoteExtensions));
        }
        emitter.emitOne(new LocalExtensions(localExtensions));
    }
    _resolveExtensions() {
        return new AsyncIterableObject(emitter => this._doResolveExtensions(emitter));
    }
    async _doResolveExtensions(emitter) {
        if (!this._browserEnvironmentService.expectsResolverExtension) {
            return this._resolveExtensionsDefault(emitter);
        }
        const remoteAuthority = this._environmentService.remoteAuthority;
        // Now that the canonical URI provider has been registered, we need to wait for the trust state to be
        // calculated. The trust state will be used while resolving the authority, however the resolver can
        // override the trust state through the resolver result.
        await this._workspaceTrustManagementService.workspaceResolved;
        const localExtensions = await this._scanWebExtensions();
        const resolverExtensions = localExtensions.filter(extension => isResolverExtension(extension));
        if (resolverExtensions.length) {
            emitter.emitOne(new ResolverExtensions(resolverExtensions));
        }
        let resolverResult;
        try {
            resolverResult = await this._resolveAuthorityInitial(remoteAuthority);
        }
        catch (err) {
            if (RemoteAuthorityResolverError.isHandled(err)) {
                console.log(`Error handled: Not showing a notification for the error`);
            }
            this._remoteAuthorityResolverService._setResolvedAuthorityError(remoteAuthority, err);
            // Proceed with the local extension host
            return this._resolveExtensionsDefault(emitter);
        }
        // set the resolved authority
        this._remoteAuthorityResolverService._setResolvedAuthority(resolverResult.authority, resolverResult.options);
        this._remoteExplorerService.setTunnelInformation(resolverResult.tunnelInformation);
        // monitor for breakage
        const connection = this._remoteAgentService.getConnection();
        if (connection) {
            connection.onDidStateChange(async (e) => {
                if (e.type === 0 /* PersistentConnectionEventType.ConnectionLost */) {
                    this._remoteAuthorityResolverService._clearResolvedAuthority(remoteAuthority);
                }
            });
            connection.onReconnecting(() => this._resolveAuthorityAgain());
        }
        return this._resolveExtensionsDefault(emitter);
    }
    async _onExtensionHostExit(code) {
        // Dispose everything associated with the extension host
        await this._doStopExtensionHosts();
        // If we are running extension tests, forward logs and exit code
        const automatedWindow = mainWindow;
        if (typeof automatedWindow.codeAutomationExit === 'function') {
            automatedWindow.codeAutomationExit(code, await getLogs(this._fileService, this._environmentService));
        }
    }
    async _resolveAuthority(remoteAuthority) {
        return this._resolveAuthorityOnExtensionHosts(2 /* ExtensionHostKind.LocalWebWorker */, remoteAuthority);
    }
};
ExtensionService = __decorate([
    __param(0, IInstantiationService),
    __param(1, INotificationService),
    __param(2, IBrowserWorkbenchEnvironmentService),
    __param(3, ITelemetryService),
    __param(4, IWorkbenchExtensionEnablementService),
    __param(5, IFileService),
    __param(6, IProductService),
    __param(7, IWorkbenchExtensionManagementService),
    __param(8, IWorkspaceContextService),
    __param(9, IConfigurationService),
    __param(10, IExtensionManifestPropertiesService),
    __param(11, IWebExtensionsScannerService),
    __param(12, ILogService),
    __param(13, IRemoteAgentService),
    __param(14, IRemoteExtensionsScannerService),
    __param(15, ILifecycleService),
    __param(16, IRemoteAuthorityResolverService),
    __param(17, IUserDataInitializationService),
    __param(18, IUserDataProfileService),
    __param(19, IWorkspaceTrustManagementService),
    __param(20, IRemoteExplorerService),
    __param(21, IDialogService)
], ExtensionService);
export { ExtensionService };
let BrowserExtensionHostFactory = class BrowserExtensionHostFactory {
    constructor(_extensionsProposedApi, _scanWebExtensions, _getExtensionRegistrySnapshotWhenReady, _instantiationService, _remoteAgentService, _remoteAuthorityResolverService, _extensionEnablementService, _logService) {
        this._extensionsProposedApi = _extensionsProposedApi;
        this._scanWebExtensions = _scanWebExtensions;
        this._getExtensionRegistrySnapshotWhenReady = _getExtensionRegistrySnapshotWhenReady;
        this._instantiationService = _instantiationService;
        this._remoteAgentService = _remoteAgentService;
        this._remoteAuthorityResolverService = _remoteAuthorityResolverService;
        this._extensionEnablementService = _extensionEnablementService;
        this._logService = _logService;
    }
    createExtensionHost(runningLocations, runningLocation, isInitialStart) {
        switch (runningLocation.kind) {
            case 1 /* ExtensionHostKind.LocalProcess */: {
                return null;
            }
            case 2 /* ExtensionHostKind.LocalWebWorker */: {
                const startup = (isInitialStart
                    ? 2 /* ExtensionHostStartup.EagerManualStart */
                    : 1 /* ExtensionHostStartup.EagerAutoStart */);
                return this._instantiationService.createInstance(WebWorkerExtensionHost, runningLocation, startup, this._createLocalExtensionHostDataProvider(runningLocations, runningLocation, isInitialStart));
            }
            case 3 /* ExtensionHostKind.Remote */: {
                const remoteAgentConnection = this._remoteAgentService.getConnection();
                if (remoteAgentConnection) {
                    return this._instantiationService.createInstance(RemoteExtensionHost, runningLocation, this._createRemoteExtensionHostDataProvider(runningLocations, remoteAgentConnection.remoteAuthority));
                }
                return null;
            }
        }
    }
    _createLocalExtensionHostDataProvider(runningLocations, desiredRunningLocation, isInitialStart) {
        return {
            getInitData: async () => {
                if (isInitialStart) {
                    // Here we load even extensions that would be disabled by workspace trust
                    const localExtensions = checkEnabledAndProposedAPI(this._logService, this._extensionEnablementService, this._extensionsProposedApi, await this._scanWebExtensions(), /* ignore workspace trust */ true);
                    const runningLocation = runningLocations.computeRunningLocation(localExtensions, [], false);
                    const myExtensions = filterExtensionDescriptions(localExtensions, runningLocation, extRunningLocation => desiredRunningLocation.equals(extRunningLocation));
                    const extensions = new ExtensionHostExtensions(0, localExtensions, myExtensions.map(extension => extension.identifier));
                    return { extensions };
                }
                else {
                    // restart case
                    const snapshot = await this._getExtensionRegistrySnapshotWhenReady();
                    const myExtensions = runningLocations.filterByRunningLocation(snapshot.extensions, desiredRunningLocation);
                    const extensions = new ExtensionHostExtensions(snapshot.versionId, snapshot.extensions, myExtensions.map(extension => extension.identifier));
                    return { extensions };
                }
            }
        };
    }
    _createRemoteExtensionHostDataProvider(runningLocations, remoteAuthority) {
        return {
            remoteAuthority: remoteAuthority,
            getInitData: async () => {
                const snapshot = await this._getExtensionRegistrySnapshotWhenReady();
                const remoteEnv = await this._remoteAgentService.getEnvironment();
                if (!remoteEnv) {
                    throw new Error('Cannot provide init data for remote extension host!');
                }
                const myExtensions = runningLocations.filterByExtensionHostKind(snapshot.extensions, 3 /* ExtensionHostKind.Remote */);
                const extensions = new ExtensionHostExtensions(snapshot.versionId, snapshot.extensions, myExtensions.map(extension => extension.identifier));
                return {
                    connectionData: this._remoteAuthorityResolverService.getConnectionData(remoteAuthority),
                    pid: remoteEnv.pid,
                    appRoot: remoteEnv.appRoot,
                    extensionHostLogsPath: remoteEnv.extensionHostLogsPath,
                    globalStorageHome: remoteEnv.globalStorageHome,
                    workspaceStorageHome: remoteEnv.workspaceStorageHome,
                    extensions,
                };
            }
        };
    }
};
BrowserExtensionHostFactory = __decorate([
    __param(3, IInstantiationService),
    __param(4, IRemoteAgentService),
    __param(5, IRemoteAuthorityResolverService),
    __param(6, IWorkbenchExtensionEnablementService),
    __param(7, ILogService)
], BrowserExtensionHostFactory);
let BrowserExtensionHostKindPicker = BrowserExtensionHostKindPicker_1 = class BrowserExtensionHostKindPicker {
    constructor(_logService) {
        this._logService = _logService;
    }
    pickExtensionHostKind(extensionId, extensionKinds, isInstalledLocally, isInstalledRemotely, preference) {
        const result = BrowserExtensionHostKindPicker_1.pickRunningLocation(extensionKinds, isInstalledLocally, isInstalledRemotely, preference);
        this._logService.trace(`pickRunningLocation for ${extensionId.value}, extension kinds: [${extensionKinds.join(', ')}], isInstalledLocally: ${isInstalledLocally}, isInstalledRemotely: ${isInstalledRemotely}, preference: ${extensionRunningPreferenceToString(preference)} => ${extensionHostKindToString(result)}`);
        return result;
    }
    static pickRunningLocation(extensionKinds, isInstalledLocally, isInstalledRemotely, preference) {
        const result = [];
        let canRunRemotely = false;
        for (const extensionKind of extensionKinds) {
            if (extensionKind === 'ui' && isInstalledRemotely) {
                // ui extensions run remotely if possible (but only as a last resort)
                if (preference === 2 /* ExtensionRunningPreference.Remote */) {
                    return 3 /* ExtensionHostKind.Remote */;
                }
                else {
                    canRunRemotely = true;
                }
            }
            if (extensionKind === 'workspace' && isInstalledRemotely) {
                // workspace extensions run remotely if possible
                if (preference === 0 /* ExtensionRunningPreference.None */ || preference === 2 /* ExtensionRunningPreference.Remote */) {
                    return 3 /* ExtensionHostKind.Remote */;
                }
                else {
                    result.push(3 /* ExtensionHostKind.Remote */);
                }
            }
            if (extensionKind === 'web' && (isInstalledLocally || isInstalledRemotely)) {
                // web worker extensions run in the local web worker if possible
                if (preference === 0 /* ExtensionRunningPreference.None */ || preference === 1 /* ExtensionRunningPreference.Local */) {
                    return 2 /* ExtensionHostKind.LocalWebWorker */;
                }
                else {
                    result.push(2 /* ExtensionHostKind.LocalWebWorker */);
                }
            }
        }
        if (canRunRemotely) {
            result.push(3 /* ExtensionHostKind.Remote */);
        }
        return (result.length > 0 ? result[0] : null);
    }
};
BrowserExtensionHostKindPicker = BrowserExtensionHostKindPicker_1 = __decorate([
    __param(0, ILogService)
], BrowserExtensionHostKindPicker);
export { BrowserExtensionHostKindPicker };
registerSingleton(IExtensionService, ExtensionService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy9icm93c2VyL2V4dGVuc2lvblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBR2hGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFvQixPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBRXhGLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSw0QkFBNEIsRUFBa0IsTUFBTSwrREFBK0QsQ0FBQztBQUM5SixPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUNoSCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsd0JBQXdCLEVB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