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
var NativeExtensionHostKindPicker_1;
import { runWhenWindowIdle } from '../../../../base/browser/dom.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Schemas } from '../../../../base/common/network.js';
import * as performance from '../../../../base/common/performance.js';
import { isCI } from '../../../../base/common/platform.js';
import * as nls from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IExtensionGalleryService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { INotificationService, NotificationPriority, Severity } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IRemoteAuthorityResolverService, RemoteAuthorityResolverError, getRemoteAuthorityPrefix } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { IRemoteExtensionsScannerService } from '../../../../platform/remote/common/remoteExtensionsScanner.js';
import { getRemoteName, parseAuthorityWithPort } from '../../../../platform/remote/common/remoteHosts.js';
import { updateProxyConfigurationsScope } from '../../../../platform/request/common/request.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { IWorkbenchExtensionEnablementService, IWorkbenchExtensionManagementService } from '../../extensionManagement/common/extensionManagement.js';
import { WebWorkerExtensionHost } from '../browser/webWorkerExtensionHost.js';
import { AbstractExtensionService, ExtensionHostCrashTracker, LocalExtensions, RemoteExtensions, ResolverExtensions, checkEnabledAndProposedAPI, extensionIsEnabled, isResolverExtension } from '../common/abstractExtensionService.js';
import { parseExtensionDevOptions } from '../common/extensionDevOptions.js';
import { extensionHostKindToString, extensionRunningPreferenceToString } from '../common/extensionHostKind.js';
import { IExtensionManifestPropertiesService } from '../common/extensionManifestPropertiesService.js';
import { filterExtensionDescriptions } from '../common/extensionRunningLocationTracker.js';
import { ExtensionHostExtensions, IExtensionService, toExtension, webWorkerExtHostConfig } from '../common/extensions.js';
import { ExtensionsProposedApi } from '../common/extensionsProposedApi.js';
import { RemoteExtensionHost } from '../common/remoteExtensionHost.js';
import { CachedExtensionScanner } from './cachedExtensionScanner.js';
import { NativeLocalProcessExtensionHost } from './localProcessExtensionHost.js';
import { IHostService } from '../../host/browser/host.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
import { IRemoteExplorerService } from '../../remote/common/remoteExplorerService.js';
import { AsyncIterableObject } from '../../../../base/common/async.js';
let NativeExtensionService = class NativeExtensionService extends AbstractExtensionService {
    constructor(instantiationService, notificationService, environmentService, telemetryService, extensionEnablementService, fileService, productService, extensionManagementService, contextService, configurationService, extensionManifestPropertiesService, logService, remoteAgentService, remoteExtensionsScannerService, lifecycleService, remoteAuthorityResolverService, _nativeHostService, _hostService, _remoteExplorerService, _extensionGalleryService, _workspaceTrustManagementService, dialogService) {
        const extensionsProposedApi = instantiationService.createInstance(ExtensionsProposedApi);
        const extensionScanner = instantiationService.createInstance(CachedExtensionScanner);
        const extensionHostFactory = new NativeExtensionHostFactory(extensionsProposedApi, extensionScanner, () => this._getExtensionRegistrySnapshotWhenReady(), instantiationService, environmentService, extensionEnablementService, configurationService, remoteAgentService, remoteAuthorityResolverService, logService);
        super({ hasLocalProcess: true, allowRemoteExtensionsInLocalWebWorker: false }, extensionsProposedApi, extensionHostFactory, new NativeExtensionHostKindPicker(environmentService, configurationService, logService), instantiationService, notificationService, environmentService, telemetryService, extensionEnablementService, fileService, productService, extensionManagementService, contextService, configurationService, extensionManifestPropertiesService, logService, remoteAgentService, remoteExtensionsScannerService, lifecycleService, remoteAuthorityResolverService, dialogService);
        this._nativeHostService = _nativeHostService;
        this._hostService = _hostService;
        this._remoteExplorerService = _remoteExplorerService;
        this._extensionGalleryService = _extensionGalleryService;
        this._workspaceTrustManagementService = _workspaceTrustManagementService;
        this._localCrashTracker = new ExtensionHostCrashTracker();
        this._extensionScanner = extensionScanner;
        // delay extension host creation and extension scanning
        // until the workbench is running. we cannot defer the
        // extension host more (LifecyclePhase.Restored) because
        // some editors require the extension host to restore
        // and this would result in a deadlock
        // see https://github.com/microsoft/vscode/issues/41322
        lifecycleService.when(2 /* LifecyclePhase.Ready */).then(() => {
            // reschedule to ensure this runs after restoring viewlets, panels, and editors
            runWhenWindowIdle(mainWindow, () => {
                this._initialize();
            }, 50 /*max delay*/);
        });
    }
    async _scanAllLocalExtensions() {
        return this._extensionScanner.scannedExtensions;
    }
    _onExtensionHostCrashed(extensionHost, code, signal) {
        const activatedExtensions = [];
        const extensionsStatus = this.getExtensionsStatus();
        for (const key of Object.keys(extensionsStatus)) {
            const extensionStatus = extensionsStatus[key];
            if (extensionStatus.activationStarted && extensionHost.containsExtension(extensionStatus.id)) {
                activatedExtensions.push(extensionStatus.id);
            }
        }
        super._onExtensionHostCrashed(extensionHost, code, signal);
        if (extensionHost.kind === 1 /* ExtensionHostKind.LocalProcess */) {
            if (code === 55 /* ExtensionHostExitCode.VersionMismatch */) {
                this._notificationService.prompt(Severity.Error, nls.localize('extensionService.versionMismatchCrash', "Extension host cannot start: version mismatch."), [{
                        label: nls.localize('relaunch', "Relaunch VS Code"),
                        run: () => {
                            this._instantiationService.invokeFunction((accessor) => {
                                const hostService = accessor.get(IHostService);
                                hostService.restart();
                            });
                        }
                    }]);
                return;
            }
            this._logExtensionHostCrash(extensionHost);
            this._sendExtensionHostCrashTelemetry(code, signal, activatedExtensions);
            this._localCrashTracker.registerCrash();
            if (this._localCrashTracker.shouldAutomaticallyRestart()) {
                this._logService.info(`Automatically restarting the extension host.`);
                this._notificationService.status(nls.localize('extensionService.autoRestart', "The extension host terminated unexpectedly. Restarting..."), { hideAfter: 5000 });
                this.startExtensionHosts();
            }
            else {
                const choices = [];
                if (this._environmentService.isBuilt) {
                    choices.push({
                        label: nls.localize('startBisect', "Start Extension Bisect"),
                        run: () => {
                            this._instantiationService.invokeFunction(accessor => {
                                const commandService = accessor.get(ICommandService);
                                commandService.executeCommand('extension.bisect.start');
                            });
                        }
                    });
                }
                else {
                    choices.push({
                        label: nls.localize('devTools', "Open Developer Tools"),
                        run: () => this._nativeHostService.openDevTools()
                    });
                }
                choices.push({
                    label: nls.localize('restart', "Restart Extension Host"),
                    run: () => this.startExtensionHosts()
                });
                if (this._environmentService.isBuilt) {
                    choices.push({
                        label: nls.localize('learnMore', "Learn More"),
                        run: () => {
                            this._instantiationService.invokeFunction(accessor => {
                                const openerService = accessor.get(IOpenerService);
                                openerService.open('https://aka.ms/vscode-extension-bisect');
                            });
                        }
                    });
                }
                this._notificationService.prompt(Severity.Error, nls.localize('extensionService.crash', "Extension host terminated unexpectedly 3 times within the last 5 minutes."), choices);
            }
        }
    }
    _sendExtensionHostCrashTelemetry(code, signal, activatedExtensions) {
        this._telemetryService.publicLog2('extensionHostCrash', {
            code,
            signal,
            extensionIds: activatedExtensions.map(e => e.value)
        });
        for (const extensionId of activatedExtensions) {
            this._telemetryService.publicLog2('extensionHostCrashExtension', {
                code,
                signal,
                extensionId: extensionId.value
            });
        }
    }
    // --- impl
    async _resolveAuthority(remoteAuthority) {
        const authorityPlusIndex = remoteAuthority.indexOf('+');
        if (authorityPlusIndex === -1) {
            // This authority does not need to be resolved, simply parse the port number
            const { host, port } = parseAuthorityWithPort(remoteAuthority);
            return {
                authority: {
                    authority: remoteAuthority,
                    connectTo: {
                        type: 0 /* RemoteConnectionType.WebSocket */,
                        host,
                        port
                    },
                    connectionToken: undefined
                }
            };
        }
        return this._resolveAuthorityOnExtensionHosts(1 /* ExtensionHostKind.LocalProcess */, remoteAuthority);
    }
    async _getCanonicalURI(remoteAuthority, uri) {
        const authorityPlusIndex = remoteAuthority.indexOf('+');
        if (authorityPlusIndex === -1) {
            // This authority does not use a resolver
            return uri;
        }
        const localProcessExtensionHosts = this._getExtensionHostManagers(1 /* ExtensionHostKind.LocalProcess */);
        if (localProcessExtensionHosts.length === 0) {
            // no local process extension hosts
            throw new Error(`Cannot resolve canonical URI`);
        }
        const results = await Promise.all(localProcessExtensionHosts.map(extHost => extHost.getCanonicalURI(remoteAuthority, uri)));
        for (const result of results) {
            if (result) {
                return result;
            }
        }
        // we can only reach this if there was no resolver extension that can return the cannonical uri
        throw new Error(`Cannot get canonical URI because no extension is installed to resolve ${getRemoteAuthorityPrefix(remoteAuthority)}`);
    }
    _resolveExtensions() {
        return new AsyncIterableObject(emitter => this._doResolveExtensions(emitter));
    }
    async _doResolveExtensions(emitter) {
        this._extensionScanner.startScanningExtensions();
        const remoteAuthority = this._environmentService.remoteAuthority;
        let remoteEnv = null;
        let remoteExtensions = [];
        if (remoteAuthority) {
            this._remoteAuthorityResolverService._setCanonicalURIProvider(async (uri) => {
                if (uri.scheme !== Schemas.vscodeRemote || uri.authority !== remoteAuthority) {
                    // The current remote authority resolver cannot give the canonical URI for this URI
                    return uri;
                }
                performance.mark(`code/willGetCanonicalURI/${getRemoteAuthorityPrefix(remoteAuthority)}`);
                if (isCI) {
                    this._logService.info(`Invoking getCanonicalURI for authority ${getRemoteAuthorityPrefix(remoteAuthority)}...`);
                }
                try {
                    return this._getCanonicalURI(remoteAuthority, uri);
                }
                finally {
                    performance.mark(`code/didGetCanonicalURI/${getRemoteAuthorityPrefix(remoteAuthority)}`);
                    if (isCI) {
                        this._logService.info(`getCanonicalURI returned for authority ${getRemoteAuthorityPrefix(remoteAuthority)}.`);
                    }
                }
            });
            if (isCI) {
                this._logService.info(`Starting to wait on IWorkspaceTrustManagementService.workspaceResolved...`);
            }
            // Now that the canonical URI provider has been registered, we need to wait for the trust state to be
            // calculated. The trust state will be used while resolving the authority, however the resolver can
            // override the trust state through the resolver result.
            await this._workspaceTrustManagementService.workspaceResolved;
            if (isCI) {
                this._logService.info(`Finished waiting on IWorkspaceTrustManagementService.workspaceResolved.`);
            }
            const localExtensions = await this._scanAllLocalExtensions();
            const resolverExtensions = localExtensions.filter(extension => isResolverExtension(extension));
            if (resolverExtensions.length) {
                emitter.emitOne(new ResolverExtensions(resolverExtensions));
            }
            let resolverResult;
            try {
                resolverResult = await this._resolveAuthorityInitial(remoteAuthority);
            }
            catch (err) {
                if (RemoteAuthorityResolverError.isNoResolverFound(err)) {
                    err.isHandled = await this._handleNoResolverFound(remoteAuthority);
                }
                else {
                    if (RemoteAuthorityResolverError.isHandled(err)) {
                        console.log(`Error handled: Not showing a notification for the error`);
                    }
                }
                this._remoteAuthorityResolverService._setResolvedAuthorityError(remoteAuthority, err);
                // Proceed with the local extension host
                return this._startLocalExtensionHost(emitter);
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
            // fetch the remote environment
            [remoteEnv, remoteExtensions] = await Promise.all([
                this._remoteAgentService.getEnvironment(),
                this._remoteExtensionsScannerService.scanExtensions()
            ]);
            if (!remoteEnv) {
                this._notificationService.notify({ severity: Severity.Error, message: nls.localize('getEnvironmentFailure', "Could not fetch remote environment") });
                // Proceed with the local extension host
                return this._startLocalExtensionHost(emitter);
            }
            const useHostProxyDefault = remoteEnv.useHostProxy;
            this._register(this._configurationService.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('http.useLocalProxyConfiguration')) {
                    updateProxyConfigurationsScope(this._configurationService.getValue('http.useLocalProxyConfiguration'), useHostProxyDefault);
                }
            }));
            updateProxyConfigurationsScope(this._configurationService.getValue('http.useLocalProxyConfiguration'), useHostProxyDefault);
        }
        else {
            this._remoteAuthorityResolverService._setCanonicalURIProvider(async (uri) => uri);
        }
        return this._startLocalExtensionHost(emitter, remoteExtensions);
    }
    async _startLocalExtensionHost(emitter, remoteExtensions = []) {
        // Ensure that the workspace trust state has been fully initialized so
        // that the extension host can start with the correct set of extensions.
        await this._workspaceTrustManagementService.workspaceTrustInitialized;
        if (remoteExtensions.length) {
            emitter.emitOne(new RemoteExtensions(remoteExtensions));
        }
        emitter.emitOne(new LocalExtensions(await this._scanAllLocalExtensions()));
    }
    async _onExtensionHostExit(code) {
        // Dispose everything associated with the extension host
        await this._doStopExtensionHosts();
        // Dispose the management connection to avoid reconnecting after the extension host exits
        const connection = this._remoteAgentService.getConnection();
        connection?.dispose();
        if (parseExtensionDevOptions(this._environmentService).isExtensionDevTestFromCli) {
            // When CLI testing make sure to exit with proper exit code
            if (isCI) {
                this._logService.info(`Asking native host service to exit with code ${code}.`);
            }
            this._nativeHostService.exit(code);
        }
        else {
            // Expected development extension termination: When the extension host goes down we also shutdown the window
            this._nativeHostService.closeWindow();
        }
    }
    async _handleNoResolverFound(remoteAuthority) {
        const remoteName = getRemoteName(remoteAuthority);
        const recommendation = this._productService.remoteExtensionTips?.[remoteName];
        if (!recommendation) {
            return false;
        }
        const resolverExtensionId = recommendation.extensionId;
        const allExtensions = await this._scanAllLocalExtensions();
        const extension = allExtensions.filter(e => e.identifier.value === resolverExtensionId)[0];
        if (extension) {
            if (!extensionIsEnabled(this._logService, this._extensionEnablementService, extension, false)) {
                const message = nls.localize('enableResolver', "Extension '{0}' is required to open the remote window.\nOK to enable?", recommendation.friendlyName);
                this._notificationService.prompt(Severity.Info, message, [{
                        label: nls.localize('enable', 'Enable and Reload'),
                        run: async () => {
                            await this._extensionEnablementService.setEnablement([toExtension(extension)], 11 /* EnablementState.EnabledGlobally */);
                            await this._hostService.reload();
                        }
                    }], {
                    sticky: true,
                    priority: NotificationPriority.URGENT
                });
            }
        }
        else {
            // Install the Extension and reload the window to handle.
            const message = nls.localize('installResolver', "Extension '{0}' is required to open the remote window.\nDo you want to install the extension?", recommendation.friendlyName);
            this._notificationService.prompt(Severity.Info, message, [{
                    label: nls.localize('install', 'Install and Reload'),
                    run: async () => {
                        const [galleryExtension] = await this._extensionGalleryService.getExtensions([{ id: resolverExtensionId }], CancellationToken.None);
                        if (galleryExtension) {
                            await this._extensionManagementService.installFromGallery(galleryExtension);
                            await this._hostService.reload();
                        }
                        else {
                            this._notificationService.error(nls.localize('resolverExtensionNotFound', "`{0}` not found on marketplace"));
                        }
                    }
                }], {
                sticky: true,
                priority: NotificationPriority.URGENT,
            });
        }
        return true;
    }
};
NativeExtensionService = __decorate([
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
    __param(15, IRemoteAuthorityResolverService),
    __param(16, INativeHostService),
    __param(17, IHostService),
    __param(18, IRemoteExplorerService),
    __param(19, IExtensionGalleryService),
    __param(20, IWorkspaceTrustManagementService),
    __param(21, IDialogService)
], NativeExtensionService);
export { NativeExtensionService };
let NativeExtensionHostFactory = class NativeExtensionHostFactory {
    constructor(_extensionsProposedApi, _extensionScanner, _getExtensionRegistrySnapshotWhenReady, _instantiationService, environmentService, _extensionEnablementService, configurationService, _remoteAgentService, _remoteAuthorityResolverService, _logService) {
        this._extensionsProposedApi = _extensionsProposedApi;
        this._extensionScanner = _extensionScanner;
        this._getExtensionRegistrySnapshotWhenReady = _getExtensionRegistrySnapshotWhenReady;
        this._instantiationService = _instantiationService;
        this._extensionEnablementService = _extensionEnablementService;
        this._remoteAgentService = _remoteAgentService;
        this._remoteAuthorityResolverService = _remoteAuthorityResolverService;
        this._logService = _logService;
        this._webWorkerExtHostEnablement = determineLocalWebWorkerExtHostEnablement(environmentService, configurationService);
    }
    createExtensionHost(runningLocations, runningLocation, isInitialStart) {
        switch (runningLocation.kind) {
            case 1 /* ExtensionHostKind.LocalProcess */: {
                const startup = (isInitialStart
                    ? 2 /* ExtensionHostStartup.EagerManualStart */
                    : 1 /* ExtensionHostStartup.EagerAutoStart */);
                return this._instantiationService.createInstance(NativeLocalProcessExtensionHost, runningLocation, startup, this._createLocalProcessExtensionHostDataProvider(runningLocations, isInitialStart, runningLocation));
            }
            case 2 /* ExtensionHostKind.LocalWebWorker */: {
                if (this._webWorkerExtHostEnablement !== 0 /* LocalWebWorkerExtHostEnablement.Disabled */) {
                    const startup = (isInitialStart
                        ? (this._webWorkerExtHostEnablement === 2 /* LocalWebWorkerExtHostEnablement.Lazy */ ? 3 /* ExtensionHostStartup.Lazy */ : 2 /* ExtensionHostStartup.EagerManualStart */)
                        : 1 /* ExtensionHostStartup.EagerAutoStart */);
                    return this._instantiationService.createInstance(WebWorkerExtensionHost, runningLocation, startup, this._createWebWorkerExtensionHostDataProvider(runningLocations, runningLocation));
                }
                return null;
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
    _createLocalProcessExtensionHostDataProvider(runningLocations, isInitialStart, desiredRunningLocation) {
        return {
            getInitData: async () => {
                if (isInitialStart) {
                    // Here we load even extensions that would be disabled by workspace trust
                    const scannedExtensions = await this._extensionScanner.scannedExtensions;
                    if (isCI) {
                        this._logService.info(`NativeExtensionHostFactory._createLocalProcessExtensionHostDataProvider.scannedExtensions: ${scannedExtensions.map(ext => ext.identifier.value).join(',')}`);
                    }
                    const localExtensions = checkEnabledAndProposedAPI(this._logService, this._extensionEnablementService, this._extensionsProposedApi, scannedExtensions, /* ignore workspace trust */ true);
                    if (isCI) {
                        this._logService.info(`NativeExtensionHostFactory._createLocalProcessExtensionHostDataProvider.localExtensions: ${localExtensions.map(ext => ext.identifier.value).join(',')}`);
                    }
                    const runningLocation = runningLocations.computeRunningLocation(localExtensions, [], false);
                    const myExtensions = filterExtensionDescriptions(localExtensions, runningLocation, extRunningLocation => desiredRunningLocation.equals(extRunningLocation));
                    const extensions = new ExtensionHostExtensions(0, localExtensions, myExtensions.map(extension => extension.identifier));
                    if (isCI) {
                        this._logService.info(`NativeExtensionHostFactory._createLocalProcessExtensionHostDataProvider.myExtensions: ${myExtensions.map(ext => ext.identifier.value).join(',')}`);
                    }
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
    _createWebWorkerExtensionHostDataProvider(runningLocations, desiredRunningLocation) {
        return {
            getInitData: async () => {
                const snapshot = await this._getExtensionRegistrySnapshotWhenReady();
                const myExtensions = runningLocations.filterByRunningLocation(snapshot.extensions, desiredRunningLocation);
                const extensions = new ExtensionHostExtensions(snapshot.versionId, snapshot.extensions, myExtensions.map(extension => extension.identifier));
                return { extensions };
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
NativeExtensionHostFactory = __decorate([
    __param(3, IInstantiationService),
    __param(4, IWorkbenchEnvironmentService),
    __param(5, IWorkbenchExtensionEnablementService),
    __param(6, IConfigurationService),
    __param(7, IRemoteAgentService),
    __param(8, IRemoteAuthorityResolverService),
    __param(9, ILogService)
], NativeExtensionHostFactory);
function determineLocalWebWorkerExtHostEnablement(environmentService, configurationService) {
    if (environmentService.isExtensionDevelopment && environmentService.extensionDevelopmentKind?.some(k => k === 'web')) {
        return 1 /* LocalWebWorkerExtHostEnablement.Eager */;
    }
    else {
        const config = configurationService.getValue(webWorkerExtHostConfig);
        if (config === true) {
            return 1 /* LocalWebWorkerExtHostEnablement.Eager */;
        }
        else if (config === 'auto') {
            return 2 /* LocalWebWorkerExtHostEnablement.Lazy */;
        }
        else {
            return 0 /* LocalWebWorkerExtHostEnablement.Disabled */;
        }
    }
}
var LocalWebWorkerExtHostEnablement;
(function (LocalWebWorkerExtHostEnablement) {
    LocalWebWorkerExtHostEnablement[LocalWebWorkerExtHostEnablement["Disabled"] = 0] = "Disabled";
    LocalWebWorkerExtHostEnablement[LocalWebWorkerExtHostEnablement["Eager"] = 1] = "Eager";
    LocalWebWorkerExtHostEnablement[LocalWebWorkerExtHostEnablement["Lazy"] = 2] = "Lazy";
})(LocalWebWorkerExtHostEnablement || (LocalWebWorkerExtHostEnablement = {}));
let NativeExtensionHostKindPicker = NativeExtensionHostKindPicker_1 = class NativeExtensionHostKindPicker {
    constructor(environmentService, configurationService, _logService) {
        this._logService = _logService;
        this._hasRemoteExtHost = Boolean(environmentService.remoteAuthority);
        const webWorkerExtHostEnablement = determineLocalWebWorkerExtHostEnablement(environmentService, configurationService);
        this._hasWebWorkerExtHost = (webWorkerExtHostEnablement !== 0 /* LocalWebWorkerExtHostEnablement.Disabled */);
    }
    pickExtensionHostKind(extensionId, extensionKinds, isInstalledLocally, isInstalledRemotely, preference) {
        const result = NativeExtensionHostKindPicker_1.pickExtensionHostKind(extensionKinds, isInstalledLocally, isInstalledRemotely, preference, this._hasRemoteExtHost, this._hasWebWorkerExtHost);
        this._logService.trace(`pickRunningLocation for ${extensionId.value}, extension kinds: [${extensionKinds.join(', ')}], isInstalledLocally: ${isInstalledLocally}, isInstalledRemotely: ${isInstalledRemotely}, preference: ${extensionRunningPreferenceToString(preference)} => ${extensionHostKindToString(result)}`);
        return result;
    }
    static pickExtensionHostKind(extensionKinds, isInstalledLocally, isInstalledRemotely, preference, hasRemoteExtHost, hasWebWorkerExtHost) {
        const result = [];
        for (const extensionKind of extensionKinds) {
            if (extensionKind === 'ui' && isInstalledLocally) {
                // ui extensions run locally if possible
                if (preference === 0 /* ExtensionRunningPreference.None */ || preference === 1 /* ExtensionRunningPreference.Local */) {
                    return 1 /* ExtensionHostKind.LocalProcess */;
                }
                else {
                    result.push(1 /* ExtensionHostKind.LocalProcess */);
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
            if (extensionKind === 'workspace' && !hasRemoteExtHost) {
                // workspace extensions also run locally if there is no remote
                if (preference === 0 /* ExtensionRunningPreference.None */ || preference === 1 /* ExtensionRunningPreference.Local */) {
                    return 1 /* ExtensionHostKind.LocalProcess */;
                }
                else {
                    result.push(1 /* ExtensionHostKind.LocalProcess */);
                }
            }
            if (extensionKind === 'web' && isInstalledLocally && hasWebWorkerExtHost) {
                // web worker extensions run in the local web worker if possible
                if (preference === 0 /* ExtensionRunningPreference.None */ || preference === 1 /* ExtensionRunningPreference.Local */) {
                    return 2 /* ExtensionHostKind.LocalWebWorker */;
                }
                else {
                    result.push(2 /* ExtensionHostKind.LocalWebWorker */);
                }
            }
        }
        return (result.length > 0 ? result[0] : null);
    }
};
NativeExtensionHostKindPicker = NativeExtensionHostKindPicker_1 = __decorate([
    __param(0, IWorkbenchEnvironmentService),
    __param(1, IConfigurationService),
    __param(2, ILogService)
], NativeExtensionHostKindPicker);
export { NativeExtensionHostKindPicker };
class RestartExtensionHostAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.restartExtensionHost',
            title: nls.localize2('restartExtensionHost', "Restart Extension Host"),
            category: Categories.Developer,
            f1: true
        });
    }
    async run(accessor) {
        const extensionService = accessor.get(IExtensionService);
        const stopped = await extensionService.stopExtensionHosts(nls.localize('restartExtensionHost.reason', "An explicit request"));
        if (stopped) {
            extensionService.startExtensionHosts();
        }
    }
}
registerAction2(RestartExtensionHostAction);
registerSingleton(IExtensionService, NativeExtensionService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlRXh0ZW5zaW9uU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25zL2VsZWN0cm9uLXNhbmRib3gvbmF0aXZlRXh0ZW5zaW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEtBQUssV0FBVyxNQUFNLHdDQUF3QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUUzRCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUMxRixPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNuRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFaEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0VBQXdFLENBQUM7QUFFbEgsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBcUIsaUJBQWlCLEVB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