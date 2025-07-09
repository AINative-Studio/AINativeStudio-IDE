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
var AbstractExtHostExtensionService_1;
/* eslint-disable local/code-no-native-private */
import * as nls from '../../../nls.js';
import * as path from '../../../base/common/path.js';
import * as performance from '../../../base/common/performance.js';
import { originalFSPath, joinPath, extUriBiasedIgnorePathCase } from '../../../base/common/resources.js';
import { asPromise, Barrier, IntervalTimer, timeout } from '../../../base/common/async.js';
import { dispose, toDisposable, Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { TernarySearchTree } from '../../../base/common/ternarySearchTree.js';
import { URI } from '../../../base/common/uri.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { MainContext } from './extHost.protocol.js';
import { IExtHostConfiguration } from './extHostConfiguration.js';
import { ActivatedExtension, EmptyExtension, ExtensionActivationTimes, ExtensionActivationTimesBuilder, ExtensionsActivator, HostExtension } from './extHostExtensionActivator.js';
import { ExtHostStorage, IExtHostStorage } from './extHostStorage.js';
import { IExtHostWorkspace } from './extHostWorkspace.js';
import { checkProposedApiEnabled, isProposedApiEnabled } from '../../services/extensions/common/extensions.js';
import { ExtensionDescriptionRegistry } from '../../services/extensions/common/extensionDescriptionRegistry.js';
import * as errors from '../../../base/common/errors.js';
import { ExtensionIdentifier, ExtensionIdentifierMap, ExtensionIdentifierSet } from '../../../platform/extensions/common/extensions.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { ExtensionGlobalMemento, ExtensionMemento } from './extHostMemento.js';
import { RemoteAuthorityResolverError, ExtensionKind, ExtensionMode, ManagedResolvedAuthority as ExtHostManagedResolvedAuthority } from './extHostTypes.js';
import { RemoteAuthorityResolverErrorCode, getRemoteAuthorityPrefix, ManagedRemoteConnection, WebSocketRemoteConnection } from '../../../platform/remote/common/remoteAuthorityResolver.js';
import { IInstantiationService, createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { IExtensionStoragePaths } from './extHostStoragePaths.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { ServiceCollection } from '../../../platform/instantiation/common/serviceCollection.js';
import { IExtHostTunnelService } from './extHostTunnelService.js';
import { IExtHostTerminalService } from './extHostTerminalService.js';
import { IExtHostLanguageModels } from './extHostLanguageModels.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { checkActivateWorkspaceContainsExtension } from '../../services/extensions/common/workspaceContains.js';
import { ExtHostSecretState, IExtHostSecretState } from './extHostSecretState.js';
import { ExtensionSecrets } from './extHostSecrets.js';
import { Schemas } from '../../../base/common/network.js';
import { IExtHostLocalizationService } from './extHostLocalizationService.js';
import { StopWatch } from '../../../base/common/stopwatch.js';
import { isCI, setTimeout0 } from '../../../base/common/platform.js';
import { IExtHostManagedSockets } from './extHostManagedSockets.js';
export const IHostUtils = createDecorator('IHostUtils');
let AbstractExtHostExtensionService = AbstractExtHostExtensionService_1 = class AbstractExtHostExtensionService extends Disposable {
    constructor(instaService, hostUtils, extHostContext, extHostWorkspace, extHostConfiguration, logService, initData, storagePath, extHostTunnelService, extHostTerminalService, extHostLocalizationService, _extHostManagedSockets, _extHostLanguageModels) {
        super();
        this._extHostManagedSockets = _extHostManagedSockets;
        this._extHostLanguageModels = _extHostLanguageModels;
        this._onDidChangeRemoteConnectionData = this._register(new Emitter());
        this.onDidChangeRemoteConnectionData = this._onDidChangeRemoteConnectionData.event;
        this._realPathCache = new Map();
        this._isTerminating = false;
        this._hostUtils = hostUtils;
        this._extHostContext = extHostContext;
        this._initData = initData;
        this._extHostWorkspace = extHostWorkspace;
        this._extHostConfiguration = extHostConfiguration;
        this._logService = logService;
        this._extHostTunnelService = extHostTunnelService;
        this._extHostTerminalService = extHostTerminalService;
        this._extHostLocalizationService = extHostLocalizationService;
        this._mainThreadWorkspaceProxy = this._extHostContext.getProxy(MainContext.MainThreadWorkspace);
        this._mainThreadTelemetryProxy = this._extHostContext.getProxy(MainContext.MainThreadTelemetry);
        this._mainThreadExtensionsProxy = this._extHostContext.getProxy(MainContext.MainThreadExtensionService);
        this._almostReadyToRunExtensions = new Barrier();
        this._readyToStartExtensionHost = new Barrier();
        this._readyToRunExtensions = new Barrier();
        this._eagerExtensionsActivated = new Barrier();
        this._activationEventsReader = new SyncedActivationEventsReader(this._initData.extensions.activationEvents);
        this._globalRegistry = new ExtensionDescriptionRegistry(this._activationEventsReader, this._initData.extensions.allExtensions);
        const myExtensionsSet = new ExtensionIdentifierSet(this._initData.extensions.myExtensions);
        this._myRegistry = new ExtensionDescriptionRegistry(this._activationEventsReader, filterExtensions(this._globalRegistry, myExtensionsSet));
        if (isCI) {
            this._logService.info(`Creating extension host with the following global extensions: ${printExtIds(this._globalRegistry)}`);
            this._logService.info(`Creating extension host with the following local extensions: ${printExtIds(this._myRegistry)}`);
        }
        this._storage = new ExtHostStorage(this._extHostContext, this._logService);
        this._secretState = new ExtHostSecretState(this._extHostContext);
        this._storagePath = storagePath;
        this._instaService = this._store.add(instaService.createChild(new ServiceCollection([IExtHostStorage, this._storage], [IExtHostSecretState, this._secretState])));
        this._activator = this._register(new ExtensionsActivator(this._myRegistry, this._globalRegistry, {
            onExtensionActivationError: (extensionId, error, missingExtensionDependency) => {
                this._mainThreadExtensionsProxy.$onExtensionActivationError(extensionId, errors.transformErrorForSerialization(error), missingExtensionDependency);
            },
            actualActivateExtension: async (extensionId, reason) => {
                if (ExtensionDescriptionRegistry.isHostExtension(extensionId, this._myRegistry, this._globalRegistry)) {
                    await this._mainThreadExtensionsProxy.$activateExtension(extensionId, reason);
                    return new HostExtension();
                }
                const extensionDescription = this._myRegistry.getExtensionDescription(extensionId);
                return this._activateExtension(extensionDescription, reason);
            }
        }, this._logService));
        this._extensionPathIndex = null;
        this._resolvers = Object.create(null);
        this._started = false;
        this._remoteConnectionData = this._initData.remote.connectionData;
    }
    getRemoteConnectionData() {
        return this._remoteConnectionData;
    }
    async initialize() {
        try {
            await this._beforeAlmostReadyToRunExtensions();
            this._almostReadyToRunExtensions.open();
            await this._extHostWorkspace.waitForInitializeCall();
            performance.mark('code/extHost/ready');
            this._readyToStartExtensionHost.open();
            if (this._initData.autoStart) {
                this._startExtensionHost();
            }
        }
        catch (err) {
            errors.onUnexpectedError(err);
        }
    }
    async _deactivateAll() {
        this._storagePath.onWillDeactivateAll();
        let allPromises = [];
        try {
            const allExtensions = this._myRegistry.getAllExtensionDescriptions();
            const allExtensionsIds = allExtensions.map(ext => ext.identifier);
            const activatedExtensions = allExtensionsIds.filter(id => this.isActivated(id));
            allPromises = activatedExtensions.map((extensionId) => {
                return this._deactivate(extensionId);
            });
        }
        catch (err) {
            // TODO: write to log once we have one
        }
        await Promise.all(allPromises);
    }
    terminate(reason, code = 0) {
        if (this._isTerminating) {
            // we are already shutting down...
            return;
        }
        this._isTerminating = true;
        this._logService.info(`Extension host terminating: ${reason}`);
        this._logService.flush();
        this._extHostTerminalService.dispose();
        this._activator.dispose();
        errors.setUnexpectedErrorHandler((err) => {
            this._logService.error(err);
        });
        // Invalidate all proxies
        this._extHostContext.dispose();
        const extensionsDeactivated = this._deactivateAll();
        // Give extensions at most 5 seconds to wrap up any async deactivate, then exit
        Promise.race([timeout(5000), extensionsDeactivated]).finally(() => {
            if (this._hostUtils.pid) {
                this._logService.info(`Extension host with pid ${this._hostUtils.pid} exiting with code ${code}`);
            }
            else {
                this._logService.info(`Extension host exiting with code ${code}`);
            }
            this._logService.flush();
            this._logService.dispose();
            this._hostUtils.exit(code);
        });
    }
    isActivated(extensionId) {
        if (this._readyToRunExtensions.isOpen()) {
            return this._activator.isActivated(extensionId);
        }
        return false;
    }
    async getExtension(extensionId) {
        const ext = await this._mainThreadExtensionsProxy.$getExtension(extensionId);
        return ext && {
            ...ext,
            identifier: new ExtensionIdentifier(ext.identifier.value),
            extensionLocation: URI.revive(ext.extensionLocation)
        };
    }
    _activateByEvent(activationEvent, startup) {
        return this._activator.activateByEvent(activationEvent, startup);
    }
    _activateById(extensionId, reason) {
        return this._activator.activateById(extensionId, reason);
    }
    activateByIdWithErrors(extensionId, reason) {
        return this._activateById(extensionId, reason).then(() => {
            const extension = this._activator.getActivatedExtension(extensionId);
            if (extension.activationFailed) {
                // activation failed => bubble up the error as the promise result
                return Promise.reject(extension.activationFailedError);
            }
            return undefined;
        });
    }
    getExtensionRegistry() {
        return this._readyToRunExtensions.wait().then(_ => this._myRegistry);
    }
    getExtensionExports(extensionId) {
        if (this._readyToRunExtensions.isOpen()) {
            return this._activator.getActivatedExtension(extensionId).exports;
        }
        else {
            try {
                return this._activator.getActivatedExtension(extensionId).exports;
            }
            catch (err) {
                return null;
            }
        }
    }
    /**
     * Applies realpath to file-uris and returns all others uris unmodified.
     * The real path is cached for the lifetime of the extension host.
     */
    async _realPathExtensionUri(uri) {
        if (uri.scheme === Schemas.file && this._hostUtils.fsRealpath) {
            const fsPath = uri.fsPath;
            if (!this._realPathCache.has(fsPath)) {
                this._realPathCache.set(fsPath, this._hostUtils.fsRealpath(fsPath));
            }
            const realpathValue = await this._realPathCache.get(fsPath);
            return URI.file(realpathValue);
        }
        return uri;
    }
    // create trie to enable fast 'filename -> extension id' look up
    async getExtensionPathIndex() {
        if (!this._extensionPathIndex) {
            this._extensionPathIndex = this._createExtensionPathIndex(this._myRegistry.getAllExtensionDescriptions()).then((searchTree) => {
                return new ExtensionPaths(searchTree);
            });
        }
        return this._extensionPathIndex;
    }
    /**
     * create trie to enable fast 'filename -> extension id' look up
     */
    async _createExtensionPathIndex(extensions) {
        const tst = TernarySearchTree.forUris(key => {
            // using the default/biased extUri-util because the IExtHostFileSystemInfo-service
            // isn't ready to be used yet, e.g the knowledge about `file` protocol and others
            // comes in while this code runs
            return extUriBiasedIgnorePathCase.ignorePathCasing(key);
        });
        // const tst = TernarySearchTree.forUris<IExtensionDescription>(key => true);
        await Promise.all(extensions.map(async (ext) => {
            if (this._getEntryPoint(ext)) {
                const uri = await this._realPathExtensionUri(ext.extensionLocation);
                tst.set(uri, ext);
            }
        }));
        return tst;
    }
    _deactivate(extensionId) {
        let result = Promise.resolve(undefined);
        if (!this._readyToRunExtensions.isOpen()) {
            return result;
        }
        if (!this._activator.isActivated(extensionId)) {
            return result;
        }
        const extension = this._activator.getActivatedExtension(extensionId);
        if (!extension) {
            return result;
        }
        // call deactivate if available
        try {
            if (typeof extension.module.deactivate === 'function') {
                result = Promise.resolve(extension.module.deactivate()).then(undefined, (err) => {
                    this._logService.error(err);
                    return Promise.resolve(undefined);
                });
            }
        }
        catch (err) {
            this._logService.error(`An error occurred when deactivating the extension '${extensionId.value}':`);
            this._logService.error(err);
        }
        // clean up subscriptions
        try {
            extension.disposable.dispose();
        }
        catch (err) {
            this._logService.error(`An error occurred when disposing the subscriptions for extension '${extensionId.value}':`);
            this._logService.error(err);
        }
        return result;
    }
    // --- impl
    async _activateExtension(extensionDescription, reason) {
        if (!this._initData.remote.isRemote) {
            // local extension host process
            await this._mainThreadExtensionsProxy.$onWillActivateExtension(extensionDescription.identifier);
        }
        else {
            // remote extension host process
            // do not wait for renderer confirmation
            this._mainThreadExtensionsProxy.$onWillActivateExtension(extensionDescription.identifier);
        }
        return this._doActivateExtension(extensionDescription, reason).then((activatedExtension) => {
            const activationTimes = activatedExtension.activationTimes;
            this._mainThreadExtensionsProxy.$onDidActivateExtension(extensionDescription.identifier, activationTimes.codeLoadingTime, activationTimes.activateCallTime, activationTimes.activateResolvedTime, reason);
            this._logExtensionActivationTimes(extensionDescription, reason, 'success', activationTimes);
            return activatedExtension;
        }, (err) => {
            this._logExtensionActivationTimes(extensionDescription, reason, 'failure');
            throw err;
        });
    }
    _logExtensionActivationTimes(extensionDescription, reason, outcome, activationTimes) {
        const event = getTelemetryActivationEvent(extensionDescription, reason);
        this._mainThreadTelemetryProxy.$publicLog2('extensionActivationTimes', {
            ...event,
            ...(activationTimes || {}),
            outcome
        });
    }
    _doActivateExtension(extensionDescription, reason) {
        const event = getTelemetryActivationEvent(extensionDescription, reason);
        this._mainThreadTelemetryProxy.$publicLog2('activatePlugin', event);
        const entryPoint = this._getEntryPoint(extensionDescription);
        if (!entryPoint) {
            // Treat the extension as being empty => NOT AN ERROR CASE
            return Promise.resolve(new EmptyExtension(ExtensionActivationTimes.NONE));
        }
        this._logService.info(`ExtensionService#_doActivateExtension ${extensionDescription.identifier.value}, startup: ${reason.startup}, activationEvent: '${reason.activationEvent}'${extensionDescription.identifier.value !== reason.extensionId.value ? `, root cause: ${reason.extensionId.value}` : ``}`);
        this._logService.flush();
        const extensionInternalStore = new DisposableStore(); // disposables that follow the extension lifecycle
        const activationTimesBuilder = new ExtensionActivationTimesBuilder(reason.startup);
        return Promise.all([
            this._loadCommonJSModule(extensionDescription, joinPath(extensionDescription.extensionLocation, entryPoint), activationTimesBuilder),
            this._loadExtensionContext(extensionDescription, extensionInternalStore)
        ]).then(values => {
            performance.mark(`code/extHost/willActivateExtension/${extensionDescription.identifier.value}`);
            return AbstractExtHostExtensionService_1._callActivate(this._logService, extensionDescription.identifier, values[0], values[1], extensionInternalStore, activationTimesBuilder);
        }).then((activatedExtension) => {
            performance.mark(`code/extHost/didActivateExtension/${extensionDescription.identifier.value}`);
            return activatedExtension;
        });
    }
    _loadExtensionContext(extensionDescription, extensionInternalStore) {
        const languageModelAccessInformation = this._extHostLanguageModels.createLanguageModelAccessInformation(extensionDescription);
        const globalState = extensionInternalStore.add(new ExtensionGlobalMemento(extensionDescription, this._storage));
        const workspaceState = extensionInternalStore.add(new ExtensionMemento(extensionDescription.identifier.value, false, this._storage));
        const secrets = extensionInternalStore.add(new ExtensionSecrets(extensionDescription, this._secretState));
        const extensionMode = extensionDescription.isUnderDevelopment
            ? (this._initData.environment.extensionTestsLocationURI ? ExtensionMode.Test : ExtensionMode.Development)
            : ExtensionMode.Production;
        const extensionKind = this._initData.remote.isRemote ? ExtensionKind.Workspace : ExtensionKind.UI;
        this._logService.trace(`ExtensionService#loadExtensionContext ${extensionDescription.identifier.value}`);
        return Promise.all([
            globalState.whenReady,
            workspaceState.whenReady,
            this._storagePath.whenReady
        ]).then(() => {
            const that = this;
            let extension;
            let messagePassingProtocol;
            const messagePort = isProposedApiEnabled(extensionDescription, 'ipc')
                ? this._initData.messagePorts?.get(ExtensionIdentifier.toKey(extensionDescription.identifier))
                : undefined;
            return Object.freeze({
                globalState,
                workspaceState,
                secrets,
                subscriptions: [],
                get languageModelAccessInformation() { return languageModelAccessInformation; },
                get extensionUri() { return extensionDescription.extensionLocation; },
                get extensionPath() { return extensionDescription.extensionLocation.fsPath; },
                asAbsolutePath(relativePath) { return path.join(extensionDescription.extensionLocation.fsPath, relativePath); },
                get storagePath() { return that._storagePath.workspaceValue(extensionDescription)?.fsPath; },
                get globalStoragePath() { return that._storagePath.globalValue(extensionDescription).fsPath; },
                get logPath() { return path.join(that._initData.logsLocation.fsPath, extensionDescription.identifier.value); },
                get logUri() { return URI.joinPath(that._initData.logsLocation, extensionDescription.identifier.value); },
                get storageUri() { return that._storagePath.workspaceValue(extensionDescription); },
                get globalStorageUri() { return that._storagePath.globalValue(extensionDescription); },
                get extensionMode() { return extensionMode; },
                get extension() {
                    if (extension === undefined) {
                        extension = new Extension(that, extensionDescription.identifier, extensionDescription, extensionKind, false);
                    }
                    return extension;
                },
                get extensionRuntime() {
                    checkProposedApiEnabled(extensionDescription, 'extensionRuntime');
                    return that.extensionRuntime;
                },
                get environmentVariableCollection() { return that._extHostTerminalService.getEnvironmentVariableCollection(extensionDescription); },
                get messagePassingProtocol() {
                    if (!messagePassingProtocol) {
                        if (!messagePort) {
                            return undefined;
                        }
                        const onDidReceiveMessage = Event.buffer(Event.fromDOMEventEmitter(messagePort, 'message', e => e.data));
                        messagePort.start();
                        messagePassingProtocol = {
                            onDidReceiveMessage,
                            postMessage: messagePort.postMessage.bind(messagePort)
                        };
                    }
                    return messagePassingProtocol;
                }
            });
        });
    }
    static _callActivate(logService, extensionId, extensionModule, context, extensionInternalStore, activationTimesBuilder) {
        // Make sure the extension's surface is not undefined
        extensionModule = extensionModule || {
            activate: undefined,
            deactivate: undefined
        };
        return this._callActivateOptional(logService, extensionId, extensionModule, context, activationTimesBuilder).then((extensionExports) => {
            return new ActivatedExtension(false, null, activationTimesBuilder.build(), extensionModule, extensionExports, toDisposable(() => {
                extensionInternalStore.dispose();
                dispose(context.subscriptions);
            }));
        });
    }
    static _callActivateOptional(logService, extensionId, extensionModule, context, activationTimesBuilder) {
        if (typeof extensionModule.activate === 'function') {
            try {
                activationTimesBuilder.activateCallStart();
                logService.trace(`ExtensionService#_callActivateOptional ${extensionId.value}`);
                const scope = typeof global === 'object' ? global : self; // `global` is nodejs while `self` is for workers
                const activateResult = extensionModule.activate.apply(scope, [context]);
                activationTimesBuilder.activateCallStop();
                activationTimesBuilder.activateResolveStart();
                return Promise.resolve(activateResult).then((value) => {
                    activationTimesBuilder.activateResolveStop();
                    return value;
                });
            }
            catch (err) {
                return Promise.reject(err);
            }
        }
        else {
            // No activate found => the module is the extension's exports
            return Promise.resolve(extensionModule);
        }
    }
    // -- eager activation
    _activateOneStartupFinished(desc, activationEvent) {
        this._activateById(desc.identifier, {
            startup: false,
            extensionId: desc.identifier,
            activationEvent: activationEvent
        }).then(undefined, (err) => {
            this._logService.error(err);
        });
    }
    _activateAllStartupFinishedDeferred(extensions, start = 0) {
        const timeBudget = 50; // 50 milliseconds
        const startTime = Date.now();
        setTimeout0(() => {
            for (let i = start; i < extensions.length; i += 1) {
                const desc = extensions[i];
                for (const activationEvent of (desc.activationEvents ?? [])) {
                    if (activationEvent === 'onStartupFinished') {
                        if (Date.now() - startTime > timeBudget) {
                            // time budget for current task has been exceeded
                            // set a new task to activate current and remaining extensions
                            this._activateAllStartupFinishedDeferred(extensions, i);
                            break;
                        }
                        else {
                            this._activateOneStartupFinished(desc, activationEvent);
                        }
                    }
                }
            }
        });
    }
    _activateAllStartupFinished() {
        // startup is considered finished
        this._mainThreadExtensionsProxy.$setPerformanceMarks(performance.getMarks());
        this._extHostConfiguration.getConfigProvider().then((configProvider) => {
            const shouldDeferActivation = configProvider.getConfiguration('extensions.experimental').get('deferredStartupFinishedActivation');
            const allExtensionDescriptions = this._myRegistry.getAllExtensionDescriptions();
            if (shouldDeferActivation) {
                this._activateAllStartupFinishedDeferred(allExtensionDescriptions);
            }
            else {
                for (const desc of allExtensionDescriptions) {
                    if (desc.activationEvents) {
                        for (const activationEvent of desc.activationEvents) {
                            if (activationEvent === 'onStartupFinished') {
                                this._activateOneStartupFinished(desc, activationEvent);
                            }
                        }
                    }
                }
            }
        });
    }
    // Handle "eager" activation extensions
    _handleEagerExtensions() {
        const starActivation = this._activateByEvent('*', true).then(undefined, (err) => {
            this._logService.error(err);
        });
        this._register(this._extHostWorkspace.onDidChangeWorkspace((e) => this._handleWorkspaceContainsEagerExtensions(e.added)));
        const folders = this._extHostWorkspace.workspace ? this._extHostWorkspace.workspace.folders : [];
        const workspaceContainsActivation = this._handleWorkspaceContainsEagerExtensions(folders);
        const remoteResolverActivation = this._handleRemoteResolverEagerExtensions();
        const eagerExtensionsActivation = Promise.all([remoteResolverActivation, starActivation, workspaceContainsActivation]).then(() => { });
        Promise.race([eagerExtensionsActivation, timeout(10000)]).then(() => {
            this._activateAllStartupFinished();
        });
        return eagerExtensionsActivation;
    }
    _handleWorkspaceContainsEagerExtensions(folders) {
        if (folders.length === 0) {
            return Promise.resolve(undefined);
        }
        return Promise.all(this._myRegistry.getAllExtensionDescriptions().map((desc) => {
            return this._handleWorkspaceContainsEagerExtension(folders, desc);
        })).then(() => { });
    }
    async _handleWorkspaceContainsEagerExtension(folders, desc) {
        if (this.isActivated(desc.identifier)) {
            return;
        }
        const localWithRemote = !this._initData.remote.isRemote && !!this._initData.remote.authority;
        const host = {
            logService: this._logService,
            folders: folders.map(folder => folder.uri),
            forceUsingSearch: localWithRemote || !this._hostUtils.fsExists,
            exists: (uri) => this._hostUtils.fsExists(uri.fsPath),
            checkExists: (folders, includes, token) => this._mainThreadWorkspaceProxy.$checkExists(folders, includes, token)
        };
        const result = await checkActivateWorkspaceContainsExtension(host, desc);
        if (!result) {
            return;
        }
        return (this._activateById(desc.identifier, { startup: true, extensionId: desc.identifier, activationEvent: result.activationEvent })
            .then(undefined, err => this._logService.error(err)));
    }
    async _handleRemoteResolverEagerExtensions() {
        if (this._initData.remote.authority) {
            return this._activateByEvent(`onResolveRemoteAuthority:${this._initData.remote.authority}`, false);
        }
    }
    async $extensionTestsExecute() {
        await this._eagerExtensionsActivated.wait();
        try {
            return await this._doHandleExtensionTests();
        }
        catch (error) {
            console.error(error); // ensure any error message makes it onto the console
            throw error;
        }
    }
    async _doHandleExtensionTests() {
        const { extensionDevelopmentLocationURI, extensionTestsLocationURI } = this._initData.environment;
        if (!extensionDevelopmentLocationURI || !extensionTestsLocationURI) {
            throw new Error(nls.localize('extensionTestError1', "Cannot load test runner."));
        }
        // Require the test runner via node require from the provided path
        const testRunner = await this._loadCommonJSModule(null, extensionTestsLocationURI, new ExtensionActivationTimesBuilder(false));
        if (!testRunner || typeof testRunner.run !== 'function') {
            throw new Error(nls.localize('extensionTestError', "Path {0} does not point to a valid extension test runner.", extensionTestsLocationURI.toString()));
        }
        // Execute the runner if it follows the old `run` spec
        return new Promise((resolve, reject) => {
            const oldTestRunnerCallback = (error, failures) => {
                if (error) {
                    if (isCI) {
                        this._logService.error(`Test runner called back with error`, error);
                    }
                    reject(error);
                }
                else {
                    if (isCI) {
                        if (failures) {
                            this._logService.info(`Test runner called back with ${failures} failures.`);
                        }
                        else {
                            this._logService.info(`Test runner called back with successful outcome.`);
                        }
                    }
                    resolve((typeof failures === 'number' && failures > 0) ? 1 /* ERROR */ : 0 /* OK */);
                }
            };
            const extensionTestsPath = originalFSPath(extensionTestsLocationURI); // for the old test runner API
            const runResult = testRunner.run(extensionTestsPath, oldTestRunnerCallback);
            // Using the new API `run(): Promise<void>`
            if (runResult && runResult.then) {
                runResult
                    .then(() => {
                    if (isCI) {
                        this._logService.info(`Test runner finished successfully.`);
                    }
                    resolve(0);
                })
                    .catch((err) => {
                    if (isCI) {
                        this._logService.error(`Test runner finished with error`, err);
                    }
                    reject(err instanceof Error && err.stack ? err.stack : String(err));
                });
            }
        });
    }
    _startExtensionHost() {
        if (this._started) {
            throw new Error(`Extension host is already started!`);
        }
        this._started = true;
        return this._readyToStartExtensionHost.wait()
            .then(() => this._readyToRunExtensions.open())
            .then(() => {
            // wait for all activation events that came in during workbench startup, but at maximum 1s
            return Promise.race([this._activator.waitForActivatingExtensions(), timeout(1000)]);
        })
            .then(() => this._handleEagerExtensions())
            .then(() => {
            this._eagerExtensionsActivated.open();
            this._logService.info(`Eager extensions activated`);
        });
    }
    // -- called by extensions
    registerRemoteAuthorityResolver(authorityPrefix, resolver) {
        this._resolvers[authorityPrefix] = resolver;
        return toDisposable(() => {
            delete this._resolvers[authorityPrefix];
        });
    }
    async getRemoteExecServer(remoteAuthority) {
        const { resolver } = await this._activateAndGetResolver(remoteAuthority);
        return resolver?.resolveExecServer?.(remoteAuthority, { resolveAttempt: 0 });
    }
    // -- called by main thread
    async _activateAndGetResolver(remoteAuthority) {
        const authorityPlusIndex = remoteAuthority.indexOf('+');
        if (authorityPlusIndex === -1) {
            throw new RemoteAuthorityResolverError(`Not an authority that can be resolved!`, RemoteAuthorityResolverErrorCode.InvalidAuthority);
        }
        const authorityPrefix = remoteAuthority.substr(0, authorityPlusIndex);
        await this._almostReadyToRunExtensions.wait();
        await this._activateByEvent(`onResolveRemoteAuthority:${authorityPrefix}`, false);
        return { authorityPrefix, resolver: this._resolvers[authorityPrefix] };
    }
    async $resolveAuthority(remoteAuthorityChain, resolveAttempt) {
        const sw = StopWatch.create(false);
        const prefix = () => `[resolveAuthority(${getRemoteAuthorityPrefix(remoteAuthorityChain)},${resolveAttempt})][${sw.elapsed()}ms] `;
        const logInfo = (msg) => this._logService.info(`${prefix()}${msg}`);
        const logWarning = (msg) => this._logService.warn(`${prefix()}${msg}`);
        const logError = (msg, err = undefined) => this._logService.error(`${prefix()}${msg}`, err);
        const normalizeError = (err) => {
            if (err instanceof RemoteAuthorityResolverError) {
                return {
                    type: 'error',
                    error: {
                        code: err._code,
                        message: err._message,
                        detail: err._detail
                    }
                };
            }
            throw err;
        };
        const getResolver = async (remoteAuthority) => {
            logInfo(`activating resolver for ${remoteAuthority}...`);
            const { resolver, authorityPrefix } = await this._activateAndGetResolver(remoteAuthority);
            if (!resolver) {
                logError(`no resolver for ${authorityPrefix}`);
                throw new RemoteAuthorityResolverError(`No remote extension installed to resolve ${authorityPrefix}.`, RemoteAuthorityResolverErrorCode.NoResolverFound);
            }
            return { resolver, authorityPrefix, remoteAuthority };
        };
        const chain = remoteAuthorityChain.split(/@|%40/g).reverse();
        logInfo(`activating remote resolvers ${chain.join(' -> ')}`);
        let resolvers;
        try {
            resolvers = await Promise.all(chain.map(getResolver)).catch(async (e) => {
                if (!(e instanceof RemoteAuthorityResolverError) || e._code !== RemoteAuthorityResolverErrorCode.InvalidAuthority) {
                    throw e;
                }
                logWarning(`resolving nested authorities failed: ${e.message}`);
                return [await getResolver(remoteAuthorityChain)];
            });
        }
        catch (e) {
            return normalizeError(e);
        }
        const intervalLogger = new IntervalTimer();
        intervalLogger.cancelAndSet(() => logInfo('waiting...'), 1000);
        let result;
        let execServer;
        for (const [i, { authorityPrefix, resolver, remoteAuthority }] of resolvers.entries()) {
            try {
                if (i === resolvers.length - 1) {
                    logInfo(`invoking final resolve()...`);
                    performance.mark(`code/extHost/willResolveAuthority/${authorityPrefix}`);
                    result = await resolver.resolve(remoteAuthority, { resolveAttempt, execServer });
                    performance.mark(`code/extHost/didResolveAuthorityOK/${authorityPrefix}`);
                    logInfo(`setting tunnel factory...`);
                    this._register(await this._extHostTunnelService.setTunnelFactory(resolver, ExtHostManagedResolvedAuthority.isManagedResolvedAuthority(result) ? result : undefined));
                }
                else {
                    logInfo(`invoking resolveExecServer() for ${remoteAuthority}`);
                    performance.mark(`code/extHost/willResolveExecServer/${authorityPrefix}`);
                    execServer = await resolver.resolveExecServer?.(remoteAuthority, { resolveAttempt, execServer });
                    if (!execServer) {
                        throw new RemoteAuthorityResolverError(`Exec server was not available for ${remoteAuthority}`, RemoteAuthorityResolverErrorCode.NoResolverFound); // we did, in fact, break the chain :(
                    }
                    performance.mark(`code/extHost/didResolveExecServerOK/${authorityPrefix}`);
                }
            }
            catch (e) {
                performance.mark(`code/extHost/didResolveAuthorityError/${authorityPrefix}`);
                logError(`returned an error`, e);
                intervalLogger.dispose();
                return normalizeError(e);
            }
        }
        intervalLogger.dispose();
        const tunnelInformation = {
            environmentTunnels: result.environmentTunnels,
            features: result.tunnelFeatures ? {
                elevation: result.tunnelFeatures.elevation,
                privacyOptions: result.tunnelFeatures.privacyOptions,
                protocol: result.tunnelFeatures.protocol === undefined ? true : result.tunnelFeatures.protocol,
            } : undefined
        };
        // Split merged API result into separate authority/options
        const options = {
            extensionHostEnv: result.extensionHostEnv,
            isTrusted: result.isTrusted,
            authenticationSession: result.authenticationSessionForInitializingExtensions ? { id: result.authenticationSessionForInitializingExtensions.id, providerId: result.authenticationSessionForInitializingExtensions.providerId } : undefined
        };
        // extension are not required to return an instance of ResolvedAuthority or ManagedResolvedAuthority, so don't use `instanceof`
        logInfo(`returned ${ExtHostManagedResolvedAuthority.isManagedResolvedAuthority(result) ? 'managed authority' : `${result.host}:${result.port}`}`);
        let authority;
        if (ExtHostManagedResolvedAuthority.isManagedResolvedAuthority(result)) {
            // The socket factory is identified by the `resolveAttempt`, since that is a number which
            // always increments and is unique over all resolve() calls in a workbench session.
            const socketFactoryId = resolveAttempt;
            // There is only on managed socket factory at a time, so we can just overwrite the old one.
            this._extHostManagedSockets.setFactory(socketFactoryId, result.makeConnection);
            authority = {
                authority: remoteAuthorityChain,
                connectTo: new ManagedRemoteConnection(socketFactoryId),
                connectionToken: result.connectionToken
            };
        }
        else {
            authority = {
                authority: remoteAuthorityChain,
                connectTo: new WebSocketRemoteConnection(result.host, result.port),
                connectionToken: result.connectionToken
            };
        }
        return {
            type: 'ok',
            value: {
                authority: authority,
                options,
                tunnelInformation,
            }
        };
    }
    async $getCanonicalURI(remoteAuthority, uriComponents) {
        this._logService.info(`$getCanonicalURI invoked for authority (${getRemoteAuthorityPrefix(remoteAuthority)})`);
        const { resolver } = await this._activateAndGetResolver(remoteAuthority);
        if (!resolver) {
            // Return `null` if no resolver for `remoteAuthority` is found.
            return null;
        }
        const uri = URI.revive(uriComponents);
        if (typeof resolver.getCanonicalURI === 'undefined') {
            // resolver cannot compute canonical URI
            return uri;
        }
        const result = await asPromise(() => resolver.getCanonicalURI(uri));
        if (!result) {
            return uri;
        }
        return result;
    }
    async $startExtensionHost(extensionsDelta) {
        extensionsDelta.toAdd.forEach((extension) => extension.extensionLocation = URI.revive(extension.extensionLocation));
        const { globalRegistry, myExtensions } = applyExtensionsDelta(this._activationEventsReader, this._globalRegistry, this._myRegistry, extensionsDelta);
        const newSearchTree = await this._createExtensionPathIndex(myExtensions);
        const extensionsPaths = await this.getExtensionPathIndex();
        extensionsPaths.setSearchTree(newSearchTree);
        this._globalRegistry.set(globalRegistry.getAllExtensionDescriptions());
        this._myRegistry.set(myExtensions);
        if (isCI) {
            this._logService.info(`$startExtensionHost: global extensions: ${printExtIds(this._globalRegistry)}`);
            this._logService.info(`$startExtensionHost: local extensions: ${printExtIds(this._myRegistry)}`);
        }
        return this._startExtensionHost();
    }
    $activateByEvent(activationEvent, activationKind) {
        if (activationKind === 1 /* ActivationKind.Immediate */) {
            return this._almostReadyToRunExtensions.wait()
                .then(_ => this._activateByEvent(activationEvent, false));
        }
        return (this._readyToRunExtensions.wait()
            .then(_ => this._activateByEvent(activationEvent, false)));
    }
    async $activate(extensionId, reason) {
        await this._readyToRunExtensions.wait();
        if (!this._myRegistry.getExtensionDescription(extensionId)) {
            // unknown extension => ignore
            return false;
        }
        await this._activateById(extensionId, reason);
        return true;
    }
    async $deltaExtensions(extensionsDelta) {
        extensionsDelta.toAdd.forEach((extension) => extension.extensionLocation = URI.revive(extension.extensionLocation));
        // First build up and update the trie and only afterwards apply the delta
        const { globalRegistry, myExtensions } = applyExtensionsDelta(this._activationEventsReader, this._globalRegistry, this._myRegistry, extensionsDelta);
        const newSearchTree = await this._createExtensionPathIndex(myExtensions);
        const extensionsPaths = await this.getExtensionPathIndex();
        extensionsPaths.setSearchTree(newSearchTree);
        this._globalRegistry.set(globalRegistry.getAllExtensionDescriptions());
        this._myRegistry.set(myExtensions);
        if (isCI) {
            this._logService.info(`$deltaExtensions: global extensions: ${printExtIds(this._globalRegistry)}`);
            this._logService.info(`$deltaExtensions: local extensions: ${printExtIds(this._myRegistry)}`);
        }
        return Promise.resolve(undefined);
    }
    async $test_latency(n) {
        return n;
    }
    async $test_up(b) {
        return b.byteLength;
    }
    async $test_down(size) {
        const buff = VSBuffer.alloc(size);
        const value = Math.random() % 256;
        for (let i = 0; i < size; i++) {
            buff.writeUInt8(value, i);
        }
        return buff;
    }
    async $updateRemoteConnectionData(connectionData) {
        this._remoteConnectionData = connectionData;
        this._onDidChangeRemoteConnectionData.fire();
    }
};
AbstractExtHostExtensionService = AbstractExtHostExtensionService_1 = __decorate([
    __param(0, IInstantiationService),
    __param(1, IHostUtils),
    __param(2, IExtHostRpcService),
    __param(3, IExtHostWorkspace),
    __param(4, IExtHostConfiguration),
    __param(5, ILogService),
    __param(6, IExtHostInitDataService),
    __param(7, IExtensionStoragePaths),
    __param(8, IExtHostTunnelService),
    __param(9, IExtHostTerminalService),
    __param(10, IExtHostLocalizationService),
    __param(11, IExtHostManagedSockets),
    __param(12, IExtHostLanguageModels)
], AbstractExtHostExtensionService);
export { AbstractExtHostExtensionService };
function applyExtensionsDelta(activationEventsReader, oldGlobalRegistry, oldMyRegistry, extensionsDelta) {
    activationEventsReader.addActivationEvents(extensionsDelta.addActivationEvents);
    const globalRegistry = new ExtensionDescriptionRegistry(activationEventsReader, oldGlobalRegistry.getAllExtensionDescriptions());
    globalRegistry.deltaExtensions(extensionsDelta.toAdd, extensionsDelta.toRemove);
    const myExtensionsSet = new ExtensionIdentifierSet(oldMyRegistry.getAllExtensionDescriptions().map(extension => extension.identifier));
    for (const extensionId of extensionsDelta.myToRemove) {
        myExtensionsSet.delete(extensionId);
    }
    for (const extensionId of extensionsDelta.myToAdd) {
        myExtensionsSet.add(extensionId);
    }
    const myExtensions = filterExtensions(globalRegistry, myExtensionsSet);
    return { globalRegistry, myExtensions };
}
function getTelemetryActivationEvent(extensionDescription, reason) {
    const event = {
        id: extensionDescription.identifier.value,
        name: extensionDescription.name,
        extensionVersion: extensionDescription.version,
        publisherDisplayName: extensionDescription.publisher,
        activationEvents: extensionDescription.activationEvents ? extensionDescription.activationEvents.join(',') : null,
        isBuiltin: extensionDescription.isBuiltin,
        reason: reason.activationEvent,
        reasonId: reason.extensionId.value,
    };
    return event;
}
function printExtIds(registry) {
    return registry.getAllExtensionDescriptions().map(ext => ext.identifier.value).join(',');
}
export const IExtHostExtensionService = createDecorator('IExtHostExtensionService');
export class Extension {
    #extensionService;
    #originExtensionId;
    #identifier;
    constructor(extensionService, originExtensionId, description, kind, isFromDifferentExtensionHost) {
        this.#extensionService = extensionService;
        this.#originExtensionId = originExtensionId;
        this.#identifier = description.identifier;
        this.id = description.identifier.value;
        this.extensionUri = description.extensionLocation;
        this.extensionPath = path.normalize(originalFSPath(description.extensionLocation));
        this.packageJSON = description;
        this.extensionKind = kind;
        this.isFromDifferentExtensionHost = isFromDifferentExtensionHost;
    }
    get isActive() {
        // TODO@alexdima support this
        return this.#extensionService.isActivated(this.#identifier);
    }
    get exports() {
        if (this.packageJSON.api === 'none' || this.isFromDifferentExtensionHost) {
            return undefined; // Strict nulloverride - Public api
        }
        return this.#extensionService.getExtensionExports(this.#identifier);
    }
    async activate() {
        if (this.isFromDifferentExtensionHost) {
            throw new Error('Cannot activate foreign extension'); // TODO@alexdima support this
        }
        await this.#extensionService.activateByIdWithErrors(this.#identifier, { startup: false, extensionId: this.#originExtensionId, activationEvent: 'api' });
        return this.exports;
    }
}
function filterExtensions(globalRegistry, desiredExtensions) {
    return globalRegistry.getAllExtensionDescriptions().filter(extension => desiredExtensions.has(extension.identifier));
}
export class ExtensionPaths {
    constructor(_searchTree) {
        this._searchTree = _searchTree;
    }
    setSearchTree(searchTree) {
        this._searchTree = searchTree;
    }
    findSubstr(key) {
        return this._searchTree.findSubstr(key);
    }
    forEach(callback) {
        return this._searchTree.forEach(callback);
    }
}
/**
 * This mirrors the activation events as seen by the renderer. The renderer
 * is the only one which can have a reliable view of activation events because
 * implicit activation events are generated via extension points, and they
 * are registered only on the renderer side.
 */
class SyncedActivationEventsReader {
    constructor(activationEvents) {
        this._map = new ExtensionIdentifierMap();
        this.addActivationEvents(activationEvents);
    }
    readActivationEvents(extensionDescription) {
        return this._map.get(extensionDescription.identifier) ?? [];
    }
    addActivationEvents(activationEvents) {
        for (const extensionId of Object.keys(activationEvents)) {
            this._map.set(extensionId, activationEvents[extensionId]);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEV4dGVuc2lvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdEV4dGVuc2lvblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLGlEQUFpRDtBQUVqRCxPQUFPLEtBQUssR0FBRyxNQUFNLGlCQUFpQixDQUFDO0FBQ3ZDLE9BQU8sS0FBSyxJQUFJLE1BQU0sOEJBQThCLENBQUM7QUFDckQsT0FBTyxLQUFLLFdBQVcsTUFBTSxxQ0FBcUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMzRixPQUFPLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLE1BQU0sbUNBQW1DLENBQUM7QUFDcEgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDOUUsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQztBQUNqRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbEUsT0FBTyxFQUFnQyxXQUFXLEVBQXVGLE1BQU0sdUJBQXVCLENBQUM7QUFFdkssT0FBTyxFQUF3QixxQkFBcUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3hGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxjQUFjLEVBQUUsd0JBQXdCLEVBQUUsK0JBQStCLEVBQUUsbUJBQW1CLEVBQW1DLGFBQWEsRUFBb0MsTUFBTSxnQ0FBZ0Ms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