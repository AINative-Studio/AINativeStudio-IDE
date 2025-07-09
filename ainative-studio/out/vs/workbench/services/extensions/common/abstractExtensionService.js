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
var AbstractExtensionService_1;
import { Barrier } from '../../../../base/common/async.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { Emitter } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import * as perf from '../../../../base/common/performance.js';
import { isCI } from '../../../../base/common/platform.js';
import { isEqualOrParent } from '../../../../base/common/resources.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { isDefined } from '../../../../base/common/types.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { ImplicitActivationEvents } from '../../../../platform/extensionManagement/common/implicitActivationEvents.js';
import { ExtensionIdentifier, ExtensionIdentifierMap } from '../../../../platform/extensions/common/extensions.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { handleVetos } from '../../../../platform/lifecycle/common/lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IRemoteAuthorityResolverService, RemoteAuthorityResolverError, RemoteAuthorityResolverErrorCode, getRemoteAuthorityPrefix } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { IRemoteExtensionsScannerService } from '../../../../platform/remote/common/remoteExtensionsScanner.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { Extensions as ExtensionFeaturesExtensions, } from '../../extensionManagement/common/extensionFeatures.js';
import { IWorkbenchExtensionEnablementService, IWorkbenchExtensionManagementService } from '../../extensionManagement/common/extensionManagement.js';
import { LockableExtensionDescriptionRegistry } from './extensionDescriptionRegistry.js';
import { parseExtensionDevOptions } from './extensionDevOptions.js';
import { ExtensionHostManager } from './extensionHostManager.js';
import { IExtensionManifestPropertiesService } from './extensionManifestPropertiesService.js';
import { LocalProcessRunningLocation, LocalWebWorkerRunningLocation, RemoteRunningLocation } from './extensionRunningLocation.js';
import { ExtensionRunningLocationTracker, filterExtensionIdentifiers } from './extensionRunningLocationTracker.js';
import { ActivationTimes, ExtensionPointContribution, toExtension, toExtensionDescription } from './extensions.js';
import { ExtensionMessageCollector, ExtensionsRegistry } from './extensionsRegistry.js';
import { LazyCreateExtensionHostManager } from './lazyCreateExtensionHostManager.js';
import { checkActivateWorkspaceContainsExtension, checkGlobFileExists } from './workspaceContains.js';
import { ILifecycleService, WillShutdownJoinerOrder } from '../../lifecycle/common/lifecycle.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
const hasOwnProperty = Object.hasOwnProperty;
const NO_OP_VOID_PROMISE = Promise.resolve(undefined);
let AbstractExtensionService = AbstractExtensionService_1 = class AbstractExtensionService extends Disposable {
    constructor(options, _extensionsProposedApi, _extensionHostFactory, _extensionHostKindPicker, _instantiationService, _notificationService, _environmentService, _telemetryService, _extensionEnablementService, _fileService, _productService, _extensionManagementService, _contextService, _configurationService, _extensionManifestPropertiesService, _logService, _remoteAgentService, _remoteExtensionsScannerService, _lifecycleService, _remoteAuthorityResolverService, _dialogService) {
        super();
        this._extensionsProposedApi = _extensionsProposedApi;
        this._extensionHostFactory = _extensionHostFactory;
        this._extensionHostKindPicker = _extensionHostKindPicker;
        this._instantiationService = _instantiationService;
        this._notificationService = _notificationService;
        this._environmentService = _environmentService;
        this._telemetryService = _telemetryService;
        this._extensionEnablementService = _extensionEnablementService;
        this._fileService = _fileService;
        this._productService = _productService;
        this._extensionManagementService = _extensionManagementService;
        this._contextService = _contextService;
        this._configurationService = _configurationService;
        this._extensionManifestPropertiesService = _extensionManifestPropertiesService;
        this._logService = _logService;
        this._remoteAgentService = _remoteAgentService;
        this._remoteExtensionsScannerService = _remoteExtensionsScannerService;
        this._lifecycleService = _lifecycleService;
        this._remoteAuthorityResolverService = _remoteAuthorityResolverService;
        this._dialogService = _dialogService;
        this._onDidRegisterExtensions = this._register(new Emitter());
        this.onDidRegisterExtensions = this._onDidRegisterExtensions.event;
        this._onDidChangeExtensionsStatus = this._register(new Emitter());
        this.onDidChangeExtensionsStatus = this._onDidChangeExtensionsStatus.event;
        this._onDidChangeExtensions = this._register(new Emitter({ leakWarningThreshold: 400 }));
        this.onDidChangeExtensions = this._onDidChangeExtensions.event;
        this._onWillActivateByEvent = this._register(new Emitter());
        this.onWillActivateByEvent = this._onWillActivateByEvent.event;
        this._onDidChangeResponsiveChange = this._register(new Emitter());
        this.onDidChangeResponsiveChange = this._onDidChangeResponsiveChange.event;
        this._onWillStop = this._register(new Emitter());
        this.onWillStop = this._onWillStop.event;
        this._activationEventReader = new ImplicitActivationAwareReader();
        this._registry = new LockableExtensionDescriptionRegistry(this._activationEventReader);
        this._installedExtensionsReady = new Barrier();
        this._extensionStatus = new ExtensionIdentifierMap();
        this._allRequestedActivateEvents = new Set();
        this._remoteCrashTracker = new ExtensionHostCrashTracker();
        this._deltaExtensionsQueue = [];
        this._inHandleDeltaExtensions = false;
        this._extensionHostManagers = this._register(new ExtensionHostCollection());
        this._resolveAuthorityAttempt = 0;
        this._hasLocalProcess = options.hasLocalProcess;
        this._allowRemoteExtensionsInLocalWebWorker = options.allowRemoteExtensionsInLocalWebWorker;
        // help the file service to activate providers by activating extensions by file system event
        this._register(this._fileService.onWillActivateFileSystemProvider(e => {
            if (e.scheme !== Schemas.vscodeRemote) {
                e.join(this.activateByEvent(`onFileSystem:${e.scheme}`));
            }
        }));
        this._runningLocations = new ExtensionRunningLocationTracker(this._registry, this._extensionHostKindPicker, this._environmentService, this._configurationService, this._logService, this._extensionManifestPropertiesService);
        this._register(this._extensionEnablementService.onEnablementChanged((extensions) => {
            const toAdd = [];
            const toRemove = [];
            for (const extension of extensions) {
                if (this._safeInvokeIsEnabled(extension)) {
                    // an extension has been enabled
                    toAdd.push(extension);
                }
                else {
                    // an extension has been disabled
                    toRemove.push(extension);
                }
            }
            if (isCI) {
                this._logService.info(`AbstractExtensionService.onEnablementChanged fired for ${extensions.map(e => e.identifier.id).join(', ')}`);
            }
            this._handleDeltaExtensions(new DeltaExtensionsQueueItem(toAdd, toRemove));
        }));
        this._register(this._extensionManagementService.onDidChangeProfile(({ added, removed }) => {
            if (added.length || removed.length) {
                if (isCI) {
                    this._logService.info(`AbstractExtensionService.onDidChangeProfile fired`);
                }
                this._handleDeltaExtensions(new DeltaExtensionsQueueItem(added, removed));
            }
        }));
        this._register(this._extensionManagementService.onDidEnableExtensions(extensions => {
            if (extensions.length) {
                if (isCI) {
                    this._logService.info(`AbstractExtensionService.onDidEnableExtensions fired`);
                }
                this._handleDeltaExtensions(new DeltaExtensionsQueueItem(extensions, []));
            }
        }));
        this._register(this._extensionManagementService.onDidInstallExtensions((result) => {
            const extensions = [];
            for (const { local, operation } of result) {
                if (local && local.isValid && operation !== 4 /* InstallOperation.Migrate */ && this._safeInvokeIsEnabled(local)) {
                    extensions.push(local);
                }
            }
            if (extensions.length) {
                if (isCI) {
                    this._logService.info(`AbstractExtensionService.onDidInstallExtensions fired for ${extensions.map(e => e.identifier.id).join(', ')}`);
                }
                this._handleDeltaExtensions(new DeltaExtensionsQueueItem(extensions, []));
            }
        }));
        this._register(this._extensionManagementService.onDidUninstallExtension((event) => {
            if (!event.error) {
                // an extension has been uninstalled
                if (isCI) {
                    this._logService.info(`AbstractExtensionService.onDidUninstallExtension fired for ${event.identifier.id}`);
                }
                this._handleDeltaExtensions(new DeltaExtensionsQueueItem([], [event.identifier.id]));
            }
        }));
        this._register(this._lifecycleService.onWillShutdown(event => {
            if (this._remoteAgentService.getConnection()) {
                event.join(async () => {
                    // We need to disconnect the management connection before killing the local extension host.
                    // Otherwise, the local extension host might terminate the underlying tunnel before the
                    // management connection has a chance to send its disconnection message.
                    try {
                        await this._remoteAgentService.endConnection();
                        await this._doStopExtensionHosts();
                        this._remoteAgentService.getConnection()?.dispose();
                    }
                    catch {
                        this._logService.warn('Error while disconnecting remote agent');
                    }
                }, {
                    id: 'join.disconnectRemote',
                    label: nls.localize('disconnectRemote', "Disconnect Remote Agent"),
                    order: WillShutdownJoinerOrder.Last // after others have joined that might depend on a remote connection
                });
            }
            else {
                event.join(this._doStopExtensionHosts(), {
                    id: 'join.stopExtensionHosts',
                    label: nls.localize('stopExtensionHosts', "Stopping Extension Hosts"),
                });
            }
        }));
    }
    _getExtensionHostManagers(kind) {
        return this._extensionHostManagers.getByKind(kind);
    }
    //#region deltaExtensions
    async _handleDeltaExtensions(item) {
        this._deltaExtensionsQueue.push(item);
        if (this._inHandleDeltaExtensions) {
            // Let the current item finish, the new one will be picked up
            return;
        }
        let lock = null;
        try {
            this._inHandleDeltaExtensions = true;
            // wait for _initialize to finish before hanlding any delta extension events
            await this._installedExtensionsReady.wait();
            lock = await this._registry.acquireLock('handleDeltaExtensions');
            while (this._deltaExtensionsQueue.length > 0) {
                const item = this._deltaExtensionsQueue.shift();
                await this._deltaExtensions(lock, item.toAdd, item.toRemove);
            }
        }
        finally {
            this._inHandleDeltaExtensions = false;
            lock?.dispose();
        }
    }
    async _deltaExtensions(lock, _toAdd, _toRemove) {
        if (isCI) {
            this._logService.info(`AbstractExtensionService._deltaExtensions: toAdd: [${_toAdd.map(e => e.identifier.id).join(',')}] toRemove: [${_toRemove.map(e => typeof e === 'string' ? e : e.identifier.id).join(',')}]`);
        }
        let toRemove = [];
        for (let i = 0, len = _toRemove.length; i < len; i++) {
            const extensionOrId = _toRemove[i];
            const extensionId = (typeof extensionOrId === 'string' ? extensionOrId : extensionOrId.identifier.id);
            const extension = (typeof extensionOrId === 'string' ? null : extensionOrId);
            const extensionDescription = this._registry.getExtensionDescription(extensionId);
            if (!extensionDescription) {
                // ignore disabling/uninstalling an extension which is not running
                continue;
            }
            if (extension && extensionDescription.extensionLocation.scheme !== extension.location.scheme) {
                // this event is for a different extension than mine (maybe for the local extension, while I have the remote extension)
                continue;
            }
            if (!this.canRemoveExtension(extensionDescription)) {
                // uses non-dynamic extension point or is activated
                continue;
            }
            toRemove.push(extensionDescription);
        }
        const toAdd = [];
        for (let i = 0, len = _toAdd.length; i < len; i++) {
            const extension = _toAdd[i];
            const extensionDescription = toExtensionDescription(extension, false);
            if (!extensionDescription) {
                // could not scan extension...
                continue;
            }
            if (!this._canAddExtension(extensionDescription, toRemove)) {
                continue;
            }
            toAdd.push(extensionDescription);
        }
        if (toAdd.length === 0 && toRemove.length === 0) {
            return;
        }
        // Update the local registry
        const result = this._registry.deltaExtensions(lock, toAdd, toRemove.map(e => e.identifier));
        this._onDidChangeExtensions.fire({ added: toAdd, removed: toRemove });
        toRemove = toRemove.concat(result.removedDueToLooping);
        if (result.removedDueToLooping.length > 0) {
            this._notificationService.notify({
                severity: Severity.Error,
                message: nls.localize('looping', "The following extensions contain dependency loops and have been disabled: {0}", result.removedDueToLooping.map(e => `'${e.identifier.value}'`).join(', '))
            });
        }
        // enable or disable proposed API per extension
        this._extensionsProposedApi.updateEnabledApiProposals(toAdd);
        // Update extension points
        this._doHandleExtensionPoints([].concat(toAdd).concat(toRemove), false);
        // Update the extension host
        await this._updateExtensionsOnExtHosts(result.versionId, toAdd, toRemove.map(e => e.identifier));
        for (let i = 0; i < toAdd.length; i++) {
            this._activateAddedExtensionIfNeeded(toAdd[i]);
        }
    }
    async _updateExtensionsOnExtHosts(versionId, toAdd, toRemove) {
        const removedRunningLocation = this._runningLocations.deltaExtensions(toAdd, toRemove);
        const promises = this._extensionHostManagers.map(extHostManager => this._updateExtensionsOnExtHost(extHostManager, versionId, toAdd, toRemove, removedRunningLocation));
        await Promise.all(promises);
    }
    async _updateExtensionsOnExtHost(extensionHostManager, versionId, toAdd, toRemove, removedRunningLocation) {
        const myToAdd = this._runningLocations.filterByExtensionHostManager(toAdd, extensionHostManager);
        const myToRemove = filterExtensionIdentifiers(toRemove, removedRunningLocation, extRunningLocation => extensionHostManager.representsRunningLocation(extRunningLocation));
        const addActivationEvents = ImplicitActivationEvents.createActivationEventsMap(toAdd);
        if (isCI) {
            const printExtIds = (extensions) => extensions.map(e => e.identifier.value).join(',');
            const printIds = (extensions) => extensions.map(e => e.value).join(',');
            this._logService.info(`AbstractExtensionService: Calling deltaExtensions: toRemove: [${printIds(toRemove)}], toAdd: [${printExtIds(toAdd)}], myToRemove: [${printIds(myToRemove)}], myToAdd: [${printExtIds(myToAdd)}],`);
        }
        await extensionHostManager.deltaExtensions({ versionId, toRemove, toAdd, addActivationEvents, myToRemove, myToAdd: myToAdd.map(extension => extension.identifier) });
    }
    canAddExtension(extension) {
        return this._canAddExtension(extension, []);
    }
    _canAddExtension(extension, extensionsBeingRemoved) {
        // (Also check for renamed extensions)
        const existing = this._registry.getExtensionDescriptionByIdOrUUID(extension.identifier, extension.id);
        if (existing) {
            // This extension is already known (most likely at a different version)
            // so it cannot be added again unless it is removed first
            const isBeingRemoved = extensionsBeingRemoved.some((extensionDescription) => ExtensionIdentifier.equals(extension.identifier, extensionDescription.identifier));
            if (!isBeingRemoved) {
                return false;
            }
        }
        const extensionKinds = this._runningLocations.readExtensionKinds(extension);
        const isRemote = extension.extensionLocation.scheme === Schemas.vscodeRemote;
        const extensionHostKind = this._extensionHostKindPicker.pickExtensionHostKind(extension.identifier, extensionKinds, !isRemote, isRemote, 0 /* ExtensionRunningPreference.None */);
        if (extensionHostKind === null) {
            return false;
        }
        return true;
    }
    canRemoveExtension(extension) {
        const extensionDescription = this._registry.getExtensionDescription(extension.identifier);
        if (!extensionDescription) {
            // Can't remove an extension that is unknown!
            return false;
        }
        if (this._extensionStatus.get(extensionDescription.identifier)?.activationStarted) {
            // Extension is running, cannot remove it safely
            return false;
        }
        return true;
    }
    async _activateAddedExtensionIfNeeded(extensionDescription) {
        let shouldActivate = false;
        let shouldActivateReason = null;
        let hasWorkspaceContains = false;
        const activationEvents = this._activationEventReader.readActivationEvents(extensionDescription);
        for (const activationEvent of activationEvents) {
            if (this._allRequestedActivateEvents.has(activationEvent)) {
                // This activation event was fired before the extension was added
                shouldActivate = true;
                shouldActivateReason = activationEvent;
                break;
            }
            if (activationEvent === '*') {
                shouldActivate = true;
                shouldActivateReason = activationEvent;
                break;
            }
            if (/^workspaceContains/.test(activationEvent)) {
                hasWorkspaceContains = true;
            }
            if (activationEvent === 'onStartupFinished') {
                shouldActivate = true;
                shouldActivateReason = activationEvent;
                break;
            }
        }
        if (shouldActivate) {
            await Promise.all(this._extensionHostManagers.map(extHostManager => extHostManager.activate(extensionDescription.identifier, { startup: false, extensionId: extensionDescription.identifier, activationEvent: shouldActivateReason }))).then(() => { });
        }
        else if (hasWorkspaceContains) {
            const workspace = await this._contextService.getCompleteWorkspace();
            const forceUsingSearch = !!this._environmentService.remoteAuthority;
            const host = {
                logService: this._logService,
                folders: workspace.folders.map(folder => folder.uri),
                forceUsingSearch: forceUsingSearch,
                exists: (uri) => this._fileService.exists(uri),
                checkExists: (folders, includes, token) => this._instantiationService.invokeFunction((accessor) => checkGlobFileExists(accessor, folders, includes, token))
            };
            const result = await checkActivateWorkspaceContainsExtension(host, extensionDescription);
            if (!result) {
                return;
            }
            await Promise.all(this._extensionHostManagers.map(extHostManager => extHostManager.activate(extensionDescription.identifier, { startup: false, extensionId: extensionDescription.identifier, activationEvent: result.activationEvent }))).then(() => { });
        }
    }
    //#endregion
    async _initialize() {
        perf.mark('code/willLoadExtensions');
        this._startExtensionHostsIfNecessary(true, []);
        const lock = await this._registry.acquireLock('_initialize');
        try {
            await this._resolveAndProcessExtensions(lock);
            // Start extension hosts which are not automatically started
            const snapshot = this._registry.getSnapshot();
            for (const extHostManager of this._extensionHostManagers) {
                if (extHostManager.startup !== 1 /* ExtensionHostStartup.EagerAutoStart */) {
                    const extensions = this._runningLocations.filterByExtensionHostManager(snapshot.extensions, extHostManager);
                    extHostManager.start(snapshot.versionId, snapshot.extensions, extensions.map(extension => extension.identifier));
                }
            }
        }
        finally {
            lock.dispose();
        }
        this._releaseBarrier();
        perf.mark('code/didLoadExtensions');
        await this._handleExtensionTests();
    }
    async _resolveAndProcessExtensions(lock) {
        let resolverExtensions = [];
        let localExtensions = [];
        let remoteExtensions = [];
        for await (const extensions of this._resolveExtensions()) {
            if (extensions instanceof ResolverExtensions) {
                resolverExtensions = checkEnabledAndProposedAPI(this._logService, this._extensionEnablementService, this._extensionsProposedApi, extensions.extensions, false);
                this._registry.deltaExtensions(lock, resolverExtensions, []);
                this._doHandleExtensionPoints(resolverExtensions, true);
            }
            if (extensions instanceof LocalExtensions) {
                localExtensions = checkEnabledAndProposedAPI(this._logService, this._extensionEnablementService, this._extensionsProposedApi, extensions.extensions, false);
            }
            if (extensions instanceof RemoteExtensions) {
                remoteExtensions = checkEnabledAndProposedAPI(this._logService, this._extensionEnablementService, this._extensionsProposedApi, extensions.extensions, false);
            }
        }
        // `initializeRunningLocation` will look at the complete picture (e.g. an extension installed on both sides),
        // takes care of duplicates and picks a running location for each extension
        this._runningLocations.initializeRunningLocation(localExtensions, remoteExtensions);
        this._startExtensionHostsIfNecessary(true, []);
        // Some remote extensions could run locally in the web worker, so store them
        const remoteExtensionsThatNeedToRunLocally = (this._allowRemoteExtensionsInLocalWebWorker ? this._runningLocations.filterByExtensionHostKind(remoteExtensions, 2 /* ExtensionHostKind.LocalWebWorker */) : []);
        const localProcessExtensions = (this._hasLocalProcess ? this._runningLocations.filterByExtensionHostKind(localExtensions, 1 /* ExtensionHostKind.LocalProcess */) : []);
        const localWebWorkerExtensions = this._runningLocations.filterByExtensionHostKind(localExtensions, 2 /* ExtensionHostKind.LocalWebWorker */);
        remoteExtensions = this._runningLocations.filterByExtensionHostKind(remoteExtensions, 3 /* ExtensionHostKind.Remote */);
        // Add locally the remote extensions that need to run locally in the web worker
        for (const ext of remoteExtensionsThatNeedToRunLocally) {
            if (!includes(localWebWorkerExtensions, ext.identifier)) {
                localWebWorkerExtensions.push(ext);
            }
        }
        const allExtensions = remoteExtensions.concat(localProcessExtensions).concat(localWebWorkerExtensions);
        let toAdd = allExtensions;
        if (resolverExtensions.length) {
            // Add extensions that are not registered as resolvers but are in the final resolved set
            toAdd = allExtensions.filter(extension => !resolverExtensions.some(e => ExtensionIdentifier.equals(e.identifier, extension.identifier) && e.extensionLocation.toString() === extension.extensionLocation.toString()));
            // Remove extensions that are registered as resolvers but are not in the final resolved set
            if (allExtensions.length < toAdd.length + resolverExtensions.length) {
                const toRemove = resolverExtensions.filter(registered => !allExtensions.some(e => ExtensionIdentifier.equals(e.identifier, registered.identifier) && e.extensionLocation.toString() === registered.extensionLocation.toString()));
                if (toRemove.length) {
                    this._registry.deltaExtensions(lock, [], toRemove.map(e => e.identifier));
                    this._doHandleExtensionPoints(toRemove, true);
                }
            }
        }
        const result = this._registry.deltaExtensions(lock, toAdd, []);
        if (result.removedDueToLooping.length > 0) {
            this._notificationService.notify({
                severity: Severity.Error,
                message: nls.localize('looping', "The following extensions contain dependency loops and have been disabled: {0}", result.removedDueToLooping.map(e => `'${e.identifier.value}'`).join(', '))
            });
        }
        this._doHandleExtensionPoints(this._registry.getAllExtensionDescriptions(), false);
    }
    async _handleExtensionTests() {
        if (!this._environmentService.isExtensionDevelopment || !this._environmentService.extensionTestsLocationURI) {
            return;
        }
        const extensionHostManager = this.findTestExtensionHost(this._environmentService.extensionTestsLocationURI);
        if (!extensionHostManager) {
            const msg = nls.localize('extensionTestError', "No extension host found that can launch the test runner at {0}.", this._environmentService.extensionTestsLocationURI.toString());
            console.error(msg);
            this._notificationService.error(msg);
            return;
        }
        let exitCode;
        try {
            exitCode = await extensionHostManager.extensionTestsExecute();
            if (isCI) {
                this._logService.info(`Extension host test runner exit code: ${exitCode}`);
            }
        }
        catch (err) {
            if (isCI) {
                this._logService.error(`Extension host test runner error`, err);
            }
            console.error(err);
            exitCode = 1 /* ERROR */;
        }
        this._onExtensionHostExit(exitCode);
    }
    findTestExtensionHost(testLocation) {
        let runningLocation = null;
        for (const extension of this._registry.getAllExtensionDescriptions()) {
            if (isEqualOrParent(testLocation, extension.extensionLocation)) {
                runningLocation = this._runningLocations.getRunningLocation(extension.identifier);
                break;
            }
        }
        if (runningLocation === null) {
            // not sure if we should support that, but it was possible to have an test outside an extension
            if (testLocation.scheme === Schemas.vscodeRemote) {
                runningLocation = new RemoteRunningLocation();
            }
            else {
                // When a debugger attaches to the extension host, it will surface all console.log messages from the extension host,
                // but not necessarily from the window. So it would be best if any errors get printed to the console of the extension host.
                // That is why here we use the local process extension host even for non-file URIs
                runningLocation = new LocalProcessRunningLocation(0);
            }
        }
        if (runningLocation !== null) {
            return this._extensionHostManagers.getByRunningLocation(runningLocation);
        }
        return null;
    }
    _releaseBarrier() {
        this._installedExtensionsReady.open();
        this._onDidRegisterExtensions.fire(undefined);
        this._onDidChangeExtensionsStatus.fire(this._registry.getAllExtensionDescriptions().map(e => e.identifier));
    }
    //#region remote authority resolving
    async _resolveAuthorityInitial(remoteAuthority) {
        const MAX_ATTEMPTS = 5;
        for (let attempt = 1;; attempt++) {
            try {
                return this._resolveAuthorityWithLogging(remoteAuthority);
            }
            catch (err) {
                if (RemoteAuthorityResolverError.isNoResolverFound(err)) {
                    // There is no point in retrying if there is no resolver found
                    throw err;
                }
                if (RemoteAuthorityResolverError.isNotAvailable(err)) {
                    // The resolver is not available and asked us to not retry
                    throw err;
                }
                if (attempt >= MAX_ATTEMPTS) {
                    // Too many failed attempts, give up
                    throw err;
                }
            }
        }
    }
    async _resolveAuthorityAgain() {
        const remoteAuthority = this._environmentService.remoteAuthority;
        if (!remoteAuthority) {
            return;
        }
        this._remoteAuthorityResolverService._clearResolvedAuthority(remoteAuthority);
        try {
            const result = await this._resolveAuthorityWithLogging(remoteAuthority);
            this._remoteAuthorityResolverService._setResolvedAuthority(result.authority, result.options);
        }
        catch (err) {
            this._remoteAuthorityResolverService._setResolvedAuthorityError(remoteAuthority, err);
        }
    }
    async _resolveAuthorityWithLogging(remoteAuthority) {
        const authorityPrefix = getRemoteAuthorityPrefix(remoteAuthority);
        const sw = StopWatch.create(false);
        this._logService.info(`Invoking resolveAuthority(${authorityPrefix})...`);
        try {
            perf.mark(`code/willResolveAuthority/${authorityPrefix}`);
            const result = await this._resolveAuthority(remoteAuthority);
            perf.mark(`code/didResolveAuthorityOK/${authorityPrefix}`);
            this._logService.info(`resolveAuthority(${authorityPrefix}) returned '${result.authority.connectTo}' after ${sw.elapsed()} ms`);
            return result;
        }
        catch (err) {
            perf.mark(`code/didResolveAuthorityError/${authorityPrefix}`);
            this._logService.error(`resolveAuthority(${authorityPrefix}) returned an error after ${sw.elapsed()} ms`, err);
            throw err;
        }
    }
    async _resolveAuthorityOnExtensionHosts(kind, remoteAuthority) {
        const extensionHosts = this._getExtensionHostManagers(kind);
        if (extensionHosts.length === 0) {
            // no local process extension hosts
            throw new Error(`Cannot resolve authority`);
        }
        this._resolveAuthorityAttempt++;
        const results = await Promise.all(extensionHosts.map(extHost => extHost.resolveAuthority(remoteAuthority, this._resolveAuthorityAttempt)));
        let bestErrorResult = null;
        for (const result of results) {
            if (result.type === 'ok') {
                return result.value;
            }
            if (!bestErrorResult) {
                bestErrorResult = result;
                continue;
            }
            const bestErrorIsUnknown = (bestErrorResult.error.code === RemoteAuthorityResolverErrorCode.Unknown);
            const errorIsUnknown = (result.error.code === RemoteAuthorityResolverErrorCode.Unknown);
            if (bestErrorIsUnknown && !errorIsUnknown) {
                bestErrorResult = result;
            }
        }
        // we can only reach this if there is an error
        throw new RemoteAuthorityResolverError(bestErrorResult.error.message, bestErrorResult.error.code, bestErrorResult.error.detail);
    }
    //#endregion
    //#region Stopping / Starting / Restarting
    stopExtensionHosts(reason, auto) {
        return this._doStopExtensionHostsWithVeto(reason, auto);
    }
    async _doStopExtensionHosts() {
        const previouslyActivatedExtensionIds = [];
        for (const extensionStatus of this._extensionStatus.values()) {
            if (extensionStatus.activationStarted) {
                previouslyActivatedExtensionIds.push(extensionStatus.id);
            }
        }
        await this._extensionHostManagers.stopAllInReverse();
        for (const extensionStatus of this._extensionStatus.values()) {
            extensionStatus.clearRuntimeStatus();
        }
        if (previouslyActivatedExtensionIds.length > 0) {
            this._onDidChangeExtensionsStatus.fire(previouslyActivatedExtensionIds);
        }
    }
    async _doStopExtensionHostsWithVeto(reason, auto = false) {
        if (auto && this._environmentService.isExtensionDevelopment) {
            return false;
        }
        const vetos = [];
        const vetoReasons = new Set();
        this._onWillStop.fire({
            reason,
            auto,
            veto(value, reason) {
                vetos.push(value);
                if (typeof value === 'boolean') {
                    if (value === true) {
                        vetoReasons.add(reason);
                    }
                }
                else {
                    value.then(value => {
                        if (value) {
                            vetoReasons.add(reason);
                        }
                    }).catch(error => {
                        vetoReasons.add(nls.localize('extensionStopVetoError', "{0} (Error: {1})", reason, toErrorMessage(error)));
                    });
                }
            }
        });
        const veto = await handleVetos(vetos, error => this._logService.error(error));
        if (!veto) {
            await this._doStopExtensionHosts();
        }
        else {
            if (!auto) {
                const vetoReasonsArray = Array.from(vetoReasons);
                this._logService.warn(`Extension host was not stopped because of veto (stop reason: ${reason}, veto reason: ${vetoReasonsArray.join(', ')})`);
                const { confirmed } = await this._dialogService.confirm({
                    type: Severity.Warning,
                    message: nls.localize('extensionStopVetoMessage', "Please confirm restart of extensions."),
                    detail: vetoReasonsArray.length === 1 ?
                        vetoReasonsArray[0] :
                        vetoReasonsArray.join('\n -'),
                    primaryButton: nls.localize('proceedAnyways', "Restart Anyway")
                });
                if (confirmed) {
                    return true;
                }
            }
        }
        return !veto;
    }
    _startExtensionHostsIfNecessary(isInitialStart, initialActivationEvents) {
        const locations = [];
        for (let affinity = 0; affinity <= this._runningLocations.maxLocalProcessAffinity; affinity++) {
            locations.push(new LocalProcessRunningLocation(affinity));
        }
        for (let affinity = 0; affinity <= this._runningLocations.maxLocalWebWorkerAffinity; affinity++) {
            locations.push(new LocalWebWorkerRunningLocation(affinity));
        }
        locations.push(new RemoteRunningLocation());
        for (const location of locations) {
            if (this._extensionHostManagers.getByRunningLocation(location)) {
                // already running
                continue;
            }
            const res = this._createExtensionHostManager(location, isInitialStart, initialActivationEvents);
            if (res) {
                const [extHostManager, disposableStore] = res;
                this._extensionHostManagers.add(extHostManager, disposableStore);
            }
        }
    }
    _createExtensionHostManager(runningLocation, isInitialStart, initialActivationEvents) {
        const extensionHost = this._extensionHostFactory.createExtensionHost(this._runningLocations, runningLocation, isInitialStart);
        if (!extensionHost) {
            return null;
        }
        const processManager = this._doCreateExtensionHostManager(extensionHost, initialActivationEvents);
        const disposableStore = new DisposableStore();
        disposableStore.add(processManager.onDidExit(([code, signal]) => this._onExtensionHostCrashOrExit(processManager, code, signal)));
        disposableStore.add(processManager.onDidChangeResponsiveState((responsiveState) => {
            this._logService.info(`Extension host (${processManager.friendyName}) is ${responsiveState === 0 /* ResponsiveState.Responsive */ ? 'responsive' : 'unresponsive'}.`);
            this._onDidChangeResponsiveChange.fire({
                extensionHostKind: processManager.kind,
                isResponsive: responsiveState === 0 /* ResponsiveState.Responsive */,
                getInspectListener: (tryEnableInspector) => {
                    return processManager.getInspectPort(tryEnableInspector);
                }
            });
        }));
        return [processManager, disposableStore];
    }
    _doCreateExtensionHostManager(extensionHost, initialActivationEvents) {
        const internalExtensionService = this._acquireInternalAPI(extensionHost);
        if (extensionHost.startup === 3 /* ExtensionHostStartup.Lazy */ && initialActivationEvents.length === 0) {
            return this._instantiationService.createInstance(LazyCreateExtensionHostManager, extensionHost, internalExtensionService);
        }
        return this._instantiationService.createInstance(ExtensionHostManager, extensionHost, initialActivationEvents, internalExtensionService);
    }
    _onExtensionHostCrashOrExit(extensionHost, code, signal) {
        // Unexpected termination
        const isExtensionDevHost = parseExtensionDevOptions(this._environmentService).isExtensionDevHost;
        if (!isExtensionDevHost) {
            this._onExtensionHostCrashed(extensionHost, code, signal);
            return;
        }
        this._onExtensionHostExit(code);
    }
    _onExtensionHostCrashed(extensionHost, code, signal) {
        console.error(`Extension host (${extensionHost.friendyName}) terminated unexpectedly. Code: ${code}, Signal: ${signal}`);
        if (extensionHost.kind === 1 /* ExtensionHostKind.LocalProcess */) {
            this._doStopExtensionHosts();
        }
        else if (extensionHost.kind === 3 /* ExtensionHostKind.Remote */) {
            if (signal) {
                this._onRemoteExtensionHostCrashed(extensionHost, signal);
            }
            this._extensionHostManagers.stopOne(extensionHost);
        }
    }
    _getExtensionHostExitInfoWithTimeout(reconnectionToken) {
        return new Promise((resolve, reject) => {
            const timeoutHandle = setTimeout(() => {
                reject(new Error('getExtensionHostExitInfo timed out'));
            }, 2000);
            this._remoteAgentService.getExtensionHostExitInfo(reconnectionToken).then((r) => {
                clearTimeout(timeoutHandle);
                resolve(r);
            }, reject);
        });
    }
    async _onRemoteExtensionHostCrashed(extensionHost, reconnectionToken) {
        try {
            const info = await this._getExtensionHostExitInfoWithTimeout(reconnectionToken);
            if (info) {
                this._logService.error(`Extension host (${extensionHost.friendyName}) terminated unexpectedly with code ${info.code}.`);
            }
            this._logExtensionHostCrash(extensionHost);
            this._remoteCrashTracker.registerCrash();
            if (this._remoteCrashTracker.shouldAutomaticallyRestart()) {
                this._logService.info(`Automatically restarting the remote extension host.`);
                this._notificationService.status(nls.localize('extensionService.autoRestart', "The remote extension host terminated unexpectedly. Restarting..."), { hideAfter: 5000 });
                this._startExtensionHostsIfNecessary(false, Array.from(this._allRequestedActivateEvents.keys()));
            }
            else {
                this._notificationService.prompt(Severity.Error, nls.localize('extensionService.crash', "Remote Extension host terminated unexpectedly 3 times within the last 5 minutes."), [{
                        label: nls.localize('restart', "Restart Remote Extension Host"),
                        run: () => {
                            this._startExtensionHostsIfNecessary(false, Array.from(this._allRequestedActivateEvents.keys()));
                        }
                    }]);
            }
        }
        catch (err) {
            // maybe this wasn't an extension host crash and it was a permanent disconnection
        }
    }
    _logExtensionHostCrash(extensionHost) {
        const activatedExtensions = [];
        for (const extensionStatus of this._extensionStatus.values()) {
            if (extensionStatus.activationStarted && extensionHost.containsExtension(extensionStatus.id)) {
                activatedExtensions.push(extensionStatus.id);
            }
        }
        if (activatedExtensions.length > 0) {
            this._logService.error(`Extension host (${extensionHost.friendyName}) terminated unexpectedly. The following extensions were running: ${activatedExtensions.map(id => id.value).join(', ')}`);
        }
        else {
            this._logService.error(`Extension host (${extensionHost.friendyName}) terminated unexpectedly. No extensions were activated.`);
        }
    }
    async startExtensionHosts(updates) {
        await this._doStopExtensionHosts();
        if (updates) {
            await this._handleDeltaExtensions(new DeltaExtensionsQueueItem(updates.toAdd, updates.toRemove));
        }
        const lock = await this._registry.acquireLock('startExtensionHosts');
        try {
            this._startExtensionHostsIfNecessary(false, Array.from(this._allRequestedActivateEvents.keys()));
            const localProcessExtensionHosts = this._getExtensionHostManagers(1 /* ExtensionHostKind.LocalProcess */);
            await Promise.all(localProcessExtensionHosts.map(extHost => extHost.ready()));
        }
        finally {
            lock.dispose();
        }
    }
    //#endregion
    //#region IExtensionService
    activateByEvent(activationEvent, activationKind = 0 /* ActivationKind.Normal */) {
        if (this._installedExtensionsReady.isOpen()) {
            // Extensions have been scanned and interpreted
            // Record the fact that this activationEvent was requested (in case of a restart)
            this._allRequestedActivateEvents.add(activationEvent);
            if (!this._registry.containsActivationEvent(activationEvent)) {
                // There is no extension that is interested in this activation event
                return NO_OP_VOID_PROMISE;
            }
            return this._activateByEvent(activationEvent, activationKind);
        }
        else {
            // Extensions have not been scanned yet.
            // Record the fact that this activationEvent was requested (in case of a restart)
            this._allRequestedActivateEvents.add(activationEvent);
            if (activationKind === 1 /* ActivationKind.Immediate */) {
                // Do not wait for the normal start-up of the extension host(s)
                return this._activateByEvent(activationEvent, activationKind);
            }
            return this._installedExtensionsReady.wait().then(() => this._activateByEvent(activationEvent, activationKind));
        }
    }
    _activateByEvent(activationEvent, activationKind) {
        const result = Promise.all(this._extensionHostManagers.map(extHostManager => extHostManager.activateByEvent(activationEvent, activationKind))).then(() => { });
        this._onWillActivateByEvent.fire({
            event: activationEvent,
            activation: result
        });
        return result;
    }
    activateById(extensionId, reason) {
        return this._activateById(extensionId, reason);
    }
    activationEventIsDone(activationEvent) {
        if (!this._installedExtensionsReady.isOpen()) {
            return false;
        }
        if (!this._registry.containsActivationEvent(activationEvent)) {
            // There is no extension that is interested in this activation event
            return true;
        }
        return this._extensionHostManagers.every(manager => manager.activationEventIsDone(activationEvent));
    }
    whenInstalledExtensionsRegistered() {
        return this._installedExtensionsReady.wait();
    }
    get extensions() {
        return this._registry.getAllExtensionDescriptions();
    }
    _getExtensionRegistrySnapshotWhenReady() {
        return this._installedExtensionsReady.wait().then(() => this._registry.getSnapshot());
    }
    getExtension(id) {
        return this._installedExtensionsReady.wait().then(() => {
            return this._registry.getExtensionDescription(id);
        });
    }
    readExtensionPointContributions(extPoint) {
        return this._installedExtensionsReady.wait().then(() => {
            const availableExtensions = this._registry.getAllExtensionDescriptions();
            const result = [];
            for (const desc of availableExtensions) {
                if (desc.contributes && hasOwnProperty.call(desc.contributes, extPoint.name)) {
                    result.push(new ExtensionPointContribution(desc, desc.contributes[extPoint.name]));
                }
            }
            return result;
        });
    }
    getExtensionsStatus() {
        const result = Object.create(null);
        if (this._registry) {
            const extensions = this._registry.getAllExtensionDescriptions();
            for (const extension of extensions) {
                const extensionStatus = this._extensionStatus.get(extension.identifier);
                result[extension.identifier.value] = {
                    id: extension.identifier,
                    messages: extensionStatus?.messages ?? [],
                    activationStarted: extensionStatus?.activationStarted ?? false,
                    activationTimes: extensionStatus?.activationTimes ?? undefined,
                    runtimeErrors: extensionStatus?.runtimeErrors ?? [],
                    runningLocation: this._runningLocations.getRunningLocation(extension.identifier),
                };
            }
        }
        return result;
    }
    async getInspectPorts(extensionHostKind, tryEnableInspector) {
        const result = await Promise.all(this._getExtensionHostManagers(extensionHostKind).map(extHost => extHost.getInspectPort(tryEnableInspector)));
        // remove 0s:
        return result.filter(isDefined);
    }
    async setRemoteEnvironment(env) {
        await this._extensionHostManagers
            .map(manager => manager.setRemoteEnvironment(env));
    }
    //#endregion
    // --- impl
    _safeInvokeIsEnabled(extension) {
        try {
            return this._extensionEnablementService.isEnabled(extension);
        }
        catch (err) {
            return false;
        }
    }
    _doHandleExtensionPoints(affectedExtensions, onlyResolverExtensionPoints) {
        const affectedExtensionPoints = Object.create(null);
        for (const extensionDescription of affectedExtensions) {
            if (extensionDescription.contributes) {
                for (const extPointName in extensionDescription.contributes) {
                    if (hasOwnProperty.call(extensionDescription.contributes, extPointName)) {
                        affectedExtensionPoints[extPointName] = true;
                    }
                }
            }
        }
        const messageHandler = (msg) => this._handleExtensionPointMessage(msg);
        const availableExtensions = this._registry.getAllExtensionDescriptions();
        const extensionPoints = ExtensionsRegistry.getExtensionPoints();
        perf.mark(onlyResolverExtensionPoints ? 'code/willHandleResolverExtensionPoints' : 'code/willHandleExtensionPoints');
        for (const extensionPoint of extensionPoints) {
            if (affectedExtensionPoints[extensionPoint.name] && (!onlyResolverExtensionPoints || extensionPoint.canHandleResolver)) {
                perf.mark(`code/willHandleExtensionPoint/${extensionPoint.name}`);
                AbstractExtensionService_1._handleExtensionPoint(extensionPoint, availableExtensions, messageHandler);
                perf.mark(`code/didHandleExtensionPoint/${extensionPoint.name}`);
            }
        }
        perf.mark(onlyResolverExtensionPoints ? 'code/didHandleResolverExtensionPoints' : 'code/didHandleExtensionPoints');
    }
    _getOrCreateExtensionStatus(extensionId) {
        if (!this._extensionStatus.has(extensionId)) {
            this._extensionStatus.set(extensionId, new ExtensionStatus(extensionId));
        }
        return this._extensionStatus.get(extensionId);
    }
    _handleExtensionPointMessage(msg) {
        const extensionStatus = this._getOrCreateExtensionStatus(msg.extensionId);
        extensionStatus.addMessage(msg);
        const extension = this._registry.getExtensionDescription(msg.extensionId);
        const strMsg = `[${msg.extensionId.value}]: ${msg.message}`;
        if (msg.type === Severity.Error) {
            if (extension && extension.isUnderDevelopment) {
                // This message is about the extension currently being developed
                this._notificationService.notify({ severity: Severity.Error, message: strMsg });
            }
            this._logService.error(strMsg);
        }
        else if (msg.type === Severity.Warning) {
            if (extension && extension.isUnderDevelopment) {
                // This message is about the extension currently being developed
                this._notificationService.notify({ severity: Severity.Warning, message: strMsg });
            }
            this._logService.warn(strMsg);
        }
        else {
            this._logService.info(strMsg);
        }
        if (msg.extensionId && this._environmentService.isBuilt && !this._environmentService.isExtensionDevelopment) {
            const { type, extensionId, extensionPointId, message } = msg;
            this._telemetryService.publicLog2('extensionsMessage', {
                type, extensionId: extensionId.value, extensionPointId, message
            });
        }
    }
    static _handleExtensionPoint(extensionPoint, availableExtensions, messageHandler) {
        const users = [];
        for (const desc of availableExtensions) {
            if (desc.contributes && hasOwnProperty.call(desc.contributes, extensionPoint.name)) {
                users.push({
                    description: desc,
                    value: desc.contributes[extensionPoint.name],
                    collector: new ExtensionMessageCollector(messageHandler, desc, extensionPoint.name)
                });
            }
        }
        extensionPoint.acceptUsers(users);
    }
    //#region Called by extension host
    _acquireInternalAPI(extensionHost) {
        return {
            _activateById: (extensionId, reason) => {
                return this._activateById(extensionId, reason);
            },
            _onWillActivateExtension: (extensionId) => {
                return this._onWillActivateExtension(extensionId, extensionHost.runningLocation);
            },
            _onDidActivateExtension: (extensionId, codeLoadingTime, activateCallTime, activateResolvedTime, activationReason) => {
                return this._onDidActivateExtension(extensionId, codeLoadingTime, activateCallTime, activateResolvedTime, activationReason);
            },
            _onDidActivateExtensionError: (extensionId, error) => {
                return this._onDidActivateExtensionError(extensionId, error);
            },
            _onExtensionRuntimeError: (extensionId, err) => {
                return this._onExtensionRuntimeError(extensionId, err);
            }
        };
    }
    async _activateById(extensionId, reason) {
        const results = await Promise.all(this._extensionHostManagers.map(manager => manager.activate(extensionId, reason)));
        const activated = results.some(e => e);
        if (!activated) {
            throw new Error(`Unknown extension ${extensionId.value}`);
        }
    }
    _onWillActivateExtension(extensionId, runningLocation) {
        this._runningLocations.set(extensionId, runningLocation);
        const extensionStatus = this._getOrCreateExtensionStatus(extensionId);
        extensionStatus.onWillActivate();
    }
    _onDidActivateExtension(extensionId, codeLoadingTime, activateCallTime, activateResolvedTime, activationReason) {
        const extensionStatus = this._getOrCreateExtensionStatus(extensionId);
        extensionStatus.setActivationTimes(new ActivationTimes(codeLoadingTime, activateCallTime, activateResolvedTime, activationReason));
        this._onDidChangeExtensionsStatus.fire([extensionId]);
    }
    _onDidActivateExtensionError(extensionId, error) {
        this._telemetryService.publicLog2('extensionActivationError', {
            extensionId: extensionId.value,
            error: error.message
        });
    }
    _onExtensionRuntimeError(extensionId, err) {
        const extensionStatus = this._getOrCreateExtensionStatus(extensionId);
        extensionStatus.addRuntimeError(err);
        this._onDidChangeExtensionsStatus.fire([extensionId]);
    }
};
AbstractExtensionService = AbstractExtensionService_1 = __decorate([
    __param(4, IInstantiationService),
    __param(5, INotificationService),
    __param(6, IWorkbenchEnvironmentService),
    __param(7, ITelemetryService),
    __param(8, IWorkbenchExtensionEnablementService),
    __param(9, IFileService),
    __param(10, IProductService),
    __param(11, IWorkbenchExtensionManagementService),
    __param(12, IWorkspaceContextService),
    __param(13, IConfigurationService),
    __param(14, IExtensionManifestPropertiesService),
    __param(15, ILogService),
    __param(16, IRemoteAgentService),
    __param(17, IRemoteExtensionsScannerService),
    __param(18, ILifecycleService),
    __param(19, IRemoteAuthorityResolverService),
    __param(20, IDialogService)
], AbstractExtensionService);
export { AbstractExtensionService };
class ExtensionHostCollection extends Disposable {
    constructor() {
        super(...arguments);
        this._extensionHostManagers = [];
    }
    dispose() {
        for (let i = this._extensionHostManagers.length - 1; i >= 0; i--) {
            const manager = this._extensionHostManagers[i];
            manager.extensionHost.disconnect();
            manager.dispose();
        }
        this._extensionHostManagers = [];
        super.dispose();
    }
    add(extensionHostManager, disposableStore) {
        this._extensionHostManagers.push(new ExtensionHostManagerData(extensionHostManager, disposableStore));
    }
    async stopAllInReverse() {
        // See https://github.com/microsoft/vscode/issues/152204
        // Dispose extension hosts in reverse creation order because the local extension host
        // might be critical in sustaining a connection to the remote extension host
        for (let i = this._extensionHostManagers.length - 1; i >= 0; i--) {
            const manager = this._extensionHostManagers[i];
            await manager.extensionHost.disconnect();
            manager.dispose();
        }
        this._extensionHostManagers = [];
    }
    async stopOne(extensionHostManager) {
        const index = this._extensionHostManagers.findIndex(el => el.extensionHost === extensionHostManager);
        if (index >= 0) {
            this._extensionHostManagers.splice(index, 1);
            await extensionHostManager.disconnect();
            extensionHostManager.dispose();
        }
    }
    getByKind(kind) {
        return this.filter(el => el.kind === kind);
    }
    getByRunningLocation(runningLocation) {
        for (const el of this._extensionHostManagers) {
            if (el.extensionHost.representsRunningLocation(runningLocation)) {
                return el.extensionHost;
            }
        }
        return null;
    }
    *[Symbol.iterator]() {
        for (const extensionHostManager of this._extensionHostManagers) {
            yield extensionHostManager.extensionHost;
        }
    }
    map(callback) {
        return this._extensionHostManagers.map(el => callback(el.extensionHost));
    }
    every(callback) {
        return this._extensionHostManagers.every(el => callback(el.extensionHost));
    }
    filter(callback) {
        return this._extensionHostManagers.filter(el => callback(el.extensionHost)).map(el => el.extensionHost);
    }
}
class ExtensionHostManagerData {
    constructor(extensionHost, disposableStore) {
        this.extensionHost = extensionHost;
        this.disposableStore = disposableStore;
    }
    dispose() {
        this.disposableStore.dispose();
        this.extensionHost.dispose();
    }
}
export class ResolverExtensions {
    constructor(extensions) {
        this.extensions = extensions;
    }
}
export class LocalExtensions {
    constructor(extensions) {
        this.extensions = extensions;
    }
}
export class RemoteExtensions {
    constructor(extensions) {
        this.extensions = extensions;
    }
}
class DeltaExtensionsQueueItem {
    constructor(toAdd, toRemove) {
        this.toAdd = toAdd;
        this.toRemove = toRemove;
    }
}
export function isResolverExtension(extension) {
    return !!extension.activationEvents?.some(activationEvent => activationEvent.startsWith('onResolveRemoteAuthority:'));
}
/**
 * @argument extensions The extensions to be checked.
 * @argument ignoreWorkspaceTrust Do not take workspace trust into account.
 */
