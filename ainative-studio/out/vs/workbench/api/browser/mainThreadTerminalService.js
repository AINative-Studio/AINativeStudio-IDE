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
import { DisposableStore, Disposable, MutableDisposable, combinedDisposable } from '../../../base/common/lifecycle.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { URI } from '../../../base/common/uri.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { TerminalExitReason, TerminalLocation } from '../../../platform/terminal/common/terminal.js';
import { TerminalDataBufferer } from '../../../platform/terminal/common/terminalDataBuffering.js';
import { ITerminalEditorService, ITerminalGroupService, ITerminalService } from '../../contrib/terminal/browser/terminal.js';
import { TerminalProcessExtHostProxy } from '../../contrib/terminal/browser/terminalProcessExtHostProxy.js';
import { IEnvironmentVariableService } from '../../contrib/terminal/common/environmentVariable.js';
import { deserializeEnvironmentDescriptionMap, deserializeEnvironmentVariableCollection, serializeEnvironmentVariableCollection } from '../../../platform/terminal/common/environmentVariableShared.js';
import { ITerminalProfileResolverService, ITerminalProfileService } from '../../contrib/terminal/common/terminal.js';
import { IRemoteAgentService } from '../../services/remote/common/remoteAgentService.js';
import { OS } from '../../../base/common/platform.js';
import { Promises } from '../../../base/common/async.js';
import { ITerminalLinkProviderService } from '../../contrib/terminalContrib/links/browser/links.js';
import { ITerminalQuickFixService, TerminalQuickFixType } from '../../contrib/terminalContrib/quickFix/browser/quickFix.js';
import { ITerminalCompletionService } from '../../contrib/terminalContrib/suggest/browser/terminalCompletionService.js';
let MainThreadTerminalService = class MainThreadTerminalService {
    constructor(_extHostContext, _terminalService, _terminalLinkProviderService, _terminalQuickFixService, _instantiationService, _environmentVariableService, _logService, _terminalProfileResolverService, remoteAgentService, _terminalGroupService, _terminalEditorService, _terminalProfileService, _terminalCompletionService) {
        this._extHostContext = _extHostContext;
        this._terminalService = _terminalService;
        this._terminalLinkProviderService = _terminalLinkProviderService;
        this._terminalQuickFixService = _terminalQuickFixService;
        this._instantiationService = _instantiationService;
        this._environmentVariableService = _environmentVariableService;
        this._logService = _logService;
        this._terminalProfileResolverService = _terminalProfileResolverService;
        this._terminalGroupService = _terminalGroupService;
        this._terminalEditorService = _terminalEditorService;
        this._terminalProfileService = _terminalProfileService;
        this._terminalCompletionService = _terminalCompletionService;
        this._store = new DisposableStore();
        /**
         * Stores a map from a temporary terminal id (a UUID generated on the extension host side)
         * to a numeric terminal id (an id generated on the renderer side)
         * This comes in play only when dealing with terminals created on the extension host side
         */
        this._extHostTerminals = new Map();
        this._terminalProcessProxies = new Map();
        this._profileProviders = new Map();
        this._completionProviders = new Map();
        this._quickFixProviders = new Map();
        this._dataEventTracker = new MutableDisposable();
        this._sendCommandEventListener = new MutableDisposable();
        /**
         * A single shared terminal link provider for the exthost. When an ext registers a link
         * provider, this is registered with the terminal on the renderer side and all links are
         * provided through this, even from multiple ext link providers. Xterm should remove lower
         * priority intersecting links itself.
         */
        this._linkProvider = this._store.add(new MutableDisposable());
        this._os = OS;
        this._proxy = _extHostContext.getProxy(ExtHostContext.ExtHostTerminalService);
        // ITerminalService listeners
        this._store.add(_terminalService.onDidCreateInstance((instance) => {
            this._onTerminalOpened(instance);
            this._onInstanceDimensionsChanged(instance);
        }));
        this._store.add(_terminalService.onDidDisposeInstance(instance => this._onTerminalDisposed(instance)));
        this._store.add(_terminalService.onAnyInstanceProcessIdReady(instance => this._onTerminalProcessIdReady(instance)));
        this._store.add(_terminalService.onDidChangeInstanceDimensions(instance => this._onInstanceDimensionsChanged(instance)));
        this._store.add(_terminalService.onAnyInstanceMaximumDimensionsChange(instance => this._onInstanceMaximumDimensionsChanged(instance)));
        this._store.add(_terminalService.onDidRequestStartExtensionTerminal(e => this._onRequestStartExtensionTerminal(e)));
        this._store.add(_terminalService.onDidChangeActiveInstance(instance => this._onActiveTerminalChanged(instance ? instance.instanceId : null)));
        this._store.add(_terminalService.onAnyInstanceTitleChange(instance => instance && this._onTitleChanged(instance.instanceId, instance.title)));
        this._store.add(_terminalService.onAnyInstanceDataInput(instance => this._proxy.$acceptTerminalInteraction(instance.instanceId)));
        this._store.add(_terminalService.onAnyInstanceSelectionChange(instance => this._proxy.$acceptTerminalSelection(instance.instanceId, instance.selection)));
        this._store.add(_terminalService.onAnyInstanceShellTypeChanged(instance => this._onShellTypeChanged(instance.instanceId)));
        // Set initial ext host state
        for (const instance of this._terminalService.instances) {
            this._onTerminalOpened(instance);
            instance.processReady.then(() => this._onTerminalProcessIdReady(instance));
            if (instance.shellType) {
                this._proxy.$acceptTerminalShellType(instance.instanceId, instance.shellType);
            }
        }
        const activeInstance = this._terminalService.activeInstance;
        if (activeInstance) {
            this._proxy.$acceptActiveTerminalChanged(activeInstance.instanceId);
        }
        if (this._environmentVariableService.collections.size > 0) {
            const collectionAsArray = [...this._environmentVariableService.collections.entries()];
            const serializedCollections = collectionAsArray.map(e => {
                return [e[0], serializeEnvironmentVariableCollection(e[1].map)];
            });
            this._proxy.$initEnvironmentVariableCollections(serializedCollections);
        }
        remoteAgentService.getEnvironment().then(async (env) => {
            this._os = env?.os || OS;
            this._updateDefaultProfile();
        });
        this._store.add(this._terminalProfileService.onDidChangeAvailableProfiles(() => this._updateDefaultProfile()));
    }
    dispose() {
        this._store.dispose();
        for (const provider of this._profileProviders.values()) {
            provider.dispose();
        }
        for (const provider of this._quickFixProviders.values()) {
            provider.dispose();
        }
    }
    async _updateDefaultProfile() {
        const remoteAuthority = this._extHostContext.remoteAuthority ?? undefined;
        const defaultProfile = this._terminalProfileResolverService.getDefaultProfile({ remoteAuthority, os: this._os });
        const defaultAutomationProfile = this._terminalProfileResolverService.getDefaultProfile({ remoteAuthority, os: this._os, allowAutomationShell: true });
        this._proxy.$acceptDefaultProfile(...await Promise.all([defaultProfile, defaultAutomationProfile]));
    }
    async _getTerminalInstance(id) {
        if (typeof id === 'string') {
            return this._extHostTerminals.get(id);
        }
        return this._terminalService.getInstanceFromId(id);
    }
    async $createTerminal(extHostTerminalId, launchConfig) {
        const shellLaunchConfig = {
            name: launchConfig.name,
            executable: launchConfig.shellPath,
            args: launchConfig.shellArgs,
            cwd: typeof launchConfig.cwd === 'string' ? launchConfig.cwd : URI.revive(launchConfig.cwd),
            icon: launchConfig.icon,
            color: launchConfig.color,
            initialText: launchConfig.initialText,
            waitOnExit: launchConfig.waitOnExit,
            ignoreConfigurationCwd: true,
            env: launchConfig.env,
            strictEnv: launchConfig.strictEnv,
            hideFromUser: launchConfig.hideFromUser,
            customPtyImplementation: launchConfig.isExtensionCustomPtyTerminal
                ? (id, cols, rows) => new TerminalProcessExtHostProxy(id, cols, rows, this._terminalService)
                : undefined,
            extHostTerminalId,
            forceShellIntegration: launchConfig.forceShellIntegration,
            isFeatureTerminal: launchConfig.isFeatureTerminal,
            isExtensionOwnedTerminal: launchConfig.isExtensionOwnedTerminal,
            useShellEnvironment: launchConfig.useShellEnvironment,
            isTransient: launchConfig.isTransient
        };
        const terminal = Promises.withAsyncBody(async (r) => {
            const terminal = await this._terminalService.createTerminal({
                config: shellLaunchConfig,
                location: await this._deserializeParentTerminal(launchConfig.location)
            });
            r(terminal);
        });
        this._extHostTerminals.set(extHostTerminalId, terminal);
        const terminalInstance = await terminal;
        this._store.add(terminalInstance.onDisposed(() => {
            this._extHostTerminals.delete(extHostTerminalId);
        }));
    }
    async _deserializeParentTerminal(location) {
        if (typeof location === 'object' && 'parentTerminal' in location) {
            const parentTerminal = await this._extHostTerminals.get(location.parentTerminal.toString());
            return parentTerminal ? { parentTerminal } : undefined;
        }
        return location;
    }
    async $show(id, preserveFocus) {
        const terminalInstance = await this._getTerminalInstance(id);
        if (terminalInstance) {
            this._terminalService.setActiveInstance(terminalInstance);
            if (terminalInstance.target === TerminalLocation.Editor) {
                await this._terminalEditorService.revealActiveEditor(preserveFocus);
            }
            else {
                await this._terminalGroupService.showPanel(!preserveFocus);
            }
        }
    }
    async $hide(id) {
        const instanceToHide = await this._getTerminalInstance(id);
        const activeInstance = this._terminalService.activeInstance;
        if (activeInstance && activeInstance.instanceId === instanceToHide?.instanceId && activeInstance.target !== TerminalLocation.Editor) {
            this._terminalGroupService.hidePanel();
        }
    }
    async $dispose(id) {
        (await this._getTerminalInstance(id))?.dispose(TerminalExitReason.Extension);
    }
    async $sendText(id, text, shouldExecute) {
        const instance = await this._getTerminalInstance(id);
        await instance?.sendText(text, shouldExecute);
    }
    $sendProcessExit(terminalId, exitCode) {
        this._terminalProcessProxies.get(terminalId)?.emitExit(exitCode);
    }
    $startSendingDataEvents() {
        if (!this._dataEventTracker.value) {
            this._dataEventTracker.value = this._instantiationService.createInstance(TerminalDataEventTracker, (id, data) => {
                this._onTerminalData(id, data);
            });
            // Send initial events if they exist
            for (const instance of this._terminalService.instances) {
                for (const data of instance.initialDataEvents || []) {
                    this._onTerminalData(instance.instanceId, data);
                }
            }
        }
    }
    $stopSendingDataEvents() {
        this._dataEventTracker.clear();
    }
    $startSendingCommandEvents() {
        if (this._sendCommandEventListener.value) {
            return;
        }
        const multiplexer = this._terminalService.createOnInstanceCapabilityEvent(2 /* TerminalCapability.CommandDetection */, capability => capability.onCommandFinished);
        const sub = multiplexer.event(e => {
            this._onDidExecuteCommand(e.instance.instanceId, {
                commandLine: e.data.command,
                // TODO: Convert to URI if possible
                cwd: e.data.cwd,
                exitCode: e.data.exitCode,
                output: e.data.getOutput()
            });
        });
        this._sendCommandEventListener.value = combinedDisposable(multiplexer, sub);
    }
    $stopSendingCommandEvents() {
        this._sendCommandEventListener.clear();
    }
    $startLinkProvider() {
        this._linkProvider.value = this._terminalLinkProviderService.registerLinkProvider(new ExtensionTerminalLinkProvider(this._proxy));
    }
    $stopLinkProvider() {
        this._linkProvider.clear();
    }
    $registerProcessSupport(isSupported) {
        this._terminalService.registerProcessSupport(isSupported);
    }
    $registerCompletionProvider(id, extensionIdentifier, ...triggerCharacters) {
        this._completionProviders.set(id, this._terminalCompletionService.registerTerminalCompletionProvider(extensionIdentifier, id, {
            id,
            provideCompletions: async (commandLine, cursorPosition, allowFallbackCompletions, token) => {
                const completions = await this._proxy.$provideTerminalCompletions(id, { commandLine, cursorPosition, allowFallbackCompletions }, token);
                return {
                    items: completions?.items.map(c => ({ ...c, provider: id })),
                    resourceRequestConfig: completions?.resourceRequestConfig
                };
            }
        }, ...triggerCharacters));
    }
    $unregisterCompletionProvider(id) {
        this._completionProviders.get(id)?.dispose();
        this._completionProviders.delete(id);
    }
    $registerProfileProvider(id, extensionIdentifier) {
        // Proxy profile provider requests through the extension host
        this._profileProviders.set(id, this._terminalProfileService.registerTerminalProfileProvider(extensionIdentifier, id, {
            createContributedTerminalProfile: async (options) => {
                return this._proxy.$createContributedProfileTerminal(id, options);
            }
        }));
    }
    $unregisterProfileProvider(id) {
        this._profileProviders.get(id)?.dispose();
        this._profileProviders.delete(id);
    }
    async $registerQuickFixProvider(id, extensionId) {
        this._quickFixProviders.set(id, this._terminalQuickFixService.registerQuickFixProvider(id, {
            provideTerminalQuickFixes: async (terminalCommand, lines, options, token) => {
                if (token.isCancellationRequested) {
                    return;
                }
                if (options.outputMatcher?.length && options.outputMatcher.length > 40) {
                    options.outputMatcher.length = 40;
                    this._logService.warn('Cannot exceed output matcher length of 40');
                }
                const commandLineMatch = terminalCommand.command.match(options.commandLineMatcher);
                if (!commandLineMatch || !lines) {
                    return;
                }
                const outputMatcher = options.outputMatcher;
                let outputMatch;
                if (outputMatcher) {
                    outputMatch = getOutputMatchForLines(lines, outputMatcher);
                }
                if (!outputMatch) {
                    return;
                }
                const matchResult = { commandLineMatch, outputMatch, commandLine: terminalCommand.command };
                if (matchResult) {
                    const result = await this._proxy.$provideTerminalQuickFixes(id, matchResult, token);
                    if (result && Array.isArray(result)) {
                        return result.map(r => parseQuickFix(id, extensionId, r));
                    }
                    else if (result) {
                        return parseQuickFix(id, extensionId, result);
                    }
                }
                return;
            }
        }));
    }
    $unregisterQuickFixProvider(id) {
        this._quickFixProviders.get(id)?.dispose();
        this._quickFixProviders.delete(id);
    }
    _onActiveTerminalChanged(terminalId) {
        this._proxy.$acceptActiveTerminalChanged(terminalId);
    }
    _onTerminalData(terminalId, data) {
        this._proxy.$acceptTerminalProcessData(terminalId, data);
    }
    _onDidExecuteCommand(terminalId, command) {
        this._proxy.$acceptDidExecuteCommand(terminalId, command);
    }
    _onTitleChanged(terminalId, name) {
        this._proxy.$acceptTerminalTitleChange(terminalId, name);
    }
    _onShellTypeChanged(terminalId) {
        const terminalInstance = this._terminalService.getInstanceFromId(terminalId);
        if (terminalInstance) {
            this._proxy.$acceptTerminalShellType(terminalId, terminalInstance.shellType);
        }
    }
    _onTerminalDisposed(terminalInstance) {
        this._proxy.$acceptTerminalClosed(terminalInstance.instanceId, terminalInstance.exitCode, terminalInstance.exitReason ?? TerminalExitReason.Unknown);
    }
    _onTerminalOpened(terminalInstance) {
        const extHostTerminalId = terminalInstance.shellLaunchConfig.extHostTerminalId;
        const shellLaunchConfigDto = {
            name: terminalInstance.shellLaunchConfig.name,
            executable: terminalInstance.shellLaunchConfig.executable,
            args: terminalInstance.shellLaunchConfig.args,
            cwd: terminalInstance.shellLaunchConfig.cwd,
            env: terminalInstance.shellLaunchConfig.env,
            hideFromUser: terminalInstance.shellLaunchConfig.hideFromUser,
            tabActions: terminalInstance.shellLaunchConfig.tabActions
        };
        this._proxy.$acceptTerminalOpened(terminalInstance.instanceId, extHostTerminalId, terminalInstance.title, shellLaunchConfigDto);
    }
    _onTerminalProcessIdReady(terminalInstance) {
        if (terminalInstance.processId === undefined) {
            return;
        }
        this._proxy.$acceptTerminalProcessId(terminalInstance.instanceId, terminalInstance.processId);
    }
    _onInstanceDimensionsChanged(instance) {
        this._proxy.$acceptTerminalDimensions(instance.instanceId, instance.cols, instance.rows);
    }
    _onInstanceMaximumDimensionsChanged(instance) {
        this._proxy.$acceptTerminalMaximumDimensions(instance.instanceId, instance.maxCols, instance.maxRows);
    }
    _onRequestStartExtensionTerminal(request) {
        const proxy = request.proxy;
        this._terminalProcessProxies.set(proxy.instanceId, proxy);
        // Note that onResize is not being listened to here as it needs to fire when max dimensions
        // change, excluding the dimension override
        const initialDimensions = request.cols && request.rows ? {
            columns: request.cols,
            rows: request.rows
        } : undefined;
        this._proxy.$startExtensionTerminal(proxy.instanceId, initialDimensions).then(request.callback);
        proxy.onInput(data => this._proxy.$acceptProcessInput(proxy.instanceId, data));
        proxy.onShutdown(immediate => this._proxy.$acceptProcessShutdown(proxy.instanceId, immediate));
        proxy.onRequestCwd(() => this._proxy.$acceptProcessRequestCwd(proxy.instanceId));
        proxy.onRequestInitialCwd(() => this._proxy.$acceptProcessRequestInitialCwd(proxy.instanceId));
    }
    $sendProcessData(terminalId, data) {
        this._terminalProcessProxies.get(terminalId)?.emitData(data);
    }
    $sendProcessReady(terminalId, pid, cwd, windowsPty) {
        this._terminalProcessProxies.get(terminalId)?.emitReady(pid, cwd, windowsPty);
    }
    $sendProcessProperty(terminalId, property) {
        if (property.type === "title" /* ProcessPropertyType.Title */) {
            const instance = this._terminalService.getInstanceFromId(terminalId);
            instance?.rename(property.value);
        }
        this._terminalProcessProxies.get(terminalId)?.emitProcessProperty(property);
    }
    $setEnvironmentVariableCollection(extensionIdentifier, persistent, collection, descriptionMap) {
        if (collection) {
            const translatedCollection = {
                persistent,
                map: deserializeEnvironmentVariableCollection(collection),
                descriptionMap: deserializeEnvironmentDescriptionMap(descriptionMap)
            };
            this._environmentVariableService.set(extensionIdentifier, translatedCollection);
        }
        else {
            this._environmentVariableService.delete(extensionIdentifier);
        }
    }
};
MainThreadTerminalService = __decorate([
    extHostNamedCustomer(MainContext.MainThreadTerminalService),
    __param(1, ITerminalService),
    __param(2, ITerminalLinkProviderService),
    __param(3, ITerminalQuickFixService),
    __param(4, IInstantiationService),
    __param(5, IEnvironmentVariableService),
    __param(6, ILogService),
    __param(7, ITerminalProfileResolverService),
    __param(8, IRemoteAgentService),
    __param(9, ITerminalGroupService),
    __param(10, ITerminalEditorService),
    __param(11, ITerminalProfileService),
    __param(12, ITerminalCompletionService)
], MainThreadTerminalService);
export { MainThreadTerminalService };
/**
 * Encapsulates temporary tracking of data events from terminal instances, once disposed all
 * listeners are removed.
 */
