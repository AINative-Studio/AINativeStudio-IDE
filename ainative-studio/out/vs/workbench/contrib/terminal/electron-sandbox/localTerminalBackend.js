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
import { Emitter } from '../../../../base/common/event.js';
import { isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ILocalPtyService, ITerminalLogService, TerminalExtensions, TerminalIpcChannels } from '../../../../platform/terminal/common/terminal.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ITerminalInstanceService } from '../browser/terminal.js';
import { ITerminalProfileResolverService } from '../common/terminal.js';
import { LocalPty } from './localPty.js';
import { IConfigurationResolverService } from '../../../services/configurationResolver/common/configurationResolver.js';
import { IShellEnvironmentService } from '../../../services/environment/electron-sandbox/shellEnvironmentService.js';
import { IHistoryService } from '../../../services/history/common/history.js';
import * as terminalEnvironment from '../common/terminalEnvironment.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IEnvironmentVariableService } from '../common/environmentVariable.js';
import { BaseTerminalBackend } from '../browser/baseTerminalBackend.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { Client as MessagePortClient } from '../../../../base/parts/ipc/common/ipc.mp.js';
import { acquirePort } from '../../../../base/parts/ipc/electron-sandbox/ipc.mp.js';
import { getDelayedChannel, ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { mark } from '../../../../base/common/performance.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { DeferredPromise } from '../../../../base/common/async.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
import { memoize } from '../../../../base/common/decorators.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { shouldUseEnvironmentVariableCollection } from '../../../../platform/terminal/common/terminalEnvironment.js';
import { DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
let LocalTerminalBackendContribution = class LocalTerminalBackendContribution {
    static { this.ID = 'workbench.contrib.localTerminalBackend'; }
    constructor(instantiationService, terminalInstanceService) {
        const backend = instantiationService.createInstance(LocalTerminalBackend);
        Registry.as(TerminalExtensions.Backend).registerTerminalBackend(backend);
        terminalInstanceService.didRegisterBackend(backend);
    }
};
LocalTerminalBackendContribution = __decorate([
    __param(0, IInstantiationService),
    __param(1, ITerminalInstanceService)
], LocalTerminalBackendContribution);
export { LocalTerminalBackendContribution };
let LocalTerminalBackend = class LocalTerminalBackend extends BaseTerminalBackend {
    /**
     * Communicate to the direct proxy (renderer<->ptyhost) if it's available, otherwise use the
     * indirect proxy (renderer<->main<->ptyhost). The latter may not need to actually launch the
     * pty host, for example when detecting profiles.
     */
    get _proxy() { return this._directProxy || this._localPtyService; }
    get whenReady() { return this._whenReady.p; }
    setReady() { this._whenReady.complete(); }
    constructor(workspaceContextService, _lifecycleService, logService, _localPtyService, _labelService, _shellEnvironmentService, _storageService, _configurationResolverService, _configurationService, _productService, _historyService, _terminalProfileResolverService, _environmentVariableService, historyService, _nativeHostService, statusBarService, _remoteAgentService) {
        super(_localPtyService, logService, historyService, _configurationResolverService, statusBarService, workspaceContextService);
        this._lifecycleService = _lifecycleService;
        this._localPtyService = _localPtyService;
        this._labelService = _labelService;
        this._shellEnvironmentService = _shellEnvironmentService;
        this._storageService = _storageService;
        this._configurationResolverService = _configurationResolverService;
        this._configurationService = _configurationService;
        this._productService = _productService;
        this._historyService = _historyService;
        this._terminalProfileResolverService = _terminalProfileResolverService;
        this._environmentVariableService = _environmentVariableService;
        this._nativeHostService = _nativeHostService;
        this._remoteAgentService = _remoteAgentService;
        this.remoteAuthority = undefined;
        this._ptys = new Map();
        this._directProxyDisposables = this._register(new MutableDisposable());
        this._whenReady = new DeferredPromise();
        this._onDidRequestDetach = this._register(new Emitter());
        this.onDidRequestDetach = this._onDidRequestDetach.event;
        this._register(this.onPtyHostRestart(() => {
            this._directProxy = undefined;
            this._directProxyClientEventually = undefined;
            this._connectToDirectProxy();
        }));
    }
    /**
     * Request a direct connection to the pty host, this will launch the pty host process if necessary.
     */
    async _connectToDirectProxy() {
        // Check if connecting is in progress
        if (this._directProxyClientEventually) {
            await this._directProxyClientEventually.p;
            return;
        }
        this._logService.debug('Starting pty host');
        const directProxyClientEventually = new DeferredPromise();
        this._directProxyClientEventually = directProxyClientEventually;
        const directProxy = ProxyChannel.toService(getDelayedChannel(this._directProxyClientEventually.p.then(client => client.getChannel(TerminalIpcChannels.PtyHostWindow))));
        this._directProxy = directProxy;
        this._directProxyDisposables.clear();
        // The pty host should not get launched until at least the window restored phase
        // if remote auth exists, don't await
        if (!this._remoteAgentService.getConnection()?.remoteAuthority) {
            await this._lifecycleService.when(3 /* LifecyclePhase.Restored */);
        }
        mark('code/terminal/willConnectPtyHost');
        this._logService.trace('Renderer->PtyHost#connect: before acquirePort');
        acquirePort('vscode:createPtyHostMessageChannel', 'vscode:createPtyHostMessageChannelResult').then(port => {
            mark('code/terminal/didConnectPtyHost');
            this._logService.trace('Renderer->PtyHost#connect: connection established');
            const store = new DisposableStore();
            this._directProxyDisposables.value = store;
            // There are two connections to the pty host; one to the regular shared process
            // _localPtyService, and one directly via message port _ptyHostDirectProxy. The former is
            // used for pty host management messages, it would make sense in the future to use a
            // separate interface/service for this one.
            const client = store.add(new MessagePortClient(port, `window:${this._nativeHostService.windowId}`));
            directProxyClientEventually.complete(client);
            this._onPtyHostConnected.fire();
            // Attach process listeners
            store.add(directProxy.onProcessData(e => this._ptys.get(e.id)?.handleData(e.event)));
            store.add(directProxy.onDidChangeProperty(e => this._ptys.get(e.id)?.handleDidChangeProperty(e.property)));
            store.add(directProxy.onProcessExit(e => {
                const pty = this._ptys.get(e.id);
                if (pty) {
                    pty.handleExit(e.event);
                    this._ptys.delete(e.id);
                }
            }));
            store.add(directProxy.onProcessReady(e => this._ptys.get(e.id)?.handleReady(e.event)));
            store.add(directProxy.onProcessReplay(e => this._ptys.get(e.id)?.handleReplay(e.event)));
            store.add(directProxy.onProcessOrphanQuestion(e => this._ptys.get(e.id)?.handleOrphanQuestion()));
            store.add(directProxy.onDidRequestDetach(e => this._onDidRequestDetach.fire(e)));
            // Eagerly fetch the backend's environment for memoization
            this.getEnvironment();
        });
    }
    async requestDetachInstance(workspaceId, instanceId) {
        return this._proxy.requestDetachInstance(workspaceId, instanceId);
    }
    async acceptDetachInstanceReply(requestId, persistentProcessId) {
        if (!persistentProcessId) {
            this._logService.warn('Cannot attach to feature terminals, custom pty terminals, or those without a persistentProcessId');
            return;
        }
        return this._proxy.acceptDetachInstanceReply(requestId, persistentProcessId);
    }
    async persistTerminalState() {
        const ids = Array.from(this._ptys.keys());
        const serialized = await this._proxy.serializeTerminalState(ids);
        this._storageService.store("terminal.integrated.bufferState" /* TerminalStorageKeys.TerminalBufferState */, serialized, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    async updateTitle(id, title, titleSource) {
        await this._proxy.updateTitle(id, title, titleSource);
    }
    async updateIcon(id, userInitiated, icon, color) {
        await this._proxy.updateIcon(id, userInitiated, icon, color);
    }
    async updateProperty(id, property, value) {
        return this._proxy.updateProperty(id, property, value);
    }
    async createProcess(shellLaunchConfig, cwd, cols, rows, unicodeVersion, env, options, shouldPersist) {
        await this._connectToDirectProxy();
        const executableEnv = await this._shellEnvironmentService.getShellEnv();
        const id = await this._proxy.createProcess(shellLaunchConfig, cwd, cols, rows, unicodeVersion, env, executableEnv, options, shouldPersist, this._getWorkspaceId(), this._getWorkspaceName());
        const pty = new LocalPty(id, shouldPersist, this._proxy);
        this._ptys.set(id, pty);
        return pty;
    }
    async attachToProcess(id) {
        await this._connectToDirectProxy();
        try {
            await this._proxy.attachToProcess(id);
            const pty = new LocalPty(id, true, this._proxy);
            this._ptys.set(id, pty);
            return pty;
        }
        catch (e) {
            this._logService.warn(`Couldn't attach to process ${e.message}`);
        }
        return undefined;
    }
    async attachToRevivedProcess(id) {
        await this._connectToDirectProxy();
        try {
            const newId = await this._proxy.getRevivedPtyNewId(this._getWorkspaceId(), id) ?? id;
            return await this.attachToProcess(newId);
        }
        catch (e) {
            this._logService.warn(`Couldn't attach to process ${e.message}`);
        }
        return undefined;
    }
    async listProcesses() {
        await this._connectToDirectProxy();
        return this._proxy.listProcesses();
    }
    async getLatency() {
        const measurements = [];
        const sw = new StopWatch();
        if (this._directProxy) {
            await this._directProxy.getLatency();
            sw.stop();
            measurements.push({
                label: 'window<->ptyhost (message port)',
                latency: sw.elapsed()
            });
            sw.reset();
        }
        const results = await this._localPtyService.getLatency();
        sw.stop();
        measurements.push({
            label: 'window<->ptyhostservice<->ptyhost',
            latency: sw.elapsed()
        });
        return [
            ...measurements,
            ...results
        ];
    }
    async getPerformanceMarks() {
        return this._proxy.getPerformanceMarks();
    }
    async reduceConnectionGraceTime() {
        this._proxy.reduceConnectionGraceTime();
    }
    async getDefaultSystemShell(osOverride) {
        return this._proxy.getDefaultSystemShell(osOverride);
    }
    async getProfiles(profiles, defaultProfile, includeDetectedProfiles) {
        return this._localPtyService.getProfiles(this._workspaceContextService.getWorkspace().id, profiles, defaultProfile, includeDetectedProfiles) || [];
    }
    async getEnvironment() {
        return this._proxy.getEnvironment();
    }
    async getShellEnvironment() {
        return this._shellEnvironmentService.getShellEnv();
    }
    async getWslPath(original, direction) {
        return this._proxy.getWslPath(original, direction);
    }
    async setTerminalLayoutInfo(layoutInfo) {
        const args = {
            workspaceId: this._getWorkspaceId(),
            tabs: layoutInfo ? layoutInfo.tabs : []
        };
        await this._proxy.setTerminalLayoutInfo(args);
        // Store in the storage service as well to be used when reviving processes as normally this
        // is stored in memory on the pty host
        this._storageService.store("terminal.integrated.layoutInfo" /* TerminalStorageKeys.TerminalLayoutInfo */, JSON.stringify(args), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    async getTerminalLayoutInfo() {
        const workspaceId = this._getWorkspaceId();
        const layoutArgs = { workspaceId };
        // Revive processes if needed
        const serializedState = this._storageService.get("terminal.integrated.bufferState" /* TerminalStorageKeys.TerminalBufferState */, 1 /* StorageScope.WORKSPACE */);
        const reviveBufferState = this._deserializeTerminalState(serializedState);
        if (reviveBufferState && reviveBufferState.length > 0) {
            try {
                // Create variable resolver
                const activeWorkspaceRootUri = this._historyService.getLastActiveWorkspaceRoot();
                const lastActiveWorkspace = activeWorkspaceRootUri ? this._workspaceContextService.getWorkspaceFolder(activeWorkspaceRootUri) ?? undefined : undefined;
                const variableResolver = terminalEnvironment.createVariableResolver(lastActiveWorkspace, await this._terminalProfileResolverService.getEnvironment(this.remoteAuthority), this._configurationResolverService);
                // Re-resolve the environments and replace it on the state so local terminals use a fresh
                // environment
                mark('code/terminal/willGetReviveEnvironments');
                await Promise.all(reviveBufferState.map(state => new Promise(r => {
                    this._resolveEnvironmentForRevive(variableResolver, state.shellLaunchConfig).then(freshEnv => {
                        state.processLaunchConfig.env = freshEnv;
                        r();
                    });
                })));
                mark('code/terminal/didGetReviveEnvironments');
                mark('code/terminal/willReviveTerminalProcesses');
                await this._proxy.reviveTerminalProcesses(workspaceId, reviveBufferState, Intl.DateTimeFormat().resolvedOptions().locale);
                mark('code/terminal/didReviveTerminalProcesses');
                this._storageService.remove("terminal.integrated.bufferState" /* TerminalStorageKeys.TerminalBufferState */, 1 /* StorageScope.WORKSPACE */);
                // If reviving processes, send the terminal layout info back to the pty host as it
                // will not have been persisted on application exit
                const layoutInfo = this._storageService.get("terminal.integrated.layoutInfo" /* TerminalStorageKeys.TerminalLayoutInfo */, 1 /* StorageScope.WORKSPACE */);
                if (layoutInfo) {
                    mark('code/terminal/willSetTerminalLayoutInfo');
                    await this._proxy.setTerminalLayoutInfo(JSON.parse(layoutInfo));
                    mark('code/terminal/didSetTerminalLayoutInfo');
                    this._storageService.remove("terminal.integrated.layoutInfo" /* TerminalStorageKeys.TerminalLayoutInfo */, 1 /* StorageScope.WORKSPACE */);
                }
            }
            catch (e) {
                this._logService.warn('LocalTerminalBackend#getTerminalLayoutInfo Error', e && typeof e === 'object' && 'message' in e ? e.message : e);
            }
        }
        return this._proxy.getTerminalLayoutInfo(layoutArgs);
    }
    async _resolveEnvironmentForRevive(variableResolver, shellLaunchConfig) {
        const platformKey = isWindows ? 'windows' : (isMacintosh ? 'osx' : 'linux');
        const envFromConfigValue = this._configurationService.getValue(`terminal.integrated.env.${platformKey}`);
        const baseEnv = await (shellLaunchConfig.useShellEnvironment ? this.getShellEnvironment() : this.getEnvironment());
        const env = await terminalEnvironment.createTerminalEnvironment(shellLaunchConfig, envFromConfigValue, variableResolver, this._productService.version, this._configurationService.getValue("terminal.integrated.detectLocale" /* TerminalSettingId.DetectLocale */), baseEnv);
        if (shouldUseEnvironmentVariableCollection(shellLaunchConfig)) {
            const workspaceFolder = terminalEnvironment.getWorkspaceForTerminal(shellLaunchConfig.cwd, this._workspaceContextService, this._historyService);
            await this._environmentVariableService.mergedCollection.applyToProcessEnvironment(env, { workspaceFolder }, variableResolver);
        }
        return env;
    }
    _getWorkspaceName() {
        return this._labelService.getWorkspaceLabel(this._workspaceContextService.getWorkspace());
    }
    // #region Pty service contribution RPC calls
    installAutoReply(match, reply) {
        return this._proxy.installAutoReply(match, reply);
    }
    uninstallAllAutoReplies() {
        return this._proxy.uninstallAllAutoReplies();
    }
};
__decorate([
    memoize
], LocalTerminalBackend.prototype, "getEnvironment", null);
__decorate([
    memoize
], LocalTerminalBackend.prototype, "getShellEnvironment", null);
LocalTerminalBackend = __decorate([
    __param(0, IWorkspaceContextService),
    __param(1, ILifecycleService),
    __param(2, ITerminalLogService),
    __param(3, ILocalPtyService),
    __param(4, ILabelService),
    __param(5, IShellEnvironmentService),
    __param(6, IStorageService),
    __param(7, IConfigurationResolverService),
    __param(8, IConfigurationService),
    __param(9, IProductService),
    __param(10, IHistoryService),
    __param(11, ITerminalProfileResolverService),
    __param(12, IEnvironmentVariableService),
    __param(13, IHistoryService),
    __param(14, INativeHostService),
    __param(15, IStatusbarService),
    __param(16, IRemoteAgentService)
], LocalTerminalBackend);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxUZXJtaW5hbEJhY2tlbmQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvZWxlY3Ryb24tc2FuZGJveC9sb2NhbFRlcm1pbmFsQmFja2VuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUF1QixXQUFXLEVBQUUsU0FBUyxFQUFtQixNQUFNLHFDQUFxQyxDQUFDO0FBRW5ILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsZ0JBQWdCLEVBQTZLLG1CQUFtQixFQUFnRyxrQkFBa0IsRUFBRSxtQkFBbUIsRUFBdUMsTUFBTSxrREFBa0QsQ0FBQztBQUVoYyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUU5RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUNsRSxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUV4RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3pDLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHlFQUF5RSxDQUFDO0FBQ3hILE9BQU8sRUFBRSx3QkFB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