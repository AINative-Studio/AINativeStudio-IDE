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
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, dispose, toDisposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { isMacintosh, isWindows, OS } from '../../../../base/common/platform.js';
import { localize } from '../../../../nls.js';
import { formatMessageForTerminal } from '../../../../platform/terminal/common/terminalStrings.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { getRemoteAuthority } from '../../../../platform/remote/common/remoteHosts.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { NaiveCwdDetectionCapability } from '../../../../platform/terminal/common/capabilities/naiveCwdDetectionCapability.js';
import { TerminalCapabilityStore } from '../../../../platform/terminal/common/capabilities/terminalCapabilityStore.js';
import { ITerminalLogService } from '../../../../platform/terminal/common/terminal.js';
import { TerminalRecorder } from '../../../../platform/terminal/common/terminalRecorder.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { EnvironmentVariableInfoChangesActive, EnvironmentVariableInfoStale } from './environmentVariableInfo.js';
import { ITerminalConfigurationService, ITerminalInstanceService } from './terminal.js';
import { IEnvironmentVariableService } from '../common/environmentVariable.js';
import { MergedEnvironmentVariableCollection } from '../../../../platform/terminal/common/environmentVariableCollection.js';
import { serializeEnvironmentVariableCollections } from '../../../../platform/terminal/common/environmentVariableShared.js';
import { ITerminalProfileResolverService } from '../common/terminal.js';
import * as terminalEnvironment from '../common/terminalEnvironment.js';
import { IConfigurationResolverService } from '../../../services/configurationResolver/common/configurationResolver.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IHistoryService } from '../../../services/history/common/history.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import Severity from '../../../../base/common/severity.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { getActiveWindow, runWhenWindowIdle } from '../../../../base/browser/dom.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { shouldUseEnvironmentVariableCollection } from '../../../../platform/terminal/common/terminalEnvironment.js';
var ProcessConstants;
(function (ProcessConstants) {
    /**
     * The amount of time to consider terminal errors to be related to the launch.
     */
    ProcessConstants[ProcessConstants["ErrorLaunchThresholdDuration"] = 500] = "ErrorLaunchThresholdDuration";
    /**
     * The minimum amount of time between latency requests.
     */
    ProcessConstants[ProcessConstants["LatencyMeasuringInterval"] = 1000] = "LatencyMeasuringInterval";
})(ProcessConstants || (ProcessConstants = {}));
var ProcessType;
(function (ProcessType) {
    ProcessType[ProcessType["Process"] = 0] = "Process";
    ProcessType[ProcessType["PsuedoTerminal"] = 1] = "PsuedoTerminal";
})(ProcessType || (ProcessType = {}));
/**
 * Holds all state related to the creation and management of terminal processes.
 *
 * Internal definitions:
 * - Process: The process launched with the terminalProcess.ts file, or the pty as a whole
 * - Pty Process: The pseudoterminal parent process (or the conpty/winpty agent process)
 * - Shell Process: The pseudoterminal child process (ie. the shell)
 */
