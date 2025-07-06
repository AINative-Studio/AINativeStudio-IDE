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
import { DeferredPromise } from '../../../../base/common/async.js';
import { Emitter } from '../../../../base/common/event.js';
import { revive } from '../../../../base/common/marshalling.js';
import { mark } from '../../../../base/common/performance.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IRemoteAuthorityResolverService } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITerminalLogService, TerminalExtensions } from '../../../../platform/terminal/common/terminal.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { BaseTerminalBackend } from './baseTerminalBackend.js';
import { RemotePty } from './remotePty.js';
import { ITerminalInstanceService } from './terminal.js';
import { RemoteTerminalChannelClient, REMOTE_TERMINAL_CHANNEL_NAME } from '../common/remote/remoteTerminalChannel.js';
import { TERMINAL_CONFIG_SECTION } from '../common/terminal.js';
import { IConfigurationResolverService } from '../../../services/configurationResolver/common/configurationResolver.js';
import { IHistoryService } from '../../../services/history/common/history.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
let RemoteTerminalBackendContribution = class RemoteTerminalBackendContribution {
    static { this.ID = 'remoteTerminalBackend'; }
    constructor(instantiationService, remoteAgentService, terminalInstanceService) {
        const connection = remoteAgentService.getConnection();
        if (connection?.remoteAuthority) {
            const channel = instantiationService.createInstance(RemoteTerminalChannelClient, connection.remoteAuthority, connection.getChannel(REMOTE_TERMINAL_CHANNEL_NAME));
            const backend = instantiationService.createInstance(RemoteTerminalBackend, connection.remoteAuthority, channel);
            Registry.as(TerminalExtensions.Backend).registerTerminalBackend(backend);
            terminalInstanceService.didRegisterBackend(backend);
        }
    }
};
RemoteTerminalBackendContribution = __decorate([
    __param(0, IInstantiationService),
    __param(1, IRemoteAgentService),
    __param(2, ITerminalInstanceService)
], RemoteTerminalBackendContribution);
export { RemoteTerminalBackendContribution };
let RemoteTerminalBackend = class RemoteTerminalBackend extends BaseTerminalBackend {
    get whenReady() { return this._whenConnected.p; }
    setReady() { this._whenConnected.complete(); }
    constructor(remoteAuthority, _remoteTerminalChannel, _remoteAgentService, _instantiationService, logService, _commandService, _storageService, _remoteAuthorityResolverService, workspaceContextService, configurationResolverService, _historyService, _configurationService, statusBarService) {
        super(_remoteTerminalChannel, logService, _historyService, configurationResolverService, statusBarService, workspaceContextService);
        this.remoteAuthority = remoteAuthority;
        this._remoteTerminalChannel = _remoteTerminalChannel;
        this._remoteAgentService = _remoteAgentService;
        this._instantiationService = _instantiationService;
        this._commandService = _commandService;
        this._storageService = _storageService;
        this._remoteAuthorityResolverService = _remoteAuthorityResolverService;
        this._historyService = _historyService;
        this._configurationService = _configurationService;
        this._ptys = new Map();
        this._whenConnected = new DeferredPromise();
        this._onDidRequestDetach = this._register(new Emitter());
        this.onDidRequestDetach = this._onDidRequestDetach.event;
        this._onRestoreCommands = this._register(new Emitter());
        this.onRestoreCommands = this._onRestoreCommands.event;
        this._remoteTerminalChannel.onProcessData(e => this._ptys.get(e.id)?.handleData(e.event));
        this._remoteTerminalChannel.onProcessReplay(e => {
            this._ptys.get(e.id)?.handleReplay(e.event);
            if (e.event.commands.commands.length > 0) {
                this._onRestoreCommands.fire({ id: e.id, commands: e.event.commands.commands });
            }
        });
        this._remoteTerminalChannel.onProcessOrphanQuestion(e => this._ptys.get(e.id)?.handleOrphanQuestion());
        this._remoteTerminalChannel.onDidRequestDetach(e => this._onDidRequestDetach.fire(e));
        this._remoteTerminalChannel.onProcessReady(e => this._ptys.get(e.id)?.handleReady(e.event));
        this._remoteTerminalChannel.onDidChangeProperty(e => this._ptys.get(e.id)?.handleDidChangeProperty(e.property));
        this._remoteTerminalChannel.onProcessExit(e => {
            const pty = this._ptys.get(e.id);
            if (pty) {
                pty.handleExit(e.event);
                this._ptys.delete(e.id);
            }
        });
        const allowedCommands = ['_remoteCLI.openExternal', '_remoteCLI.windowOpen', '_remoteCLI.getSystemStatus', '_remoteCLI.manageExtensions'];
        this._remoteTerminalChannel.onExecuteCommand(async (e) => {
            // Ensure this request for for this window
            const pty = this._ptys.get(e.persistentProcessId);
            if (!pty) {
                return;
            }
            const reqId = e.reqId;
            const commandId = e.commandId;
            if (!allowedCommands.includes(commandId)) {
                this._remoteTerminalChannel.sendCommandResult(reqId, true, 'Invalid remote cli command: ' + commandId);
                return;
            }
            const commandArgs = e.commandArgs.map(arg => revive(arg));
            try {
                const result = await this._commandService.executeCommand(e.commandId, ...commandArgs);
                this._remoteTerminalChannel.sendCommandResult(reqId, false, result);
            }
            catch (err) {
                this._remoteTerminalChannel.sendCommandResult(reqId, true, err);
            }
        });
        this._onPtyHostConnected.fire();
    }
    async requestDetachInstance(workspaceId, instanceId) {
        if (!this._remoteTerminalChannel) {
            throw new Error(`Cannot request detach instance when there is no remote!`);
        }
        return this._remoteTerminalChannel.requestDetachInstance(workspaceId, instanceId);
    }
    async acceptDetachInstanceReply(requestId, persistentProcessId) {
        if (!this._remoteTerminalChannel) {
            throw new Error(`Cannot accept detached instance when there is no remote!`);
        }
        else if (!persistentProcessId) {
            this._logService.warn('Cannot attach to feature terminals, custom pty terminals, or those without a persistentProcessId');
            return;
        }
        return this._remoteTerminalChannel.acceptDetachInstanceReply(requestId, persistentProcessId);
    }
    async persistTerminalState() {
        if (!this._remoteTerminalChannel) {
            throw new Error(`Cannot persist terminal state when there is no remote!`);
        }
        const ids = Array.from(this._ptys.keys());
        const serialized = await this._remoteTerminalChannel.serializeTerminalState(ids);
        this._storageService.store("terminal.integrated.bufferState" /* TerminalStorageKeys.TerminalBufferState */, serialized, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    async createProcess(shellLaunchConfig, cwd, // TODO: This is ignored
    cols, rows, unicodeVersion, env, // TODO: This is ignored
    options, shouldPersist) {
        if (!this._remoteTerminalChannel) {
            throw new Error(`Cannot create remote terminal when there is no remote!`);
        }
        // Fetch the environment to check shell permissions
        const remoteEnv = await this._remoteAgentService.getEnvironment();
        if (!remoteEnv) {
            // Extension host processes are only allowed in remote extension hosts currently
            throw new Error('Could not fetch remote environment');
        }
        const terminalConfig = this._configurationService.getValue(TERMINAL_CONFIG_SECTION);
        const configuration = {
            'terminal.integrated.env.windows': this._configurationService.getValue("terminal.integrated.env.windows" /* TerminalSettingId.EnvWindows */),
            'terminal.integrated.env.osx': this._configurationService.getValue("terminal.integrated.env.osx" /* TerminalSettingId.EnvMacOs */),
            'terminal.integrated.env.linux': this._configurationService.getValue("terminal.integrated.env.linux" /* TerminalSettingId.EnvLinux */),
            'terminal.integrated.cwd': this._configurationService.getValue("terminal.integrated.cwd" /* TerminalSettingId.Cwd */),
            'terminal.integrated.detectLocale': terminalConfig.detectLocale
        };
        const shellLaunchConfigDto = {
            name: shellLaunchConfig.name,
            executable: shellLaunchConfig.executable,
            args: shellLaunchConfig.args,
            cwd: shellLaunchConfig.cwd,
            env: shellLaunchConfig.env,
            useShellEnvironment: shellLaunchConfig.useShellEnvironment,
            reconnectionProperties: shellLaunchConfig.reconnectionProperties,
            type: shellLaunchConfig.type,
            isFeatureTerminal: shellLaunchConfig.isFeatureTerminal,
            tabActions: shellLaunchConfig.tabActions,
            shellIntegrationEnvironmentReporting: shellLaunchConfig.shellIntegrationEnvironmentReporting,
        };
        const activeWorkspaceRootUri = this._historyService.getLastActiveWorkspaceRoot();
        const result = await this._remoteTerminalChannel.createProcess(shellLaunchConfigDto, configuration, activeWorkspaceRootUri, options, shouldPersist, cols, rows, unicodeVersion);
        const pty = this._instantiationService.createInstance(RemotePty, result.persistentTerminalId, shouldPersist, this._remoteTerminalChannel);
        this._ptys.set(result.persistentTerminalId, pty);
        return pty;
    }
    async attachToProcess(id) {
        if (!this._remoteTerminalChannel) {
            throw new Error(`Cannot create remote terminal when there is no remote!`);
        }
        try {
            await this._remoteTerminalChannel.attachToProcess(id);
            const pty = this._instantiationService.createInstance(RemotePty, id, true, this._remoteTerminalChannel);
            this._ptys.set(id, pty);
            return pty;
        }
        catch (e) {
            this._logService.trace(`Couldn't attach to process ${e.message}`);
        }
        return undefined;
    }
    async attachToRevivedProcess(id) {
        if (!this._remoteTerminalChannel) {
            throw new Error(`Cannot create remote terminal when there is no remote!`);
        }
        try {
            const newId = await this._remoteTerminalChannel.getRevivedPtyNewId(id) ?? id;
            return await this.attachToProcess(newId);
        }
        catch (e) {
            this._logService.trace(`Couldn't attach to process ${e.message}`);
        }
        return undefined;
    }
    async listProcesses() {
        return this._remoteTerminalChannel.listProcesses();
    }
    async getLatency() {
        const sw = new StopWatch();
        const results = await this._remoteTerminalChannel.getLatency();
        sw.stop();
        return [
            {
                label: 'window<->ptyhostservice<->ptyhost',
                latency: sw.elapsed()
            },
            ...results
        ];
    }
    async updateProperty(id, property, value) {
        await this._remoteTerminalChannel.updateProperty(id, property, value);
    }
    async updateTitle(id, title, titleSource) {
        await this._remoteTerminalChannel.updateTitle(id, title, titleSource);
    }
    async updateIcon(id, userInitiated, icon, color) {
        await this._remoteTerminalChannel.updateIcon(id, userInitiated, icon, color);
    }
    async getDefaultSystemShell(osOverride) {
        return this._remoteTerminalChannel.getDefaultSystemShell(osOverride) || '';
    }
    async getProfiles(profiles, defaultProfile, includeDetectedProfiles) {
        return this._remoteTerminalChannel.getProfiles(profiles, defaultProfile, includeDetectedProfiles) || [];
    }
    async getEnvironment() {
        return this._remoteTerminalChannel.getEnvironment() || {};
    }
    async getShellEnvironment() {
        const connection = this._remoteAgentService.getConnection();
        if (!connection) {
            return undefined;
        }
        const resolverResult = await this._remoteAuthorityResolverService.resolveAuthority(connection.remoteAuthority);
        return resolverResult.options?.extensionHostEnv;
    }
    async getWslPath(original, direction) {
        const env = await this._remoteAgentService.getEnvironment();
        if (env?.os !== 1 /* OperatingSystem.Windows */) {
            return original;
        }
        return this._remoteTerminalChannel.getWslPath(original, direction) || original;
    }
    async setTerminalLayoutInfo(layout) {
        if (!this._remoteTerminalChannel) {
            throw new Error(`Cannot call setActiveInstanceId when there is no remote`);
        }
        return this._remoteTerminalChannel.setTerminalLayoutInfo(layout);
    }
    async reduceConnectionGraceTime() {
        if (!this._remoteTerminalChannel) {
            throw new Error('Cannot reduce grace time when there is no remote');
        }
        return this._remoteTerminalChannel.reduceConnectionGraceTime();
    }
    async getTerminalLayoutInfo() {
        if (!this._remoteTerminalChannel) {
            throw new Error(`Cannot call getActiveInstanceId when there is no remote`);
        }
        const workspaceId = this._getWorkspaceId();
        // Revive processes if needed
        const serializedState = this._storageService.get("terminal.integrated.bufferState" /* TerminalStorageKeys.TerminalBufferState */, 1 /* StorageScope.WORKSPACE */);
        const reviveBufferState = this._deserializeTerminalState(serializedState);
        if (reviveBufferState && reviveBufferState.length > 0) {
            try {
                // Note that remote terminals do not get their environment re-resolved unlike in local terminals
                mark('code/terminal/willReviveTerminalProcessesRemote');
                await this._remoteTerminalChannel.reviveTerminalProcesses(workspaceId, reviveBufferState, Intl.DateTimeFormat().resolvedOptions().locale);
                mark('code/terminal/didReviveTerminalProcessesRemote');
                this._storageService.remove("terminal.integrated.bufferState" /* TerminalStorageKeys.TerminalBufferState */, 1 /* StorageScope.WORKSPACE */);
                // If reviving processes, send the terminal layout info back to the pty host as it
                // will not have been persisted on application exit
                const layoutInfo = this._storageService.get("terminal.integrated.layoutInfo" /* TerminalStorageKeys.TerminalLayoutInfo */, 1 /* StorageScope.WORKSPACE */);
                if (layoutInfo) {
                    mark('code/terminal/willSetTerminalLayoutInfoRemote');
                    await this._remoteTerminalChannel.setTerminalLayoutInfo(JSON.parse(layoutInfo));
                    mark('code/terminal/didSetTerminalLayoutInfoRemote');
                    this._storageService.remove("terminal.integrated.layoutInfo" /* TerminalStorageKeys.TerminalLayoutInfo */, 1 /* StorageScope.WORKSPACE */);
                }
            }
            catch (e) {
                this._logService.warn('RemoteTerminalBackend#getTerminalLayoutInfo Error', e && typeof e === 'object' && 'message' in e ? e.message : e);
            }
        }
        return this._remoteTerminalChannel.getTerminalLayoutInfo();
    }
    async getPerformanceMarks() {
        return this._remoteTerminalChannel.getPerformanceMarks();
    }
    installAutoReply(match, reply) {
        return this._remoteTerminalChannel.installAutoReply(match, reply);
    }
    uninstallAllAutoReplies() {
        return this._remoteTerminalChannel.uninstallAllAutoReplies();
    }
};
RemoteTerminalBackend = __decorate([
    __param(2, IRemoteAgentService),
    __param(3, IInstantiationService),
    __param(4, ITerminalLogService),
    __param(5, ICommandService),
    __param(6, IStorageService),
    __param(7, IRemoteAuthorityResolverService),
    __param(8, IWorkspaceContextService),
    __param(9, IConfigurationResolverService),
    __param(10, IHistoryService),
    __param(11, IConfigurationService),
    __param(12, IStatusbarService)
], RemoteTerminalBackend);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlVGVybWluYWxCYWNrZW5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci9yZW1vdGVUZXJtaW5hbEJhY2tlbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDaEUsT0FBTyxFQUFtQixJQUFJLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUUvRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUNoSCxPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBRTlHLE9BQU8sRUFBa0ssbUJBQW1CLEVBQWtILGtCQUFrQixFQUFxRCxNQUFNLGtEQUFrRCxDQUFDO0FBRTlhLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRTlGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxTQUFT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