let TerminalDataEventTracker = class TerminalDataEventTracker extends Disposable {
    constructor(_callback, _terminalService) {
        super();
        this._callback = _callback;
        this._terminalService = _terminalService;
        this._register(this._bufferer = new TerminalDataBufferer(this._callback));
        for (const instance of this._terminalService.instances) {
            this._registerInstance(instance);
        }
        this._register(this._terminalService.onDidCreateInstance(instance => this._registerInstance(instance)));
        this._register(this._terminalService.onDidDisposeInstance(instance => this._bufferer.stopBuffering(instance.instanceId)));
    }
    _registerInstance(instance) {
        // Buffer data events to reduce the amount of messages going to the extension host
        this._register(this._bufferer.startBuffering(instance.instanceId, instance.onData));
    }
};
TerminalDataEventTracker = __decorate([
    __param(1, ITerminalService)
], TerminalDataEventTracker);
class ExtensionTerminalLinkProvider {
    constructor(_proxy) {
        this._proxy = _proxy;
    }
    async provideLinks(instance, line) {
        const proxy = this._proxy;
        const extHostLinks = await proxy.$provideLinks(instance.instanceId, line);
        return extHostLinks.map(dto => ({
            id: dto.id,
            startIndex: dto.startIndex,
            length: dto.length,
            label: dto.label,
            activate: () => proxy.$activateLink(instance.instanceId, dto.id)
        }));
    }
}
export function getOutputMatchForLines(lines, outputMatcher) {
    const match = lines.join('\n').match(outputMatcher.lineMatcher);
    return match ? { regexMatch: match, outputLines: lines } : undefined;
}
function parseQuickFix(id, source, fix) {
    let type = TerminalQuickFixType.TerminalCommand;
    if ('uri' in fix) {
        fix.uri = URI.revive(fix.uri);
        type = TerminalQuickFixType.Opener;
    }
    else if ('id' in fix) {
        type = TerminalQuickFixType.VscodeCommand;
    }
    return { id, type, source, ...fix };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFRlcm1pbmFsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZFRlcm1pbmFsU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLFVBQVUsRUFBZSxpQkFBaUIsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3BJLE9BQU8sRUFBRSxjQUFjLEVBQStELFdBQVcsRUFBa0gsTUFBTSwrQkFBK0IsQ0FBQztBQUN6UCxPQUFPLEVBQUUsb0JBQW9CLEVBQW1CLE1BQU0sc0RBQXNELENBQUM7QUFDN0csT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsRSxPQUFPLEVBQTJKLGtCQUFrQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDOVAsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbEcsT0FBTyxFQUFFLHNCQUFzQixFQUFpQyxxQkFBcUIsRUFBb0MsZ0JBQWdCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUM5TCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUM1RyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNuRyxPQUFPLEVBQUUsb0NBQW9DLEVBQUUsd0NBQXdDLEVBQUUsc0NBQXNDLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUN4TSxPQUFPLEVBQWdFLCtCQUErQixFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDbkwsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDekYsT0FBTyxFQUFtQixFQUFFLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUV2RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFekQsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDcEcsT0FBTyxFQUFFLHdCQUF3QixFQUFxQixvQkFBb0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRS9JLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDRFQUE0RSxDQUFDO0FBR2pILElBQU0seUJBQXlCLEdBQS9CLE1BQU0seUJBQXlCO0lBNEJyQyxZQUNrQixlQUFnQyxFQUMvQixnQkFBbUQsRUFDdkMsNEJBQTJFLEVBQy9FLHdCQUFtRSxFQUN0RSxxQkFBNkQsRUFDdkQsMkJBQXlFLEVBQ3pGLFdBQXlDLEVBQ3JCLCtCQUFpRixFQUM3RixrQkFBdUMsRUFDckMscUJBQTZELEVBQzVELHNCQUErRCxFQUM5RCx1QkFBaUUsRUFDOUQsMEJBQXVFO1FBWmxGLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUNkLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFDdEIsaUNBQTRCLEdBQTVCLDRCQUE0QixDQUE4QjtRQUM5RCw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTBCO1FBQ3JELDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDdEMsZ0NBQTJCLEdBQTNCLDJCQUEyQixDQUE2QjtRQUN4RSxnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQUNKLG9DQUErQixHQUEvQiwrQkFBK0IsQ0FBaUM7UUFFMUUsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUMzQywyQkFBc0IsR0FBdEIsc0JBQXNCLENBQXdCO1FBQzdDLDRCQUF1QixHQUF2Qix1QkFBdUIsQ0FBeUI7UUFDN0MsK0JBQTBCLEdBQTFCLDBCQUEwQixDQUE0QjtRQXZDbkYsV0FBTSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFHaEQ7Ozs7V0FJRztRQUNjLHNCQUFpQixHQUFHLElBQUksR0FBRyxFQUFzQyxDQUFDO1FBQ2xFLDRCQUF1QixHQUFHLElBQUksR0FBRyxFQUF3QyxDQUFDO1FBQzFFLHNCQUFpQixHQUFHLElBQUksR0FBRyxFQUF1QixDQUFDO1FBQ25ELHlCQUFvQixHQUFHLElBQUksR0FBRyxFQUF1QixDQUFDO1FBQ3RELHVCQUFrQixHQUFHLElBQUksR0FBRyxFQUF1QixDQUFDO1FBQ3BELHNCQUFpQixHQUFHLElBQUksaUJBQWlCLEVBQTRCLENBQUM7UUFDdEUsOEJBQXlCLEdBQUcsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1FBRXJFOzs7OztXQUtHO1FBQ2Msa0JBQWEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLGlCQUFpQixFQUFFLENBQUMsQ0FBQztRQUVsRSxRQUFHLEdBQW9CLEVBQUUsQ0FBQztRQWlCakMsSUFBSSxDQUFDLE1BQU0sR0FBRyxlQUFlLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBRTlFLDZCQUE2QjtRQUM3QixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO1lBQ2pFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNqQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDN0MsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2RyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQywyQkFBMkIsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEgsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsNkJBQTZCLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pILElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLG9DQUFvQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLG1DQUFtQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2SSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEgsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMseUJBQXlCLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsd0JBQXdCLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsc0JBQXNCLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLDBCQUEwQixDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEksSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsNEJBQTRCLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLHdCQUF3QixDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxSixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyw2QkFBNkIsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTNILDZCQUE2QjtRQUM3QixLQUFLLE1BQU0sUUFBUSxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN4RCxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDakMsUUFBUSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDM0UsSUFBSSxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ3hCLElBQUksQ0FBQyxNQUFNLENBQUMsd0JBQXdCLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDL0UsQ0FBQztRQUNGLENBQUM7UUFDRCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUFDO1FBQzVELElBQUksY0FBYyxFQUFFLENBQUM7WUFDcEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyw0QkFBNEIsQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDckUsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLDJCQUEyQixDQUFDLFdBQVcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDM0QsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLDJCQUEyQixDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQ3RGLE1BQU0scUJBQXFCLEdBQTJELGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDL0csT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxzQ0FBc0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNqRSxDQUFDLENBQUMsQ0FBQztZQUNILElBQUksQ0FBQyxNQUFNLENBQUMsbUNBQW1DLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUN4RSxDQUFDO1FBRUQsa0JBQWtCLENBQUMsY0FBYyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBQyxHQUFHLEVBQUMsRUFBRTtZQUNwRCxJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDO1lBQ3pCLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1FBQzlCLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLDRCQUE0QixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNoSCxDQUFDO0lBRU0sT0FBTztRQUNiLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDdEIsS0FBSyxNQUFNLFFBQVEsSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztZQUN4RCxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDcEIsQ0FBQztRQUNELEtBQUssTUFBTSxRQUFRLElBQUksSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7WUFDekQsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3BCLENBQUM7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLHFCQUFxQjtRQUNsQyxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLGVBQWUsSUFBSSxTQUFTLENBQUM7UUFDMUUsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLCtCQUErQixDQUFDLGlCQUFpQixDQUFDLEVBQUUsZUFBZSxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUNqSCxNQUFNLHdCQUF3QixHQUFHLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLGVBQWUsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxvQkFBb0IsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZKLElBQUksQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUMsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxjQUFjLEVBQUUsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDckcsQ0FBQztJQUVPLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxFQUE2QjtRQUMvRCxJQUFJLE9BQU8sRUFBRSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzVCLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN2QyxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDcEQsQ0FBQztJQUVNLEtBQUssQ0FBQyxlQUFlLENBQUMsaUJBQXlCLEVBQUUsWUFBa0M7UUFDekYsTUFBTSxpQkFBaUIsR0FBdUI7WUFDN0MsSUFBSSxFQUFFLFlBQVksQ0FBQyxJQUFJO1lBQ3ZCLFVBQVUsRUFBRSxZQUFZLENBQUMsU0FBUztZQUNsQyxJQUFJLEVBQUUsWUFBWSxDQUFDLFNBQVM7WUFDNUIsR0FBRyxFQUFFLE9BQU8sWUFBWSxDQUFDLEdBQUcsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQztZQUMzRixJQUFJLEVBQUUsWUFBWSxDQUFDLElBQUk7WUFDdkIsS0FBSyxFQUFFLFlBQVksQ0FBQyxLQUFLO1lBQ3pCLFdBQVcsRUFBRSxZQUFZLENBQUMsV0FBVztZQUNyQyxVQUFVLEVBQUUsWUFBWSxDQUFDLFVBQVU7WUFDbkMsc0JBQXNCLEVBQUUsSUFBSTtZQUM1QixHQUFHLEVBQUUsWUFBWSxDQUFDLEdBQUc7WUFDckIsU0FBUyxFQUFFLFlBQVksQ0FBQyxTQUFTO1lBQ2pDLFlBQVksRUFBRSxZQUFZLENBQUMsWUFBWTtZQUN2Qyx1QkFBdUIsRUFBRSxZQUFZLENBQUMsNEJBQTRCO2dCQUNqRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSwyQkFBMkIsQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUM7Z0JBQzVGLENBQUMsQ0FBQyxTQUFTO1lBQ1osaUJBQWlCO1lBQ2pCLHFCQUFxQixFQUFFLFlBQVksQ0FBQyxxQkFBcUI7WUFDekQsaUJBQWlCLEVBQUUsWUFBWSxDQUFDLGlCQUFpQjtZQUNqRCx3QkFBd0IsRUFBRSxZQUFZLENBQUMsd0JBQXdCO1lBQy9ELG1CQUFtQixFQUFFLFlBQVksQ0FBQyxtQkFBbUI7WUFDckQsV0FBVyxFQUFFLFlBQVksQ0FBQyxXQUFXO1NBQ3JDLENBQUM7UUFDRixNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFvQixLQUFLLEVBQUMsQ0FBQyxFQUFDLEVBQUU7WUFDcEUsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUFDO2dCQUMzRCxNQUFNLEVBQUUsaUJBQWlCO2dCQUN6QixRQUFRLEVBQUUsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQzthQUN0RSxDQUFDLENBQUM7WUFDSCxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDYixDQUFDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDeEQsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLFFBQVEsQ0FBQztRQUN4QyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ2hELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUNsRCxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxRQUEySztRQUNuTixJQUFJLE9BQU8sUUFBUSxLQUFLLFFBQVEsSUFBSSxnQkFBZ0IsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNsRSxNQUFNLGNBQWMsR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQzVGLE9BQU8sY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDeEQsQ0FBQztRQUNELE9BQU8sUUFBUSxDQUFDO0lBQ2pCLENBQUM7SUFFTSxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQTZCLEVBQUUsYUFBc0I7UUFDdkUsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM3RCxJQUFJLGdCQUFnQixFQUFFLENBQUM7WUFDdEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDMUQsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLEtBQUssZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3pELE1BQU0sSUFBSSxDQUFDLHNCQUFzQixDQUFDLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQ3JFLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUM1RCxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTSxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQTZCO1FBQy9DLE1BQU0sY0FBYyxHQUFHLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzNELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUM7UUFDNUQsSUFBSSxjQUFjLElBQUksY0FBYyxDQUFDLFVBQVUsS0FBSyxjQUFjLEVBQUUsVUFBVSxJQUFJLGNBQWMsQ0FBQyxNQUFNLEtBQUssZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDckksSUFBSSxDQUFDLHFCQUFxQixDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ3hDLENBQUM7SUFDRixDQUFDO0lBRU0sS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUE2QjtRQUNsRCxDQUFDLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzlFLENBQUM7SUFFTSxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQTZCLEVBQUUsSUFBWSxFQUFFLGFBQXNCO1FBQ3pGLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sUUFBUSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVNLGdCQUFnQixDQUFDLFVBQWtCLEVBQUUsUUFBNEI7UUFDdkUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDbEUsQ0FBQztJQUVNLHVCQUF1QjtRQUM3QixJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ25DLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyx3QkFBd0IsRUFBRSxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRTtnQkFDL0csSUFBSSxDQUFDLGVBQWUsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDaEMsQ0FBQyxDQUFDLENBQUM7WUFDSCxvQ0FBb0M7WUFDcEMsS0FBSyxNQUFNLFFBQVEsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ3hELEtBQUssTUFBTSxJQUFJLElBQUksUUFBUSxDQUFDLGlCQUFpQixJQUFJLEVBQUUsRUFBRSxDQUFDO29CQUNyRCxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ2pELENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTSxzQkFBc0I7UUFDNUIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ2hDLENBQUM7SUFFTSwwQkFBMEI7UUFDaEMsSUFBSSxJQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDMUMsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsK0JBQStCLDhDQUFzQyxVQUFVLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQzNKLE1BQU0sR0FBRyxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDakMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFO2dCQUNoRCxXQUFXLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPO2dCQUMzQixtQ0FBbUM7Z0JBQ25DLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUc7Z0JBQ2YsUUFBUSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUTtnQkFDekIsTUFBTSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFO2FBQzFCLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEtBQUssR0FBRyxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDN0UsQ0FBQztJQUVNLHlCQUF5QjtRQUMvQixJQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDeEMsQ0FBQztJQUVNLGtCQUFrQjtRQUN4QixJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsNEJBQTRCLENBQUMsb0JBQW9CLENBQUMsSUFBSSw2QkFBNkIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUNuSSxDQUFDO0lBRU0saUJBQWlCO1FBQ3ZCLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDNUIsQ0FBQztJQUVNLHVCQUF1QixDQUFDLFdBQW9CO1FBQ2xELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBRU0sMkJBQTJCLENBQUMsRUFBVSxFQUFFLG1CQUEyQixFQUFFLEdBQUcsaUJBQTJCO1FBQ3pHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxrQ0FBa0MsQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLEVBQUU7WUFDN0gsRUFBRTtZQUNGLGtCQUFrQixFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLHdCQUF3QixFQUFFLEtBQUssRUFBRSxFQUFFO2dCQUMxRixNQUFNLFdBQVcsR0FBRyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsMkJBQTJCLENBQUMsRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSx3QkFBd0IsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUN4SSxPQUFPO29CQUNOLEtBQUssRUFBRSxXQUFXLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDNUQscUJBQXFCLEVBQUUsV0FBVyxFQUFFLHFCQUFxQjtpQkFDekQsQ0FBQztZQUNILENBQUM7U0FDRCxFQUFFLEdBQUcsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO0lBQzNCLENBQUM7SUFFTSw2QkFBNkIsQ0FBQyxFQUFVO1FBQzlDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUM7UUFDN0MsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBRU0sd0JBQXdCLENBQUMsRUFBVSxFQUFFLG1CQUEyQjtRQUN0RSw2REFBNkQ7UUFDN0QsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLCtCQUErQixDQUFDLG1CQUFtQixFQUFFLEVBQUUsRUFBRTtZQUNwSCxnQ0FBZ0MsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7Z0JBQ25ELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxpQ0FBaUMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDbkUsQ0FBQztTQUNELENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVNLDBCQUEwQixDQUFDLEVBQVU7UUFDM0MsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQztRQUMxQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFFTSxLQUFLLENBQUMseUJBQXlCLENBQUMsRUFBVSxFQUFFLFdBQW1CO1FBQ3JFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLEVBQUU7WUFDMUYseUJBQXlCLEVBQUUsS0FBSyxFQUFFLGVBQWUsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxFQUFFO2dCQUMzRSxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO29CQUNuQyxPQUFPO2dCQUNSLENBQUM7Z0JBQ0QsSUFBSSxPQUFPLENBQUMsYUFBYSxFQUFFLE1BQU0sSUFBSSxPQUFPLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxFQUFFLEVBQUUsQ0FBQztvQkFDeEUsT0FBTyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDO29CQUNsQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQywyQ0FBMkMsQ0FBQyxDQUFDO2dCQUNwRSxDQUFDO2dCQUNELE1BQU0sZ0JBQWdCLEdBQUcsZUFBZSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7Z0JBQ25GLElBQUksQ0FBQyxnQkFBZ0IsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO29CQUNqQyxPQUFPO2dCQUNSLENBQUM7Z0JBQ0QsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQztnQkFDNUMsSUFBSSxXQUFXLENBQUM7Z0JBQ2hCLElBQUksYUFBYSxFQUFFLENBQUM7b0JBQ25CLFdBQVcsR0FBRyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLENBQUM7Z0JBQzVELENBQUM7Z0JBQ0QsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO29CQUNsQixPQUFPO2dCQUNSLENBQUM7Z0JBQ0QsTUFBTSxXQUFXLEdBQUcsRUFBRSxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFFNUYsSUFBSSxXQUFXLEVBQUUsQ0FBQztvQkFDakIsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLDBCQUEwQixDQUFDLEVBQUUsRUFBRSxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7b0JBQ3BGLElBQUksTUFBTSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQzt3QkFDckMsT0FBTyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsYUFBYSxDQUFDLEVBQUUsRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDM0QsQ0FBQzt5QkFBTSxJQUFJLE1BQU0sRUFBRSxDQUFDO3dCQUNuQixPQUFPLGFBQWEsQ0FBQyxFQUFFLEVBQUUsV0FBVyxFQUFFLE1BQU0sQ0FBQyxDQUFDO29CQUMvQyxDQUFDO2dCQUNGLENBQUM7Z0JBQ0QsT0FBTztZQUNSLENBQUM7U0FDRCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTSwyQkFBMkIsQ0FBQyxFQUFVO1FBQzVDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUM7UUFDM0MsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRU8sd0JBQXdCLENBQUMsVUFBeUI7UUFDekQsSUFBSSxDQUFDLE1BQU0sQ0FBQyw0QkFBNEIsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUN0RCxDQUFDO0lBRU8sZUFBZSxDQUFDLFVBQWtCLEVBQUUsSUFBWTtRQUN2RCxJQUFJLENBQUMsTUFBTSxDQUFDLDBCQUEwQixDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBRU8sb0JBQW9CLENBQUMsVUFBa0IsRUFBRSxPQUE0QjtRQUM1RSxJQUFJLENBQUMsTUFBTSxDQUFDLHdCQUF3QixDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBRU8sZUFBZSxDQUFDLFVBQWtCLEVBQUUsSUFBWTtRQUN2RCxJQUFJLENBQUMsTUFBTSxDQUFDLDBCQUEwQixDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBRU8sbUJBQW1CLENBQUMsVUFBa0I7UUFDN0MsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDN0UsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3RCLElBQUksQ0FBQyxNQUFNLENBQUMsd0JBQXdCLENBQUMsVUFBVSxFQUFFLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzlFLENBQUM7SUFDRixDQUFDO0lBRU8sbUJBQW1CLENBQUMsZ0JBQW1DO1FBQzlELElBQUksQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBQyxVQUFVLElBQUksa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDdEosQ0FBQztJQUVPLGlCQUFpQixDQUFDLGdCQUFtQztRQUM1RCxNQUFNLGlCQUFpQixHQUFHLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLGlCQUFpQixDQUFDO1FBQy9FLE1BQU0sb0JBQW9CLEdBQTBCO1lBQ25ELElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJO1lBQzdDLFVBQVUsRUFBRSxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVO1lBQ3pELElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJO1lBQzdDLEdBQUcsRUFBRSxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHO1lBQzNDLEdBQUcsRUFBRSxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHO1lBQzNDLFlBQVksRUFBRSxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxZQUFZO1lBQzdELFVBQVUsRUFBRSxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVO1NBQ3pELENBQUM7UUFDRixJQUFJLENBQUMsTUFBTSxDQUFDLHFCQUFxQixDQUFDLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztJQUNqSSxDQUFDO0lBRU8seUJBQXlCLENBQUMsZ0JBQW1DO1FBQ3BFLElBQUksZ0JBQWdCLENBQUMsU0FBUyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzlDLE9BQU87UUFDUixDQUFDO1FBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDL0YsQ0FBQztJQUVPLDRCQUE0QixDQUFDLFFBQTJCO1FBQy9ELElBQUksQ0FBQyxNQUFNLENBQUMseUJBQXlCLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMxRixDQUFDO0lBRU8sbUNBQW1DLENBQUMsUUFBMkI7UUFDdEUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQ0FBZ0MsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3ZHLENBQUM7SUFFTyxnQ0FBZ0MsQ0FBQyxPQUF1QztRQUMvRSxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDO1FBQzVCLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUUxRCwyRkFBMkY7UUFDM0YsMkNBQTJDO1FBQzNDLE1BQU0saUJBQWlCLEdBQXVDLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDNUYsT0FBTyxFQUFFLE9BQU8sQ0FBQyxJQUFJO1lBQ3JCLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSTtTQUNsQixDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFFZCxJQUFJLENBQUMsTUFBTSxDQUFDLHVCQUF1QixDQUNsQyxLQUFLLENBQUMsVUFBVSxFQUNoQixpQkFBaUIsQ0FDakIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRXpCLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUMvRSxLQUFLLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDL0YsS0FBSyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQ2pGLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLCtCQUErQixDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO0lBQ2hHLENBQUM7SUFFTSxnQkFBZ0IsQ0FBQyxVQUFrQixFQUFFLElBQVk7UUFDdkQsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDOUQsQ0FBQztJQUVNLGlCQUFpQixDQUFDLFVBQWtCLEVBQUUsR0FBVyxFQUFFLEdBQVcsRUFBRSxVQUErQztRQUNySCxJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQy9FLENBQUM7SUFFTSxvQkFBb0IsQ0FBQyxVQUFrQixFQUFFLFFBQStCO1FBQzlFLElBQUksUUFBUSxDQUFDLElBQUksNENBQThCLEVBQUUsQ0FBQztZQUNqRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDckUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbEMsQ0FBQztRQUNELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUUsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDN0UsQ0FBQztJQUVELGlDQUFpQyxDQUFDLG1CQUEyQixFQUFFLFVBQW1CLEVBQUUsVUFBa0UsRUFBRSxjQUFzRDtRQUM3TSxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLE1BQU0sb0JBQW9CLEdBQUc7Z0JBQzVCLFVBQVU7Z0JBQ1YsR0FBRyxFQUFFLHdDQUF3QyxDQUFDLFVBQVUsQ0FBQztnQkFDekQsY0FBYyxFQUFFLG9DQUFvQyxDQUFDLGNBQWMsQ0FBQzthQUNwRSxDQUFDO1lBQ0YsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBQ2pGLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLDJCQUEyQixDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQzlELENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQXhhWSx5QkFBeUI7SUFEckMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLHlCQUF5QixDQUFDO0lBK0J6RCxXQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFdBQUEsNEJBQTRCLENBQUE7SUFDNUIsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsMkJBQTJCLENBQUE7SUFDM0IsV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLCtCQUErQixDQUFBO0lBQy9CLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixZQUFBLHNCQUFzQixDQUFBO0lBQ3RCLFlBQUEsdUJBQXVCLENBQUE7SUFDdkIsWUFBQSwwQkFBMEIsQ0FBQTtHQXpDaEIseUJBQXlCLENBd2FyQzs7QUFFRDs7O0dBR0c7QUFDSCxJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF5QixTQUFRLFVBQVU7SUFHaEQsWUFDa0IsU0FBNkMsRUFDM0IsZ0JBQWtDO1FBRXJFLEtBQUssRUFBRSxDQUFDO1FBSFMsY0FBUyxHQUFULFNBQVMsQ0FBb0M7UUFDM0IscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQUlyRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUUxRSxLQUFLLE1BQU0sUUFBUSxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN4RCxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbEMsQ0FBQztRQUNELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4RyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDM0gsQ0FBQztJQUVPLGlCQUFpQixDQUFDLFFBQTJCO1FBQ3BELGtGQUFrRjtRQUNsRixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDckYsQ0FBQztDQUNELENBQUE7QUF0Qkssd0JBQXdCO0lBSzNCLFdBQUEsZ0JBQWdCLENBQUE7R0FMYix3QkFBd0IsQ0FzQjdCO0FBRUQsTUFBTSw2QkFBNkI7SUFDbEMsWUFDa0IsTUFBbUM7UUFBbkMsV0FBTSxHQUFOLE1BQU0sQ0FBNkI7SUFFckQsQ0FBQztJQUVELEtBQUssQ0FBQyxZQUFZLENBQUMsUUFBMkIsRUFBRSxJQUFZO1FBQzNELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDMUIsTUFBTSxZQUFZLEdBQUcsTUFBTSxLQUFLLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDMUUsT0FBTyxZQUFZLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUMvQixFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQUU7WUFDVixVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVU7WUFDMUIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNO1lBQ2xCLEtBQUssRUFBRSxHQUFHLENBQUMsS0FBSztZQUNoQixRQUFRLEVBQUUsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUM7U0FDaEUsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLFVBQVUsc0JBQXNCLENBQUMsS0FBZSxFQUFFLGFBQXFDO0lBQzVGLE1BQU0sS0FBSyxHQUF3QyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDckcsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztBQUN0RSxDQUFDO0FBRUQsU0FBUyxhQUFhLENBQUMsRUFBVSxFQUFFLE1BQWMsRUFBRSxHQUFxQjtJQUN2RSxJQUFJLElBQUksR0FBRyxvQkFBb0IsQ0FBQyxlQUFlLENBQUM7SUFDaEQsSUFBSSxLQUFLLElBQUksR0FBRyxFQUFFLENBQUM7UUFDbEIsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM5QixJQUFJLEdBQUcsb0JBQW9CLENBQUMsTUFBTSxDQUFDO0lBQ3BDLENBQUM7U0FBTSxJQUFJLElBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUN4QixJQUFJLEdBQUcsb0JBQW9CLENBQUMsYUFBYSxDQUFDO0lBQzNDLENBQUM7SUFDRCxPQUFPLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsR0FBRyxHQUFHLEVBQUUsQ0FBQztBQUNyQyxDQUFDIn0=