export function checkEnabledAndProposedAPI(logService, extensionEnablementService, extensionsProposedApi, extensions, ignoreWorkspaceTrust) {
    // enable or disable proposed API per extension
    extensionsProposedApi.updateEnabledApiProposals(extensions);
    // keep only enabled extensions
    return filterEnabledExtensions(logService, extensionEnablementService, extensions, ignoreWorkspaceTrust);
}
/**
 * Return the subset of extensions that are enabled.
 * @argument ignoreWorkspaceTrust Do not take workspace trust into account.
 */
export function filterEnabledExtensions(logService, extensionEnablementService, extensions, ignoreWorkspaceTrust) {
    const enabledExtensions = [], extensionsToCheck = [], mappedExtensions = [];
    for (const extension of extensions) {
        if (extension.isUnderDevelopment) {
            // Never disable extensions under development
            enabledExtensions.push(extension);
        }
        else {
            extensionsToCheck.push(extension);
            mappedExtensions.push(toExtension(extension));
        }
    }
    const enablementStates = extensionEnablementService.getEnablementStates(mappedExtensions, ignoreWorkspaceTrust ? { trusted: true } : undefined);
    for (let index = 0; index < enablementStates.length; index++) {
        if (extensionEnablementService.isEnabledEnablementState(enablementStates[index])) {
            enabledExtensions.push(extensionsToCheck[index]);
        }
        else {
            if (isCI) {
                logService.info(`filterEnabledExtensions: extension '${extensionsToCheck[index].identifier.value}' is disabled`);
            }
        }
    }
    return enabledExtensions;
}
/**
 * @argument extension The extension to be checked.
 * @argument ignoreWorkspaceTrust Do not take workspace trust into account.
 */
