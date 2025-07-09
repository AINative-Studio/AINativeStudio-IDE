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
import * as nls from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IRemoteAgentService, remoteConnectionLatencyMeasurer } from '../../../services/remote/common/remoteAgentService.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { Extensions as WorkbenchContributionsExtensions, registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { Schemas } from '../../../../base/common/network.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { ipcRenderer } from '../../../../base/parts/sandbox/electron-sandbox/globals.js';
import { INativeWorkbenchEnvironmentService } from '../../../services/environment/electron-sandbox/environmentService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IRemoteAuthorityResolverService } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { OpenLocalFileFolderCommand, OpenLocalFileCommand, OpenLocalFolderCommand, SaveLocalFileCommand, RemoteFileDialogContext } from '../../../services/dialogs/browser/simpleFileDialog.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { TELEMETRY_SETTING_ID } from '../../../../platform/telemetry/common/telemetry.js';
import { getTelemetryLevel } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
let RemoteAgentDiagnosticListener = class RemoteAgentDiagnosticListener {
    constructor(remoteAgentService, labelService) {
        ipcRenderer.on('vscode:getDiagnosticInfo', (event, request) => {
            const connection = remoteAgentService.getConnection();
            if (connection) {
                const hostName = labelService.getHostLabel(Schemas.vscodeRemote, connection.remoteAuthority);
                remoteAgentService.getDiagnosticInfo(request.args)
                    .then(info => {
                    if (info) {
                        info.hostName = hostName;
                        if (remoteConnectionLatencyMeasurer.latency?.high) {
                            info.latency = {
                                average: remoteConnectionLatencyMeasurer.latency.average,
                                current: remoteConnectionLatencyMeasurer.latency.current
                            };
                        }
                    }
                    ipcRenderer.send(request.replyChannel, info);
                })
                    .catch(e => {
                    const errorMessage = e && e.message ? `Connection to '${hostName}' could not be established  ${e.message}` : `Connection to '${hostName}' could not be established `;
                    ipcRenderer.send(request.replyChannel, { hostName, errorMessage });
                });
            }
            else {
                ipcRenderer.send(request.replyChannel);
            }
        });
    }
};
RemoteAgentDiagnosticListener = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, ILabelService)
], RemoteAgentDiagnosticListener);
let RemoteExtensionHostEnvironmentUpdater = class RemoteExtensionHostEnvironmentUpdater {
    constructor(remoteAgentService, remoteResolverService, extensionService) {
        const connection = remoteAgentService.getConnection();
        if (connection) {
            connection.onDidStateChange(async (e) => {
                if (e.type === 4 /* PersistentConnectionEventType.ConnectionGain */) {
                    const resolveResult = await remoteResolverService.resolveAuthority(connection.remoteAuthority);
                    if (resolveResult.options && resolveResult.options.extensionHostEnv) {
                        await extensionService.setRemoteEnvironment(resolveResult.options.extensionHostEnv);
                    }
                }
            });
        }
    }
};
RemoteExtensionHostEnvironmentUpdater = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, IRemoteAuthorityResolverService),
    __param(2, IExtensionService)
], RemoteExtensionHostEnvironmentUpdater);
let RemoteTelemetryEnablementUpdater = class RemoteTelemetryEnablementUpdater extends Disposable {
    static { this.ID = 'workbench.contrib.remoteTelemetryEnablementUpdater'; }
    constructor(remoteAgentService, configurationService) {
        super();
        this.remoteAgentService = remoteAgentService;
        this.configurationService = configurationService;
        this.updateRemoteTelemetryEnablement();
        this._register(configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(TELEMETRY_SETTING_ID)) {
                this.updateRemoteTelemetryEnablement();
            }
        }));
    }
    updateRemoteTelemetryEnablement() {
        return this.remoteAgentService.updateTelemetryLevel(getTelemetryLevel(this.configurationService));
    }
};
RemoteTelemetryEnablementUpdater = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, IConfigurationService)
], RemoteTelemetryEnablementUpdater);
let RemoteEmptyWorkbenchPresentation = class RemoteEmptyWorkbenchPresentation extends Disposable {
    static { this.ID = 'workbench.contrib.remoteEmptyWorkbenchPresentation'; }
    constructor(environmentService, remoteAuthorityResolverService, configurationService, commandService, contextService) {
        super();
        function shouldShowExplorer() {
            const startupEditor = configurationService.getValue('workbench.startupEditor');
            return startupEditor !== 'welcomePage' && startupEditor !== 'welcomePageInEmptyWorkbench';
        }
        function shouldShowTerminal() {
            return shouldShowExplorer();
        }
        const { remoteAuthority, filesToDiff, filesToMerge, filesToOpenOrCreate, filesToWait } = environmentService;
        if (remoteAuthority && contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */ && !filesToDiff?.length && !filesToMerge?.length && !filesToOpenOrCreate?.length && !filesToWait) {
            remoteAuthorityResolverService.resolveAuthority(remoteAuthority).then(() => {
                if (shouldShowExplorer()) {
                    commandService.executeCommand('workbench.view.explorer');
                }
                if (shouldShowTerminal()) {
                    commandService.executeCommand('workbench.action.terminal.toggleTerminal');
                }
            });
        }
    }
};
RemoteEmptyWorkbenchPresentation = __decorate([
    __param(0, INativeWorkbenchEnvironmentService),
    __param(1, IRemoteAuthorityResolverService),
    __param(2, IConfigurationService),
    __param(3, ICommandService),
    __param(4, IWorkspaceContextService)
], RemoteEmptyWorkbenchPresentation);
/**
 * Sets the 'wslFeatureInstalled' context key if the WSL feature is or was installed on this machine.
 */