let TerminalProcessManager = class TerminalProcessManager extends Disposable {
    get persistentProcessId() { return this._process?.id; }
    get shouldPersist() { return !!this.reconnectionProperties || (this._process ? this._process.shouldPersist : false); }
    get hasWrittenData() { return this._hasWrittenData; }
    get hasChildProcesses() { return this._hasChildProcesses; }
    get reconnectionProperties() { return this._shellLaunchConfig?.attachPersistentProcess?.reconnectionProperties || this._shellLaunchConfig?.reconnectionProperties || undefined; }
    get extEnvironmentVariableCollection() { return this._extEnvironmentVariableCollection; }
    get processTraits() { return this._processTraits; }
    constructor(_instanceId, cwd, environmentVariableCollections, shellIntegrationNonce, _historyService, _instantiationService, _logService, _workspaceContextService, _configurationResolverService, _workbenchEnvironmentService, _productService, _remoteAgentService, _pathService, _environmentVariableService, _terminalConfigurationService, _terminalProfileResolverService, _configurationService, _terminalInstanceService, _telemetryService, _notificationService) {
        super();
        this._instanceId = _instanceId;
        this._historyService = _historyService;
        this._instantiationService = _instantiationService;
        this._logService = _logService;
        this._workspaceContextService = _workspaceContextService;
        this._configurationResolverService = _configurationResolverService;
        this._workbenchEnvironmentService = _workbenchEnvironmentService;
        this._productService = _productService;
        this._remoteAgentService = _remoteAgentService;
        this._pathService = _pathService;
        this._environmentVariableService = _environmentVariableService;
        this._terminalConfigurationService = _terminalConfigurationService;
        this._terminalProfileResolverService = _terminalProfileResolverService;
        this._configurationService = _configurationService;
        this._terminalInstanceService = _terminalInstanceService;
        this._telemetryService = _telemetryService;
        this._notificationService = _notificationService;
        this.processState = 1 /* ProcessState.Uninitialized */;
        this.capabilities = this._register(new TerminalCapabilityStore());
        this._isDisposed = false;
        this._process = null;
        this._processType = 0 /* ProcessType.Process */;
        this._preLaunchInputQueue = [];
        this._hasWrittenData = false;
        this._hasChildProcesses = false;
        this._ptyListenersAttached = false;
        this._isDisconnected = false;
        this._dimensions = { cols: 0, rows: 0 };
        this._onPtyDisconnect = this._register(new Emitter());
        this.onPtyDisconnect = this._onPtyDisconnect.event;
        this._onPtyReconnect = this._register(new Emitter());
        this.onPtyReconnect = this._onPtyReconnect.event;
        this._onProcessReady = this._register(new Emitter());
        this.onProcessReady = this._onProcessReady.event;
        this._onProcessStateChange = this._register(new Emitter());
        this.onProcessStateChange = this._onProcessStateChange.event;
        this._onBeforeProcessData = this._register(new Emitter());
        this.onBeforeProcessData = this._onBeforeProcessData.event;
        this._onProcessData = this._register(new Emitter());
        this.onProcessData = this._onProcessData.event;
        this._onProcessReplayComplete = this._register(new Emitter());
        this.onProcessReplayComplete = this._onProcessReplayComplete.event;
        this._onDidChangeProperty = this._register(new Emitter());
        this.onDidChangeProperty = this._onDidChangeProperty.event;
        this._onEnvironmentVariableInfoChange = this._register(new Emitter());
        this.onEnvironmentVariableInfoChanged = this._onEnvironmentVariableInfoChange.event;
        this._onProcessExit = this._register(new Emitter());
        this.onProcessExit = this._onProcessExit.event;
        this._onRestoreCommands = this._register(new Emitter());
        this.onRestoreCommands = this._onRestoreCommands.event;
        this._cwdWorkspaceFolder = terminalEnvironment.getWorkspaceForTerminal(cwd, this._workspaceContextService, this._historyService);
        this.ptyProcessReady = this._createPtyProcessReadyPromise();
        this._ackDataBufferer = new AckDataBufferer(e => this._process?.acknowledgeDataEvent(e));
        this._dataFilter = this._register(this._instantiationService.createInstance(SeamlessRelaunchDataFilter));
        this._register(this._dataFilter.onProcessData(ev => {
            const data = (typeof ev === 'string' ? ev : ev.data);
            const beforeProcessDataEvent = { data };
            this._onBeforeProcessData.fire(beforeProcessDataEvent);
            if (beforeProcessDataEvent.data && beforeProcessDataEvent.data.length > 0) {
                // This event is used by the caller so the object must be reused
                if (typeof ev !== 'string') {
                    ev.data = beforeProcessDataEvent.data;
                }
                this._onProcessData.fire(typeof ev !== 'string' ? ev : { data: beforeProcessDataEvent.data, trackCommit: false });
            }
        }));
        if (cwd && typeof cwd === 'object') {
            this.remoteAuthority = getRemoteAuthority(cwd);
        }
        else {
            this.remoteAuthority = this._workbenchEnvironmentService.remoteAuthority;
        }
        if (environmentVariableCollections) {
            this._extEnvironmentVariableCollection = new MergedEnvironmentVariableCollection(environmentVariableCollections);
            this._register(this._environmentVariableService.onDidChangeCollections(newCollection => this._onEnvironmentVariableCollectionChange(newCollection)));
            this.environmentVariableInfo = this._instantiationService.createInstance(EnvironmentVariableInfoChangesActive, this._extEnvironmentVariableCollection);
            this._onEnvironmentVariableInfoChange.fire(this.environmentVariableInfo);
        }
        this.shellIntegrationNonce = shellIntegrationNonce ?? generateUuid();
    }
    async freePortKillProcess(port) {
        try {
            if (this._process?.freePortKillProcess) {
                await this._process?.freePortKillProcess(port);
            }
        }
        catch (e) {
            this._notificationService.notify({ message: localize('killportfailure', 'Could not kill process listening on port {0}, command exited with error {1}', port, e), severity: Severity.Warning });
        }
    }
    dispose(immediate = false) {
        this._isDisposed = true;
        if (this._process) {
            // If the process was still connected this dispose came from
            // within VS Code, not the process, so mark the process as
            // killed by the user.
            this._setProcessState(5 /* ProcessState.KilledByUser */);
            this._process.shutdown(immediate);
            this._process = null;
        }
        super.dispose();
    }
    _createPtyProcessReadyPromise() {
        return new Promise(c => {
            const listener = Event.once(this.onProcessReady)(() => {
                this._logService.debug(`Terminal process ready (shellProcessId: ${this.shellProcessId})`);
                this._store.delete(listener);
                c(undefined);
            });
            this._store.add(listener);
        });
    }
    async detachFromProcess(forcePersist) {
        await this._process?.detach?.(forcePersist);
        this._process = null;
    }
    async createProcess(shellLaunchConfig, cols, rows, reset = true) {
        this._shellLaunchConfig = shellLaunchConfig;
        this._dimensions.cols = cols;
        this._dimensions.rows = rows;
        let newProcess;
        if (shellLaunchConfig.customPtyImplementation) {
            this._processType = 1 /* ProcessType.PsuedoTerminal */;
            newProcess = shellLaunchConfig.customPtyImplementation(this._instanceId, cols, rows);
        }
        else {
            const backend = await this._terminalInstanceService.getBackend(this.remoteAuthority);
            if (!backend) {
                throw new Error(`No terminal backend registered for remote authority '${this.remoteAuthority}'`);
            }
            this.backend = backend;
            // Create variable resolver
            const variableResolver = terminalEnvironment.createVariableResolver(this._cwdWorkspaceFolder, await this._terminalProfileResolverService.getEnvironment(this.remoteAuthority), this._configurationResolverService);
            // resolvedUserHome is needed here as remote resolvers can launch local terminals before
            // they're connected to the remote.
            this.userHome = this._pathService.resolvedUserHome?.fsPath;
            this.os = OS;
            if (!!this.remoteAuthority) {
                const userHomeUri = await this._pathService.userHome();
                this.userHome = userHomeUri.path;
                const remoteEnv = await this._remoteAgentService.getEnvironment();
                if (!remoteEnv) {
                    throw new Error(`Failed to get remote environment for remote authority "${this.remoteAuthority}"`);
                }
                this.userHome = remoteEnv.userHome.path;
                this.os = remoteEnv.os;
                // this is a copy of what the merged environment collection is on the remote side
                const env = await this._resolveEnvironment(backend, variableResolver, shellLaunchConfig);
                const shouldPersist = ((this._configurationService.getValue("task.reconnection" /* TaskSettingId.Reconnection */) && shellLaunchConfig.reconnectionProperties) || !shellLaunchConfig.isFeatureTerminal) && this._terminalConfigurationService.config.enablePersistentSessions && !shellLaunchConfig.isTransient;
                if (shellLaunchConfig.attachPersistentProcess) {
                    const result = await backend.attachToProcess(shellLaunchConfig.attachPersistentProcess.id);
                    if (result) {
                        newProcess = result;
                    }
                    else {
                        // Warn and just create a new terminal if attach failed for some reason
                        this._logService.warn(`Attach to process failed for terminal`, shellLaunchConfig.attachPersistentProcess);
                        shellLaunchConfig.attachPersistentProcess = undefined;
                    }
                }
                if (!newProcess) {
                    await this._terminalProfileResolverService.resolveShellLaunchConfig(shellLaunchConfig, {
                        remoteAuthority: this.remoteAuthority,
                        os: this.os
                    });
                    const options = {
                        shellIntegration: {
                            enabled: this._configurationService.getValue("terminal.integrated.shellIntegration.enabled" /* TerminalSettingId.ShellIntegrationEnabled */),
                            suggestEnabled: this._configurationService.getValue("terminal.integrated.suggest.enabled" /* TerminalContribSettingId.SuggestEnabled */),
                            nonce: this.shellIntegrationNonce
                        },
                        windowsEnableConpty: this._terminalConfigurationService.config.windowsEnableConpty,
                        windowsUseConptyDll: this._terminalConfigurationService.config.windowsUseConptyDll ?? false,
                        environmentVariableCollections: this._extEnvironmentVariableCollection?.collections ? serializeEnvironmentVariableCollections(this._extEnvironmentVariableCollection.collections) : undefined,
                        workspaceFolder: this._cwdWorkspaceFolder,
                    };
                    try {
                        newProcess = await backend.createProcess(shellLaunchConfig, '', // TODO: Fix cwd
                        cols, rows, this._terminalConfigurationService.config.unicodeVersion, env, // TODO:
                        options, shouldPersist);
                    }
                    catch (e) {
                        if (e?.message === 'Could not fetch remote environment') {
                            this._logService.trace(`Could not fetch remote environment, silently failing`);
                            return undefined;
                        }
                        throw e;
                    }
                }
                if (!this._isDisposed) {
                    this._setupPtyHostListeners(backend);
                }
            }
            else {
                if (shellLaunchConfig.attachPersistentProcess) {
                    const result = shellLaunchConfig.attachPersistentProcess.findRevivedId ? await backend.attachToRevivedProcess(shellLaunchConfig.attachPersistentProcess.id) : await backend.attachToProcess(shellLaunchConfig.attachPersistentProcess.id);
                    if (result) {
                        newProcess = result;
                    }
                    else {
                        // Warn and just create a new terminal if attach failed for some reason
                        this._logService.warn(`Attach to process failed for terminal`, shellLaunchConfig.attachPersistentProcess);
                        shellLaunchConfig.attachPersistentProcess = undefined;
                    }
                }
                if (!newProcess) {
                    newProcess = await this._launchLocalProcess(backend, shellLaunchConfig, cols, rows, this.userHome, variableResolver);
                }
                if (!this._isDisposed) {
                    this._setupPtyHostListeners(backend);
                }
            }
        }
        // If the process was disposed during its creation, shut it down and return failure
        if (this._isDisposed) {
            newProcess.shutdown(false);
            return undefined;
        }
        this._process = newProcess;
        this._setProcessState(2 /* ProcessState.Launching */);
        // Add any capabilities inherent to the backend
        if (this.os === 3 /* OperatingSystem.Linux */ || this.os === 2 /* OperatingSystem.Macintosh */) {
            this.capabilities.add(1 /* TerminalCapability.NaiveCwdDetection */, new NaiveCwdDetectionCapability(this._process));
        }
        this._dataFilter.newProcess(this._process, reset);
        if (this._processListeners) {
            dispose(this._processListeners);
        }
        this._processListeners = [
            newProcess.onProcessReady((e) => {
                this._processTraits = e;
                this.shellProcessId = e.pid;
                this._initialCwd = e.cwd;
                this._onDidChangeProperty.fire({ type: "initialCwd" /* ProcessPropertyType.InitialCwd */, value: this._initialCwd });
                this._onProcessReady.fire(e);
                if (this._preLaunchInputQueue.length > 0 && this._process) {
                    // Send any queued data that's waiting
                    newProcess.input(this._preLaunchInputQueue.join(''));
                    this._preLaunchInputQueue.length = 0;
                }
            }),
            newProcess.onProcessExit(exitCode => this._onExit(exitCode)),
            newProcess.onDidChangeProperty(({ type, value }) => {
                switch (type) {
                    case "hasChildProcesses" /* ProcessPropertyType.HasChildProcesses */:
                        this._hasChildProcesses = value;
                        break;
                    case "failedShellIntegrationActivation" /* ProcessPropertyType.FailedShellIntegrationActivation */:
                        this._telemetryService?.publicLog2('terminal/shellIntegrationActivationFailureCustomArgs');
                        break;
                }
                this._onDidChangeProperty.fire({ type, value });
            })
        ];
        if (newProcess.onProcessReplayComplete) {
            this._processListeners.push(newProcess.onProcessReplayComplete(() => this._onProcessReplayComplete.fire()));
        }
        if (newProcess.onRestoreCommands) {
            this._processListeners.push(newProcess.onRestoreCommands(e => this._onRestoreCommands.fire(e)));
        }
        setTimeout(() => {
            if (this.processState === 2 /* ProcessState.Launching */) {
                this._setProcessState(3 /* ProcessState.Running */);
            }
        }, 500 /* ProcessConstants.ErrorLaunchThresholdDuration */);
        const result = await newProcess.start();
        if (result) {
            // Error
            return result;
        }
        // Report the latency to the pty host when idle
        runWhenWindowIdle(getActiveWindow(), () => {
            this.backend?.getLatency().then(measurements => {
                this._logService.info(`Latency measurements for ${this.remoteAuthority ?? 'local'} backend\n${measurements.map(e => `${e.label}: ${e.latency.toFixed(2)}ms`).join('\n')}`);
            });
        });
        return undefined;
    }
    async relaunch(shellLaunchConfig, cols, rows, reset) {
        this.ptyProcessReady = this._createPtyProcessReadyPromise();
        this._logService.trace(`Relaunching terminal instance ${this._instanceId}`);
        // Fire reconnect if needed to ensure the terminal is usable again
        if (this._isDisconnected) {
            this._isDisconnected = false;
            this._onPtyReconnect.fire();
        }
        // Clear data written flag to re-enable seamless relaunch if this relaunch was manually
        // triggered
        this._hasWrittenData = false;
        return this.createProcess(shellLaunchConfig, cols, rows, reset);
    }
    // Fetch any extension environment additions and apply them
    async _resolveEnvironment(backend, variableResolver, shellLaunchConfig) {
        const workspaceFolder = terminalEnvironment.getWorkspaceForTerminal(shellLaunchConfig.cwd, this._workspaceContextService, this._historyService);
        const platformKey = isWindows ? 'windows' : (isMacintosh ? 'osx' : 'linux');
        const envFromConfigValue = this._configurationService.getValue(`terminal.integrated.env.${platformKey}`);
        let baseEnv;
        if (shellLaunchConfig.useShellEnvironment) {
            // TODO: Avoid as any?
            baseEnv = await backend.getShellEnvironment();
        }
        else {
            baseEnv = await this._terminalProfileResolverService.getEnvironment(this.remoteAuthority);
        }
        const env = await terminalEnvironment.createTerminalEnvironment(shellLaunchConfig, envFromConfigValue, variableResolver, this._productService.version, this._terminalConfigurationService.config.detectLocale, baseEnv);
        if (!this._isDisposed && shouldUseEnvironmentVariableCollection(shellLaunchConfig)) {
            this._extEnvironmentVariableCollection = this._environmentVariableService.mergedCollection;
            this._register(this._environmentVariableService.onDidChangeCollections(newCollection => this._onEnvironmentVariableCollectionChange(newCollection)));
            // For remote terminals, this is a copy of the mergedEnvironmentCollection created on
            // the remote side. Since the environment collection is synced between the remote and
            // local sides immediately this is a fairly safe way of enabling the env var diffing and
            // info widget. While technically these could differ due to the slight change of a race
            // condition, the chance is minimal plus the impact on the user is also not that great
            // if it happens - it's not worth adding plumbing to sync back the resolved collection.
            await this._extEnvironmentVariableCollection.applyToProcessEnvironment(env, { workspaceFolder }, variableResolver);
            if (this._extEnvironmentVariableCollection.getVariableMap({ workspaceFolder }).size) {
                this.environmentVariableInfo = this._instantiationService.createInstance(EnvironmentVariableInfoChangesActive, this._extEnvironmentVariableCollection);
                this._onEnvironmentVariableInfoChange.fire(this.environmentVariableInfo);
            }
        }
        return env;
    }
    async _launchLocalProcess(backend, shellLaunchConfig, cols, rows, userHome, variableResolver) {
        await this._terminalProfileResolverService.resolveShellLaunchConfig(shellLaunchConfig, {
            remoteAuthority: undefined,
            os: OS
        });
        const activeWorkspaceRootUri = this._historyService.getLastActiveWorkspaceRoot(Schemas.file);
        const initialCwd = await terminalEnvironment.getCwd(shellLaunchConfig, userHome, variableResolver, activeWorkspaceRootUri, this._terminalConfigurationService.config.cwd, this._logService);
        const env = await this._resolveEnvironment(backend, variableResolver, shellLaunchConfig);
        const options = {
            shellIntegration: {
                enabled: this._configurationService.getValue("terminal.integrated.shellIntegration.enabled" /* TerminalSettingId.ShellIntegrationEnabled */),
                suggestEnabled: this._configurationService.getValue("terminal.integrated.suggest.enabled" /* TerminalContribSettingId.SuggestEnabled */),
                nonce: this.shellIntegrationNonce
            },
            windowsEnableConpty: this._terminalConfigurationService.config.windowsEnableConpty,
            windowsUseConptyDll: this._terminalConfigurationService.config.windowsUseConptyDll ?? false,
            environmentVariableCollections: this._extEnvironmentVariableCollection ? serializeEnvironmentVariableCollections(this._extEnvironmentVariableCollection.collections) : undefined,
            workspaceFolder: this._cwdWorkspaceFolder,
        };
        const shouldPersist = ((this._configurationService.getValue("task.reconnection" /* TaskSettingId.Reconnection */) && shellLaunchConfig.reconnectionProperties) || !shellLaunchConfig.isFeatureTerminal) && this._terminalConfigurationService.config.enablePersistentSessions && !shellLaunchConfig.isTransient;
        return await backend.createProcess(shellLaunchConfig, initialCwd, cols, rows, this._terminalConfigurationService.config.unicodeVersion, env, options, shouldPersist);
    }
    _setupPtyHostListeners(backend) {
        if (this._ptyListenersAttached) {
            return;
        }
        this._ptyListenersAttached = true;
        // Mark the process as disconnected is the pty host is unresponsive, the responsive event
        // will fire only when the pty host was already unresponsive
        this._register(backend.onPtyHostUnresponsive(() => {
            this._isDisconnected = true;
            this._onPtyDisconnect.fire();
        }));
        this._ptyResponsiveListener = backend.onPtyHostResponsive(() => {
            this._isDisconnected = false;
            this._onPtyReconnect.fire();
        });
        this._register(toDisposable(() => this._ptyResponsiveListener?.dispose()));
        // When the pty host restarts, reconnect is no longer possible so dispose the responsive
        // listener
        this._register(backend.onPtyHostRestart(async () => {
            // When the pty host restarts, reconnect is no longer possible
            if (!this._isDisconnected) {
                this._isDisconnected = true;
                this._onPtyDisconnect.fire();
            }
            this._ptyResponsiveListener?.dispose();
            this._ptyResponsiveListener = undefined;
            if (this._shellLaunchConfig) {
                if (this._shellLaunchConfig.isFeatureTerminal && !this.reconnectionProperties) {
                    // Indicate the process is exited (and gone forever) only for feature terminals
                    // so they can react to the exit, this is particularly important for tasks so
                    // that it knows that the process is not still active. Note that this is not
                    // done for regular terminals because otherwise the terminal instance would be
                    // disposed.
                    this._onExit(-1);
                }
                else {
                    // For normal terminals write a message indicating what happened and relaunch
                    // using the previous shellLaunchConfig
                    const message = localize('ptyHostRelaunch', "Restarting the terminal because the connection to the shell process was lost...");
                    this._onProcessData.fire({ data: formatMessageForTerminal(message, { loudFormatting: true }), trackCommit: false });
                    await this.relaunch(this._shellLaunchConfig, this._dimensions.cols, this._dimensions.rows, false);
                }
            }
        }));
    }
    async getBackendOS() {
        let os = OS;
        if (!!this.remoteAuthority) {
            const remoteEnv = await this._remoteAgentService.getEnvironment();
            if (!remoteEnv) {
                throw new Error(`Failed to get remote environment for remote authority "${this.remoteAuthority}"`);
            }
            os = remoteEnv.os;
        }
        return os;
    }
    setDimensions(cols, rows, sync) {
        if (sync) {
            this._resize(cols, rows);
            return;
        }
        return this.ptyProcessReady.then(() => this._resize(cols, rows));
    }
    async setUnicodeVersion(version) {
        return this._process?.setUnicodeVersion(version);
    }
    _resize(cols, rows) {
        if (!this._process) {
            return;
        }
        // The child process could already be terminated
        try {
            this._process.resize(cols, rows);
        }
        catch (error) {
            // We tried to write to a closed pipe / channel.
            if (error.code !== 'EPIPE' && error.code !== 'ERR_IPC_CHANNEL_CLOSED') {
                throw (error);
            }
        }
        this._dimensions.cols = cols;
        this._dimensions.rows = rows;
    }
    async write(data) {
        await this.ptyProcessReady;
        this._dataFilter.disableSeamlessRelaunch();
        this._hasWrittenData = true;
        if (this.shellProcessId || this._processType === 1 /* ProcessType.PsuedoTerminal */) {
            if (this._process) {
                // Send data if the pty is ready
                this._process.input(data);
            }
        }
        else {
            // If the pty is not ready, queue the data received to send later
            this._preLaunchInputQueue.push(data);
        }
    }
    async processBinary(data) {
        await this.ptyProcessReady;
        this._dataFilter.disableSeamlessRelaunch();
        this._hasWrittenData = true;
        this._process?.processBinary(data);
    }
    get initialCwd() {
        return this._initialCwd ?? '';
    }
    async refreshProperty(type) {
        if (!this._process) {
            throw new Error('Cannot refresh property when process is not set');
        }
        return this._process.refreshProperty(type);
    }
    async updateProperty(type, value) {
        return this._process?.updateProperty(type, value);
    }
    acknowledgeDataEvent(charCount) {
        this._ackDataBufferer.ack(charCount);
    }
    _onExit(exitCode) {
        this._process = null;
        // If the process is marked as launching then mark the process as killed
        // during launch. This typically means that there is a problem with the
        // shell and args.
        if (this.processState === 2 /* ProcessState.Launching */) {
            this._setProcessState(4 /* ProcessState.KilledDuringLaunch */);
        }
        // If TerminalInstance did not know about the process exit then it was
        // triggered by the process, not on VS Code's side.
        if (this.processState === 3 /* ProcessState.Running */) {
            this._setProcessState(6 /* ProcessState.KilledByProcess */);
        }
        this._onProcessExit.fire(exitCode);
    }
    _setProcessState(state) {
        this.processState = state;
        this._onProcessStateChange.fire();
    }
    _onEnvironmentVariableCollectionChange(newCollection) {
        const diff = this._extEnvironmentVariableCollection.diff(newCollection, { workspaceFolder: this._cwdWorkspaceFolder });
        if (diff === undefined) {
            // If there are no longer differences, remove the stale info indicator
            if (this.environmentVariableInfo instanceof EnvironmentVariableInfoStale) {
                this.environmentVariableInfo = this._instantiationService.createInstance(EnvironmentVariableInfoChangesActive, this._extEnvironmentVariableCollection);
                this._onEnvironmentVariableInfoChange.fire(this.environmentVariableInfo);
            }
            return;
        }
        this.environmentVariableInfo = this._instantiationService.createInstance(EnvironmentVariableInfoStale, diff, this._instanceId, newCollection);
        this._onEnvironmentVariableInfoChange.fire(this.environmentVariableInfo);
    }
    async clearBuffer() {
        this._process?.clearBuffer?.();
    }
};
TerminalProcessManager = __decorate([
    __param(4, IHistoryService),
    __param(5, IInstantiationService),
    __param(6, ITerminalLogService),
    __param(7, IWorkspaceContextService),
    __param(8, IConfigurationResolverService),
    __param(9, IWorkbenchEnvironmentService),
    __param(10, IProductService),
    __param(11, IRemoteAgentService),
    __param(12, IPathService),
    __param(13, IEnvironmentVariableService),
    __param(14, ITerminalConfigurationService),
    __param(15, ITerminalProfileResolverService),
    __param(16, IConfigurationService),
    __param(17, ITerminalInstanceService),
    __param(18, ITelemetryService),
    __param(19, INotificationService)
], TerminalProcessManager);
export { TerminalProcessManager };
class AckDataBufferer {
    constructor(_callback) {
        this._callback = _callback;
        this._unsentCharCount = 0;
    }
    ack(charCount) {
        this._unsentCharCount += charCount;
        while (this._unsentCharCount > 5000 /* FlowControlConstants.CharCountAckSize */) {
            this._unsentCharCount -= 5000 /* FlowControlConstants.CharCountAckSize */;
            this._callback(5000 /* FlowControlConstants.CharCountAckSize */);
        }
    }
}
var SeamlessRelaunchConstants;
(function (SeamlessRelaunchConstants) {
    /**
     * How long to record data events for new terminals.
     */
    SeamlessRelaunchConstants[SeamlessRelaunchConstants["RecordTerminalDuration"] = 10000] = "RecordTerminalDuration";
    /**
     * The maximum duration after a relaunch occurs to trigger a swap.
     */
    SeamlessRelaunchConstants[SeamlessRelaunchConstants["SwapWaitMaximumDuration"] = 3000] = "SwapWaitMaximumDuration";
})(SeamlessRelaunchConstants || (SeamlessRelaunchConstants = {}));
/**
 * Filters data events from the process and supports seamlessly restarting swapping out the process
 * with another, delaying the swap in output in order to minimize flickering/clearing of the
 * terminal.
 */