export function extensionIsEnabled(logService, extensionEnablementService, extension, ignoreWorkspaceTrust) {
    return filterEnabledExtensions(logService, extensionEnablementService, [extension], ignoreWorkspaceTrust).includes(extension);
}
function includes(extensions, identifier) {
    for (const extension of extensions) {
        if (ExtensionIdentifier.equals(extension.identifier, identifier)) {
            return true;
        }
    }
    return false;
}
export class ExtensionStatus {
    get messages() {
        return this._messages;
    }
    get activationTimes() {
        return this._activationTimes;
    }
    get runtimeErrors() {
        return this._runtimeErrors;
    }
    get activationStarted() {
        return this._activationStarted;
    }
    constructor(id) {
        this.id = id;
        this._messages = [];
        this._activationTimes = null;
        this._runtimeErrors = [];
        this._activationStarted = false;
    }
    clearRuntimeStatus() {
        this._activationStarted = false;
        this._activationTimes = null;
        this._runtimeErrors = [];
    }
    addMessage(msg) {
        this._messages.push(msg);
    }
    setActivationTimes(activationTimes) {
        this._activationTimes = activationTimes;
    }
    addRuntimeError(err) {
        this._runtimeErrors.push(err);
    }
    onWillActivate() {
        this._activationStarted = true;
    }
}
export class ExtensionHostCrashTracker {
    constructor() {
        this._recentCrashes = [];
    }
    static { this._TIME_LIMIT = 5 * 60 * 1000; } // 5 minutes
    static { this._CRASH_LIMIT = 3; }
    _removeOldCrashes() {
        const limit = Date.now() - ExtensionHostCrashTracker._TIME_LIMIT;
        while (this._recentCrashes.length > 0 && this._recentCrashes[0].timestamp < limit) {
            this._recentCrashes.shift();
        }
    }
    registerCrash() {
        this._removeOldCrashes();
        this._recentCrashes.push({ timestamp: Date.now() });
    }
    shouldAutomaticallyRestart() {
        this._removeOldCrashes();
        return (this._recentCrashes.length < ExtensionHostCrashTracker._CRASH_LIMIT);
    }
}
/**
 * This can run correctly only on the renderer process because that is the only place
 * where all extension points and all implicit activation events generators are known.
 */
export class ImplicitActivationAwareReader {
    readActivationEvents(extensionDescription) {
        return ImplicitActivationEvents.readActivationEvents(extensionDescription);
    }
}
class ActivationFeatureMarkdowneRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'markdown';
    }
    shouldRender(manifest) {
        return !!manifest.activationEvents;
    }
    render(manifest) {
        const activationEvents = manifest.activationEvents || [];
        const data = new MarkdownString();
        if (activationEvents.length) {
            for (const activationEvent of activationEvents) {
                data.appendMarkdown(`- \`${activationEvent}\`\n`);
            }
        }
        return {
            data,
            dispose: () => { }
        };
    }
}
Registry.as(ExtensionFeaturesExtensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'activationEvents',
    label: nls.localize('activation', "Activation Events"),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(ActivationFeatureMarkdowneRenderer),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RFeHRlbnNpb25TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25zL2NvbW1vbi9hYnN0cmFjdEV4dGVuc2lvblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDekUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBbUIsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDekYsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxLQUFLLElBQUksTUFBTSx3Q0FBd0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDM0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFN0QsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFaEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sNkVB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