let WSLContextKeyInitializer = class WSLContextKeyInitializer extends Disposable {
    static { this.ID = 'workbench.contrib.wslContextKeyInitializer'; }
    constructor(contextKeyService, nativeHostService, storageService, lifecycleService) {
        super();
        const contextKeyId = 'wslFeatureInstalled';
        const storageKey = 'remote.wslFeatureInstalled';
        const defaultValue = storageService.getBoolean(storageKey, -1 /* StorageScope.APPLICATION */, undefined);
        const hasWSLFeatureContext = new RawContextKey(contextKeyId, !!defaultValue, nls.localize('wslFeatureInstalled', "Whether the platform has the WSL feature installed"));
        const contextKey = hasWSLFeatureContext.bindTo(contextKeyService);
        if (defaultValue === undefined) {
            lifecycleService.when(4 /* LifecyclePhase.Eventually */).then(async () => {
                nativeHostService.hasWSLFeatureInstalled().then(res => {
                    if (res) {
                        contextKey.set(true);
                        // once detected, set to true
                        storageService.store(storageKey, true, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
                    }
                });
            });
        }
    }
};
WSLContextKeyInitializer = __decorate([
    __param(0, IContextKeyService),
    __param(1, INativeHostService),
    __param(2, IStorageService),
    __param(3, ILifecycleService)
], WSLContextKeyInitializer);
const workbenchContributionsRegistry = Registry.as(WorkbenchContributionsExtensions.Workbench);
workbenchContributionsRegistry.registerWorkbenchContribution(RemoteAgentDiagnosticListener, 4 /* LifecyclePhase.Eventually */);
workbenchContributionsRegistry.registerWorkbenchContribution(RemoteExtensionHostEnvironmentUpdater, 4 /* LifecyclePhase.Eventually */);
registerWorkbenchContribution2(RemoteTelemetryEnablementUpdater.ID, RemoteTelemetryEnablementUpdater, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(RemoteEmptyWorkbenchPresentation.ID, RemoteEmptyWorkbenchPresentation, 2 /* WorkbenchPhase.BlockRestore */);
if (isWindows) {
    registerWorkbenchContribution2(WSLContextKeyInitializer.ID, WSLContextKeyInitializer, 2 /* WorkbenchPhase.BlockRestore */);
}
Registry.as(ConfigurationExtensions.Configuration)
    .registerConfiguration({
    id: 'remote',
    title: nls.localize('remote', "Remote"),
    type: 'object',
    properties: {
        'remote.downloadExtensionsLocally': {
            type: 'boolean',
            markdownDescription: nls.localize('remote.downloadExtensionsLocally', "When enabled extensions are downloaded locally and installed on remote."),
            default: false
        },
    }
});
if (isMacintosh) {
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: OpenLocalFileFolderCommand.ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        primary: 2048 /* KeyMod.CtrlCmd */ | 45 /* KeyCode.KeyO */,
        when: RemoteFileDialogContext,
        metadata: { description: OpenLocalFileFolderCommand.LABEL, args: [] },
        handler: OpenLocalFileFolderCommand.handler()
    });
}
else {
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: OpenLocalFileCommand.ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        primary: 2048 /* KeyMod.CtrlCmd */ | 45 /* KeyCode.KeyO */,
        when: RemoteFileDialogContext,
        metadata: { description: OpenLocalFileCommand.LABEL, args: [] },
        handler: OpenLocalFileCommand.handler()
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: OpenLocalFolderCommand.ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 45 /* KeyCode.KeyO */),
        when: RemoteFileDialogContext,
        metadata: { description: OpenLocalFolderCommand.LABEL, args: [] },
        handler: OpenLocalFolderCommand.handler()
    });
}
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: SaveLocalFileCommand.ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 49 /* KeyCode.KeyS */,
    when: RemoteFileDialogContext,
    metadata: { description: SaveLocalFileCommand.LABEL, args: [] },
    handler: SaveLocalFileCommand.handler()
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9yZW1vdGUvZWxlY3Ryb24tc2FuZGJveC9yZW1vdGUuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzdILE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzdFLE9BQU8sRUFBVSxRQUFRLEVBQVcsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRixPQUFPLEVBQUUsbUJBQW1CLEVBQW9CLE1BQU0sK0RBQStELENBQUM7QUFDdEgsT0FBTyxFQUEyRSxVQUFVLElBQUksZ0NBQWdDLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzTSxPQUFPLEVBQUUsaUJBQWlCLEVBQWtCLE1BQU0saURBQWlELENBQUM7QUFDcEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNuRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDdEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDREQUE0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