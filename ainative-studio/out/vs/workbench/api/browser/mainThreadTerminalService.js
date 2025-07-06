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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFRlcm1pbmFsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkVGVybWluYWxTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsVUFBVSxFQUFlLGlCQUFpQixFQUFFLGtCQUFrQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDcEksT0FBTyxFQUFFLGNBQWMsRUFBK0QsV0FBVyxFQUFrSCxNQUFNLCtCQUErQixDQUFDO0FBQ3pQLE9BQU8sRUFBRSxvQkFBb0IsRUFBbUIsTUFBTSxzREFBc0QsQ0FBQztBQUM3RyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2xFLE9BQU8sRUFBMkosa0JBQWtCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM5UCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNsRyxPQUFPLEVBQUUsc0JBQXNCLEVBQWlDLHFCQUFxQixFQUFvQyxnQkFBZ0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzlMLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQzVHLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxvQ0FBb0MsRUFBRSx3Q0FBd0MsRUFBRSxzQ0FBc0MsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQ3hNLE9BQU8sRUFB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