let SeamlessRelaunchDataFilter = class SeamlessRelaunchDataFilter extends Disposable {
    get onProcessData() { return this._onProcessData.event; }
    constructor(_logService) {
        super();
        this._logService = _logService;
        this._disableSeamlessRelaunch = false;
        this._onProcessData = this._register(new Emitter());
    }
    newProcess(process, reset) {
        // Stop listening to the old process and trigger delayed shutdown (for hang issue #71966)
        this._dataListener?.dispose();
        this._activeProcess?.shutdown(false);
        this._activeProcess = process;
        // Start firing events immediately if:
        // - there's no recorder, which means it's a new terminal
        // - this is not a reset, so seamless relaunch isn't necessary
        // - seamless relaunch is disabled because the terminal has accepted input
        if (!this._firstRecorder || !reset || this._disableSeamlessRelaunch) {
            this._firstDisposable?.dispose();
            [this._firstRecorder, this._firstDisposable] = this._createRecorder(process);
            if (this._disableSeamlessRelaunch && reset) {
                this._onProcessData.fire('\x1bc');
            }
            this._dataListener = process.onProcessData(e => this._onProcessData.fire(e));
            this._disableSeamlessRelaunch = false;
            return;
        }
        // Trigger a swap if there was a recent relaunch
        if (this._secondRecorder) {
            this.triggerSwap();
        }
        this._swapTimeout = mainWindow.setTimeout(() => this.triggerSwap(), 3000 /* SeamlessRelaunchConstants.SwapWaitMaximumDuration */);
        // Pause all outgoing data events
        this._dataListener?.dispose();
        this._firstDisposable?.dispose();
        const recorder = this._createRecorder(process);
        [this._secondRecorder, this._secondDisposable] = recorder;
    }
    /**
     * Disables seamless relaunch for the active process
     */
    disableSeamlessRelaunch() {
        this._disableSeamlessRelaunch = true;
        this._stopRecording();
        this.triggerSwap();
    }
    /**
     * Trigger the swap of the processes if needed (eg. timeout, input)
     */
    triggerSwap() {
        // Clear the swap timeout if it exists
        if (this._swapTimeout) {
            mainWindow.clearTimeout(this._swapTimeout);
            this._swapTimeout = undefined;
        }
        // Do nothing if there's nothing being recorder
        if (!this._firstRecorder) {
            return;
        }
        // Clear the first recorder if no second process was attached before the swap trigger
        if (!this._secondRecorder) {
            this._firstRecorder = undefined;
            this._firstDisposable?.dispose();
            return;
        }
        // Generate data for each recorder
        const firstData = this._getDataFromRecorder(this._firstRecorder);
        const secondData = this._getDataFromRecorder(this._secondRecorder);
        // Re-write the terminal if the data differs
        if (firstData === secondData) {
            this._logService.trace(`Seamless terminal relaunch - identical content`);
        }
        else {
            this._logService.trace(`Seamless terminal relaunch - resetting content`);
            // Fire full reset (RIS) followed by the new data so the update happens in the same frame
            this._onProcessData.fire({ data: `\x1bc${secondData}`, trackCommit: false });
        }
        // Set up the new data listener
        this._dataListener?.dispose();
        this._dataListener = this._activeProcess.onProcessData(e => this._onProcessData.fire(e));
        // Replace first recorder with second
        this._firstRecorder = this._secondRecorder;
        this._firstDisposable?.dispose();
        this._firstDisposable = this._secondDisposable;
        this._secondRecorder = undefined;
    }
    _stopRecording() {
        // Continue recording if a swap is coming
        if (this._swapTimeout) {
            return;
        }
        // Stop recording
        this._firstRecorder = undefined;
        this._firstDisposable?.dispose();
        this._secondRecorder = undefined;
        this._secondDisposable?.dispose();
    }
    _createRecorder(process) {
        const recorder = new TerminalRecorder(0, 0);
        const disposable = process.onProcessData(e => recorder.handleData(typeof e === 'string' ? e : e.data));
        return [recorder, disposable];
    }
    _getDataFromRecorder(recorder) {
        return recorder.generateReplayEventSync().events.filter(e => !!e.data).map(e => e.data).join('');
    }
};
SeamlessRelaunchDataFilter = __decorate([
    __param(0, ITerminalLogService)
], SeamlessRelaunchDataFilter);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9jZXNzTWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWxQcm9jZXNzTWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQXVCLFdBQVcsRUFBRSxTQUFTLEVBQW1CLEVBQUUsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRXZILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUNuRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDdkYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFFdkYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sa0ZBQWtGLENBQUM7QUFDL0gsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEVBQThFLENBQUM7QUFDdkgsT0FBTyxFQUE2UCxtQkFBbUIs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